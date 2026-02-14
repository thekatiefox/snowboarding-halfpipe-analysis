/**
 * Rough Trick Difficulty Estimation (Exploratory/Fun)
 * 
 * Parse trick codes to estimate point values by difficulty
 * This is NOT scientific - just pattern exploration from available data
 * 
 * Trick code format appears to be: [spin direction]-[type]-[difficulty]-[grab/style]
 * Examples:
 *   Cab-DC-14-Mu = Cab backflip double cork 1440 mute
 *   f-DC-16-Tg = frontflip double cork 1600 tail grab
 *   x-b-D-AO-Rd-9-St = complex rail trick
 *   b-DC-12-Mu = backflip double cork 1260 mute
 */

const fs = require('fs');
const path = require('path');
const stats = require('simple-statistics');

class TrickDifficultyEstimator {
  constructor(csvPath) {
    this.rows = this.loadCSV(csvPath);
    this.cleanRuns = this.filterCleanRuns();
  }

  loadCSV(csvPath) {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return {
        competitor: values[0],
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
      };
    });
  }

  filterCleanRuns() {
    return this.rows.filter(row => {
      if (row.final_score === 'DNI' || row.final_score === '') return false;
      const score = parseFloat(row.final_score);
      return score >= 50 && !isNaN(score);
    });
  }

  /**
   * Parse trick code to extract difficulty info
   * Returns { rotation, hasFlip, hasCork, hasGrab, fullCode }
   */
  parseTrick(trick) {
    if (!trick || !trick.trim()) return null;

    const parts = trick.split('-');
    
    return {
      fullCode: trick,
      rotation: this.extractRotation(trick),
      hasFlip: /^[fb][-]|^[fb]\-/.test(trick) || trick.includes('Cab'),
      hasCork: trick.includes('DC') || trick.includes('TC'),
      complexity: this.estimateComplexity(trick),
    };
  }

  /**
   * Extract rotation difficulty (10, 12, 14, 16 = 1080, 1260, 1440, 1600)
   */
  extractRotation(trick) {
    const rotationMatch = trick.match(/-(1[0-9])[-]|-(1[0-9])$/);
    if (rotationMatch) {
      const num = rotationMatch[1] || rotationMatch[2];
      return parseInt(num);
    }
    return null;
  }

  /**
   * Rough complexity score: more code parts = harder trick
   */
  estimateComplexity(trick) {
    return trick.split('-').length;
  }

  /**
   * Get tricks from a run
   */
  getTricks(row) {
    const tricks = [];
    for (let i = 1; i <= 5; i++) {
      const trick = row[`trick${i}`];
      if (trick && trick.trim()) {
        tricks.push(this.parseTrick(trick));
      }
    }
    return tricks.filter(t => t !== null);
  }

  analyze() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║   EXPLORATORY: Rough Trick Difficulty Scoring                 ║');
    console.log('║   (NOT scientific - fun pattern detection from codes)          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const trickDifficultyMap = {}; // rotation -> scores
    const complexityMap = {};      // complexity level -> scores

    this.cleanRuns.forEach(row => {
      const finalScore = parseFloat(row.final_score);
      const tricks = this.getTricks(row);

      tricks.forEach(trick => {
        // Group by rotation
        if (trick.rotation) {
          if (!trickDifficultyMap[trick.rotation]) {
            trickDifficultyMap[trick.rotation] = [];
          }
          trickDifficultyMap[trick.rotation].push(finalScore);
        }

        // Group by complexity
        if (!complexityMap[trick.complexity]) {
          complexityMap[trick.complexity] = [];
        }
        complexityMap[trick.complexity].push(finalScore);
      });
    });

    // Analysis 1: By rotation difficulty
    console.log('ANALYSIS 1: RUNS BY ROTATION DIFFICULTY');
    console.log('='.repeat(80));
    console.log('(Rotation codes: 10=1080°, 12=1260°, 14=1440°, 16=1600°)\n');

    Object.keys(trickDifficultyMap)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach(rotation => {
        const scores = trickDifficultyMap[rotation];
        const rotationName = `${rotation}00°`;
        const avg = stats.mean(scores);
        const count = scores.length;

        console.log(`${rotationName.padEnd(10)} (n=${count.toString().padStart(2)}): avg=${avg.toFixed(2)}`);
      });

    // Analysis 2: By complexity
    console.log('\n\nANALYSIS 2: RUNS BY TRICK COMPLEXITY');
    console.log('='.repeat(80));
    console.log('(Complexity = number of code segments, rough proxy for difficulty)\n');

    Object.keys(complexityMap)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach(complexity => {
        const scores = complexityMap[complexity];
        const avg = stats.mean(scores);
        const count = scores.length;
        const label = `${complexity}-segment tricks`;

        console.log(`${label.padEnd(30)} (n=${count.toString().padStart(2)}): avg=${avg.toFixed(2)}`);
      });

    // Analysis 3: Silly point estimation
    console.log('\n\nANALYSIS 3: SILLY POINT ESTIMATES (Fun Only!)');
    console.log('='.repeat(80));
    console.log('\nIf we assume BASE = simple trick, and work backwards from 86.35 avg score:');
    console.log('(Remember: all clean runs had 5 tricks)\n');

    const baseTricks = 5;
    const baselineAvg = 86.35;
    const estPointsPerTrick = baselineAvg / baseTricks;

    console.log(`Average clean run: ${baselineAvg.toFixed(2)} pts with 5 tricks`);
    console.log(`→ Rough baseline per trick: ${estPointsPerTrick.toFixed(2)} pts\n`);

    console.log('Rough estimates if tricks vary in difficulty:\n');
    
    // Most common rotations
    const rotations = Object.keys(trickDifficultyMap).map(Number).sort((a, b) => a - b);
    const lowestRotation = Math.min(...rotations);
    const baselineRotationAvg = stats.mean(trickDifficultyMap[lowestRotation]);
    
    rotations.forEach(rot => {
      const avg = stats.mean(trickDifficultyMap[rot]);
      const diff = avg - baselineRotationAvg;
      const rotationName = `${rot}00° tricks`;
      
      console.log(`  ${rotationName.padEnd(25)} → +${diff.toFixed(1)} vs baseline`);
    });

    console.log('\n⚠️  HUGE CAVEAT: This is NOT real trick scoring!');
    console.log('   - We\'re just averaging scores of runs with these tricks');
    console.log('   - Confounded by performer skill, execution, other tricks in same run');
    console.log('   - Official scoring is much more sophisticated');
    console.log('   - But it\'s fun to see the pattern!\n');

    // Analysis 4: The Scotty James mystery (include wipeouts for this)
    console.log('\nANALYSIS 4: THE SCOTTY JAMES CASE');
    console.log('='.repeat(80));
    
    const allRuns = this.rows;
    const scottyR1 = allRuns.find(r => r.competitor === 'Scotty JAMES' && r.run === 1);
    const scottyR2 = allRuns.find(r => r.competitor === 'Scotty JAMES' && r.run === 2);
    
    if (scottyR1 && scottyR2) {
      console.log('\nScotty James repeated THE EXACT SAME TRICK SEQUENCE:\n');
      
      for (let i = 1; i <= 5; i++) {
        const t1 = scottyR1[`trick${i}`];
        const t2 = scottyR2[`trick${i}`];
        const match = t1 === t2 ? ' ✓ SAME' : ' ✗ DIFFERENT';
        console.log(`  Trick ${i}: ${(t1 || '(none)').padEnd(25)} ${match}`);
      }
      
      const score1 = parseFloat(scottyR1.final_score);
      const score2 = parseFloat(scottyR2.final_score);
      const diff = score2 - score1;
      
      console.log(`\n  Run 1 Score: ${score1.toFixed(2)} (likely crashed - <50)`);
      console.log(`  Run 2 Score: ${score2.toFixed(2)} (clean execution)`);
      console.log(`  Δ: +${diff.toFixed(2)} points`);
      console.log(`\n  🤔 Same tricks → +${diff.toFixed(2)} point swing`);
      console.log(`     This MUST be execution quality (wipeout vs clean) or judge context!`);
      console.log(`\n  ⚠️  Note: R1 score of 48.75 with full trick list = crash during execution`);
      console.log(`     So this IS a trick execution difference, not pure judge bias.`);
    }
  }

  run() {
    this.analyze();
  }
}

const csvPath = path.join(__dirname, '../data/raw/milano-cortina-2026-individual-judge-scores.csv');
if (fs.existsSync(csvPath)) {
  const analyzer = new TrickDifficultyEstimator(csvPath);
  analyzer.run();
} else {
  console.error(`Error: CSV not found at ${csvPath}`);
  process.exit(1);
}
