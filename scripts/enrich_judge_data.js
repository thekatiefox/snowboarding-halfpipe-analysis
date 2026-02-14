/**
 * Judge-Level Data Enrichment
 * 
 * Processes individual judge scores to create a per-judge analysis dataset:
 * - Which judge was excluded (high/low) on each run
 * - Each judge's deviation from panel mean
 * - Judge nationality vs competitor nationality (home bias check)
 * - Judge consistency metrics
 */

const fs = require('fs');
const path = require('path');
const stats = require('simple-statistics');

class JudgeDataEnricher {
  constructor(scoresCsvPath, judgesCsvPath) {
    this.rows = this.loadScoresCSV(scoresCsvPath);
    this.judges = this.loadJudgesCSV(judgesCsvPath);
  }

  loadScoresCSV(csvPath) {
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
        judges: [
          { num: 1, country: values[5], score: values[6] },
          { num: 2, country: values[7], score: values[8] },
          { num: 3, country: values[9], score: values[10] },
          { num: 4, country: values[11], score: values[12] },
          { num: 5, country: values[13], score: values[14] },
          { num: 6, country: values[15], score: values[16] },
        ],
        notes: values[23] || '',
      };
    });
  }

  loadJudgesCSV(csvPath) {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');

    const judges = {};
    lines.slice(1).forEach(line => {
      const values = line.split(',');
      judges[parseInt(values[0])] = {
        number: parseInt(values[0]),
        name: values[1],
        countryCode: values[2],
        country: values[3],
        role: values[4],
      };
    });
    return judges;
  }

  /**
   * Determine which judges were excluded (high/low) for a run
   */
  findExcludedJudges(judgeScores) {
    const validScores = judgeScores
      .filter(j => j.score !== '' && !isNaN(parseFloat(j.score)))
      .map(j => ({ ...j, scoreNum: parseFloat(j.score) }));

    if (validScores.length < 4) return { excluded: [], middle4: [] };

    const sorted = [...validScores].sort((a, b) => a.scoreNum - b.scoreNum);
    const lowest = sorted[0];
    const highest = sorted[sorted.length - 1];

    const excluded = [];
    const middle4 = [];

    // Handle ties: find which judges were actually excluded
    let lowExcluded = false, highExcluded = false;

    sorted.forEach((judge, idx) => {
      if (idx === 0 && !lowExcluded) {
        excluded.push({ ...judge, reason: 'low' });
        lowExcluded = true;
      } else if (idx === sorted.length - 1 && !highExcluded) {
        excluded.push({ ...judge, reason: 'high' });
        highExcluded = true;
      } else {
        middle4.push(judge);
      }
    });

    return { excluded, middle4 };
  }

  /**
   * Check if judge shares nationality with competitor
   */
  sameNationality(judgeCountryCode, competitorCountry) {
    const countryMap = {
      'SLO': 'SLO', 'GBR': 'GBR', 'SWE': 'SWE',
      'SUI': 'SUI', 'FRA': 'FRA', 'JPN': 'JPN',
    };
    return judgeCountryCode === competitorCountry;
  }

  run() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║   JUDGE-LEVEL DATA ENRICHMENT                                 ║');
    console.log('║   Per-judge exclusions, deviations, and nationality analysis  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const enrichedRows = [];
    const judgeStats = {};  // Track per-judge aggregate stats
    const nationalityBias = { same: [], different: [] };

    // Initialize judge stats
    for (let j = 1; j <= 6; j++) {
      judgeStats[j] = {
        name: this.judges[j].name,
        country: this.judges[j].countryCode,
        scores: [],
        deviations: [],
        excludedAsHigh: 0,
        excludedAsLow: 0,
        totalScoredRuns: 0,
        sameNationalityScores: [],
        diffNationalityScores: [],
      };
    }

    // Process each run
    const scoredRuns = this.rows.filter(row =>
      row.final_score !== 'DNI' && row.final_score !== '' && !isNaN(parseFloat(row.final_score))
    );

    console.log(`Processing ${scoredRuns.length} scored runs (excluding ${this.rows.length - scoredRuns.length} DNI)\n`);

    scoredRuns.forEach(row => {
      const validScores = row.judges
        .filter(j => j.score !== '' && !isNaN(parseFloat(j.score)))
        .map(j => parseFloat(j.score));

      if (validScores.length === 0) return;

      const panelMean = stats.mean(validScores);
      const { excluded, middle4 } = this.findExcludedJudges(row.judges);

      const excludedNums = new Set(excluded.map(e => e.num));

      row.judges.forEach(judge => {
        const scoreNum = parseFloat(judge.score);
        if (isNaN(scoreNum)) return;

        const judgeNum = judge.num;
        const judgeMeta = this.judges[judgeNum];
        const deviation = scoreNum - panelMean;
        const isExcluded = excludedNums.has(judgeNum);
        const excludedReason = excluded.find(e => e.num === judgeNum)?.reason || 'none';
        const isSameNationality = this.sameNationality(judgeMeta.countryCode, row.country);

        enrichedRows.push({
          competitor: row.competitor,
          competitorCountry: row.country,
          run: row.run,
          finalScore: parseFloat(row.final_score),
          judgeNumber: judgeNum,
          judgeName: judgeMeta.name,
          judgeCountry: judgeMeta.countryCode,
          score: scoreNum,
          panelMean: panelMean,
          deviation: deviation,
          excluded: isExcluded,
          excludedReason: excludedReason,
          sameNationality: isSameNationality,
        });

        // Aggregate judge stats
        judgeStats[judgeNum].scores.push(scoreNum);
        judgeStats[judgeNum].deviations.push(deviation);
        judgeStats[judgeNum].totalScoredRuns++;
        if (excludedReason === 'high') judgeStats[judgeNum].excludedAsHigh++;
        if (excludedReason === 'low') judgeStats[judgeNum].excludedAsLow++;

        if (isSameNationality) {
          judgeStats[judgeNum].sameNationalityScores.push(deviation);
          nationalityBias.same.push(deviation);
        } else {
          judgeStats[judgeNum].diffNationalityScores.push(deviation);
          nationalityBias.different.push(deviation);
        }
      });
    });

    // Print judge summary
    console.log('JUDGE SUMMARY:');
    console.log('='.repeat(80));
    for (let j = 1; j <= 6; j++) {
      const js = judgeStats[j];
      const avgDev = js.deviations.length > 0 ? stats.mean(js.deviations) : 0;
      const stdDev = js.deviations.length > 1 ? stats.standardDeviation(js.deviations) : 0;

      console.log(`\n  Judge ${j}: ${js.name} (${js.country})`);
      console.log(`    Scored runs: ${js.totalScoredRuns}`);
      console.log(`    Avg deviation from panel: ${avgDev > 0 ? '+' : ''}${avgDev.toFixed(2)} (σ=${stdDev.toFixed(2)})`);
      console.log(`    Excluded as HIGH: ${js.excludedAsHigh} times`);
      console.log(`    Excluded as LOW: ${js.excludedAsLow} times`);

      if (js.sameNationalityScores.length > 0) {
        const sameAvg = stats.mean(js.sameNationalityScores);
        const diffAvg = js.diffNationalityScores.length > 0 ? stats.mean(js.diffNationalityScores) : 0;
        console.log(`    Same nationality deviation: ${sameAvg > 0 ? '+' : ''}${sameAvg.toFixed(2)} (n=${js.sameNationalityScores.length})`);
        console.log(`    Diff nationality deviation: ${diffAvg > 0 ? '+' : ''}${diffAvg.toFixed(2)} (n=${js.diffNationalityScores.length})`);
        console.log(`    Home bias indicator: ${(sameAvg - diffAvg) > 0 ? '⚠️ +' : ''}${(sameAvg - diffAvg).toFixed(2)} pts`);
      }
    }

    // Nationality bias summary
    console.log('\n\nNATIONALITY BIAS SUMMARY:');
    console.log('='.repeat(80));
    if (nationalityBias.same.length > 0 && nationalityBias.different.length > 0) {
      const sameAvg = stats.mean(nationalityBias.same);
      const diffAvg = stats.mean(nationalityBias.different);
      console.log(`  Same nationality avg deviation: ${sameAvg > 0 ? '+' : ''}${sameAvg.toFixed(3)} (n=${nationalityBias.same.length})`);
      console.log(`  Diff nationality avg deviation: ${diffAvg > 0 ? '+' : ''}${diffAvg.toFixed(3)} (n=${nationalityBias.different.length})`);
      console.log(`  Overall home bias: ${(sameAvg - diffAvg) > 0 ? '+' : ''}${(sameAvg - diffAvg).toFixed(3)} pts`);
    }

    // Save CSV
    const csvLines = ['competitor,competitor_country,run,final_score,judge_number,judge_name,judge_country,score,panel_mean,deviation,excluded,excluded_reason,same_nationality'];
    enrichedRows.forEach(r => {
      csvLines.push([
        r.competitor, r.competitorCountry, r.run, r.finalScore,
        r.judgeNumber, r.judgeName, r.judgeCountry,
        r.score, r.panelMean.toFixed(2), r.deviation.toFixed(2),
        r.excluded, r.excludedReason, r.sameNationality,
      ].join(','));
    });

    const processedDir = path.join(__dirname, '../data/processed');
    fs.writeFileSync(
      path.join(processedDir, 'judge_analysis_data.csv'),
      csvLines.join('\n')
    );
    console.log(`\n✓ Judge data saved to data/processed/judge_analysis_data.csv`);

    // Save JSON results
    const output = {
      timestamp: new Date().toISOString(),
      description: 'Per-judge analysis: exclusions, deviations, nationality bias',
      scoredRuns: scoredRuns.length,
      totalJudgeScores: enrichedRows.length,
      judgeProfiles: Object.entries(judgeStats).map(([num, js]) => ({
        judgeNumber: parseInt(num),
        name: js.name,
        country: js.country,
        totalScoredRuns: js.totalScoredRuns,
        avgDeviation: js.deviations.length > 0 ? stats.mean(js.deviations) : 0,
        stdDeviation: js.deviations.length > 1 ? stats.standardDeviation(js.deviations) : 0,
        excludedAsHigh: js.excludedAsHigh,
        excludedAsLow: js.excludedAsLow,
        sameNationalityScoringCount: js.sameNationalityScores.length,
        sameNationalityAvgDeviation: js.sameNationalityScores.length > 0 ? stats.mean(js.sameNationalityScores) : null,
        diffNationalityAvgDeviation: js.diffNationalityScores.length > 0 ? stats.mean(js.diffNationalityScores) : null,
      })),
      nationalityBiasSummary: {
        sameNationalityAvgDeviation: nationalityBias.same.length > 0 ? stats.mean(nationalityBias.same) : null,
        diffNationalityAvgDeviation: nationalityBias.different.length > 0 ? stats.mean(nationalityBias.different) : null,
        sameCount: nationalityBias.same.length,
        diffCount: nationalityBias.different.length,
      },
    };

    fs.writeFileSync(
      path.join(__dirname, '../results/judge_analysis.json'),
      JSON.stringify(output, null, 2)
    );
    console.log(`✓ Results saved to results/judge_analysis.json\n`);
  }
}

const scoresCsvPath = path.join(__dirname, '../data/raw/milano-cortina-2026-individual-judge-scores.csv');
const judgesCsvPath = path.join(__dirname, '../data/raw/judges-metadata.csv');

if (fs.existsSync(scoresCsvPath) && fs.existsSync(judgesCsvPath)) {
  const enricher = new JudgeDataEnricher(scoresCsvPath, judgesCsvPath);
  enricher.run();
} else {
  console.error('Error: Required CSV files not found');
  process.exit(1);
}
