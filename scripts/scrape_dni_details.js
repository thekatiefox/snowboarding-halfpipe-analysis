/**
 * DNI Resolution Script
 * 
 * Attempts to resolve the 12 "Did Not Improve" (DNI) cases by scraping
 * multiple public sources to determine if each was a crash or strategic skip.
 * 
 * Sources (in priority order):
 * 1. FIS (International Ski Federation) official results
 * 2. Sports news articles (NBC, Eurosport, BBC Sport)
 * 3. YouTube video metadata (broadcast descriptions)
 * 
 * Olympics.com is NOT used as it is the original source and does not
 * differentiate DNI reasons.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

class DNIResolver {
  constructor() {
    this.dniCases = this.loadDNICases();
    this.results = [];
    this.delay = 2000; // Rate limiting delay between requests (ms)
  }

  loadDNICases() {
    const csvPath = path.join(__dirname, '../data/raw/milano-cortina-2026-individual-judge-scores.csv');
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');

    const cases = [];
    lines.slice(1).forEach(line => {
      const values = line.split(',');
      if (values[4] === 'DNI') {
        cases.push({
          competitor: values[0],
          country: values[1],
          position: parseInt(values[2]),
          run: parseInt(values[3]),
          trickCount: [values[17], values[18], values[19], values[20], values[21]].filter(t => t && t.trim()).length,
        });
      }
    });

    return cases;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Source 1: Check FIS results for run status codes
   * FIS may distinguish DNS (Did Not Start), DNF (Did Not Finish), DSQ (Disqualified)
   */
  async checkFISResults() {
    console.log('\n📡 Checking FIS results...');
    const searchUrls = [
      'https://www.fis-ski.com/DB/general/results.html?sectorcode=SB&raceid=2026HP001',
      'https://live.fis-ski.com/sb-hp/2026/results',
    ];

    for (const url of searchUrls) {
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot)' },
        });
        const $ = cheerio.load(response.data);

        // Look for run-by-run status codes
        const statusCodes = {};
        $('table tr, .result-row, .athlete-result').each((_, el) => {
          const text = $(el).text();
          this.dniCases.forEach(dniCase => {
            const lastName = dniCase.competitor.split(' ').pop();
            if (text.includes(lastName)) {
              // Look for status indicators
              if (text.includes('DNS')) statusCodes[`${dniCase.competitor}-R${dniCase.run}`] = 'strategic_skip';
              if (text.includes('DNF')) statusCodes[`${dniCase.competitor}-R${dniCase.run}`] = 'crash';
              if (text.includes('DSQ')) statusCodes[`${dniCase.competitor}-R${dniCase.run}`] = 'crash';
              if (text.includes('FALL') || text.includes('fall')) statusCodes[`${dniCase.competitor}-R${dniCase.run}`] = 'crash';
            }
          });
        });

        if (Object.keys(statusCodes).length > 0) {
          console.log(`  ✓ Found ${Object.keys(statusCodes).length} status codes from FIS`);
          return statusCodes;
        }
      } catch (err) {
        console.log(`  ⚠ FIS ${url}: ${err.message}`);
      }
      await this.sleep(this.delay);
    }

    console.log('  ✗ No FIS data found');
    return {};
  }

  /**
   * Source 2: Search sports news for run-by-run commentary
   */
  async checkNewsArticles() {
    console.log('\n📡 Checking sports news articles...');
    const newsUrls = [
      { url: 'https://www.nbcolympics.com/news/snowboard-halfpipe-mens-final-results-2026', source: 'NBC Olympics' },
      { url: 'https://www.eurosport.com/snowboard/milano-cortina-2026/halfpipe-men-final', source: 'Eurosport' },
      { url: 'https://www.bbc.co.uk/sport/winter-olympics/2026/snowboard-halfpipe', source: 'BBC Sport' },
    ];

    const findings = {};

    for (const { url, source } of newsUrls) {
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot)' },
        });
        const $ = cheerio.load(response.data);
        const bodyText = $('article, .article-body, .story-body, main').text().toLowerCase();

        this.dniCases.forEach(dniCase => {
          const key = `${dniCase.competitor}-R${dniCase.run}`;
          if (findings[key]) return; // Already resolved

          const lastName = dniCase.competitor.split(' ').pop().toLowerCase();
          const firstName = dniCase.competitor.split(' ')[0].toLowerCase();

          // Search for crash/fall indicators near competitor name
          const crashPatterns = [
            new RegExp(`${lastName}[^.]{0,100}(fell|crashed|wiped out|tumbled|bailed|went down)`, 'i'),
            new RegExp(`(fell|crashed|wiped out|tumbled|bailed)([^.]{0,100})${lastName}`, 'i'),
            new RegExp(`${lastName}[^.]{0,100}run ${dniCase.run}[^.]{0,100}(fell|crash|fall)`, 'i'),
          ];

          const skipPatterns = [
            new RegExp(`${lastName}[^.]{0,100}(sat out|chose not|opted out|skipped|conserved|protected)`, 'i'),
            new RegExp(`${lastName}[^.]{0,100}(already secured|safe|comfortable|did not need)`, 'i'),
          ];

          for (const pattern of crashPatterns) {
            if (pattern.test(bodyText)) {
              findings[key] = { reason: 'crash', source, confidence: 'medium' };
              break;
            }
          }

          if (!findings[key]) {
            for (const pattern of skipPatterns) {
              if (pattern.test(bodyText)) {
                findings[key] = { reason: 'strategic_skip', source, confidence: 'medium' };
                break;
              }
            }
          }
        });

        if (Object.keys(findings).length > 0) {
          console.log(`  ✓ Found ${Object.keys(findings).length} clues from ${source}`);
        }
      } catch (err) {
        console.log(`  ⚠ ${source}: ${err.message}`);
      }
      await this.sleep(this.delay);
    }

    return findings;
  }

  /**
   * Source 3: Search YouTube for broadcast footage metadata
   */
  async checkYouTubeMetadata() {
    console.log('\n📡 Checking YouTube metadata...');
    const searchQueries = [
      'men halfpipe final milano cortina 2026 highlights',
      'snowboard halfpipe final 2026 olympics results',
    ];

    const findings = {};

    for (const query of searchQueries) {
      try {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        const response = await axios.get(searchUrl, {
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot)' },
        });

        const bodyText = response.data.toLowerCase();

        this.dniCases.forEach(dniCase => {
          const key = `${dniCase.competitor}-R${dniCase.run}`;
          if (findings[key]) return;

          const lastName = dniCase.competitor.split(' ').pop().toLowerCase();
          // Require "fall" to appear near the competitor's name (within 200 chars)
          const fallNearName = new RegExp(`${lastName}[^.]{0,200}(fell|crashed|fall|wipeout)`, 'i');
          const nameNearFall = new RegExp(`(fell|crashed|fall|wipeout)[^.]{0,200}${lastName}`, 'i');
          if (fallNearName.test(bodyText) || nameNearFall.test(bodyText)) {
            findings[key] = { reason: 'crash', source: 'YouTube metadata', confidence: 'low' };
          }
        });
      } catch (err) {
        console.log(`  ⚠ YouTube: ${err.message}`);
      }
      await this.sleep(this.delay);
    }

    return findings;
  }

  /**
   * Apply heuristic inference for unresolved cases based on available data
   */
  applyHeuristics() {
    console.log('\n🔍 Applying heuristic inference for unresolved cases...');
    const heuristics = {};

    this.dniCases.forEach(dniCase => {
      const key = `${dniCase.competitor}-R${dniCase.run}`;

      // Load the overview CSV to check if they had a high score already
      const overviewPath = path.join(__dirname, '../data/raw/milano-cortina-2026-mens-halfpipe.csv');
      const overviewContent = fs.readFileSync(overviewPath, 'utf8');
      const overviewLines = overviewContent.trim().split('\n');

      for (const line of overviewLines.slice(1)) {
        const values = line.split(',');
        if (values[1].trim() === dniCase.competitor) {
          const bestScore = parseFloat(values[8]);
          const run1 = parseFloat(values[5]);
          const run2 = parseFloat(values[6]);
          const run3 = parseFloat(values[7]);

          // Get scores from runs BEFORE the DNI run
          const priorScores = [];
          if (dniCase.run > 1 && !isNaN(run1)) priorScores.push(run1);
          if (dniCase.run > 2 && !isNaN(run2)) priorScores.push(run2);

          const hadHighScore = priorScores.some(s => s >= 85);
          const hadEliteScore = priorScores.some(s => s >= 90);
          const hadCleanRun = priorScores.some(s => s >= 50);

          // Heuristic: If competitor already had an elite score (≥90),
          // DNI is almost certainly a strategic skip
          if (hadEliteScore) {
            heuristics[key] = {
              reason: 'strategic_skip',
              source: 'heuristic: already had elite score ≥90',
              confidence: 'high',
              evidence: `Best prior score: ${Math.max(...priorScores).toFixed(2)}`,
            };
          }
          // If they had a high score (≥85), still very likely strategic
          else if (hadHighScore) {
            heuristics[key] = {
              reason: 'strategic_skip',
              source: 'heuristic: already had score ≥85',
              confidence: 'medium',
              evidence: `Best prior score: ${Math.max(...priorScores).toFixed(2)}`,
            };
          }
          // If they only had wipeouts before (all scores <50), they have nothing to protect
          // but DNI could still mean they wiped out OR gave up
          else if (!hadCleanRun && priorScores.length > 0) {
            // Check trick count: DNI runs with fewer tricks may indicate incomplete attempts
            if (dniCase.trickCount < 4) {
              heuristics[key] = {
                reason: 'crash',
                source: 'heuristic: no clean runs + incomplete tricks',
                confidence: 'low',
                evidence: `Only ${dniCase.trickCount} tricks, prior scores: ${priorScores.join(', ')}`,
              };
            } else {
              heuristics[key] = {
                reason: 'unknown',
                source: 'heuristic: ambiguous (no clean runs but full tricks)',
                confidence: 'low',
                evidence: `${dniCase.trickCount} tricks, prior scores: ${priorScores.join(', ')}`,
              };
            }
          }
          // Had a modest clean run (50-84), could go either way
          else if (hadCleanRun && !hadHighScore) {
            heuristics[key] = {
              reason: 'unknown',
              source: 'heuristic: ambiguous (had clean run but not high)',
              confidence: 'low',
              evidence: `Prior scores: ${priorScores.join(', ')}`,
            };
          }
          break;
        }
      }
    });

    return heuristics;
  }

  /**
   * Confidence ranking for comparison
   */
  confidenceRank(level) {
    return { high: 3, medium: 2, low: 1, none: 0 }[level] || 0;
  }

  /**
   * Merge all findings, preferring highest confidence regardless of source
   */
  mergeFindings(fisResults, newsFindings, ytFindings, heuristics) {
    const merged = {};

    this.dniCases.forEach(dniCase => {
      const key = `${dniCase.competitor}-R${dniCase.run}`;

      // Collect all findings for this case
      const candidates = [
        fisResults[key] && { ...dniCase, ...fisResults[key] },
        newsFindings[key] && { ...dniCase, ...newsFindings[key] },
        ytFindings[key] && { ...dniCase, ...ytFindings[key] },
        heuristics[key] && { ...dniCase, ...heuristics[key] },
      ].filter(Boolean);

      if (candidates.length === 0) {
        merged[key] = { ...dniCase, reason: 'unknown', source: 'no data found', confidence: 'none' };
      } else {
        // Pick the highest confidence finding; on tie, prefer FIS > news > heuristic > YouTube
        candidates.sort((a, b) => this.confidenceRank(b.confidence) - this.confidenceRank(a.confidence));
        merged[key] = candidates[0];
      }
    });

    return merged;
  }

  async run() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║   DNI RESOLUTION: Crash vs Strategic Skip                     ║');
    console.log('║   Multi-source investigation of 12 DNI cases                  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Found ${this.dniCases.length} DNI cases to investigate:\n`);
    this.dniCases.forEach(c => {
      console.log(`  ${c.competitor.padEnd(25)} Run ${c.run} (position ${c.position}, ${c.trickCount} tricks)`);
    });

    // Try each source
    let fisResults = {}, newsFindings = {}, ytFindings = {};

    try {
      fisResults = await this.checkFISResults();
    } catch (err) {
      console.log(`  ✗ FIS check failed: ${err.message}`);
    }

    try {
      newsFindings = await this.checkNewsArticles();
    } catch (err) {
      console.log(`  ✗ News check failed: ${err.message}`);
    }

    try {
      ytFindings = await this.checkYouTubeMetadata();
    } catch (err) {
      console.log(`  ✗ YouTube check failed: ${err.message}`);
    }

    // Always apply heuristics as fallback
    const heuristics = this.applyHeuristics();

    // Merge all findings
    const resolved = this.mergeFindings(fisResults, newsFindings, ytFindings, heuristics);

    // Print results
    console.log('\n\nRESOLUTION RESULTS:');
    console.log('='.repeat(80));

    const summary = { crash: 0, strategic_skip: 0, unknown: 0 };
    Object.values(resolved).forEach(r => {
      const icon = r.reason === 'crash' ? '💥' : r.reason === 'strategic_skip' ? '🎯' : '❓';
      console.log(`  ${icon} ${r.competitor.padEnd(25)} R${r.run}: ${r.reason.padEnd(15)} [${r.confidence}] via ${r.source}`);
      if (r.evidence) console.log(`     Evidence: ${r.evidence}`);
      summary[r.reason] = (summary[r.reason] || 0) + 1;
    });

    console.log(`\nSummary: ${summary.crash} crashes, ${summary.strategic_skip} strategic skips, ${summary.unknown} unknown`);

    // Save CSV
    const csvLines = ['competitor,country,position,run,trick_count,dni_reason,source,confidence,evidence'];
    Object.values(resolved).forEach(r => {
      csvLines.push([
        r.competitor, r.country, r.position, r.run, r.trickCount,
        r.reason, `"${r.source}"`, r.confidence, `"${r.evidence || ''}"`,
      ].join(','));
    });

    const processedDir = path.join(__dirname, '../data/processed');
    fs.writeFileSync(
      path.join(processedDir, 'dni_resolved.csv'),
      csvLines.join('\n')
    );
    console.log(`\n✓ Results saved to data/processed/dni_resolved.csv`);

    // Save JSON
    const output = {
      timestamp: new Date().toISOString(),
      description: 'DNI resolution: crash vs strategic skip determination',
      totalCases: this.dniCases.length,
      summary,
      sourcesChecked: ['FIS results', 'news articles', 'YouTube metadata', 'heuristic inference'],
      cases: Object.values(resolved),
    };

    fs.writeFileSync(
      path.join(__dirname, '../results/dni_resolution.json'),
      JSON.stringify(output, null, 2)
    );
    console.log(`✓ Results saved to results/dni_resolution.json\n`);
  }
}

const resolver = new DNIResolver();
resolver.run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
