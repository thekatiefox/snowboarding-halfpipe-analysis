/**
 * Master Data Pipeline
 * 
 * Merges all enriched data into a single comprehensive dataset:
 * 1. Original individual judge scores
 * 2. DNI resolution (crash vs strategic skip)
 * 3. Trick difficulty scores
 * 4. Judge analysis data
 * 
 * Output: data/processed/master_enriched_dataset.csv
 */

const fs = require('fs');
const path = require('path');

class MasterDataPipeline {
  constructor() {
    this.rawDir = path.join(__dirname, '../data/raw');
    this.processedDir = path.join(__dirname, '../data/processed');
  }

  loadCSV(filePath) {
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠ File not found: ${filePath}`);
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((h, i) => {
        row[h.trim()] = values[i]?.trim();
      });
      return row;
    });
  }

  run() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║   MASTER DATA PIPELINE                                        ║');
    console.log('║   Merging all enriched data into one dataset                  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // 1. Load base data (enriched judge scores with difficulty)
    console.log('Loading data sources...');
    const enrichedPath = path.join(this.processedDir, 'enriched-judge-scores.csv');
    let baseData;

    if (fs.existsSync(enrichedPath)) {
      const content = fs.readFileSync(enrichedPath, 'utf8');
      const lines = content.trim().split('\n');
      const headers = lines[0].split(',');
      baseData = lines.slice(1).map(line => {
        const values = line.split(',');
        const row = {};
        headers.forEach((h, i) => {
          row[h.trim()] = values[i]?.trim();
        });
        return row;
      });
      console.log(`  ✓ Enriched judge scores: ${baseData.length} rows`);
    } else {
      console.log('  ✗ enriched-judge-scores.csv not found, run compute_trick_difficulty.js first');
      process.exit(1);
    }

    // 2. Load DNI resolution
    const dniData = this.loadCSV(path.join(this.processedDir, 'dni_resolved.csv'));
    const dniMap = {};
    if (dniData) {
      dniData.forEach(row => {
        const key = `${row.competitor}-${row.run}`;
        dniMap[key] = {
          dni_reason: row.dni_reason,
          dni_source: row.source?.replace(/"/g, ''),
          dni_confidence: row.confidence,
        };
      });
      console.log(`  ✓ DNI resolution: ${dniData.length} cases`);
    }

    // 3. Load judge analysis summary
    const judgeData = this.loadCSV(path.join(this.processedDir, 'judge_analysis_data.csv'));
    console.log(`  ✓ Judge analysis: ${judgeData ? judgeData.length : 0} rows`);

    // 4. Load overview data for qualifying scores
    const overviewData = this.loadCSV(path.join(this.rawDir, 'milano-cortina-2026-mens-halfpipe.csv'));
    const overviewMap = {};
    if (overviewData) {
      overviewData.forEach(row => {
        overviewMap[row.competitor] = {
          qual_score: row.qual_score,
          final_rank: row.final_rank,
          best_score: row.best_score,
        };
      });
      console.log(`  ✓ Overview data: ${overviewData.length} competitors`);
    }

    // 5. Merge everything
    console.log('\nMerging datasets...');

    const masterRows = baseData.map(row => {
      const runNum = row.run;
      const dniKey = `${row.competitor}-${runNum}`;
      const dni = dniMap[dniKey] || {};
      const overview = overviewMap[row.competitor] || {};

      // Determine run status
      let status;
      const score = parseFloat(row.final_score);
      if (row.final_score === 'DNI') {
        status = dni.dni_reason || 'dni_unknown';
      } else if (!isNaN(score) && score >= 50) {
        status = 'clean';
      } else if (!isNaN(score) && score < 50) {
        status = 'wipeout';
      } else {
        status = 'unknown';
      }

      // Compute tier
      const position = parseInt(row.position);
      let tier;
      if (position <= 4) tier = 'bottom';
      else if (position <= 8) tier = 'middle';
      else tier = 'top';

      return {
        // Original columns
        competitor: row.competitor,
        country: row.country,
        position: row.position,
        run: row.run,
        final_score: row.final_score,
        // Individual judge scores
        judge1_score: row.judge1_score,
        judge2_score: row.judge2_score,
        judge3_score: row.judge3_score,
        judge4_score: row.judge4_score,
        judge5_score: row.judge5_score,
        judge6_score: row.judge6_score,
        // Tricks
        trick1: row.trick1,
        trick2: row.trick2,
        trick3: row.trick3,
        trick4: row.trick4,
        trick5: row.trick5,
        // Medal and notes
        medal: row.medal,
        notes: row.notes,
        // NEW: Trick difficulty
        total_difficulty: row.total_difficulty,
        avg_difficulty: row.avg_difficulty,
        max_difficulty: row.max_difficulty,
        trick_count: row.trick_count,
        // NEW: DNI resolution
        run_status: status,
        dni_reason: dni.dni_reason || '',
        dni_confidence: dni.dni_confidence || '',
        // NEW: Overview data
        qual_score: overview.qual_score || '',
        final_rank: overview.final_rank || '',
        tier,
      };
    });

    // Save master CSV
    const headers = Object.keys(masterRows[0]);
    const csvLines = [headers.join(',')];
    masterRows.forEach(row => {
      csvLines.push(headers.map(h => row[h] || '').join(','));
    });

    const masterPath = path.join(this.processedDir, 'master_enriched_dataset.csv');
    fs.writeFileSync(masterPath, csvLines.join('\n'));

    // Print summary
    console.log('\nMASTER DATASET SUMMARY:');
    console.log('='.repeat(80));
    console.log(`  Total rows: ${masterRows.length}`);
    console.log(`  Columns: ${headers.length}`);
    console.log(`  New columns added: run_status, dni_reason, dni_confidence, qual_score, final_rank, tier, total_difficulty, avg_difficulty, max_difficulty, trick_count`);

    // Status breakdown
    const statusCounts = {};
    masterRows.forEach(r => {
      statusCounts[r.run_status] = (statusCounts[r.run_status] || 0) + 1;
    });
    console.log(`\n  Run status breakdown:`);
    Object.entries(statusCounts).sort().forEach(([status, count]) => {
      console.log(`    ${status}: ${count}`);
    });

    // Tier breakdown
    const tierCounts = {};
    masterRows.forEach(r => {
      tierCounts[r.tier] = (tierCounts[r.tier] || 0) + 1;
    });
    console.log(`\n  Tier breakdown:`);
    Object.entries(tierCounts).forEach(([tier, count]) => {
      console.log(`    ${tier}: ${count}`);
    });

    console.log(`\n✓ Master dataset saved to data/processed/master_enriched_dataset.csv`);
    console.log(`  (${headers.length} columns × ${masterRows.length} rows)\n`);
  }
}

const pipeline = new MasterDataPipeline();
pipeline.run();
