/**
 * Statistical Analysis of Halfpipe Scoring Patterns
 * 
 * Analyzes scoring patterns to identify psychological or systematic effects
 * based on the previous competitor's performance.
 */

const fs = require('fs');
const path = require('path');
const stats = require('simple-statistics');

class HalfpipeAnalyzer {
  constructor() {
    this.competitionData = [];
    this.results = {};
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
      this.competitionData.push(row);
    }

    console.log(`Loaded ${this.competitionData.length} competitors`);
  }

  /**
   * Calculate correlation between consecutive scores
   */
  analyzeConsecutiveScores() {
    const scores = this.competitionData.map(d => parseFloat(d.best_score));

    if (scores.length < 2) {
      console.warn('Insufficient data for analysis');
      return null;
    }

    const pairs = [];
    for (let i = 1; i < scores.length; i++) {
      pairs.push({
        rank: i,
        previousScore: scores[i - 1],
        currentScore: scores[i],
        scoreDifference: scores[i] - scores[i - 1],
      });
    }

    const correlation = stats.sampleCorrelation(
      pairs.map(p => p.previousScore),
      pairs.map(p => p.currentScore)
    );

    return {
      correlation,
      pairCount: pairs.length,
      pairs,
      interpretation: this.interpretCorrelation(correlation),
    };
  }

  interpretCorrelation(correlation) {
    if (correlation > 0.5) {
      return 'Strong positive correlation - high scores tend to follow high scores';
    } else if (correlation > 0.2) {
      return 'Moderate positive correlation';
    } else if (correlation > -0.2) {
      return 'Weak correlation - scores appear independent';
    } else if (correlation > -0.5) {
      return 'Moderate negative correlation';
    } else {
      return 'Strong negative correlation - regression to the mean effect detected';
    }
  }

  /**
   * Group scores by previous performance (high/low)
   */
  analyzeScoresAfterPerformance() {
    const scores = this.competitionData.map(d => parseFloat(d.best_score));
    const median = stats.median(scores);

    const afterHigh = [];
    const afterLow = [];
    const scoringPairs = [];

    for (let i = 1; i < scores.length; i++) {
      const previousScore = scores[i - 1];
      const currentScore = scores[i];
      const previousCompetitor = this.competitionData[i - 1].competitor;
      const currentCompetitor = this.competitionData[i].competitor;

      scoringPairs.push({
        after: previousScore > median ? 'HIGH' : 'LOW',
        previousCompetitor,
        previousScore,
        currentCompetitor,
        currentScore,
      });

      if (previousScore > median) {
        afterHigh.push(currentScore);
      } else {
        afterLow.push(currentScore);
      }
    }

    return {
      medianScore: median,
      afterHighPerformance: {
        count: afterHigh.length,
        scores: afterHigh,
        mean: stats.mean(afterHigh),
        median: stats.median(afterHigh),
        stdDev: afterHigh.length > 1 ? stats.standardDeviation(afterHigh) : 0,
      },
      afterLowPerformance: {
        count: afterLow.length,
        scores: afterLow,
        mean: stats.mean(afterLow),
        median: stats.median(afterLow),
        stdDev: afterLow.length > 1 ? stats.standardDeviation(afterLow) : 0,
      },
      meanDifference:
        stats.mean(afterHigh) - stats.mean(afterLow),
      scoringPairs,
    };
  }

  /**
   * Identify performance clusters
   */
  analyzePerformanceClusters() {
    const scores = this.competitionData.map(d => parseFloat(d.best_score));
    const mean = stats.mean(scores);
    const stdDev = stats.standardDeviation(scores);

    const exceptional = scores.filter(s => s > mean + stdDev);
    const poor = scores.filter(s => s < mean - stdDev);
    const average = scores.filter(s => s >= mean - stdDev && s <= mean + stdDev);

    return {
      mean,
      stdDev,
      exceptional: {
        count: exceptional.length,
        scores: exceptional,
        description: 'Scores 1+ standard deviations above mean',
      },
      poor: {
        count: poor.length,
        scores: poor,
        description: 'Scores 1+ standard deviations below mean',
      },
      average: {
        count: average.length,
        scores: average,
        description: 'Scores within 1 standard deviation of mean',
      },
    };
  }

  /**
   * Analyze scoring streaks and momentum
   */
  analyzeMomentum() {
    const scores = this.competitionData.map(d => parseFloat(d.best_score));
    const differences = [];

    for (let i = 1; i < scores.length; i++) {
      differences.push(scores[i] - scores[i - 1]);
    }

    const positiveRuns = [];
    const negativeRuns = [];
    let currentRun = [];

    for (let i = 0; i < differences.length; i++) {
      if (differences[i] > 0) {
        if (currentRun.length > 0 && currentRun[0] < 0) {
          negativeRuns.push(currentRun.length);
          currentRun = [];
        }
        currentRun.push(differences[i]);
      } else if (differences[i] < 0) {
        if (currentRun.length > 0 && currentRun[0] > 0) {
          positiveRuns.push(currentRun.length);
          currentRun = [];
        }
        currentRun.push(differences[i]);
      }
    }

    return {
      scoreDifferences: differences,
      positiveRuns,
      negativeRuns,
      avgPositiveRunLength: positiveRuns.length > 0 ? stats.mean(positiveRuns) : 0,
      avgNegativeRunLength: negativeRuns.length > 0 ? stats.mean(negativeRuns) : 0,
    };
  }

  run() {
    console.log('Starting halfpipe scoring analysis...\n');

    try {
      const dataPath = path.join(__dirname, '../data/raw/milano-cortina-2026-mens-halfpipe.csv');
      this.loadDataFromCSV(dataPath);

      console.log('Running analysis...\n');

      const analysis = {
        event: 'Milano-Cortina 2026 - Men\'s Snowboard Halfpipe Final',
        timestamp: new Date().toISOString(),
        competitors: this.competitionData.length,
        
        consecutiveScoreAnalysis: this.analyzeConsecutiveScores(),
        performanceAfterPreviousResult: this.analyzeScoresAfterPerformance(),
        performanceClusters: this.analyzePerformanceClusters(),
        momentumAnalysis: this.analyzeMomentum(),
      };

      const resultsDir = path.join(__dirname, '../results');
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(resultsDir, 'analysis.json'),
        JSON.stringify(analysis, null, 2)
      );

      console.log('✓ Analysis complete. Results saved to results/analysis.json\n');
      this.printSummary(analysis);
    } catch (error) {
      console.error('Analysis error:', error.message);
      process.exit(1);
    }
  }

  printSummary(analysis) {
    console.log('=== ANALYSIS SUMMARY ===\n');
    console.log(`Correlation between consecutive scores: ${analysis.consecutiveScoreAnalysis.correlation.toFixed(3)}`);
    console.log(`→ ${analysis.consecutiveScoreAnalysis.interpretation}\n`);

    const perf = analysis.performanceAfterPreviousResult;
    console.log(`Scores after HIGH performance (>${perf.medianScore.toFixed(2)}):`);
    console.log(`  Mean: ${perf.afterHighPerformance.mean.toFixed(2)}, Median: ${perf.afterHighPerformance.median.toFixed(2)}\n`);

    console.log(`Scores after LOW performance (<${perf.medianScore.toFixed(2)}):`);
    console.log(`  Mean: ${perf.afterLowPerformance.mean.toFixed(2)}, Median: ${perf.afterLowPerformance.median.toFixed(2)}\n`);

    console.log(`Mean score difference (High→Low): ${perf.meanDifference.toFixed(2)}\n`);

    const clusters = analysis.performanceClusters;
    console.log(`Performance Distribution:`);
    console.log(`  Exceptional (>${(clusters.mean + clusters.stdDev).toFixed(2)}): ${clusters.exceptional.count}`);
    console.log(`  Average (±${clusters.stdDev.toFixed(2)}): ${clusters.average.count}`);
    console.log(`  Poor (<${(clusters.mean - clusters.stdDev).toFixed(2)}): ${clusters.poor.count}`);
  }
}

const analyzer = new HalfpipeAnalyzer();
analyzer.run();
