/**
 * Judge Psychology Analysis for Round-Robin Halfpipe Competition
 * 
 * CORRECTED: Filter out wipe outs (below 50) and only analyze clean runs
 * 
 * Score ranges:
 * - Below 40 = definitely wiped out
 * - Below 50 = likely wiped out
 * - 50-59 = fall or major bobble but finished
 * - 60-69 = noticeable mistake, hand drag
 * - 70-79 = clean but lower difficulty
 * - 80-89 = strong, clean run
 * - 90+ = medal-level, clean run
 */

const fs = require('fs');
const path = require('path');
const stats = require('simple-statistics');

class JudgePsychologyAnalyzer {
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

    // Sort by performance_order
    this.competitors.sort((a, b) => 
      parseInt(a.performance_order) - parseInt(b.performance_order)
    );

    console.log(`Loaded ${this.competitors.length} competitors\n`);
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
      const qualRank = 13 - order;
      const isTopQualifier = comp.final_rank === '1' || comp.final_rank === '2';

      if (!isNaN(run1)) {
        this.rounds.round1.push({
          order,
          qualifier: qualRank,
          competitor: comp.competitor,
          score: run1,
          isTopQualifier,
          isWipeout: this.isWipeout(run1),
        });
      }
      if (!isNaN(run2)) {
        this.rounds.round2.push({
          order,
          qualifier: qualRank,
          competitor: comp.competitor,
          score: run2,
          isTopQualifier,
          isWipeout: this.isWipeout(run2),
        });
      }
      if (!isNaN(run3)) {
        this.rounds.round3.push({
          order,
          qualifier: qualRank,
          competitor: comp.competitor,
          score: run3,
          isTopQualifier,
          isWipeout: this.isWipeout(run3),
        });
      }
    });
  }

  /**
   * Analyze judge bias on CLEAN RUNS ONLY
   */
  analyzeJudgeBias(roundData, roundName) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`${roundName.toUpperCase()} ANALYSIS`);
    console.log(`${'='.repeat(70)}\n`);

    if (roundData.length < 2) {
      console.log('Insufficient data for this round');
      return null;
    }

    // Separate clean runs from wipeouts
    const allRuns = roundData;
    const cleanRuns = roundData.filter(r => !r.isWipeout);
    const wipeouts = roundData.filter(r => r.isWipeout);

    console.log(`Total performances: ${allRuns.length}`);
    console.log(`Clean runs (≥50): ${cleanRuns.length}`);
    console.log(`Wipeouts (<50): ${wipeouts.length}`);
    console.log(`Wipeout rate: ${(wipeouts.length / allRuns.length * 100).toFixed(1)}%\n`);

    if (cleanRuns.length < 2) {
      console.log('Insufficient clean runs for bias analysis\n');
      return null;
    }

    const analysis = {
      roundName,
      totalPerformances: allRuns.length,
      cleanRuns: cleanRuns.length,
      wipeouts: wipeouts.length,
      wipeoutRate: wipeouts.length / allRuns.length,
      cleanRunStats: {
        scores: cleanRuns.map(r => r.score),
        mean: stats.mean(cleanRuns.map(r => r.score)),
        stdDev: stats.standardDeviation(cleanRuns.map(r => r.score)),
      },
      performances: [],
      contrastEffect: null,
      qualifierEffect: null,
      wipeoutContext: null,
    };

    // Analyze each CLEAN run and its context
    for (let i = 0; i < cleanRuns.length; i++) {
      const current = cleanRuns[i];
      const previous = i > 0 ? cleanRuns[i - 1] : null;

      let context = {
        position: current.order,
        competitor: current.competitor,
        score: current.score,
        qualifier: current.qualifier,
        isTopQualifier: current.isTopQualifier,
        previousScore: previous?.score || null,
        scoreDifference: previous ? current.score - previous.score : null,
      };

      if (previous) {
        const prevWasHigh = previous.score > analysis.cleanRunStats.mean;
        context.precedingPerformance = prevWasHigh ? 'HIGH' : 'LOW';
      }

      analysis.performances.push(context);
    }

    // Contrast effect on clean runs only
    const afterHigh = cleanRuns.slice(1).filter((r, i) => 
      cleanRuns[i].score > analysis.cleanRunStats.mean
    );
    const afterLow = cleanRuns.slice(1).filter((r, i) => 
      cleanRuns[i].score <= analysis.cleanRunStats.mean
    );

    if (afterHigh.length > 0 && afterLow.length > 0) {
      const meanAfterHigh = stats.mean(afterHigh.map(r => r.score));
      const meanAfterLow = stats.mean(afterLow.map(r => r.score));
      analysis.contrastEffect = {
        meanAfterHigh,
        meanAfterLow,
        difference: meanAfterLow - meanAfterHigh,
        count: { afterHigh: afterHigh.length, afterLow: afterLow.length },
        interpretation: meanAfterHigh > meanAfterLow 
          ? 'Scores lower after high performers (contrast effect)'
          : 'Scores higher after high performers (halo effect)',
      };
    }

    // Top qualifiers effect
    const topQualScores = cleanRuns.filter(r => r.isTopQualifier).map(r => r.score);
    const otherScores = cleanRuns.filter(r => !r.isTopQualifier).map(r => r.score);

    if (topQualScores.length > 0 && otherScores.length > 0) {
      analysis.qualifierEffect = {
        topQualifierMean: stats.mean(topQualScores),
        othersMean: stats.mean(otherScores),
        difference: stats.mean(topQualScores) - stats.mean(otherScores),
        count: { topQual: topQualScores.length, others: otherScores.length },
      };
    }

    // Analyze wipeout context - did wipeouts cluster after certain types of performances?
    if (wipeouts.length > 0) {
      const wipeoutPositions = wipeouts.map(w => w.order);
      analysis.wipeoutContext = {
        wipeoutPositions,
        notes: 'Positions (1-12) where wipeouts occurred this round',
      };
    }

    return analysis;
  }

  run() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   Judge Psychology Analysis (CORRECTED)       ║');
    console.log('║   Filtering out wipeouts (<50)                ║');
    console.log('║   Milano-Cortina 2026 Halfpipe               ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    try {
      const dataPath = path.join(__dirname, '../data/raw/milano-cortina-2026-mens-halfpipe.csv');
      this.loadDataFromCSV(dataPath);
      this.organizeByRound();

      const analysis = {
        event: 'Milano-Cortina 2026 - Men\'s Snowboard Halfpipe Final',
        format: 'Round-Robin (same reverse qualifying order each round)',
        methodology: 'Only analyzing clean runs (score ≥50); excluding wipeouts (<50)',
        timestamp: new Date().toISOString(),
        rounds: {},
      };

      // Analyze each round
      ['round1', 'round2', 'round3'].forEach(round => {
        if (this.rounds[round].length > 0) {
          analysis.rounds[round] = this.analyzeJudgeBias(this.rounds[round], round);
        }
      });

      // Save results
      const resultsDir = path.join(__dirname, '../results');
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(resultsDir, 'judge_psychology_analysis.json'),
        JSON.stringify(analysis, null, 2)
      );

      console.log('\n✓ Analysis complete. Results saved to results/judge_psychology_analysis.json\n');
      this.printSummary(analysis);

    } catch (error) {
      console.error('Analysis error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  printSummary(analysis) {
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY: JUDGE BIAS ON CLEAN RUNS ONLY');
    console.log('='.repeat(70));

    Object.entries(analysis.rounds).forEach(([roundName, roundData]) => {
      if (roundData) {
        console.log(`\n${roundName.toUpperCase()}:`);
        console.log(`  Total performances: ${roundData.totalPerformances}`);
        console.log(`  Clean runs: ${roundData.cleanRuns} | Wipeouts: ${roundData.wipeouts} (${(roundData.wipeoutRate * 100).toFixed(1)}%)`);
        console.log(`  Mean score (clean runs only): ${roundData.cleanRunStats.mean.toFixed(2)}`);
        
        if (roundData.contrastEffect) {
          console.log(`\n  CONTRAST EFFECT (on clean runs):`);
          console.log(`    ${roundData.contrastEffect.interpretation}`);
          console.log(`    After HIGH: ${roundData.contrastEffect.meanAfterHigh.toFixed(2)} (n=${roundData.contrastEffect.count.afterHigh})`);
          console.log(`    After LOW: ${roundData.contrastEffect.meanAfterLow.toFixed(2)} (n=${roundData.contrastEffect.count.afterLow})`);
          console.log(`    Difference: ${roundData.contrastEffect.difference.toFixed(2)} points`);
        }

        if (roundData.qualifierEffect) {
          console.log(`\n  QUALIFIER EFFECT (best go last):`);
          console.log(`    Top Qualifiers: ${roundData.qualifierEffect.topQualifierMean.toFixed(2)} (n=${roundData.qualifierEffect.count.topQual})`);
          console.log(`    Others: ${roundData.qualifierEffect.othersMean.toFixed(2)} (n=${roundData.qualifierEffect.count.others})`);
          console.log(`    Difference: ${roundData.qualifierEffect.difference.toFixed(2)} points`);
        }

        if (roundData.wipeoutContext) {
          console.log(`\n  WIPEOUTS OCCURRED AT POSITIONS: ${roundData.wipeoutContext.wipeoutPositions.join(', ')}`);
        }
      }
    });
  }
}

const analyzer = new JudgePsychologyAnalyzer();
analyzer.run();
