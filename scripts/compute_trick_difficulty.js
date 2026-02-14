/**
 * Trick Difficulty Scoring System
 * 
 * Parses trick codes from the individual judge scores CSV and computes
 * a numeric difficulty score for each trick and each run.
 * 
 * Trick code format: [spin]-[cork]-[rotation]-[grab]
 * Examples:
 *   Cab-DC-14-Mu = Cab + double cork + 1440° + mute grab
 *   f-TC-14-Tdr = frontside + triple cork + 1440° + tail drag
 *   x-b-D-AO-Rd-9-St = switch backside + alley-oop rodeo 900° + stalefish
 */

const fs = require('fs');
const path = require('path');
const stats = require('simple-statistics');

class TrickDifficultyScorer {
  constructor(csvPath) {
    this.rows = this.loadCSV(csvPath);
    this.trickCache = {};
  }

  loadCSV(csvPath) {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');

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
        medal: values[22],
        notes: values[23],
      };
    });
  }

  /**
   * Extract rotation from trick code by finding numeric segments.
   * Maps: 3→360, 7→720, 9→900, 10→1080, 12→1260, 14→1440, 16→1600
   */
  extractRotation(trick) {
    const parts = trick.split('-');
    const rotationMap = {
      3: 360, 5: 540, 7: 720, 9: 900,
      10: 1080, 12: 1260, 14: 1440, 16: 1600,
    };

    for (const part of parts) {
      const num = parseInt(part);
      if (!isNaN(num) && rotationMap[num] !== undefined) {
        return { code: num, degrees: rotationMap[num] };
      }
    }
    return { code: 0, degrees: 0 };
  }

  /**
   * Extract cork type: TC (triple), DC (double), SC (single), or none
   */
  extractCork(trick) {
    if (trick.includes('TC')) return { type: 'TC', label: 'triple cork', multiplier: 2.0 };
    if (trick.includes('DC')) return { type: 'DC', label: 'double cork', multiplier: 1.5 };
    if (trick.includes('SC')) return { type: 'SC', label: 'single cork', multiplier: 1.2 };
    return { type: 'none', label: 'no cork', multiplier: 1.0 };
  }

  /**
   * Extract spin direction
   */
  extractSpinDirection(trick) {
    if (trick.startsWith('Cab')) return { direction: 'Cab', isSwitch: true };
    if (trick.startsWith('x-')) return { direction: trick.split('-')[1] || 'switch', isSwitch: true };
    if (trick.startsWith('f-') || trick.startsWith('f')) return { direction: 'frontside', isSwitch: false };
    if (trick.startsWith('b-') || trick.startsWith('bs')) return { direction: 'backside', isSwitch: false };
    return { direction: 'unknown', isSwitch: false };
  }

  /**
   * Extract grab type from the last meaningful segment(s)
   */
  extractGrab(trick) {
    const knownGrabs = {
      'Mu': 'mute', 'Ng': 'nose grab', 'Jp': 'japan', 'Tdr': 'tail drag',
      'I': 'indy', 'St': 'stalefish', 'Ddr': 'double grab', 'Me': 'melon',
      'Tg': 'tail grab', 'Ste': 'stalefish extended',
    };

    const parts = trick.split('-');
    const grabs = [];
    const hasCombo = trick.includes('-to-');

    for (const part of parts) {
      if (knownGrabs[part]) {
        grabs.push({ code: part, name: knownGrabs[part] });
      }
    }

    return { grabs, hasCombo, count: grabs.length };
  }

  /**
   * Detect special elements (alley-oop, rodeo, McTwist, corkflip)
   */
  extractSpecials(trick) {
    const specials = [];
    if (trick.includes('AO')) specials.push({ code: 'AO', name: 'alley-oop', bonus: 1.0 });
    if (trick.includes('Rd')) specials.push({ code: 'Rd', name: 'rodeo', bonus: 1.0 });
    if (trick.includes('CF')) specials.push({ code: 'CF', name: 'corkflip', bonus: 1.0 });
    if (trick.includes('Mc')) specials.push({ code: 'Mc', name: 'McTwist', bonus: 1.5 });
    return specials;
  }

  /**
   * Compute difficulty score for a single trick
   */
  scoreTrick(trickCode) {
    if (!trickCode || !trickCode.trim()) return null;
    if (this.trickCache[trickCode]) return this.trickCache[trickCode];

    const rotation = this.extractRotation(trickCode);
    const cork = this.extractCork(trickCode);
    const spin = this.extractSpinDirection(trickCode);
    const grab = this.extractGrab(trickCode);
    const specials = this.extractSpecials(trickCode);

    // Base rotation score (primary difficulty driver)
    const rotationScoreMap = {
      0: 0.5, 360: 1.0, 540: 1.5, 720: 2.0, 900: 3.0,
      1080: 4.0, 1260: 5.0, 1440: 6.0, 1600: 7.0,
    };
    const rotationScore = rotationScoreMap[rotation.degrees] || 0.5;

    // Cork multiplier
    const corkedScore = rotationScore * cork.multiplier;

    // Switch bonus
    const switchBonus = spin.isSwitch ? 0.5 : 0;

    // Grab bonus
    const grabBonus = grab.count > 0 ? 0.5 : 0;
    const comboBonus = grab.hasCombo ? 0.5 : 0;

    // Special moves bonus
    const specialsBonus = specials.reduce((sum, s) => sum + s.bonus, 0);

    const totalDifficulty = corkedScore + switchBonus + grabBonus + comboBonus + specialsBonus;

    const result = {
      trickCode,
      rotation,
      cork,
      spinDirection: spin,
      grab,
      specials,
      scores: {
        rotationBase: rotationScore,
        corkMultiplied: corkedScore,
        switchBonus,
        grabBonus,
        comboBonus,
        specialsBonus,
        totalDifficulty,
      },
      complexity: trickCode.split('-').length,
    };

    this.trickCache[trickCode] = result;
    return result;
  }

  /**
   * Score all tricks in a run and compute run total difficulty
   */
  scoreRun(row) {
    const tricks = [];
    for (let i = 1; i <= 5; i++) {
      const trickCode = row[`trick${i}`];
      if (trickCode && trickCode.trim()) {
        tricks.push(this.scoreTrick(trickCode));
      }
    }

    const totalDifficulty = tricks.reduce((sum, t) => sum + (t ? t.scores.totalDifficulty : 0), 0);
    const avgDifficulty = tricks.length > 0 ? totalDifficulty / tricks.length : 0;
    const maxDifficulty = tricks.length > 0 ? Math.max(...tricks.map(t => t.scores.totalDifficulty)) : 0;

    return {
      tricks,
      trickCount: tricks.length,
      totalDifficulty,
      avgDifficulty,
      maxDifficulty,
    };
  }

  run() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║   TRICK DIFFICULTY SCORING SYSTEM                             ║');
    console.log('║   Computing difficulty scores from trick codes                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Score all unique tricks
    const allTricks = new Set();
    this.rows.forEach(row => {
      for (let i = 1; i <= 5; i++) {
        const trick = row[`trick${i}`];
        if (trick && trick.trim()) allTricks.add(trick.trim());
      }
    });

    console.log(`Found ${allTricks.size} unique trick codes\n`);

    // Build trick difficulty table
    const trickScores = [];
    allTricks.forEach(trickCode => {
      const scored = this.scoreTrick(trickCode);
      trickScores.push(scored);
    });

    // Sort by difficulty
    trickScores.sort((a, b) => b.scores.totalDifficulty - a.scores.totalDifficulty);

    console.log('TOP 15 HARDEST TRICKS:');
    console.log('='.repeat(80));
    trickScores.slice(0, 15).forEach((t, i) => {
      const rot = t.rotation.degrees > 0 ? `${t.rotation.degrees}°` : 'N/A';
      console.log(`  ${(i + 1).toString().padStart(2)}. ${t.trickCode.padEnd(30)} difficulty=${t.scores.totalDifficulty.toFixed(1).padStart(5)} rot=${rot.padStart(6)} cork=${t.cork.type.padEnd(4)}`);
    });

    // Score all runs
    console.log('\n\nRUN DIFFICULTY SCORES:');
    console.log('='.repeat(80));

    const runScores = [];
    this.rows.forEach(row => {
      const runScore = this.scoreRun(row);
      const isClean = row.final_score !== 'DNI' && row.final_score !== '' &&
                      parseFloat(row.final_score) >= 50;

      runScores.push({
        competitor: row.competitor,
        run: row.run,
        finalScore: row.final_score,
        isClean,
        ...runScore,
      });

      const scoreStr = row.final_score === 'DNI' ? 'DNI  ' : parseFloat(row.final_score).toFixed(2).padStart(5);
      console.log(`  ${row.competitor.padEnd(25)} R${row.run} score=${scoreStr} difficulty=${runScore.totalDifficulty.toFixed(1).padStart(5)} (${runScore.trickCount} tricks, avg=${runScore.avgDifficulty.toFixed(1)})`);
    });

    // Correlation analysis (clean runs only)
    const cleanRuns = runScores.filter(r => r.isClean);
    console.log(`\n\nDIFFICULTY vs SCORE CORRELATION (n=${cleanRuns.length} clean runs):`);
    console.log('='.repeat(80));

    if (cleanRuns.length >= 3) {
      const scores = cleanRuns.map(r => parseFloat(r.finalScore));
      const difficulties = cleanRuns.map(r => r.totalDifficulty);

      const correlation = stats.sampleCorrelation(difficulties, scores);
      console.log(`  Pearson r = ${correlation.toFixed(3)}`);
      console.log(`  Interpretation: ${Math.abs(correlation) < 0.3 ? 'Weak' : Math.abs(correlation) < 0.6 ? 'Moderate' : 'Strong'} ${correlation > 0 ? 'positive' : 'negative'} correlation`);
      console.log(`  (Higher difficulty ${correlation > 0 ? '→ higher' : '→ lower'} scores)`);
    }

    // Save trick difficulty CSV
    const trickCsvLines = ['trick_code,rotation_degrees,cork_type,cork_multiplier,switch,specials,grab_count,complexity,difficulty_score'];
    trickScores.forEach(t => {
      trickCsvLines.push([
        t.trickCode,
        t.rotation.degrees,
        t.cork.type,
        t.cork.multiplier,
        t.spinDirection.isSwitch,
        t.specials.map(s => s.code).join(';') || 'none',
        t.grab.count,
        t.complexity,
        t.scores.totalDifficulty.toFixed(2),
      ].join(','));
    });

    const processedDir = path.join(__dirname, '../data/processed');
    fs.writeFileSync(
      path.join(processedDir, 'trick_difficulty_scores.csv'),
      trickCsvLines.join('\n')
    );
    console.log(`\n✓ Trick scores saved to data/processed/trick_difficulty_scores.csv`);

    // Save enriched judge scores CSV (adding difficulty columns)
    const enrichedLines = [];
    const originalContent = fs.readFileSync(
      path.join(__dirname, '../data/raw/milano-cortina-2026-individual-judge-scores.csv'),
      'utf8'
    );
    const originalLines = originalContent.trim().split('\n');
    enrichedLines.push(originalLines[0] + ',total_difficulty,avg_difficulty,max_difficulty,trick_count');

    this.rows.forEach((row, i) => {
      const runScore = this.scoreRun(row);
      enrichedLines.push(
        originalLines[i + 1] +
        `,${runScore.totalDifficulty.toFixed(2)},${runScore.avgDifficulty.toFixed(2)},${runScore.maxDifficulty.toFixed(2)},${runScore.trickCount}`
      );
    });

    fs.writeFileSync(
      path.join(processedDir, 'enriched-judge-scores.csv'),
      enrichedLines.join('\n')
    );
    console.log(`✓ Enriched scores saved to data/processed/enriched-judge-scores.csv`);

    // Save JSON results
    const output = {
      timestamp: new Date().toISOString(),
      description: 'Trick difficulty scoring based on rotation, cork type, switch, grabs, and special moves',
      uniqueTricks: trickScores.length,
      cleanRuns: cleanRuns.length,
      scoringSystem: {
        rotationBase: '360°=1, 720°=2, 900°=3, 1080°=4, 1260°=5, 1440°=6, 1600°=7',
        corkMultiplier: 'none=1.0, SC=1.2, DC=1.5, TC=2.0',
        switchBonus: '+0.5 for Cab or x- prefix',
        grabBonus: '+0.5 per grab, +0.5 for combo grabs',
        specialsBonus: 'AO=+1.0, Rd=+1.0, CF=+1.0, Mc=+1.5',
      },
      trickScores: trickScores.map(t => ({
        code: t.trickCode,
        difficulty: t.scores.totalDifficulty,
        rotation: t.rotation.degrees,
        cork: t.cork.type,
        complexity: t.complexity,
      })),
      runScores: runScores.map(r => ({
        competitor: r.competitor,
        run: r.run,
        finalScore: r.finalScore,
        isClean: r.isClean,
        totalDifficulty: r.totalDifficulty,
        avgDifficulty: r.avgDifficulty,
        trickCount: r.trickCount,
      })),
      correlation: cleanRuns.length >= 3 ? {
        pearsonR: stats.sampleCorrelation(
          cleanRuns.map(r => r.totalDifficulty),
          cleanRuns.map(r => parseFloat(r.finalScore))
        ),
        note: 'Correlation between total trick difficulty and final score for clean runs',
      } : null,
    };

    fs.writeFileSync(
      path.join(__dirname, '../results/trick_difficulty_scores.json'),
      JSON.stringify(output, null, 2)
    );
    console.log(`✓ Results saved to results/trick_difficulty_scores.json\n`);
  }
}

const csvPath = path.join(__dirname, '../data/raw/milano-cortina-2026-individual-judge-scores.csv');
if (fs.existsSync(csvPath)) {
  const scorer = new TrickDifficultyScorer(csvPath);
  scorer.run();
} else {
  console.error(`Error: CSV not found at ${csvPath}`);
  process.exit(1);
}
