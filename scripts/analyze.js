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

  loadData(filePath) {
    // TODO: Load CSV or JSON data from data/processed
    console.log(`Loading data from: ${filePath}`);
  }

  /**
   * Calculate correlation between consecutive scores
   */
  analyzeConsecutiveScores() {
    if (this.competitionData.length < 2) {
      console.warn('Insufficient data for analysis');
      return null;
    }

    const pairs = [];
    for (let i = 1; i < this.competitionData.length; i++) {
      pairs.push({
        previousScore: this.competitionData[i - 1].score,
        currentScore: this.competitionData[i].score,
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
    };
  }

  /**
   * Group scores by previous performance (high/low)
   */
  analyzeScoresAfterPerformance() {
    // TODO: Define thresholds for "high" and "low" performance
    const threshold = stats.median(this.competitionData.map(d => d.score));

    const afterHigh = [];
    const afterLow = [];

    for (let i = 1; i < this.competitionData.length; i++) {
      const previousScore = this.competitionData[i - 1].score;
      const currentScore = this.competitionData[i].score;

      if (previousScore > threshold) {
        afterHigh.push(currentScore);
      } else {
        afterLow.push(currentScore);
      }
    }

    return {
      afterHighPerformance: {
        scores: afterHigh,
        mean: stats.mean(afterHigh),
        median: stats.median(afterHigh),
        stdDev: stats.standardDeviation(afterHigh),
      },
      afterLowPerformance: {
        scores: afterLow,
        mean: stats.mean(afterLow),
        median: stats.median(afterLow),
        stdDev: stats.standardDeviation(afterLow),
      },
      threshold,
    };
  }

  /**
   * Analyze effect of falls or poor performances
   */
  analyzeFallImpact() {
    // TODO: Integrate fall detection from raw data
    console.log('Fall impact analysis - requires competition data with fall indicators');
    return {};
  }

  run() {
    console.log('Starting halfpipe scoring analysis...\n');

    try {
      // TODO: Load and process data
      console.log('Waiting for competition data to be loaded.');
      console.log('Update scripts/scrape_results.js to gather data.');

      const resultsDir = path.join(__dirname, '../results');
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }

      const output = {
        status: 'pending',
        message: 'Analysis ready - awaiting competition data',
        timestamp: new Date().toISOString(),
      };

      fs.writeFileSync(
        path.join(resultsDir, 'analysis.json'),
        JSON.stringify(output, null, 2)
      );

      console.log('\nAnalysis template saved to results/analysis.json');
    } catch (error) {
      console.error('Analysis error:', error.message);
      process.exit(1);
    }
  }
}

const analyzer = new HalfpipeAnalyzer();
analyzer.run();
