/**
 * Generate visualizations of halfpipe scoring data
 */

const fs = require('fs');
const path = require('path');

function generateASCIIChart(title, scores, width = 60) {
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const range = maxScore - minScore;

  console.log(`\n${title}`);
  console.log('='.repeat(width));

  scores.forEach((score, idx) => {
    const normalized = (score - minScore) / range;
    const barWidth = Math.round(normalized * (width - 15));
    const bar = '█'.repeat(barWidth);
    console.log(`${String(idx + 1).padStart(2)}. [${bar.padEnd(width - 15)}] ${score.toFixed(1)}`);
  });
}

function generateCorrelationVisualization(pairs) {
  console.log('\n\nScore Correlation Visualization');
  console.log('==============================');
  console.log('Previous → Current (difference)\n');

  pairs.forEach(p => {
    const prevBars = Math.round(p.previousScore / 5);
    const currBars = Math.round(p.currentScore / 5);
    const diff = p.scoreDifference > 0 ? `+${p.scoreDifference.toFixed(1)}` : p.scoreDifference.toFixed(1);
    
    console.log(`Rank ${p.rank}:`);
    console.log(`  Prev: ${'█'.repeat(prevBars)} ${p.previousScore.toFixed(1)}`);
    console.log(`  Curr: ${'█'.repeat(currBars)} ${p.currentScore.toFixed(1)} (${diff})`);
  });
}

// Main
try {
  const analysisPath = path.join(__dirname, '../results/analysis.json');
  const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));

  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   Milano-Cortina 2026 Halfpipe Analysis       ║');
  console.log('║          ASCII Visualization                  ║');
  console.log('╚════════════════════════════════════════════════╝');

  // Get all scores from competitors
  const allScores = analysis.performanceAfterPreviousResult.scoringPairs
    .map(p => p.previousScore)
    .concat([analysis.performanceAfterPreviousResult.scoringPairs[analysis.performanceAfterPreviousResult.scoringPairs.length - 1].currentScore]);

  generateASCIIChart('Final Scores - All Competitors', allScores);

  // Separate high vs low
  const highScores = analysis.performanceAfterPreviousResult.afterHighPerformance.scores;
  const lowScores = analysis.performanceAfterPreviousResult.afterLowPerformance.scores;

  generateASCIIChart('\nScores After HIGH Performers (>87)', highScores);
  generateASCIIChart('\nScores After LOW Performers (<87)', lowScores);

  generateCorrelationVisualization(analysis.consecutiveScoreAnalysis.pairs.slice(0, 6));

  console.log('\n\nStatistical Summary');
  console.log('==================');
  console.log(`Overall Correlation: ${analysis.consecutiveScoreAnalysis.correlation.toFixed(3)}`);
  console.log(`Mean after HIGH: ${analysis.performanceAfterPreviousResult.afterHighPerformance.mean.toFixed(2)}`);
  console.log(`Mean after LOW:  ${analysis.performanceAfterPreviousResult.afterLowPerformance.mean.toFixed(2)}`);
  console.log(`Difference: ${analysis.performanceAfterPreviousResult.meanDifference.toFixed(2)} points`);
  console.log(`\n✓ Visualization complete`);

} catch (error) {
  console.error('Visualization error:', error.message);
  process.exit(1);
}
