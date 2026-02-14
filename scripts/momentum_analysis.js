/**
 * Momentum & Cross-Round Recency Analysis
 * 
 * Questions:
 * 1. Do competitors score higher after recovering from wipeouts? (momentum effect)
 * 2. Does first competitor in new round score differently based on last competitor in previous round?
 */

const fs = require('fs');
const path = require('path');
const stats = require('simple-statistics');

class MomentumAnalyzer {
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

    console.log(`Loaded ${this.competitors.length} competitors\n`);
  }

  isWipeout(score) {
    return score < 50;
  }

  isCleanRun(score) {
    return score >= 50;
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
          isWipeout: this.isWipeout(run1),
        });
      }
      if (!isNaN(run2)) {
        this.rounds.round2.push({
          order,
          competitor: comp.competitor,
          score: run2,
          isTopQualifier,
          isWipeout: this.isWipeout(run2),
        });
      }
      if (!isNaN(run3)) {
        this.rounds.round3.push({
          order,
          competitor: comp.competitor,
          score: run3,
          isTopQualifier,
          isWipeout: this.isWipeout(run3),
        });
      }
    });
  }

  /**
   * Analyze: Do competitors score higher after recovering from wipeouts?
   */
  analyzeRecoveryMomentum() {
    console.log('\n' + '='.repeat(70));
    console.log('MOMENTUM ANALYSIS: Recovery After Wipeouts');
    console.log('='.repeat(70) + '\n');

    const recoveryData = [];

    // For each competitor, check if they had wipeouts then clean runs
    this.competitors.forEach(comp => {
      const run1 = parseFloat(comp.run1);
      const run2 = parseFloat(comp.run2);
      const run3 = parseFloat(comp.run3);

      const runs = [
        { round: 1, score: run1, isWipeout: this.isWipeout(run1) },
        { round: 2, score: run2, isWipeout: this.isWipeout(run2) },
        { round: 3, score: run3, isWipeout: this.isWipeout(run3) },
      ].filter(r => !isNaN(r.score));

      // Check for wipeout -> success pattern
      for (let i = 1; i < runs.length; i++) {
        if (runs[i - 1].isWipeout && runs[i].isCleanRun) {
          // This competitor succeeded after a wipeout
          recoveryData.push({
            competitor: comp.competitor,
            wipeoutRound: runs[i - 1].round,
            wipeoutScore: runs[i - 1].score,
            recoveryRound: runs[i].round,
            recoveryScore: runs[i].score,
            improvement: runs[i].score - runs[i - 1].score,
          });
        }
      }
    });

    console.log(`Competitors who recovered after wipeout: ${recoveryData.length}\n`);

    if (recoveryData.length > 0) {
      recoveryData.forEach(rec => {
        console.log(`${rec.competitor}:`);
        console.log(`  R${rec.wipeoutRound}: ${rec.wipeoutScore.toFixed(2)} (wipeout)`);
        console.log(`  R${rec.recoveryRound}: ${rec.recoveryScore.toFixed(2)} (recovery) +${rec.improvement.toFixed(2)}`);
      });

      const recoveryScores = recoveryData.map(r => r.recoveryScore);
      const meanRecovery = stats.mean(recoveryScores);
      const meanAllCleanRuns = stats.mean(
        Object.values(this.rounds)
          .flat()
          .filter(r => this.isCleanRun(r.score))
          .map(r => r.score)
      );

      console.log(`\nRecovery Performance Comparison:`);
      console.log(`  Mean score when recovering: ${meanRecovery.toFixed(2)}`);
      console.log(`  Mean score all clean runs: ${meanAllCleanRuns.toFixed(2)}`);
      console.log(`  Difference: ${(meanRecovery - meanAllCleanRuns).toFixed(2)}`);
      console.log(`  Interpretation: Recovery attempts ${meanRecovery > meanAllCleanRuns ? 'SCORED HIGHER' : 'scored lower'} than average\n`);
    }

    return recoveryData;
  }

  /**
   * Analyze: Cross-round recency effect
   * Does first person in round N score differently based on last person in round N-1?
   */
  analyzeCrossRoundRecency() {
    console.log('\n' + '='.repeat(70));
    console.log('CROSS-ROUND RECENCY ANALYSIS');
    console.log('='.repeat(70) + '\n');

    const crossRoundData = [];

    // Get last clean run of each round
    const r1CleanRuns = this.rounds.round1.filter(r => this.isCleanRun(r.score));
    const r2CleanRuns = this.rounds.round2.filter(r => this.isCleanRun(r.score));
    const r3CleanRuns = this.rounds.round3.filter(r => this.isCleanRun(r.score));

    // Last of R1 → First of R2
    if (r1CleanRuns.length > 0 && this.rounds.round2.length > 0) {
      const lastR1 = r1CleanRuns[r1CleanRuns.length - 1];
      const firstR2 = this.rounds.round2[0];
      
      crossRoundData.push({
        transition: 'R1→R2',
        lastPrevious: {
          competitor: lastR1.competitor,
          score: lastR1.score,
        },
        firstNext: {
          competitor: firstR2.competitor,
          score: firstR2.score,
          isWipeout: firstR2.isWipeout,
        },
        scoreDifference: firstR2.score - lastR1.score,
      });
    }

    // Last of R2 → First of R3
    if (r2CleanRuns.length > 0 && this.rounds.round3.length > 0) {
      const lastR2 = r2CleanRuns[r2CleanRuns.length - 1];
      const firstR3 = this.rounds.round3[0];
      
      crossRoundData.push({
        transition: 'R2→R3',
        lastPrevious: {
          competitor: lastR2.competitor,
          score: lastR2.score,
        },
        firstNext: {
          competitor: firstR3.competitor,
          score: firstR3.score,
          isWipeout: firstR3.isWipeout,
        },
        scoreDifference: firstR3.score - lastR2.score,
      });
    }

    console.log('Round Transitions:\n');
    crossRoundData.forEach(trans => {
      console.log(`${trans.transition}:`);
      console.log(`  Last of previous round: ${trans.lastPrevious.competitor} (${trans.lastPrevious.score.toFixed(2)})`);
      console.log(`  First of next round: ${trans.firstNext.competitor} (${trans.firstNext.score.toFixed(2)})`);
      const status = trans.firstNext.isWipeout ? '❌ WIPEOUT' : '✓ CLEAN';
      console.log(`  Status: ${status}`);
      console.log(`  Score change: ${trans.scoreDifference > 0 ? '+' : ''}${trans.scoreDifference.toFixed(2)}`);
      
      if (trans.scoreDifference < 0) {
        console.log(`  → First person scored LOWER after high performer (possible contrast effect)`);
      } else if (trans.firstNext.isWipeout) {
        console.log(`  → First person wiped out (pressure from previous performance?)`);
      }
      console.log();
    });

    return crossRoundData;
  }

  /**
   * Analyze: Individual competitor trajectories across rounds
   */
  analyzeIndividualTrajectories() {
    console.log('\n' + '='.repeat(70));
    console.log('INDIVIDUAL COMPETITOR TRAJECTORIES');
    console.log('='.repeat(70) + '\n');

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
        trajectories[comp.competitor] = {
          runs,
          pattern: this.getPattern(runs),
        };
      }
    });

    // Group by pattern
    const patterns = {};
    Object.entries(trajectories).forEach(([competitor, data]) => {
      if (!patterns[data.pattern]) patterns[data.pattern] = [];
      patterns[data.pattern].push({
        competitor,
        runs: data.runs,
      });
    });

    Object.entries(patterns).forEach(([pattern, competitors]) => {
      console.log(`${pattern} (${competitors.length} competitors):`);
      competitors.forEach(comp => {
        const scores = comp.runs.map(r => r.score.toFixed(2)).join(' → ');
        console.log(`  ${comp.competitor}: ${scores}`);
      });
      console.log();
    });

    return trajectories;
  }

  getPattern(runs) {
    const wipeoutThreshold = 50;
    let pattern = '';

    runs.forEach(r => {
      if (r.score < wipeoutThreshold) {
        pattern += 'W';
      } else if (r.score >= 80) {
        pattern += 'H';
      } else {
        pattern += 'L';
      }
    });

    return pattern;
  }

  run() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   Momentum & Cross-Round Recency Analysis     ║');
    console.log('║   Milano-Cortina 2026 Halfpipe               ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    try {
      const dataPath = path.join(__dirname, '../data/raw/milano-cortina-2026-mens-halfpipe.csv');
      this.loadDataFromCSV(dataPath);
      this.organizeByRound();

      const analysis = {
        timestamp: new Date().toISOString(),
        recoveryMomentum: this.analyzeRecoveryMomentum(),
        crossRoundRecency: this.analyzeCrossRoundRecency(),
        trajectories: this.analyzeIndividualTrajectories(),
      };

      const resultsDir = path.join(__dirname, '../results');
      fs.writeFileSync(
        path.join(resultsDir, 'momentum_analysis.json'),
        JSON.stringify(analysis, null, 2)
      );

      console.log('✓ Analysis complete. Results saved to results/momentum_analysis.json\n');

    } catch (error) {
      console.error('Analysis error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

const analyzer = new MomentumAnalyzer();
analyzer.run();
