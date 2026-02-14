/**
 * Comprehensive Judging Analysis
 * 
 * Covers all Tier 1 (answerable) and Tier 2 (descriptive) questions from RESEARCH_QUESTIONS.md:
 * 
 * TIER 1 — Strong analyses:
 *   Q3: Judge severity profiles (deviation, exclusion patterns)
 *   Q4: Trimmed mean effectiveness (does dropping high/low fix bias?)
 *   Q5: Wipeout scoring mechanics (trick count → score)
 *   Q6: Judge consensus patterns (when do they agree/disagree?)
 *   Q7: Judge-to-judge correlations (who thinks alike?)
 * 
 * TIER 2 — Descriptive/exploratory:
 *   Q1: Immediate crash-streak relief bias
 *   Q2: Crash streak dose-response
 *   Q8: Nationality bias (Judge 6 JPN)
 *   Q9: Difficulty vs score
 *   Q10: Round drift
 */

const fs = require('fs');
const path = require('path');
const stats = require('simple-statistics');

class JudgingAnalyzer {
  constructor() {
    this.rawScores = this.loadRawScores();
    this.judges = this.loadJudgesMetadata();
    this.results = {};
  }

  loadRawScores() {
    const csvPath = path.join(__dirname, '../data/raw/milano-cortina-2026-individual-judge-scores.csv');
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((h, i) => { row[h.trim()] = values[i]?.trim(); });
      return row;
    });
  }

  loadJudgesMetadata() {
    const csvPath = path.join(__dirname, '../data/raw/judges-metadata.csv');
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    const judges = {};
    lines.slice(1).forEach(line => {
      const v = line.split(',');
      judges[v[0].trim()] = { name: v[1]?.trim(), country: v[2]?.trim() };
    });
    return judges;
  }

  loadDNIResolution() {
    const csvPath = path.join(__dirname, '../data/processed/dni_resolved.csv');
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    const map = {};
    lines.slice(1).forEach(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((h, i) => { row[h.trim()] = values[i]?.trim(); });
      map[`${row.competitor}-${row.run}`] = row;
    });
    return map;
  }

  // Get 6 judge scores for a scored run as array of {judgeNum, score, country, name}
  getJudgeScores(row) {
    const scores = [];
    for (let j = 1; j <= 6; j++) {
      const scoreKey = `judge${j}_score`;
      const countryKey = `judge${j}_country`;
      const val = parseFloat(row[scoreKey]);
      if (!isNaN(val)) {
        scores.push({
          judgeNum: j,
          score: val,
          country: this.judges[j]?.country || row[countryKey] || '',
          name: this.judges[j]?.name || `Judge ${j}`,
        });
      }
    }
    return scores;
  }

  // Get all scored runs (non-DNI)
  getScoredRuns() {
    return this.rawScores.filter(r => r.final_score && r.final_score !== 'DNI');
  }

  // Get clean runs (score >= 50)
  getCleanRuns() {
    return this.getScoredRuns().filter(r => parseFloat(r.final_score) >= 50);
  }

  // Get wipeout runs (score < 50)
  getWipeoutRuns() {
    return this.getScoredRuns().filter(r => parseFloat(r.final_score) < 50);
  }

  // Determine run status
  getRunStatus(row) {
    if (row.final_score === 'DNI') {
      const dniMap = this.loadDNIResolution();
      const key = `${row.competitor}-${row.run}`;
      return dniMap[key]?.dni_reason || 'dni_unknown';
    }
    const score = parseFloat(row.final_score);
    return score >= 50 ? 'clean' : 'wipeout';
  }

  // Build round sequence with crash streak info
  buildRoundSequence(roundNum) {
    const roundRuns = this.rawScores
      .filter(r => r.run === roundNum.toString())
      .sort((a, b) => parseInt(a.position) - parseInt(b.position));

    let consecCrashes = 0;
    const dniMap = this.loadDNIResolution();

    return roundRuns.map(run => {
      const status = this.getRunStatus(run);
      const isCrash = status === 'wipeout' || status === 'crash';
      const isCompleted = status === 'clean' || status === 'did_not_improve' || status === 'strategic_skip';

      const entry = {
        ...run,
        status,
        consecCrashesBefore: consecCrashes,
      };

      if (isCrash) {
        consecCrashes++;
      } else if (isCompleted) {
        consecCrashes = 0;
      }

      return entry;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // TIER 1 ANALYSES
  // ═══════════════════════════════════════════════════════════════

  analyzeQ3_JudgeSeverity() {
    console.log('\n' + '═'.repeat(80));
    console.log('Q3: JUDGE SEVERITY PROFILES');
    console.log('═'.repeat(80));
    console.log('(Are some judges consistently harsher or more generous?)\n');

    const scoredRuns = this.getScoredRuns();
    const judgeStats = {};

    for (let j = 1; j <= 6; j++) {
      judgeStats[j] = {
        name: this.judges[j]?.name || `Judge ${j}`,
        country: this.judges[j]?.country || '',
        deviations: [],
        excludedHigh: 0,
        excludedLow: 0,
        totalRuns: 0,
      };
    }

    scoredRuns.forEach(run => {
      const scores = this.getJudgeScores(run);
      if (scores.length < 6) return;

      const panelMean = stats.mean(scores.map(s => s.score));
      const maxScore = Math.max(...scores.map(s => s.score));
      const minScore = Math.min(...scores.map(s => s.score));

      scores.forEach(s => {
        judgeStats[s.judgeNum].deviations.push(s.score - panelMean);
        judgeStats[s.judgeNum].totalRuns++;
        if (s.score === maxScore && scores.filter(x => x.score === maxScore).length === 1) {
          judgeStats[s.judgeNum].excludedHigh++;
        }
        if (s.score === minScore && scores.filter(x => x.score === minScore).length === 1) {
          judgeStats[s.judgeNum].excludedLow++;
        }
      });
    });

    const q3Results = [];
    Object.entries(judgeStats).forEach(([j, s]) => {
      if (s.deviations.length === 0) return;
      const avgDev = stats.mean(s.deviations);
      const sdDev = stats.standardDeviation(s.deviations);
      const result = {
        judge: parseInt(j),
        name: s.name,
        country: s.country,
        avgDeviation: Math.round(avgDev * 100) / 100,
        deviationSD: Math.round(sdDev * 100) / 100,
        excludedHigh: s.excludedHigh,
        excludedLow: s.excludedLow,
        excludedHighPct: Math.round(s.excludedHigh / s.totalRuns * 100),
        excludedLowPct: Math.round(s.excludedLow / s.totalRuns * 100),
        totalRuns: s.totalRuns,
        tendency: avgDev > 0.2 ? 'generous' : avgDev < -0.2 ? 'strict' : 'neutral',
      };
      q3Results.push(result);

      const flag = result.excludedHighPct > 30 ? ' ⚠️ OUTLIER' : result.excludedLowPct > 30 ? ' ⚠️ OUTLIER' : '';
      console.log(`  Judge ${j} (${s.name}, ${s.country}):${flag}`);
      console.log(`    Avg deviation: ${avgDev > 0 ? '+' : ''}${avgDev.toFixed(2)} pts | SD: ${sdDev.toFixed(2)}`);
      console.log(`    Excluded HIGH: ${s.excludedHigh}/${s.totalRuns} (${result.excludedHighPct}%) | LOW: ${s.excludedLow}/${s.totalRuns} (${result.excludedLowPct}%)`);
      console.log(`    Tendency: ${result.tendency}`);
    });

    // Expected by chance: ~17% each direction (1/6)
    console.log(`\n  Expected by chance: ~17% exclusion rate each direction`);

    this.results.q3_judge_severity = q3Results;
    return q3Results;
  }

  analyzeQ4_TrimmedMean() {
    console.log('\n' + '═'.repeat(80));
    console.log('Q4: TRIMMED MEAN EFFECTIVENESS');
    console.log('═'.repeat(80));
    console.log('(Does dropping high/low protect against bias?)\n');

    const scoredRuns = this.getScoredRuns();
    const comparisons = [];

    scoredRuns.forEach(run => {
      const scores = this.getJudgeScores(run);
      if (scores.length < 6) return;

      const allScores = scores.map(s => s.score);
      const rawMean = stats.mean(allScores);

      const sorted = [...allScores].sort((a, b) => a - b);
      const middle4 = sorted.slice(1, 5);
      const trimmedMean = stats.mean(middle4);

      const officialScore = parseFloat(run.final_score);
      const shift = trimmedMean - rawMean;

      comparisons.push({
        competitor: run.competitor,
        run: parseInt(run.run),
        officialScore,
        rawMean: Math.round(rawMean * 100) / 100,
        trimmedMean: Math.round(trimmedMean * 100) / 100,
        shift: Math.round(shift * 100) / 100,
        dropped: `${sorted[0]} (low), ${sorted[5]} (high)`,
        spread: sorted[5] - sorted[0],
      });
    });

    const shifts = comparisons.map(c => c.shift);
    const absShifts = shifts.map(s => Math.abs(s));

    console.log(`  Runs analyzed: ${comparisons.length}`);
    console.log(`  Average absolute shift: ${stats.mean(absShifts).toFixed(2)} pts`);
    console.log(`  Max shift: ${Math.max(...absShifts).toFixed(2)} pts`);
    console.log(`  Shifts > 0.5 pts: ${shifts.filter(s => Math.abs(s) > 0.5).length}/${comparisons.length}`);

    // Would medals change?
    const cleanRuns = comparisons.filter(c => c.officialScore >= 50);
    const bestByRider = {};
    cleanRuns.forEach(c => {
      if (!bestByRider[c.competitor] || c.officialScore > bestByRider[c.competitor].official) {
        bestByRider[c.competitor] = { official: c.officialScore, raw: c.rawMean };
      }
    });

    // Also compute best with raw mean
    const bestRawByRider = {};
    cleanRuns.forEach(c => {
      if (!bestRawByRider[c.competitor] || c.rawMean > bestRawByRider[c.competitor]) {
        bestRawByRider[c.competitor] = c.rawMean;
      }
    });

    const officialRanking = Object.entries(bestByRider).sort((a, b) => b[1].official - a[1].official);
    const rawRanking = Object.entries(bestRawByRider).sort((a, b) => b[1] - a[1]);

    console.log('\n  Official ranking (trimmed mean) vs Raw mean ranking:');
    const maxLen = Math.max(officialRanking.length, rawRanking.length);
    for (let i = 0; i < Math.min(6, maxLen); i++) {
      const off = officialRanking[i] ? `${officialRanking[i][0]} (${officialRanking[i][1].official})` : '';
      const raw = rawRanking[i] ? `${rawRanking[i][0]} (${rawRanking[i][1].toFixed(2)})` : '';
      const match = officialRanking[i]?.[0] === rawRanking[i]?.[0] ? '✓' : '≠';
      console.log(`    ${i + 1}. ${off.padEnd(35)} ${match} ${raw}`);
    }

    const medalChanges = officialRanking.slice(0, 3).some((r, i) => r[0] !== rawRanking[i]?.[0]);
    console.log(`\n  Medal outcomes would change: ${medalChanges ? '⚠️ YES' : '✓ NO'}`);

    // Biggest shifts
    const sortedByShift = [...comparisons].sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift));
    console.log('\n  Largest shifts from trimming:');
    sortedByShift.slice(0, 5).forEach(c => {
      console.log(`    ${c.competitor} R${c.run}: ${c.shift > 0 ? '+' : ''}${c.shift.toFixed(2)} pts (raw ${c.rawMean} → trimmed ${c.trimmedMean}) [spread: ${c.spread}]`);
    });

    this.results.q4_trimmed_mean = { comparisons, medalChanges };
    return comparisons;
  }

  analyzeQ5_WipeoutMechanics() {
    console.log('\n' + '═'.repeat(80));
    console.log('Q5: WIPEOUT SCORING MECHANICS');
    console.log('═'.repeat(80));
    console.log('(How does trick count map to wipeout score?)\n');

    const wipeouts = this.getWipeoutRuns().map(run => {
      const tricks = [run.trick1, run.trick2, run.trick3, run.trick4, run.trick5]
        .filter(t => t && t.length > 0);
      const scores = this.getJudgeScores(run);
      const spread = scores.length >= 2 ? Math.max(...scores.map(s => s.score)) - Math.min(...scores.map(s => s.score)) : 0;

      return {
        competitor: run.competitor,
        run: parseInt(run.run),
        score: parseFloat(run.final_score),
        trickCount: tricks.length,
        spread,
        judgeSD: scores.length >= 2 ? stats.standardDeviation(scores.map(s => s.score)) : 0,
      };
    }).sort((a, b) => a.trickCount - b.trickCount || a.score - b.score);

    console.log('  Trick count → Wipeout score:\n');
    console.log('  Tricks | Score  | Competitor       | Judge spread | Judge SD');
    console.log('  ' + '-'.repeat(70));
    wipeouts.forEach(w => {
      console.log(`  ${w.trickCount.toString().padEnd(7)}| ${w.score.toString().padEnd(7)}| ${w.competitor.padEnd(17)}| ${w.spread.toString().padEnd(13)}| ${w.judgeSD.toFixed(2)}`);
    });

    // Correlation
    if (wipeouts.length >= 3) {
      const r = stats.sampleCorrelation(wipeouts.map(w => w.trickCount), wipeouts.map(w => w.score));
      console.log(`\n  Correlation (tricks → score): r = ${r.toFixed(3)}`);
    }

    // Compare judge agreement: wipeouts vs clean
    const cleanRuns = this.getCleanRuns();
    const cleanSpreads = cleanRuns.map(run => {
      const scores = this.getJudgeScores(run);
      return scores.length >= 2 ? Math.max(...scores.map(s => s.score)) - Math.min(...scores.map(s => s.score)) : 0;
    });
    const wipeoutSpreads = wipeouts.map(w => w.spread);

    console.log(`\n  Judge agreement comparison:`);
    console.log(`    Clean runs: avg spread ${stats.mean(cleanSpreads).toFixed(2)} pts (n=${cleanSpreads.length})`);
    console.log(`    Wipeouts:   avg spread ${stats.mean(wipeoutSpreads).toFixed(2)} pts (n=${wipeoutSpreads.length})`);
    console.log(`    → Judges ${stats.mean(wipeoutSpreads) > stats.mean(cleanSpreads) ? 'DISAGREE MORE' : 'agree similarly'} on wipeouts`);

    this.results.q5_wipeout_mechanics = wipeouts;
    return wipeouts;
  }

  analyzeQ6_ConsensusPatterns() {
    console.log('\n' + '═'.repeat(80));
    console.log('Q6: JUDGE CONSENSUS PATTERNS');
    console.log('═'.repeat(80));
    console.log('(When do judges agree perfectly vs disagree?)\n');

    const scoredRuns = this.getScoredRuns();
    const runConsensus = scoredRuns.map(run => {
      const scores = this.getJudgeScores(run);
      if (scores.length < 6) return null;
      const allScores = scores.map(s => s.score);
      const spread = Math.max(...allScores) - Math.min(...allScores);
      const sd = stats.standardDeviation(allScores);
      const score = parseFloat(run.final_score);
      return {
        competitor: run.competitor,
        run: parseInt(run.run),
        score,
        spread,
        sd: Math.round(sd * 100) / 100,
        allIdentical: spread === 0,
        scores: allScores,
        type: score >= 50 ? 'clean' : 'wipeout',
      };
    }).filter(Boolean).sort((a, b) => a.spread - b.spread);

    // Most agreement
    console.log('  HIGHEST AGREEMENT (lowest spread):');
    runConsensus.slice(0, 5).forEach(r => {
      console.log(`    ${r.competitor} R${r.run}: spread=${r.spread}, scores=[${r.scores.join(',')}]${r.allIdentical ? ' ← PERFECT CONSENSUS' : ''} (${r.type}, ${r.score})`);
    });

    // Most disagreement
    console.log('\n  MOST DISAGREEMENT (highest spread):');
    runConsensus.slice(-5).reverse().forEach(r => {
      console.log(`    ${r.competitor} R${r.run}: spread=${r.spread}, scores=[${r.scores.join(',')}] (${r.type}, ${r.score})`);
    });

    // Perfect consensus count
    const perfectCount = runConsensus.filter(r => r.allIdentical).length;
    console.log(`\n  Perfect consensus (all 6 identical): ${perfectCount}/${runConsensus.length} runs`);
    if (perfectCount > 0) {
      runConsensus.filter(r => r.allIdentical).forEach(r => {
        console.log(`    → ${r.competitor} R${r.run}: all scored ${r.scores[0]}`);
      });
    }

    // Near-consensus (spread ≤ 1)
    const nearCount = runConsensus.filter(r => r.spread <= 1 && !r.allIdentical).length;
    console.log(`  Near consensus (spread ≤ 1): ${nearCount}/${runConsensus.length} runs`);

    // By score tier
    const tiers = { elite: [], strong: [], mid: [], wipeout: [] };
    runConsensus.forEach(r => {
      if (r.score >= 90) tiers.elite.push(r);
      else if (r.score >= 80) tiers.strong.push(r);
      else if (r.score >= 50) tiers.mid.push(r);
      else tiers.wipeout.push(r);
    });

    console.log('\n  Consensus by score tier:');
    Object.entries(tiers).forEach(([tier, runs]) => {
      if (runs.length === 0) return;
      console.log(`    ${tier.padEnd(8)} (n=${runs.length}): avg spread ${stats.mean(runs.map(r => r.spread)).toFixed(2)}, avg SD ${stats.mean(runs.map(r => r.sd)).toFixed(2)}`);
    });

    this.results.q6_consensus = runConsensus;
    return runConsensus;
  }

  analyzeQ7_JudgeCorrelations() {
    console.log('\n' + '═'.repeat(80));
    console.log('Q7: JUDGE-TO-JUDGE CORRELATIONS');
    console.log('═'.repeat(80));
    console.log('(Which judges think alike?)\n');

    const scoredRuns = this.getScoredRuns();

    // Build score vectors per judge
    const judgeVectors = {};
    for (let j = 1; j <= 6; j++) judgeVectors[j] = [];

    scoredRuns.forEach(run => {
      const scores = this.getJudgeScores(run);
      if (scores.length < 6) return;
      scores.forEach(s => { judgeVectors[s.judgeNum].push(s.score); });
    });

    // Pairwise correlations
    const correlations = [];
    console.log('  Pairwise correlations (Pearson r):\n');
    console.log('         J1     J2     J3     J4     J5     J6');

    for (let i = 1; i <= 6; i++) {
      let line = `  J${i}  `;
      for (let j = 1; j <= 6; j++) {
        if (j < i) {
          line += '       ';
        } else if (j === i) {
          line += ' 1.000 ';
        } else {
          const r = stats.sampleCorrelation(judgeVectors[i], judgeVectors[j]);
          line += ` ${r.toFixed(3)} `;
          correlations.push({ judge1: i, judge2: j, r: Math.round(r * 1000) / 1000 });
        }
      }
      console.log(line);
    }

    // Most and least correlated pairs
    correlations.sort((a, b) => b.r - a.r);
    console.log(`\n  Most aligned pair: J${correlations[0].judge1}↔J${correlations[0].judge2} (r=${correlations[0].r.toFixed(3)})`);
    console.log(`  Least aligned pair: J${correlations[correlations.length - 1].judge1}↔J${correlations[correlations.length - 1].judge2} (r=${correlations[correlations.length - 1].r.toFixed(3)})`);

    // Average correlation per judge (how conformist?)
    console.log('\n  Average correlation with other judges:');
    for (let j = 1; j <= 6; j++) {
      const pairRs = correlations.filter(c => c.judge1 === j || c.judge2 === j).map(c => c.r);
      const avgR = stats.mean(pairRs);
      const label = avgR === Math.max(...[1, 2, 3, 4, 5, 6].map(k => {
        const pairs = correlations.filter(c => c.judge1 === k || c.judge2 === k).map(c => c.r);
        return stats.mean(pairs);
      })) ? ' (most conformist)' : avgR === Math.min(...[1, 2, 3, 4, 5, 6].map(k => {
        const pairs = correlations.filter(c => c.judge1 === k || c.judge2 === k).map(c => c.r);
        return stats.mean(pairs);
      })) ? ' (most independent)' : '';
      console.log(`    J${j} (${this.judges[j]?.name || ''}): ${avgR.toFixed(3)}${label}`);
    }

    this.results.q7_correlations = correlations;
    return correlations;
  }

  // ═══════════════════════════════════════════════════════════════
  // TIER 2 ANALYSES
  // ═══════════════════════════════════════════════════════════════

  analyzeQ1Q2_ReliefBias() {
    console.log('\n' + '═'.repeat(80));
    console.log('Q1/Q2: IMMEDIATE CRASH-STREAK RELIEF BIAS');
    console.log('═'.repeat(80));
    console.log('(Do clean runs score higher when immediately preceded by a crash streak?)\n');

    // Build sequences for all 3 rounds
    const allCleanWithContext = [];

    for (let round = 1; round <= 3; round++) {
      const sequence = this.buildRoundSequence(round);
      sequence.forEach(run => {
        if (run.status === 'clean') {
          allCleanWithContext.push({
            competitor: run.competitor,
            position: parseInt(run.position),
            round,
            score: parseFloat(run.final_score),
            consecCrashes: run.consecCrashesBefore,
          });
        }
      });
    }

    // Group by crash streak
    const byStreak = {};
    allCleanWithContext.forEach(r => {
      if (!byStreak[r.consecCrashes]) byStreak[r.consecCrashes] = [];
      byStreak[r.consecCrashes].push(r);
    });

    console.log('  Clean runs by consecutive crash streak immediately before:\n');
    console.log('  Streak | n | Avg Score | Avg Position | Runs');
    console.log('  ' + '-'.repeat(75));
    Object.keys(byStreak).sort((a, b) => a - b).forEach(streak => {
      const runs = byStreak[streak];
      const avgScore = stats.mean(runs.map(r => r.score));
      const avgPos = stats.mean(runs.map(r => r.position));
      const names = runs.map(r => `${r.competitor} ${r.score}`).join(', ');
      console.log(`  ${streak.toString().padEnd(7)}| ${runs.length} | ${avgScore.toFixed(2).padEnd(10)}| ${avgPos.toFixed(1).padEnd(13)}| ${names}`);
    });

    // Binary comparison
    const after0 = allCleanWithContext.filter(r => r.consecCrashes === 0);
    const after1plus = allCleanWithContext.filter(r => r.consecCrashes >= 1);

    if (after0.length > 0 && after1plus.length > 0) {
      const avg0 = stats.mean(after0.map(r => r.score));
      const avg1 = stats.mean(after1plus.map(r => r.score));
      const diff = avg1 - avg0;
      console.log(`\n  Binary split:`);
      console.log(`    After 0 crashes:  ${avg0.toFixed(2)} (n=${after0.length}, avg pos ${stats.mean(after0.map(r => r.position)).toFixed(1)})`);
      console.log(`    After 1+ crashes: ${avg1.toFixed(2)} (n=${after1plus.length}, avg pos ${stats.mean(after1plus.map(r => r.position)).toFixed(1)})`);
      console.log(`    Difference: ${diff > 0 ? '+' : ''}${diff.toFixed(2)} pts`);
      console.log(`    Position balance: ${Math.abs(stats.mean(after0.map(r => r.position)) - stats.mean(after1plus.map(r => r.position))).toFixed(1)} position gap`);
    }

    // Within-rider comparisons
    const riderRuns = {};
    allCleanWithContext.forEach(r => {
      if (!riderRuns[r.competitor]) riderRuns[r.competitor] = [];
      riderRuns[r.competitor].push(r);
    });

    const withinRider = Object.entries(riderRuns)
      .filter(([_, runs]) => runs.length >= 2)
      .filter(([_, runs]) => {
        const streaks = new Set(runs.map(r => r.consecCrashes));
        return streaks.size > 1; // must have varying crash context
      });

    if (withinRider.length > 0) {
      console.log('\n  Within-rider comparisons (same rider, different crash contexts):');
      withinRider.forEach(([name, runs]) => {
        const parts = runs.map(r => `R${r.round}: ${r.consecCrashes} crashes→${r.score}`).join('  |  ');
        console.log(`    ${name} (pos ${runs[0].position}): ${parts}`);
      });
    }

    this.results.q1q2_relief_bias = {
      byStreak: Object.fromEntries(Object.entries(byStreak).map(([k, v]) => [k, {
        n: v.length,
        avgScore: Math.round(stats.mean(v.map(r => r.score)) * 100) / 100,
        avgPosition: Math.round(stats.mean(v.map(r => r.position)) * 10) / 10,
      }])),
      binaryDiff: after1plus.length > 0 && after0.length > 0 ?
        Math.round((stats.mean(after1plus.map(r => r.score)) - stats.mean(after0.map(r => r.score))) * 100) / 100 : null,
      withinRider: withinRider.map(([name, runs]) => ({
        competitor: name,
        runs: runs.map(r => ({ round: r.round, consecCrashes: r.consecCrashes, score: r.score })),
      })),
    };
  }

  analyzeQ8_NationalityBias() {
    console.log('\n' + '═'.repeat(80));
    console.log('Q8: NATIONALITY BIAS');
    console.log('═'.repeat(80));
    console.log('(Does Judge 6 (JPN) favor Japanese athletes?)\n');

    const scoredRuns = this.getScoredRuns();
    const j6OwnCountry = [];
    const j6OtherCountry = [];

    scoredRuns.forEach(run => {
      const scores = this.getJudgeScores(run);
      if (scores.length < 6) return;
      const panelMean = stats.mean(scores.map(s => s.score));
      const j6 = scores.find(s => s.judgeNum === 6);
      if (!j6) return;

      const dev = j6.score - panelMean;
      const isOwnCountry = run.country === 'JPN';

      const entry = {
        competitor: run.competitor,
        run: parseInt(run.run),
        j6Score: j6.score,
        panelMean: Math.round(panelMean * 100) / 100,
        deviation: Math.round(dev * 100) / 100,
        score: parseFloat(run.final_score),
      };

      if (isOwnCountry) j6OwnCountry.push(entry);
      else j6OtherCountry.push(entry);
    });

    const ownAvgDev = stats.mean(j6OwnCountry.map(e => e.deviation));
    const otherAvgDev = stats.mean(j6OtherCountry.map(e => e.deviation));
    const bias = ownAvgDev - otherAvgDev;

    console.log(`  Judge 6 (HASHIMOTO Ryo, JPN):`);
    console.log(`    Scoring JPN athletes: avg dev ${ownAvgDev > 0 ? '+' : ''}${ownAvgDev.toFixed(2)} (n=${j6OwnCountry.length})`);
    console.log(`    Scoring others:       avg dev ${otherAvgDev > 0 ? '+' : ''}${otherAvgDev.toFixed(2)} (n=${j6OtherCountry.length})`);
    console.log(`    Home bias: ${bias > 0 ? '+' : ''}${bias.toFixed(2)} pts`);

    console.log('\n  Individual JPN cases:');
    j6OwnCountry.forEach(e => {
      console.log(`    ${e.competitor} R${e.run}: J6=${e.j6Score}, panel=${e.panelMean}, dev=${e.deviation > 0 ? '+' : ''}${e.deviation}`);
    });

    // Check all other judges for comparison
    console.log('\n  All judges\' avg deviation when scoring JPN vs non-JPN:');
    for (let j = 1; j <= 6; j++) {
      const ownDevs = [];
      const otherDevs = [];
      scoredRuns.forEach(run => {
        const scores = this.getJudgeScores(run);
        if (scores.length < 6) return;
        const panelMean = stats.mean(scores.map(s => s.score));
        const js = scores.find(s => s.judgeNum === j);
        if (!js) return;
        const dev = js.score - panelMean;
        if (run.country === 'JPN') ownDevs.push(dev);
        else otherDevs.push(dev);
      });
      if (ownDevs.length === 0 || otherDevs.length === 0) continue;
      const diff = stats.mean(ownDevs) - stats.mean(otherDevs);
      const flag = j === 6 ? ' ← HOME JUDGE' : '';
      console.log(`    J${j}: JPN ${stats.mean(ownDevs) > 0 ? '+' : ''}${stats.mean(ownDevs).toFixed(2)} vs other ${stats.mean(otherDevs) > 0 ? '+' : ''}${stats.mean(otherDevs).toFixed(2)} (diff: ${diff > 0 ? '+' : ''}${diff.toFixed(2)})${flag}`);
    }

    this.results.q8_nationality = { j6OwnCountry, j6OtherCountry, bias: Math.round(bias * 100) / 100 };
  }

  analyzeQ9_DifficultyVsScore() {
    console.log('\n' + '═'.repeat(80));
    console.log('Q9: DIFFICULTY vs SCORE');
    console.log('═'.repeat(80));
    console.log('(Does trick difficulty predict scores among clean runs?)\n');

    // Load difficulty data
    const diffPath = path.join(__dirname, '../data/processed/enriched-judge-scores.csv');
    if (!fs.existsSync(diffPath)) {
      console.log('  ⚠ enriched-judge-scores.csv not found, skipping Q9');
      return;
    }
    const content = fs.readFileSync(diffPath, 'utf8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    const enriched = lines.slice(1).map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((h, i) => { row[h.trim()] = values[i]?.trim(); });
      return row;
    });

    const cleanWithDifficulty = enriched
      .filter(r => r.final_score && r.final_score !== 'DNI' && parseFloat(r.final_score) >= 50)
      .filter(r => r.total_difficulty && parseFloat(r.total_difficulty) > 0)
      .map(r => ({
        competitor: r.competitor,
        score: parseFloat(r.final_score),
        totalDifficulty: parseFloat(r.total_difficulty),
        avgDifficulty: parseFloat(r.avg_difficulty),
      }));

    if (cleanWithDifficulty.length < 3) {
      console.log('  Not enough data for correlation');
      return;
    }

    const r = stats.sampleCorrelation(
      cleanWithDifficulty.map(d => d.totalDifficulty),
      cleanWithDifficulty.map(d => d.score)
    );

    console.log(`  Clean runs with difficulty data: n=${cleanWithDifficulty.length}`);
    console.log(`  Correlation (total difficulty → score): r = ${r.toFixed(3)}`);
    console.log(`  Interpretation: ${Math.abs(r) < 0.3 ? 'Weak' : Math.abs(r) < 0.6 ? 'Moderate' : 'Strong'} — execution matters more than difficulty\n`);

    // Show the data
    cleanWithDifficulty.sort((a, b) => b.score - a.score);
    console.log('  Score vs Total Difficulty (clean runs):');
    cleanWithDifficulty.forEach(d => {
      const bar = '█'.repeat(Math.round(d.totalDifficulty / 2));
      console.log(`    ${d.competitor.padEnd(22)} ${d.score.toString().padEnd(6)} difficulty: ${d.totalDifficulty.toString().padEnd(5)} ${bar}`);
    });

    this.results.q9_difficulty = {
      correlation: Math.round(r * 1000) / 1000,
      n: cleanWithDifficulty.length,
      data: cleanWithDifficulty,
    };
  }

  analyzeQ10_RoundDrift() {
    console.log('\n' + '═'.repeat(80));
    console.log('Q10: ROUND-BY-ROUND JUDGE DRIFT');
    console.log('═'.repeat(80));
    console.log('(Do judges get stricter or more generous across rounds?)\n');

    const cleanRuns = this.getCleanRuns();
    const driftData = {};

    for (let j = 1; j <= 6; j++) {
      driftData[j] = { 1: [], 2: [], 3: [] };
    }

    cleanRuns.forEach(run => {
      const scores = this.getJudgeScores(run);
      if (scores.length < 6) return;
      const panelMean = stats.mean(scores.map(s => s.score));
      const round = parseInt(run.run);
      scores.forEach(s => {
        driftData[s.judgeNum][round].push(s.score - panelMean);
      });
    });

    console.log('  Per-judge avg deviation by round (clean runs only):\n');
    console.log('  Judge                        | R1 dev  | R2 dev  | R3 dev  | Drift R1→R3');
    console.log('  ' + '-'.repeat(75));

    for (let j = 1; j <= 6; j++) {
      const r1 = driftData[j][1].length > 0 ? stats.mean(driftData[j][1]) : null;
      const r2 = driftData[j][2].length > 0 ? stats.mean(driftData[j][2]) : null;
      const r3 = driftData[j][3].length > 0 ? stats.mean(driftData[j][3]) : null;

      const drift = r1 !== null && r3 !== null ? r3 - r1 : null;
      const driftLabel = drift !== null ? (drift > 0.3 ? '↑ more generous' : drift < -0.3 ? '↓ stricter' : '→ stable') : 'N/A';

      const name = `J${j} (${this.judges[j]?.name || ''})`;
      const r1s = r1 !== null ? `${r1 > 0 ? '+' : ''}${r1.toFixed(2)}` : 'N/A';
      const r2s = r2 !== null ? `${r2 > 0 ? '+' : ''}${r2.toFixed(2)}` : 'N/A';
      const r3s = r3 !== null ? `${r3 > 0 ? '+' : ''}${r3.toFixed(2)}` : 'N/A';
      const ds = drift !== null ? `${drift > 0 ? '+' : ''}${drift.toFixed(2)} ${driftLabel}` : 'N/A';

      console.log(`  ${name.padEnd(30)}| ${r1s.padEnd(8)}| ${r2s.padEnd(8)}| ${r3s.padEnd(8)}| ${ds}`);
    }

    this.results.q10_round_drift = driftData;
  }

  run() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║   COMPREHENSIVE JUDGING ANALYSIS                              ║');
    console.log('║   Milano-Cortina 2026 Men\'s Halfpipe Final                    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(`\nDataset: ${this.rawScores.length} performances, ${this.getScoredRuns().length} scored (${this.getCleanRuns().length} clean + ${this.getWipeoutRuns().length} wipeouts)`);

    // Tier 1
    this.analyzeQ3_JudgeSeverity();
    this.analyzeQ4_TrimmedMean();
    this.analyzeQ5_WipeoutMechanics();
    this.analyzeQ6_ConsensusPatterns();
    this.analyzeQ7_JudgeCorrelations();

    // Tier 2
    this.analyzeQ1Q2_ReliefBias();
    this.analyzeQ8_NationalityBias();
    this.analyzeQ9_DifficultyVsScore();
    this.analyzeQ10_RoundDrift();

    // Save results
    const outPath = path.join(__dirname, '../results/judge_bias_analysis.json');
    fs.writeFileSync(outPath, JSON.stringify(this.results, null, 2));
    console.log(`\n✓ Results saved to results/judge_bias_analysis.json`);
  }
}

const analyzer = new JudgingAnalyzer();
analyzer.run();