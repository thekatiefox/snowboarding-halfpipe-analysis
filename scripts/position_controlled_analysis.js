/**
 * Phase 2: Qualifying Position-Controlled Analysis
 * 
 * Question: Is the relief effect real, or is it just because better-qualified
 * competitors naturally score higher AND are more likely to recover after wipeouts?
 * 
 * Approach: Break down recovery effect by qualifier groups (top, middle, bottom).
 * If relief effect is real, recovery scores should be elevated within each group.
 * If it's just skill effect, recovery and baseline will be similar within groups.
 */

const fs = require('fs');
const path = require('path');
const stats = require('simple-statistics');

class PositionControlledAnalyzer {
  constructor(csvPath) {
    this.competitors = this.loadCSV(csvPath);
    
    // Group qualifiers by performance tier
    this.tiers = this.groupByQualifyingTier();
  }

  /**
   * Load CSV data
   */
  loadCSV(csvPath) {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');

    return lines.slice(1).map(line => {
      const values = line.split(',');
      return {
        performance_order: parseInt(values[0]),
        name: values[1].trim(),
        country: values[2].trim(),
        final_rank: parseInt(values[3]),
        qual_score: parseFloat(values[4]),
        run1: parseFloat(values[5]),
        run2: parseFloat(values[6]),
        run3: parseFloat(values[7]),
        best_score: parseFloat(values[8]),
        notes: values[9] || '',
      };
    });
  }

  /**
   * Group competitors into tiers by qualifying position (skill level)
   * Position 1-4: Bottom tier (worst qualifiers)
   * Position 5-8: Middle tier
   * Position 9-12: Top tier (best qualifiers)
   */
  groupByQualifyingTier() {
    return {
      bottom: this.competitors.filter(c => c.performance_order <= 4),      // Pos 1-4
      middle: this.competitors.filter(c => c.performance_order >= 5 && c.performance_order <= 8),
      top: this.competitors.filter(c => c.performance_order >= 9),         // Pos 9-12
    };
  }

  /**
   * Analyze recovery effect within each qualifying tier
   */
  analyzeRecoveryByTier() {
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 2: RECOVERY EFFECT BY QUALIFYING POSITION');
    console.log('='.repeat(80));

    const results = {};

    Object.entries(this.tiers).forEach(([tier, competitors]) => {
      const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
      
      // Collect all clean runs and recovery runs for this tier
      const allCleanRuns = [];
      const recoveryRuns = [];
      const baselineRuns = [];

      competitors.forEach(comp => {
        // Process each round's performance
        [1, 2, 3].forEach(round => {
          const score = comp[`run${round}`];
          if (score !== null && score !== undefined && score !== '' && !isNaN(score) && score >= 50) {
            // This is a clean run
            allCleanRuns.push({
              score,
              competitor: comp.name,
              round,
              performance_order: comp.performance_order,
            });

            // Check if there were wipeouts earlier in this round (within-round only)
            const earlier_scores = [];
            for (let i = 1; i < comp.performance_order; i++) {
              const earlier = this.competitors[i - 1];
              const earlier_round_score = earlier[`run${round}`];
              if (earlier_round_score !== null && earlier_round_score !== undefined && earlier_round_score !== '' && !isNaN(earlier_round_score)) {
                earlier_scores.push(earlier_round_score);
              }
            }

            const wipeout_count = earlier_scores.filter(s => s < 50).length;
            
            if (wipeout_count > 0) {
              recoveryRuns.push({
                score,
                competitor: comp.name,
                round,
                wipeouts_before: wipeout_count,
                performance_order: comp.performance_order,
              });
            } else {
              baselineRuns.push({
                score,
                competitor: comp.name,
                round,
                performance_order: comp.performance_order,
              });
            }
          }
        });
      });

      const cleanScores = allCleanRuns.map(r => r.score);
      const recoveryScores = recoveryRuns.map(r => r.score);
      const baselineScores = baselineRuns.map(r => r.score);

      const cleanMean = cleanScores.length > 0 ? stats.mean(cleanScores) : 0;
      const cleanStd = cleanScores.length > 0 ? stats.standardDeviation(cleanScores) : 0;

      const recoveryMean = recoveryScores.length > 0 ? stats.mean(recoveryScores) : 0;
      const recoveryStd = recoveryScores.length > 0 ? stats.standardDeviation(recoveryScores) : 0;

      const baselineMean = baselineScores.length > 0 ? stats.mean(baselineScores) : 0;
      const baselineStd = baselineScores.length > 0 ? stats.standardDeviation(baselineScores) : 0;

      const relief_bonus = recoveryMean - baselineMean;

      console.log(`\n${tierLabel} Tier (Positions ${tier === 'bottom' ? '1-4' : tier === 'middle' ? '5-8' : '9-12'}):`);
      console.log(`  Qualifying Score Range: ${stats.min(competitors.map(c => c.qual_score)).toFixed(2)} - ${stats.max(competitors.map(c => c.qual_score)).toFixed(2)}`);
      console.log(`  Competitors: ${competitors.map(c => c.name).join(', ')}`);
      console.log(`\n  All Clean Runs (n=${cleanScores.length}):`);
      console.log(`    Mean: ${cleanMean.toFixed(2)} ± ${cleanStd.toFixed(2)}`);
      
      console.log(`\n  Baseline Runs (no wipeouts before; n=${baselineScores.length}):`);
      console.log(`    Mean: ${baselineMean.toFixed(2)} ± ${baselineStd.toFixed(2)}`);
      
      console.log(`\n  Recovery Runs (≥1 wipeout before; n=${recoveryScores.length}):`);
      console.log(`    Mean: ${recoveryMean.toFixed(2)} ± ${recoveryStd.toFixed(2)}`);
      
      console.log(`\n  Relief Bonus: ${relief_bonus > 0 ? '⬆️' : '⬇️'} ${relief_bonus.toFixed(2)} points`);
      
      if (recoveryRuns.length > 0) {
        console.log(`\n  Recovery Details:`);
        recoveryRuns.forEach(run => {
          const diff = run.score - baselineMean;
          console.log(`    R${run.round}: ${run.competitor} ${run.score.toFixed(2)} (${run.wipeouts_before} wipeouts before) [${diff > 0 ? '+' : ''}${diff.toFixed(2)} vs baseline]`);
        });
      }

      results[tier] = {
        n_competitors: competitors.map(c => c.name),
        all_clean: { count: cleanScores.length, mean: cleanMean, stdDev: cleanStd },
        baseline: { count: baselineScores.length, mean: baselineMean, stdDev: baselineStd },
        recovery: { count: recoveryScores.length, mean: recoveryMean, stdDev: recoveryStd },
        relief_bonus: relief_bonus,
        recovery_runs: recoveryRuns,
      };
    });

    return results;
  }

  /**
   * Compare relief effect across tiers
   */
  compareReliefEffect(results) {
    console.log('\n' + '='.repeat(80));
    console.log('CROSS-TIER COMPARISON: IS RELIEF EFFECT CONSISTENT?');
    console.log('='.repeat(80));

    const bonuses = {
      'Bottom Qualifiers (1-4)': results.bottom.relief_bonus,
      'Middle Qualifiers (5-8)': results.middle.relief_bonus,
      'Top Qualifiers (9-12)': results.top.relief_bonus,
    };

    console.log('\nRelief Bonus by Tier:');
    Object.entries(bonuses).forEach(([tier, bonus]) => {
      const indicator = bonus > 0 ? '✓' : '✗';
      console.log(`  ${indicator} ${tier}: ${bonus > 0 ? '+' : ''}${bonus.toFixed(2)} points`);
    });

    // Check if effect is consistent
    const effects = Object.values(bonuses);
    const allPositive = effects.every(e => e > 0);
    const allNegative = effects.every(e => e < 0);

    console.log(`\nInterpretation:`);
    if (allPositive) {
      console.log(`  ✓ CONSISTENT: Relief effect appears in all tiers`);
      console.log(`    → Suggests judges apply relief bias across skill levels`);
      console.log(`    → Effect is NOT just "better competitors score higher"`);
    } else if (allNegative) {
      console.log(`  ✗ REVERSED: Penalty effect in all tiers`);
    } else {
      console.log(`  ⚠ MIXED: Effect varies by tier`);
      const topBonus = bonuses['Top Qualifiers (9-12)'];
      const bottomBonus = bonuses['Bottom Qualifiers (1-4)'];
      if (topBonus > bottomBonus) {
        console.log(`    → Top qualifiers get larger relief bonus (+${topBonus.toFixed(2)} vs +${bottomBonus.toFixed(2)})`);
        console.log(`    → Could indicate judge psychology varies by competitor skill level`);
      } else {
        console.log(`    → Bottom qualifiers get larger relief bonus`);
      }
    }
  }

  /**
   * Analyze wipeout composition by tier
   */
  analyzeWipeoutRates() {
    console.log('\n' + '='.repeat(80));
    console.log('WIPEOUT RATES BY TIER');
    console.log('='.repeat(80));

    Object.entries(this.tiers).forEach(([tier, competitors]) => {
      const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
      
      let totalRuns = 0;
      let wipeouts = 0;

      competitors.forEach(comp => {
        [1, 2, 3].forEach(round => {
          const score = comp[`run${round}`];
          if (score !== null && score !== undefined) {
            totalRuns++;
            if (score < 50) {
              wipeouts++;
            }
          }
        });
      });

      const wipeoutRate = totalRuns > 0 ? (wipeouts / totalRuns * 100) : 0;
      console.log(`\n${tierLabel} Tier: ${wipeouts}/${totalRuns} runs (${wipeoutRate.toFixed(1)}%)`);
    });
  }

  run() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║   QUALIFYING POSITION CONTROL ANALYSIS                        ║');
    console.log('║   Testing: Is relief effect real or just skill effect?        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    const results = this.analyzeRecoveryByTier();
    this.compareReliefEffect(results);
    this.analyzeWipeoutRates();

    // Save results
    const output = {
      timestamp: new Date().toISOString(),
      analysis: results,
    };

    fs.writeFileSync(
      path.join(__dirname, '../results/position_controlled_analysis.json'),
      JSON.stringify(output, null, 2)
    );

    console.log(`\n✓ Results saved to results/position_controlled_analysis.json\n`);
  }
}

// Run analysis
const csvPath = path.join(__dirname, '../data/raw/milano-cortina-2026-mens-halfpipe.csv');
if (fs.existsSync(csvPath)) {
  const analyzer = new PositionControlledAnalyzer(csvPath);
  analyzer.run();
} else {
  console.error(`Error: CSV not found at ${csvPath}`);
  process.exit(1);
}
