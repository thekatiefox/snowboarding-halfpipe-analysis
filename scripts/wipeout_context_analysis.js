/**
 * Phase 1-2 Analysis: Wipeout Context & Recovery Score Analysis
 * 
 * Questions:
 * 1. What's the wipeout context (preceding failures) before each clean run?
 * 2. Do performers score higher (recovery bonus) after wipeouts?
 * 3. Is there a cumulative effect (more wipeouts before = higher score)?
 */

const fs = require('fs');
const path = require('path');
const stats = require('simple-statistics');

class WipeoutContextAnalyzer {
  constructor() {
    this.competitors = [];
    this.rounds = { round1: [], round2: [], round3: [] };
  }

  loadDataFromCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = {};
      headers.forEach((header, idx) => {
        row[header.trim()] = values[idx]?.trim();
      });
      this.competitors.push(row);
    }

    this.competitors.sort((a, b) => 
      parseInt(a.performance_order) - parseInt(b.performance_order)
    );
  }

  isWipeout(score) {
    return score < 50;
  }

  organizeByRound() {
    this.competitors.forEach(comp => {
      const run1 = parseFloat(comp.run1);
      const run2 = parseFloat(comp.run2);
      const run3 = parseFloat(comp.run3);

      const order = parseInt(comp.performance_order);
      const isTopQualifier = comp.final_rank === '1' || comp.final_rank === '2';

      if (!isNaN(run1)) {
        this.rounds.round1.push({
          order,
          competitor: comp.competitor,
          score: run1,
          isTopQualifier,
          qualRank: 13 - order,
        });
      }
      if (!isNaN(run2)) {
        this.rounds.round2.push({
          order,
          competitor: comp.competitor,
          score: run2,
          isTopQualifier,
          qualRank: 13 - order,
        });
      }
      if (!isNaN(run3)) {
        this.rounds.round3.push({
          order,
          competitor: comp.competitor,
          score: run3,
          isTopQualifier,
          qualRank: 13 - order,
        });
      }
    });
  }

  /**
   * For each clean run, analyze the wipeout context before it
   */
  analyzeWipeoutContext(roundData, roundName) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`${roundName.toUpperCase()}: WIPEOUT CONTEXT ANALYSIS`);
    console.log(`${'='.repeat(80)}\n`);

    const cleanRuns = roundData.filter(r => !this.isWipeout(r.score));
    const analysis = {
      roundName,
      totalPerformances: roundData.length,
      cleanRuns: cleanRuns.length,
      wipeouts: roundData.length - cleanRuns.length,
      performances: [],
    };

    // For each clean run, analyze context
    for (let i = 0; i < roundData.length; i++) {
      const current = roundData[i];
      
      if (this.isWipeout(current.score)) continue; // Skip wipeouts

      // Look back at preceding performances
      const precedingPerformances = roundData.slice(0, i);
      const wipeoutsBefore = precedingPerformances.filter(p => this.isWipeout(p.score));
      const cleanRunsBefore = precedingPerformances.filter(p => !this.isWipeout(p.score));

      const context = {
        position: current.order,
        competitor: current.competitor,
        score: current.score,
        qualRank: current.qualRank,
        isTopQualifier: current.isTopQualifier,
        
        // Wipeout context
        wipeoutsInRound: wipeoutsBefore.length,
        cleanRunsInRound: cleanRunsBefore.length,
        recentWipeouts: {
          last1: precedingPerformances.length > 0 ? this.isWipeout(precedingPerformances[precedingPerformances.length - 1].score) : null,
          last3: this.countRecentWipeouts(precedingPerformances, 3),
          last5: this.countRecentWipeouts(precedingPerformances, 5),
        },
        
        // Average performance before
        avgScoreBefore: cleanRunsBefore.length > 0 ? stats.mean(cleanRunsBefore.map(r => r.score)) : null,
      };

      analysis.performances.push(context);
    }

    return analysis;
  }

  countRecentWipeouts(precedingPerformances, count) {
    const recent = precedingPerformances.slice(-count);
    return recent.filter(p => this.isWipeout(p.score)).length;
  }

  /**
   * Compare recovery scores (after wipeouts) to baseline
   */
  analyzeRecoveryScores(allRoundAnalyses) {
    console.log(`\n${'='.repeat(80)}`);
    console.log('PHASE 2: RECOVERY SCORE ANALYSIS');
    console.log(`${'='.repeat(80)}\n`);

    const allCleanRuns = [];
    const recoveryRuns = [];
    const afterMultipleWipeouts = { 2: [], 3: [], 5: [] };

    // Collect all clean runs
    allRoundAnalyses.forEach(roundAnalysis => {
      roundAnalysis.performances.forEach(perf => {
        allCleanRuns.push(perf.score);

        // Check if this is a recovery run
        if (perf.wipeoutsInRound > 0) {
          recoveryRuns.push({
            score: perf.score,
            competitor: perf.competitor,
            wipeoutsBefore: perf.wipeoutsInRound,
            after: `${perf.wipeoutsInRound} wipeout(s)`,
          });
        }

        // Track by wipeout count
        if (perf.recentWipeouts.last3 >= 2) {
          afterMultipleWipeouts[2].push(perf.score);
        }
        if (perf.recentWipeouts.last5 >= 3) {
          afterMultipleWipeouts[3].push(perf.score);
        }
        if (perf.recentWipeouts.last5 >= 5) {
          afterMultipleWipeouts[5].push(perf.score);
        }
      });
    });

    const baselineMean = stats.mean(allCleanRuns);
    const baselineStdDev = stats.standardDeviation(allCleanRuns);

    console.log(`BASELINE STATISTICS (all clean runs):`);
    console.log(`  Count: ${allCleanRuns.length}`);
    console.log(`  Mean: ${baselineMean.toFixed(2)}`);
    console.log(`  Std Dev: ${baselineStdDev.toFixed(2)}`);
    console.log(`  Range: ${Math.min(...allCleanRuns).toFixed(2)} - ${Math.max(...allCleanRuns).toFixed(2)}\n`);

    // Recovery runs analysis
    console.log(`RECOVERY RUNS (after ≥1 wipeout in round):`);
    console.log(`  Count: ${recoveryRuns.length}`);
    let recoveryMean = 0, recoveryStdDev = 0;
    if (recoveryRuns.length > 0) {
      const recoveryScores = recoveryRuns.map(r => r.score);
      recoveryMean = stats.mean(recoveryScores);
      recoveryStdDev = stats.standardDeviation(recoveryScores);
      
      console.log(`  Mean: ${recoveryMean.toFixed(2)}`);
      console.log(`  Std Dev: ${recoveryStdDev.toFixed(2)}`);
      console.log(`  Difference from baseline: ${(recoveryMean - baselineMean).toFixed(2)} points`);
      console.log(`  Direction: ${recoveryMean > baselineMean ? '⬆️ HIGHER' : '⬇️ LOWER'}\n`);

      console.log(`  Recovery run details:`);
      recoveryRuns.forEach(run => {
        const diff = run.score - baselineMean;
        console.log(`    ${run.competitor}: ${run.score.toFixed(2)} (${run.after}) [${diff > 0 ? '+' : ''}${diff.toFixed(2)}]`);
      });
    }

    // Cumulative wipeout effect
    console.log(`\n\nCUMULATIVE WIPEOUT EFFECT (scores after N recent wipeouts):`);
    
    if (afterMultipleWipeouts[2].length > 0) {
      const mean2 = stats.mean(afterMultipleWipeouts[2]);
      console.log(`  After 2+ recent wipeouts: ${mean2.toFixed(2)} (n=${afterMultipleWipeouts[2].length}) [${(mean2 - baselineMean).toFixed(2)}]`);
    }
    
    if (afterMultipleWipeouts[3].length > 0) {
      const mean3 = stats.mean(afterMultipleWipeouts[3]);
      console.log(`  After 3+ recent wipeouts: ${mean3.toFixed(2)} (n=${afterMultipleWipeouts[3].length}) [${(mean3 - baselineMean).toFixed(2)}]`);
    }
    
    if (afterMultipleWipeouts[5].length > 0) {
      const mean5 = stats.mean(afterMultipleWipeouts[5]);
      console.log(`  After 5 recent wipeouts: ${mean5.toFixed(2)} (n=${afterMultipleWipeouts[5].length}) [${(mean5 - baselineMean).toFixed(2)}]`);
    }

    return {
      baseline: { mean: baselineMean, stdDev: baselineStdDev, count: allCleanRuns.length },
      recovery: { mean: recoveryMean, stdDev: recoveryStdDev, count: recoveryRuns.length, runs: recoveryRuns },
      cumulativeEffects: afterMultipleWipeouts,
    };
  }

  /**
   * Analyze performer-specific trajectories
   */
  analyzeIndividualTrajectories() {
    console.log(`\n${'='.repeat(80)}`);
    console.log('PHASE 3: INDIVIDUAL COMPETITOR TRAJECTORIES');
    console.log(`${'='.repeat(80)}\n`);

    const trajectories = {};

    this.competitors.forEach(comp => {
      const run1 = parseFloat(comp.run1);
      const run2 = parseFloat(comp.run2);
      const run3 = parseFloat(comp.run3);

      const runs = [
        { round: 1, score: run1 },
        { round: 2, score: run2 },
        { round: 3, score: run3 },
      ].filter(r => !isNaN(r.score));

      if (runs.length > 1) {
        const pattern = runs.map(r => this.isWipeout(r.score) ? 'W' : (r.score >= 80 ? 'H' : 'L')).join('-');
        const scores = runs.map(r => r.score.toFixed(1)).join(' → ');

        trajectories[comp.competitor] = {
          pattern,
          scores,
          runs,
          isRecoveryPattern: pattern.includes('W') && pattern.includes('H'),
          isTopQualifier: comp.final_rank === '1' || comp.final_rank === '2',
        };
      }
    });

    // Group by pattern
    const byPattern = {};
    Object.entries(trajectories).forEach(([competitor, data]) => {
      if (!byPattern[data.pattern]) byPattern[data.pattern] = [];
      byPattern[data.pattern].push({ competitor, data });
    });

    // Sort patterns
    const sortedPatterns = Object.keys(byPattern).sort();
    
    console.log('Recovery Patterns (W before H):\n');
    sortedPatterns.forEach(pattern => {
      if (pattern.includes('W') && pattern.includes('H')) {
        const competitors = byPattern[pattern];
        console.log(`${pattern} (${competitors.length} competitors):`);
        competitors.forEach(({ competitor, data }) => {
          const qualifier = data.isTopQualifier ? '⭐ Top qual' : '';
          console.log(`  ${competitor}: ${data.scores} ${qualifier}`);
        });
        console.log();
      }
    });

    console.log('\nOther Patterns:\n');
    sortedPatterns.forEach(pattern => {
      if (!pattern.includes('W') || !pattern.includes('H')) {
        const competitors = byPattern[pattern];
        console.log(`${pattern} (${competitors.length} competitors):`);
        competitors.forEach(({ competitor, data }) => {
          console.log(`  ${competitor}: ${data.scores}`);
        });
        console.log();
      }
    });

    return trajectories;
  }

  run() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║   WIPEOUT CONTEXT & RECOVERY SCORE ANALYSIS                   ║');
    console.log('║   Milano-Cortina 2026 Halfpipe                                ║');
    console.log('║   Testing: Do judges give "relief bonuses" after wipeouts?    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    try {
      const dataPath = path.join(__dirname, '../data/raw/milano-cortina-2026-mens-halfpipe.csv');
      this.loadDataFromCSV(dataPath);
      this.organizeByRound();

      console.log(`Loaded ${this.competitors.length} competitors\n`);

      // Phase 1: Wipeout context
      const r1Analysis = this.analyzeWipeoutContext(this.rounds.round1, 'round1');
      const r2Analysis = this.analyzeWipeoutContext(this.rounds.round2, 'round2');
      const r3Analysis = this.analyzeWipeoutContext(this.rounds.round3, 'round3');

      // Phase 2: Recovery scores
      const recoveryAnalysis = this.analyzeRecoveryScores([r1Analysis, r2Analysis, r3Analysis]);

      // Phase 3: Individual trajectories
      const trajectories = this.analyzeIndividualTrajectories();

      // Save full analysis
      const analysis = {
        timestamp: new Date().toISOString(),
        hypothesis: 'Do judges give higher scores (relief/contrast effect) after witnessing wipeouts?',
        rounds: { r1: r1Analysis, r2: r2Analysis, r3: r3Analysis },
        recoveryAnalysis,
        trajectories,
      };

      const resultsDir = path.join(__dirname, '../results');
      fs.writeFileSync(
        path.join(resultsDir, 'wipeout_context_analysis.json'),
        JSON.stringify(analysis, null, 2)
      );

      console.log('\n✓ Full analysis saved to results/wipeout_context_analysis.json\n');

    } catch (error) {
      console.error('Analysis error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

const analyzer = new WipeoutContextAnalyzer();
analyzer.run();
