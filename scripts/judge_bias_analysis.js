/**
 * Comprehensive Judge Bias Analysis
 * 
 * Uses the master enriched dataset (with DNI crashes counted as wipeouts)
 * to analyze multiple dimensions of judging bias:
 * 
 * 1. Updated relief bias (19 witnessed crashes instead of 9)
 * 2. Per-judge relief bias (which judges are most susceptible?)
 * 3. Judge consensus after crashes (do judges disagree more?)
 * 4. Nationality bias (home-country scoring)
 * 5. Round-by-round judge drift (fatigue/calibration shift)
 * 6. Difficulty-controlled relief bias
 */

const fs = require('fs');
const path = require('path');
const stats = require('simple-statistics');

class JudgeBiasAnalyzer {
  constructor() {
    this.masterData = this.loadMasterCSV();
    this.judgeScores = this.loadJudgeAnalysis();
    this.judges = this.loadJudgesMetadata();
  }

  loadMasterCSV() {
    const csvPath = path.join(__dirname, '../data/processed/master_enriched_dataset.csv');
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

  loadJudgeAnalysis() {
    const csvPath = path.join(__dirname, '../data/processed/judge_analysis_data.csv');
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
      judges[v[0]] = { name: v[1], country: v[2] };
    });
    return judges;
  }

  /**
   * Determine if a run is a "witnessed crash" (wipeout or DNI-crash)
   */
  isWitnessedCrash(row) {
    return row.run_status === 'wipeout' || row.run_status === 'crash';
  }

  isCleanRun(row) {
    return row.run_status === 'clean';
  }

  /**
   * Get all runs in a round, ordered by position
   */
  getRunsInRound(roundNum) {
    return this.masterData
      .filter(r => r.run === roundNum.toString())
      .sort((a, b) => parseInt(a.position) - parseInt(b.position));
  }

  /**
   * For a given clean run, count witnessed crashes before it in the same round
   */
  getCrashContextForRun(run) {
    const roundRuns = this.getRunsInRound(parseInt(run.run));
    const pos = parseInt(run.position);
    const preceding = roundRuns.filter(r => parseInt(r.position) < pos);
    return {
      crashesBefore: preceding.filter(r => this.isWitnessedCrash(r)).length,
      cleanBefore: preceding.filter(r => this.isCleanRun(r)).length,
      totalBefore: preceding.length,
      immediatelyAfterCrash: preceding.length > 0 && this.isWitnessedCrash(preceding[preceding.length - 1]),
    };
  }

  /**
   * Get individual judge scores for a run
   */
  getJudgeScoresForRun(run) {
    const scores = [];
    for (let j = 1; j <= 6; j++) {
      const score = parseFloat(run[`judge${j}_score`]);
      if (!isNaN(score)) {
        scores.push({
          judgeNum: j,
          judgeName: this.judges[j]?.name || `Judge ${j}`,
          judgeCountry: this.judges[j]?.country || '',
          score,
        });
      }
    }
    return scores;
  }

  /**
   * Analysis 1: Updated Relief Bias with DNI Crashes
   */
  analyzeReliefBias() {
    console.log('\n' + '═'.repeat(80));
    console.log('ANALYSIS 1: UPDATED RELIEF BIAS (DNI crashes now counted)');
    console.log('═'.repeat(80));

    const cleanRuns = this.masterData.filter(r => this.isCleanRun(r));
    const allScores = cleanRuns.map(r => parseFloat(r.final_score));
    const baseline = stats.mean(allScores);

    const afterCrash = [];
    const noCrashContext = [];

    cleanRuns.forEach(run => {
      const ctx = this.getCrashContextForRun(run);
      const score = parseFloat(run.final_score);

      if (ctx.crashesBefore > 0) {
        afterCrash.push({ ...run, score, ...ctx });
      } else {
        noCrashContext.push({ ...run, score, ...ctx });
      }
    });

    const afterCrashScores = afterCrash.map(r => r.score);
    const noContextScores = noCrashContext.map(r => r.score);

    console.log(`\nTotal witnessed crashes (wipeout + DNI crash): ${this.masterData.filter(r => this.isWitnessedCrash(r)).length}`);
    console.log(`Clean runs: ${cleanRuns.length}`);
    console.log(`  After ≥1 crash: ${afterCrash.length} (avg ${afterCrashScores.length > 0 ? stats.mean(afterCrashScores).toFixed(2) : 'N/A'})`);
    console.log(`  No crash before: ${noCrashContext.length} (avg ${noContextScores.length > 0 ? stats.mean(noContextScores).toFixed(2) : 'N/A'})`);

    if (afterCrashScores.length > 0 && noContextScores.length > 0) {
      const diff = stats.mean(afterCrashScores) - stats.mean(noContextScores);
      console.log(`\n  Relief effect: ${diff > 0 ? '+' : ''}${diff.toFixed(2)} points`);
      console.log(`  Direction: ${diff > 0 ? '⬆️ Scores HIGHER after crashes' : '⬇️ Scores LOWER after crashes'}`);
    }

    // Cumulative effect
    console.log('\n  Cumulative crash context:');
    const byCrashCount = {};
    afterCrash.forEach(r => {
      const key = r.crashesBefore;
      if (!byCrashCount[key]) byCrashCount[key] = [];
      byCrashCount[key].push(r.score);
    });

    Object.keys(byCrashCount).sort((a, b) => a - b).forEach(count => {
      const scores = byCrashCount[count];
      console.log(`    After ${count} crash(es): avg ${stats.mean(scores).toFixed(2)} (n=${scores.length})`);
    });

    // Immediately after crash vs not
    const immediatelyAfter = cleanRuns.filter(r => {
      const ctx = this.getCrashContextForRun(r);
      return ctx.immediatelyAfterCrash;
    }).map(r => parseFloat(r.final_score));

    const notImmediatelyAfter = cleanRuns.filter(r => {
      const ctx = this.getCrashContextForRun(r);
      return !ctx.immediatelyAfterCrash && ctx.crashesBefore > 0;
    }).map(r => parseFloat(r.final_score));

    if (immediatelyAfter.length > 0) {
      console.log(`\n  Immediately after a crash: avg ${stats.mean(immediatelyAfter).toFixed(2)} (n=${immediatelyAfter.length})`);
    }
    if (notImmediatelyAfter.length > 0) {
      console.log(`  Crashes before but not immediately: avg ${stats.mean(notImmediatelyAfter).toFixed(2)} (n=${notImmediatelyAfter.length})`);
    }

    return {
      baseline,
      afterCrash: { count: afterCrash.length, mean: afterCrashScores.length > 0 ? stats.mean(afterCrashScores) : null },
      noCrashContext: { count: noCrashContext.length, mean: noContextScores.length > 0 ? stats.mean(noContextScores) : null },
      byCrashCount,
    };
  }

  /**
   * Analysis 2: Per-Judge Relief Bias
   */
  analyzePerJudgeReliefBias() {
    console.log('\n' + '═'.repeat(80));
    console.log('ANALYSIS 2: PER-JUDGE RELIEF BIAS');
    console.log('═'.repeat(80));
    console.log('(Do specific judges score higher after witnessing crashes?)\n');

    const cleanRuns = this.masterData.filter(r => this.isCleanRun(r));
    const judgeResults = {};

    for (let j = 1; j <= 6; j++) {
      const afterCrashScores = [];
      const noContextScores = [];

      cleanRuns.forEach(run => {
        const score = parseFloat(run[`judge${j}_score`]);
        if (isNaN(score)) return;

        const ctx = this.getCrashContextForRun(run);
        if (ctx.crashesBefore > 0) {
          afterCrashScores.push(score);
        } else {
          noContextScores.push(score);
        }
      });

      const afterMean = afterCrashScores.length > 0 ? stats.mean(afterCrashScores) : null;
      const noCtxMean = noContextScores.length > 0 ? stats.mean(noContextScores) : null;
      const relief = (afterMean !== null && noCtxMean !== null) ? afterMean - noCtxMean : null;

      judgeResults[j] = { afterMean, noCtxMean, relief, afterN: afterCrashScores.length, noCtxN: noContextScores.length };

      const judge = this.judges[j];
      const reliefStr = relief !== null ? `${relief > 0 ? '+' : ''}${relief.toFixed(2)}` : 'N/A';
      const indicator = relief !== null ? (relief > 1 ? '⚠️' : relief > 0 ? '↑' : '↓') : '';
      console.log(`  Judge ${j} (${judge.name}, ${judge.country}): relief = ${reliefStr} pts ${indicator}`);
      console.log(`    After crashes: ${afterMean?.toFixed(2) || 'N/A'} (n=${afterCrashScores.length}) | No context: ${noCtxMean?.toFixed(2) || 'N/A'} (n=${noContextScores.length})`);
    }

    // Find most susceptible judge
    const ranked = Object.entries(judgeResults)
      .filter(([_, v]) => v.relief !== null)
      .sort((a, b) => b[1].relief - a[1].relief);

    if (ranked.length > 0) {
      const [topJudge, topData] = ranked[0];
      console.log(`\n  Most susceptible to relief bias: Judge ${topJudge} (${this.judges[topJudge].name}) at +${topData.relief.toFixed(2)} pts`);
      const [bottomJudge, bottomData] = ranked[ranked.length - 1];
      console.log(`  Least susceptible: Judge ${bottomJudge} (${this.judges[bottomJudge].name}) at ${bottomData.relief.toFixed(2)} pts`);
    }

    return judgeResults;
  }

  /**
   * Analysis 3: Judge Consensus After Crashes
   */
  analyzeJudgeConsensus() {
    console.log('\n' + '═'.repeat(80));
    console.log('ANALYSIS 3: JUDGE CONSENSUS AFTER CRASHES');
    console.log('═'.repeat(80));
    console.log('(Do judges disagree more when scoring after crashes?)\n');

    const cleanRuns = this.masterData.filter(r => this.isCleanRun(r));

    const afterCrashSpreads = [];
    const noContextSpreads = [];

    cleanRuns.forEach(run => {
      const judgeScores = this.getJudgeScoresForRun(run);
      if (judgeScores.length < 4) return;

      const scores = judgeScores.map(j => j.score);
      const spread = Math.max(...scores) - Math.min(...scores);
      const stdDev = stats.standardDeviation(scores);

      const ctx = this.getCrashContextForRun(run);

      const entry = {
        competitor: run.competitor,
        run: run.run,
        spread,
        stdDev,
        scores,
        crashesBefore: ctx.crashesBefore,
      };

      if (ctx.crashesBefore > 0) {
        afterCrashSpreads.push(entry);
      } else {
        noContextSpreads.push(entry);
      }
    });

    const afterAvgSpread = afterCrashSpreads.length > 0 ? stats.mean(afterCrashSpreads.map(e => e.spread)) : null;
    const noCtxAvgSpread = noContextSpreads.length > 0 ? stats.mean(noContextSpreads.map(e => e.spread)) : null;
    const afterAvgStd = afterCrashSpreads.length > 0 ? stats.mean(afterCrashSpreads.map(e => e.stdDev)) : null;
    const noCtxAvgStd = noContextSpreads.length > 0 ? stats.mean(noContextSpreads.map(e => e.stdDev)) : null;

    console.log(`  After crashes: avg spread ${afterAvgSpread?.toFixed(2)} pts, avg σ ${afterAvgStd?.toFixed(2)} (n=${afterCrashSpreads.length})`);
    console.log(`  No crash context: avg spread ${noCtxAvgSpread?.toFixed(2)} pts, avg σ ${noCtxAvgStd?.toFixed(2)} (n=${noContextSpreads.length})`);

    if (afterAvgSpread !== null && noCtxAvgSpread !== null) {
      const diff = afterAvgSpread - noCtxAvgSpread;
      console.log(`\n  Spread difference: ${diff > 0 ? '+' : ''}${diff.toFixed(2)} pts`);
      console.log(`  ${diff > 0 ? '⚠️ Judges DISAGREE MORE after crashes' : '✓ Judges agree similarly regardless of context'}`);
    }

    return { afterCrashSpreads, noContextSpreads, afterAvgSpread, noCtxAvgSpread };
  }

  /**
   * Analysis 4: Nationality Bias
   */
  analyzeNationalityBias() {
    console.log('\n' + '═'.repeat(80));
    console.log('ANALYSIS 4: NATIONALITY BIAS');
    console.log('═'.repeat(80));
    console.log('(Do judges score own-country competitors differently?)\n');

    const cleanRuns = this.masterData.filter(r => this.isCleanRun(r));

    // Build per-judge nationality comparison
    for (let j = 1; j <= 6; j++) {
      const judge = this.judges[j];
      const sameNat = [];
      const diffNat = [];

      cleanRuns.forEach(run => {
        const score = parseFloat(run[`judge${j}_score`]);
        if (isNaN(score)) return;
        const allScores = this.getJudgeScoresForRun(run).map(js => js.score);
        const panelMean = stats.mean(allScores);
        const deviation = score - panelMean;

        if (judge.country === run.country) {
          sameNat.push({ competitor: run.competitor, score, deviation, panelMean });
        } else {
          diffNat.push({ score, deviation });
        }
      });

      if (sameNat.length > 0) {
        const sameAvgDev = stats.mean(sameNat.map(s => s.deviation));
        const diffAvgDev = diffNat.length > 0 ? stats.mean(diffNat.map(s => s.deviation)) : 0;
        const bias = sameAvgDev - diffAvgDev;

        console.log(`  Judge ${j} (${judge.name}, ${judge.country}):`);
        console.log(`    Own country: ${sameAvgDev > 0 ? '+' : ''}${sameAvgDev.toFixed(2)} avg deviation (n=${sameNat.length})`);
        console.log(`    Other countries: ${diffAvgDev > 0 ? '+' : ''}${diffAvgDev.toFixed(2)} avg deviation (n=${diffNat.length})`);
        console.log(`    Home bias: ${bias > 0 ? '⚠️ +' : ''}${bias.toFixed(2)} pts`);

        if (sameNat.length > 0) {
          console.log(`    Specific cases:`);
          sameNat.forEach(s => {
            console.log(`      ${s.competitor}: scored ${s.score} (panel avg ${s.panelMean.toFixed(1)}, dev ${s.deviation > 0 ? '+' : ''}${s.deviation.toFixed(1)})`);
          });
        }
        console.log();
      }
    }
  }

  /**
   * Analysis 5: Round-by-Round Judge Drift
   */
  analyzeRoundDrift() {
    console.log('\n' + '═'.repeat(80));
    console.log('ANALYSIS 5: ROUND-BY-ROUND JUDGE DRIFT');
    console.log('═'.repeat(80));
    console.log('(Do judges\' standards shift across rounds?)\n');

    const cleanRuns = this.masterData.filter(r => this.isCleanRun(r));

    for (let j = 1; j <= 6; j++) {
      const byRound = { 1: [], 2: [], 3: [] };

      cleanRuns.forEach(run => {
        const score = parseFloat(run[`judge${j}_score`]);
        if (isNaN(score)) return;
        const allScores = this.getJudgeScoresForRun(run).map(js => js.score);
        const panelMean = stats.mean(allScores);
        const deviation = score - panelMean;
        byRound[parseInt(run.run)]?.push(deviation);
      });

      const judge = this.judges[j];
      const r1Avg = byRound[1].length > 0 ? stats.mean(byRound[1]) : null;
      const r2Avg = byRound[2].length > 0 ? stats.mean(byRound[2]) : null;
      const r3Avg = byRound[3].length > 0 ? stats.mean(byRound[3]) : null;

      const r1Str = r1Avg !== null ? `${r1Avg > 0 ? '+' : ''}${r1Avg.toFixed(2)} (n=${byRound[1].length})` : 'N/A';
      const r2Str = r2Avg !== null ? `${r2Avg > 0 ? '+' : ''}${r2Avg.toFixed(2)} (n=${byRound[2].length})` : 'N/A';
      const r3Str = r3Avg !== null ? `${r3Avg > 0 ? '+' : ''}${r3Avg.toFixed(2)} (n=${byRound[3].length})` : 'N/A';

      console.log(`  Judge ${j} (${judge.name}): R1=${r1Str}  R2=${r2Str}  R3=${r3Str}`);

      // Check for drift
      const availableRounds = [r1Avg, r2Avg, r3Avg].filter(r => r !== null);
      if (availableRounds.length >= 2) {
        const drift = availableRounds[availableRounds.length - 1] - availableRounds[0];
        if (Math.abs(drift) > 0.5) {
          console.log(`    → Drift: ${drift > 0 ? 'Getting more generous' : 'Getting stricter'} (${drift > 0 ? '+' : ''}${drift.toFixed(2)} pts R1→R3)`);
        }
      }
    }

    // Overall round averages
    console.log('\n  Overall panel deviation by round:');
    for (let round = 1; round <= 3; round++) {
      const roundClean = cleanRuns.filter(r => r.run === round.toString());
      if (roundClean.length > 0) {
        const scores = roundClean.map(r => parseFloat(r.final_score));
        const avg = stats.mean(scores);
        console.log(`    R${round}: avg score ${avg.toFixed(2)} (n=${roundClean.length})`);
      }
    }
  }

  /**
   * Analysis 6: Difficulty-Controlled Relief Bias
   */
  analyzeDifficultyControlledRelief() {
    console.log('\n' + '═'.repeat(80));
    console.log('ANALYSIS 6: DIFFICULTY-CONTROLLED RELIEF BIAS');
    console.log('═'.repeat(80));
    console.log('(Does relief effect hold when controlling for trick difficulty?)\n');

    const cleanRuns = this.masterData.filter(r => this.isCleanRun(r));

    // Split into difficulty tiers
    const difficulties = cleanRuns.map(r => parseFloat(r.total_difficulty));
    const medianDiff = stats.median(difficulties);

    const highDiff = cleanRuns.filter(r => parseFloat(r.total_difficulty) >= medianDiff);
    const lowDiff = cleanRuns.filter(r => parseFloat(r.total_difficulty) < medianDiff);

    console.log(`  Median difficulty: ${medianDiff.toFixed(1)}`);
    console.log(`  High difficulty runs (≥${medianDiff.toFixed(1)}): ${highDiff.length}`);
    console.log(`  Low difficulty runs (<${medianDiff.toFixed(1)}): ${lowDiff.length}`);

    [
      { label: 'HIGH difficulty', runs: highDiff },
      { label: 'LOW difficulty', runs: lowDiff },
    ].forEach(({ label, runs }) => {
      const afterCrash = [];
      const noContext = [];

      runs.forEach(run => {
        const ctx = this.getCrashContextForRun(run);
        const score = parseFloat(run.final_score);
        if (ctx.crashesBefore > 0) afterCrash.push(score);
        else noContext.push(score);
      });

      console.log(`\n  ${label} runs:`);
      console.log(`    After crashes: avg ${afterCrash.length > 0 ? stats.mean(afterCrash).toFixed(2) : 'N/A'} (n=${afterCrash.length})`);
      console.log(`    No crash context: avg ${noContext.length > 0 ? stats.mean(noContext).toFixed(2) : 'N/A'} (n=${noContext.length})`);

      if (afterCrash.length > 0 && noContext.length > 0) {
        const relief = stats.mean(afterCrash) - stats.mean(noContext);
        console.log(`    Relief effect: ${relief > 0 ? '+' : ''}${relief.toFixed(2)} pts`);
      }
    });

    // Correlation: difficulty vs score, split by crash context
    const afterCrashRuns = cleanRuns.filter(r => this.getCrashContextForRun(r).crashesBefore > 0);
    const noContextRuns = cleanRuns.filter(r => this.getCrashContextForRun(r).crashesBefore === 0);

    if (afterCrashRuns.length >= 3) {
      const r = stats.sampleCorrelation(
        afterCrashRuns.map(r => parseFloat(r.total_difficulty)),
        afterCrashRuns.map(r => parseFloat(r.final_score))
      );
      console.log(`\n  Difficulty↔Score correlation (after crashes): r=${r.toFixed(3)}`);
    }
    if (noContextRuns.length >= 3) {
      const r = stats.sampleCorrelation(
        noContextRuns.map(r => parseFloat(r.total_difficulty)),
        noContextRuns.map(r => parseFloat(r.final_score))
      );
      console.log(`  Difficulty↔Score correlation (no context): r=${r.toFixed(3)}`);
    }
  }

  /**
   * Tier-controlled relief bias (updated with DNI crashes)
   */
  analyzeTierControlledRelief() {
    console.log('\n' + '═'.repeat(80));
    console.log('ANALYSIS 7: TIER-CONTROLLED RELIEF BIAS (Updated)');
    console.log('═'.repeat(80));
    console.log('(Phase 2 re-run with DNI crashes counted as wipeouts)\n');

    const cleanRuns = this.masterData.filter(r => this.isCleanRun(r));

    ['bottom', 'middle', 'top'].forEach(tier => {
      const tierRuns = cleanRuns.filter(r => r.tier === tier);
      const afterCrash = [];
      const noContext = [];

      tierRuns.forEach(run => {
        const ctx = this.getCrashContextForRun(run);
        const score = parseFloat(run.final_score);
        if (ctx.crashesBefore > 0) afterCrash.push(score);
        else noContext.push(score);
      });

      const afterMean = afterCrash.length > 0 ? stats.mean(afterCrash).toFixed(2) : 'N/A';
      const noCtxMean = noContext.length > 0 ? stats.mean(noContext).toFixed(2) : 'N/A';

      console.log(`  ${tier.toUpperCase()} tier (n=${tierRuns.length}):`);
      console.log(`    After crashes: ${afterMean} (n=${afterCrash.length})`);
      console.log(`    No crash context: ${noCtxMean} (n=${noContext.length})`);

      if (afterCrash.length > 0 && noContext.length > 0) {
        const relief = stats.mean(afterCrash) - stats.mean(noContext);
        console.log(`    Relief: ${relief > 0 ? '+' : ''}${relief.toFixed(2)} pts ${relief > 0 ? '⬆️' : '⬇️'}`);
      }
      console.log();
    });
  }

  run() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║   COMPREHENSIVE JUDGE BIAS ANALYSIS                           ║');
    console.log('║   Milano-Cortina 2026 Men\'s Halfpipe Final                    ║');
    console.log('║   Using enriched data with DNI crashes resolved               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    // Status summary
    const statusCounts = {};
    this.masterData.forEach(r => { statusCounts[r.run_status] = (statusCounts[r.run_status] || 0) + 1; });
    console.log('\nDataset: 36 performances');
    Object.entries(statusCounts).sort().forEach(([s, c]) => console.log(`  ${s}: ${c}`));

    const relief = this.analyzeReliefBias();
    const perJudge = this.analyzePerJudgeReliefBias();
    const consensus = this.analyzeJudgeConsensus();
    this.analyzeNationalityBias();
    this.analyzeRoundDrift();
    this.analyzeDifficultyControlledRelief();
    this.analyzeTierControlledRelief();

    // Save results
    const output = {
      timestamp: new Date().toISOString(),
      description: 'Comprehensive judge bias analysis using enriched master dataset',
      datasetSummary: statusCounts,
      reliefBias: relief,
      perJudgeRelief: perJudge,
      consensusAnalysis: {
        afterCrashAvgSpread: consensus.afterAvgSpread,
        noContextAvgSpread: consensus.noCtxAvgSpread,
      },
    };

    fs.writeFileSync(
      path.join(__dirname, '../results/judge_bias_analysis.json'),
      JSON.stringify(output, null, 2)
    );

    console.log('\n✓ Results saved to results/judge_bias_analysis.json\n');
  }
}

const analyzer = new JudgeBiasAnalyzer();
analyzer.run();
