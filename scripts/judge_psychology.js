/**
 * Judge Psychology Analysis for Round-Robin Halfpipe Competition
 * 
 * Examines whether judges' scoring is influenced by the performances
 * they just witnessed from previous competitors in the same round.
 * 
 * Competition format: Reverse qualifying order, same for each round
 * Question: Do judges score higher/lower based on recent comparisons?
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

    // Sort by performance_order to ensure we have them in correct sequence
    this.competitors.sort((a, b) => 
      parseInt(a.performance_order) - parseInt(b.performance_order)
    );

    console.log(`Loaded ${this.competitors.length} competitors in performance order\n`);
  }

  organizeByRound() {
    this.competitors.forEach(comp => {
      const run1 = parseFloat(comp.run1);
      const run2 = parseFloat(comp.run2);
      const run3 = parseFloat(comp.run3);

      const order = parseInt(comp.performance_order);
      const qualRank = 13 - order; // Position in qualifying (1=worst, 12=best)
      const isTopQualifier = comp.final_rank === '1' || comp.final_rank === '2';

      if (!isNaN(run1)) {
        this.rounds.round1.push({
          order,
          qualifier: qualRank,
          competitor: comp.competitor,
          score: run1,
          isTopQualifier,
        });
      }
      if (!isNaN(run2)) {
        this.rounds.round2.push({
          order,
          qualifier: qualRank,
          competitor: comp.competitor,
          score: run2,
          isTopQualifier,
        });
      }
      if (!isNaN(run3)) {
        this.rounds.round3.push({
          order,
          qualifier: qualRank,
          competitor: comp.competitor,
          score: run3,
          isTopQualifier,
        });
      }
    });
  }

  /**
   * For each round, analyze if scores are influenced by previous performances
   */
  analyzeJudgeBias(roundData, roundName) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${roundName.toUpperCase()} ANALYSIS`);
    console.log(`${'='.repeat(60)}\n`);

    if (roundData.length < 2) {
      console.log('Insufficient data for this round');
      return null;
    }

    const analysis = {
      roundName,
      competitors: roundData.length,
      scores: roundData.map(r => r.score),
      mean: stats.mean(roundData.map(r => r.score)),
      stdDev: stats.standardDeviation(roundData.map(r => r.score)),
      performances: [],
      contrastEffect: null,
      recencyBias: null,
      qualifierEffect: null,
    };

    // Analyze each performance and context
    for (let i = 0; i < roundData.length; i++) {
      const current = roundData[i];
      const previous = i > 0 ? roundData[i - 1] : null;

      let context = {
        position: i + 1,
        competitor: current.competitor,
        score: current.score,
        qualifier: current.qualifier,
        isTopQualifier: current.isTopQualifier,
        previousScore: previous?.score || null,
        scoreDifference: previous ? current.score - previous.score : null,
      };

      if (previous) {
        // Determine if previous performance was good or bad
        const prevWasHigh = previous.score > analysis.mean;
        context.precedingPerformance = prevWasHigh ? 'HIGH' : 'LOW';
        
        // Hypothesis: judges might rate next performer lower after high performer (contrast effect)
        if (prevWasHigh && current.score < analysis.mean) {
          context.contrastedDown = true;
        } else if (!prevWasHigh && current.score > analysis.mean) {
          context.boostedUp = true;
        }
      }

      analysis.performances.push(context);
    }

    // Calculate contrast effect (do judges score lower after high performers?)
    const afterHigh = roundData.slice(1).filter((r, i) => 
      roundData[i].score > analysis.mean
    );
    const afterLow = roundData.slice(1).filter((r, i) => 
      roundData[i].score <= analysis.mean
    );

    if (afterHigh.length > 0 && afterLow.length > 0) {
      const meanAfterHigh = stats.mean(afterHigh.map(r => r.score));
      const meanAfterLow = stats.mean(afterLow.map(r => r.score));
      analysis.contrastEffect = {
        meanAfterHigh,
        meanAfterLow,
        difference: meanAfterLow - meanAfterHigh,
        interpretation: meanAfterHigh > meanAfterLow 
          ? 'Scores lower after high performers (contrast effect)'
          : 'Scores higher after high performers (halo effect)',
      };
    }

    // Top qualifiers (best) always go last - do they get advantaged or disadvantaged?
    const topQualScores = roundData.filter(r => r.isTopQualifier).map(r => r.score);
    const otherScores = roundData.filter(r => !r.isTopQualifier).map(r => r.score);

    if (topQualScores.length > 0 && otherScores.length > 0) {
      analysis.qualifierEffect = {
        topQualifierMean: stats.mean(topQualScores),
        otherseMean: stats.mean(otherScores),
        difference: stats.mean(topQualScores) - stats.mean(otherScores),
      };
    }

    return analysis;
  }

  /**
   * Compare same competitor across rounds to identify judge consistency
   */
  analyzeConsistency() {
    console.log(`\n${'='.repeat(60)}`);
    console.log('JUDGE CONSISTENCY ACROSS ROUNDS');
    console.log(`${'='.repeat(60)}\n`);

    const consistency = {};

    this.competitors.forEach(comp => {
      const run1 = parseFloat(comp.run1);
      const run2 = parseFloat(comp.run2);
      const run3 = parseFloat(comp.run3);

      const runData = [run1, run2, run3].filter(r => !isNaN(r));
      if (runData.length > 1) {
        consistency[comp.competitor] = {
          scores: runData,
          mean: stats.mean(runData),
          variance: stats.variance(runData),
          stdDev: stats.standardDeviation(runData),
          range: Math.max(...runData) - Math.min(...runData),
        };
      }
    });

    return consistency;
  }

  run() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   Judge Psychology Analysis                   ║');
    console.log('║   Milano-Cortina 2026 Halfpipe               ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    try {
      const dataPath = path.join(__dirname, '../data/raw/milano-cortina-2026-mens-halfpipe.csv');
      this.loadDataFromCSV(dataPath);
      this.organizeByRound();

      const analysis = {
        event: 'Milano-Cortina 2026 - Men\'s Snowboard Halfpipe Final',
        format: 'Round-Robin with Reverse Qualifying Order',
        timestamp: new Date().toISOString(),
        competitionStructure: {
          description: 'Each round, competitors perform in same order (reverse qualifying - best go last)',
          roundsAnalyzed: Object.keys(this.rounds).filter(r => this.rounds[r].length > 0),
        },
        rounds: {},
        consistency: this.analyzeConsistency(),
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
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY: JUDGE BIAS INDICATORS');
    console.log('='.repeat(60));

    Object.entries(analysis.rounds).forEach(([roundName, roundData]) => {
      if (roundData) {
        console.log(`\n${roundName.toUpperCase()}:`);
        console.log(`  Competitors: ${roundData.competitors}`);
        console.log(`  Mean score: ${roundData.mean.toFixed(2)}`);
        console.log(`  Std Dev: ${roundData.stdDev.toFixed(2)}`);
        
        if (roundData.contrastEffect) {
          console.log(`  Contrast Effect: ${roundData.contrastEffect.interpretation}`);
          console.log(`    After HIGH: ${roundData.contrastEffect.meanAfterHigh.toFixed(2)}`);
          console.log(`    After LOW: ${roundData.contrastEffect.meanAfterLow.toFixed(2)}`);
          console.log(`    Difference: ${roundData.contrastEffect.difference.toFixed(2)}`);
        }

        if (roundData.qualifierEffect) {
          console.log(`  Qualifier Effect (best go last):`);
          console.log(`    Top Qualifiers: ${roundData.qualifierEffect.topQualifierMean.toFixed(2)}`);
          console.log(`    Others: ${roundData.qualifierEffect.otherseMean.toFixed(2)}`);
          console.log(`    Difference: ${roundData.qualifierEffect.difference.toFixed(2)}`);
        }
      }
    });
  }
}

const analyzer = new JudgePsychologyAnalyzer();
analyzer.run();
