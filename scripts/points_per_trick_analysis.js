/**
 * Points Per Trick Analysis
 * 
 * Analyze scoring patterns by trick to understand:
 * - Base points per trick (excluding wipeouts/incomplete runs)
 * - Trick difficulty effects on scoring
 * - Consistency of scoring across same trick sequences
 */

const fs = require('fs');
const path = require('path');
const stats = require('simple-statistics');

class PointsPerTrickAnalyzer {
  constructor(csvPath) {
    this.rows = this.loadCSV(csvPath);
    this.cleanRuns = this.filterCleanRuns();
    this.trickStats = {};
  }

  loadCSV(csvPath) {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return {
        competitor: values[0],
        country: values[1],
        position: parseInt(values[2]),
        run: parseInt(values[3]),
        final_score: values[4],
        judge1_score: values[6],
        judge2_score: values[8],
        judge3_score: values[10],
        judge4_score: values[12],
        judge5_score: values[14],
        judge6_score: values[16],
        trick1: values[17],
        trick2: values[18],
        trick3: values[19],
        trick4: values[20],
        trick5: values[21],
        notes: values[23],
      };
    });
  }

  /**
   * Filter to clean runs (≥50 score, non-DNI)
   */
  filterCleanRuns() {
    return this.rows.filter(row => {
      if (row.final_score === 'DNI' || row.final_score === '') return false;
      const score = parseFloat(row.final_score);
      return score >= 50 && !isNaN(score);
    });
  }

  /**
   * Get middle 4 judge scores (high/low excluded)
   */
  getMiddle4Scores(row) {
    const scores = [
      parseFloat(row.judge1_score),
      parseFloat(row.judge2_score),
      parseFloat(row.judge3_score),
      parseFloat(row.judge4_score),
      parseFloat(row.judge5_score),
      parseFloat(row.judge6_score),
    ].filter(s => !isNaN(s));

    if (scores.length < 4) return null;
    
    scores.sort((a, b) => a - b);
    return scores.slice(1, 5); // middle 4
  }

  /**
   * Count valid tricks (non-blank)
   */
  countTricks(row) {
    let count = 0;
    for (let i = 1; i <= 5; i++) {
      const trick = row[`trick${i}`];
      if (trick && trick.trim()) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get all tricks (non-blank)
   */
  getTricks(row) {
    const tricks = [];
    for (let i = 1; i <= 5; i++) {
      const trick = row[`trick${i}`];
      if (trick && trick.trim()) {
        tricks.push(trick.trim());
      }
    }
    return tricks;
  }

  /**
   * Analyze points per trick for clean runs
   */
  analyze() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║   POINTS PER TRICK ANALYSIS (Clean Runs Only)                 ║');
    console.log('║   Excludes wipeouts/DNI; analyzes final score breakdown       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const runsByTrickCount = {};
    const trickSequences = {};
    const individualTricks = {};

    this.cleanRuns.forEach(row => {
      const finalScore = parseFloat(row.final_score);
      const trickCount = this.countTricks(row);
      const tricks = this.getTricks(row);
      const trickSequence = tricks.join(' → ');

      // Group by trick count
      if (!runsByTrickCount[trickCount]) {
        runsByTrickCount[trickCount] = [];
      }
      runsByTrickCount[trickCount].push({
        competitor: row.competitor,
        run: row.run,
        score: finalScore,
        tricks: trickSequence,
      });

      // Track trick sequences
      if (!trickSequences[trickSequence]) {
        trickSequences[trickSequence] = [];
      }
      trickSequences[trickSequence].push(finalScore);

      // Track individual tricks
      tricks.forEach(trick => {
        if (!individualTricks[trick]) {
          individualTricks[trick] = [];
        }
        individualTricks[trick].push(finalScore);
      });
    });

    // Analysis 1: Points by trick count
    console.log('ANALYSIS 1: POINTS BY TRICK COUNT');
    console.log('='.repeat(80));
    console.log(`Total clean runs: ${this.cleanRuns.length}\n`);

    Object.keys(runsByTrickCount)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach(count => {
        const runs = runsByTrickCount[count];
        const scores = runs.map(r => r.score);
        const avg = stats.mean(scores);
        const median = stats.median(scores);
        const stdDev = stats.standardDeviation(scores);
        const pointsPerTrick = avg / count;

        console.log(`${count} tricks (n=${runs.length}):`);
        console.log(`  Average score: ${avg.toFixed(2)}`);
        console.log(`  Median score: ${median.toFixed(2)}`);
        console.log(`  Std Dev: ${stdDev.toFixed(2)}`);
        console.log(`  Points/trick estimate: ${pointsPerTrick.toFixed(2)}`);
        console.log(`  Range: ${Math.min(...scores).toFixed(2)} - ${Math.max(...scores).toFixed(2)}`);
        console.log();
      });

    // Analysis 2: Most common trick sequences
    console.log('\nANALYSIS 2: REPEATED TRICK SEQUENCES');
    console.log('='.repeat(80));
    
    const sequenceStats = Object.entries(trickSequences)
      .map(([seq, scores]) => ({
        sequence: seq,
        count: scores.length,
        avg: stats.mean(scores),
        min: Math.min(...scores),
        max: Math.max(...scores),
        stdDev: scores.length > 1 ? stats.standardDeviation(scores) : 0,
      }))
      .filter(s => s.count >= 2) // Only sequences done 2+ times
      .sort((a, b) => b.count - a.count);

    console.log(`Trick sequences attempted 2+ times:\n`);
    sequenceStats.forEach(s => {
      console.log(`${s.sequence}`);
      console.log(`  Attempts: ${s.count}, Avg: ${s.avg.toFixed(2)}, Range: ${s.min.toFixed(2)}-${s.max.toFixed(2)}, Spread: ±${s.stdDev.toFixed(2)}`);
    });

    if (sequenceStats.length === 0) {
      console.log('(No trick sequences repeated 2+ times)');
    }

    // Analysis 3: Most common individual tricks
    console.log('\n\nANALYSIS 3: INDIVIDUAL TRICK SCORING');
    console.log('='.repeat(80));
    
    const trickStats = Object.entries(individualTricks)
      .map(([trick, scores]) => ({
        trick,
        count: scores.length,
        avg: stats.mean(scores),
        min: Math.min(...scores),
        max: Math.max(...scores),
        stdDev: scores.length > 1 ? stats.standardDeviation(scores) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    console.log(`All tricks (sorted by frequency):\n`);
    trickStats.slice(0, 15).forEach(t => {
      console.log(`${t.trick.padEnd(25)} n=${t.count.toString().padStart(2)} avg=${t.avg.toFixed(2).padStart(5)} range=${t.min.toFixed(0).padStart(2)}-${t.max.toFixed(0).padStart(2)}`);
    });

    // Analysis 4: Scotty James specific case (identical tricks)
    console.log('\n\nANALYSIS 4: IDENTICAL TRICK SEQUENCE ANALYSIS');
    console.log('='.repeat(80));
    
    const identicalSequences = sequenceStats.filter(s => s.count >= 2);
    if (identicalSequences.length > 0) {
      console.log('Cases where same trick sequence was attempted multiple times:\n');
      identicalSequences.forEach(s => {
        console.log(`Sequence: ${s.sequence}`);
        console.log(`  Attempts: ${s.count}`);
        console.log(`  Average: ${s.avg.toFixed(2)}`);
        console.log(`  Variance: ${s.stdDev.toFixed(2)}`);
        console.log(`  Range: ${s.min.toFixed(2)} to ${s.max.toFixed(2)} (Δ=${(s.max - s.min).toFixed(2)})`);
        
        if (s.max - s.min > 5) {
          console.log(`  ⚠️  LARGE SCORE SPREAD - Same tricks scored very differently!`);
          console.log(`      This suggests context/judging bias, not trick difficulty.\n`);
        } else {
          console.log(`  ✓ Consistent scoring\n`);
        }
      });
    } else {
      console.log('No trick sequences were identical across multiple runs.');
      console.log('(Each competitor typically uses different trick sequences each run)\n');
    }

    // Save detailed results
    const output = {
      timestamp: new Date().toISOString(),
      cleanRunsCount: this.cleanRuns.length,
      runsByTrickCount,
      trickSequenceStats: sequenceStats,
      individualTrickStats: trickStats,
      findings: {
        average_points_per_trick: this.calculateOverallPointsPerTrick(),
        sequences_with_large_variance: identicalSequences.filter(s => s.max - s.min > 5).map(s => ({
          sequence: s.sequence,
          spread: s.max - s.min,
          examples: 'See sequenceStats above'
        }))
      }
    };

    fs.writeFileSync(
      path.join(__dirname, '../results/points_per_trick_analysis.json'),
      JSON.stringify(output, null, 2)
    );

    console.log(`✓ Results saved to results/points_per_trick_analysis.json\n`);
  }

  calculateOverallPointsPerTrick() {
    const scores = this.cleanRuns.map(r => parseFloat(r.final_score));
    const trickCounts = this.cleanRuns.map(r => this.countTricks(r));
    
    const averageScore = stats.mean(scores);
    const averageTrickCount = stats.mean(trickCounts);
    
    return averageScore / averageTrickCount;
  }

  run() {
    this.analyze();
  }
}

// Run analysis
const csvPath = path.join(__dirname, '../data/raw/milano-cortina-2026-individual-judge-scores.csv');
if (fs.existsSync(csvPath)) {
  const analyzer = new PointsPerTrickAnalyzer(csvPath);
  analyzer.run();
} else {
  console.error(`Error: CSV not found at ${csvPath}`);
  process.exit(1);
}
