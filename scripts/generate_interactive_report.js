/**
 * Generate Interactive Visual Report
 * 
 * Produces a polished, narrative-driven HTML report using Plotly.js (CDN)
 * for interactive charts. Focuses only on interesting/surprising findings.
 */

const fs = require('fs');
const path = require('path');

class InteractiveReport {
  constructor() {
    this.rawScores = this.loadCSV(path.join(__dirname, '../data/raw/milano-cortina-2026-individual-judge-scores.csv'));
    this.judges = this.loadJudgesMetadata();
    this.dniMap = this.loadDNIResolution();
  }

  loadCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((h, i) => { row[h.trim()] = values[i]?.trim(); });
      return row;
    });
  }

  loadJudgesMetadata() {
    const csvPath = path.join(__dirname, '../data/raw/judges-metadata.csv');
    const content = fs.readFileSync(csvPath, 'utf8');
    return Object.fromEntries(
      content.trim().split('\n').slice(1).map(line => {
        const v = line.split(',');
        return [v[0].trim(), { name: v[1]?.trim(), country: v[2]?.trim() }];
      })
    );
  }

  loadDNIResolution() {
    const csvPath = path.join(__dirname, '../data/processed/dni_resolved.csv');
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    const map = {};
    lines.slice(1).forEach(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((h, i) => { row[h.trim()] = values[i]?.trim(); });
      map[`${row.competitor}-${row.run}`] = row;
    });
    return map;
  }

  getRunStatus(row) {
    if (row.final_score === 'DNI') {
      return this.dniMap[`${row.competitor}-${row.run}`]?.dni_reason || 'dni_unknown';
    }
    return parseFloat(row.final_score) >= 50 ? 'clean' : 'wipeout';
  }

  getJudgeScores(row) {
    const scores = [];
    for (let j = 1; j <= 6; j++) {
      const val = parseFloat(row[`judge${j}_score`]);
      if (!isNaN(val)) scores.push({ j, score: val });
    }
    return scores;
  }

  lastName(name) {
    const parts = name.split(' ');
    return parts[parts.length - 1];
  }

  generate() {
    const scored = this.rawScores.filter(r => r.final_score && r.final_score !== 'DNI');
    const clean = scored.filter(r => parseFloat(r.final_score) >= 50);
    const wipeouts = scored.filter(r => parseFloat(r.final_score) < 50);

    // ── Compute all data for charts ──

    // 1. Round sequence data
    const sequenceData = this.computeSequences();

    // 2. Per-run judge scores (for the strip/jitter plot)
    const judgeRunData = this.computeJudgeRunData(scored);

    // 3. Wipeout mechanics
    const wipeoutData = this.computeWipeoutData(wipeouts);

    // 4. Judge severity
    const severityData = this.computeSeverity(scored);

    // 5. Consensus spreads
    const spreadData = this.computeSpreads(scored);

    // 6. Crash streak relief
    const reliefData = this.computeReliefData();

    // 7. Difficulty data
    const difficultyData = this.computeDifficultyData();

    const html = this.buildHTML({
      sequenceData,
      judgeRunData,
      wipeoutData,
      severityData,
      spreadData,
      reliefData,
      difficultyData,
    });

    const outPath = path.join(__dirname, '../results/interactive-report.html');
    fs.writeFileSync(outPath, html);
    console.log(`✓ Interactive report: results/interactive-report.html`);
  }

  computeSequences() {
    const rounds = [];
    for (let r = 1; r <= 3; r++) {
      const runs = this.rawScores
        .filter(row => row.run === r.toString())
        .sort((a, b) => parseInt(a.position) - parseInt(b.position));
      rounds.push(runs.map(run => ({
        position: parseInt(run.position),
        name: this.lastName(run.competitor),
        score: run.final_score === 'DNI' ? null : parseFloat(run.final_score),
        status: this.getRunStatus(run),
      })));
    }
    return rounds;
  }

  computeJudgeRunData(scored) {
    return scored.map(run => {
      const scores = this.getJudgeScores(run);
      const final = parseFloat(run.final_score);
      return {
        label: `${this.lastName(run.competitor)} R${run.run}`,
        final,
        scores: scores.map(s => s.score),
        spread: scores.length >= 2 ? Math.max(...scores.map(s => s.score)) - Math.min(...scores.map(s => s.score)) : 0,
        type: final >= 50 ? 'clean' : 'wipeout',
        isRuka: run.competitor.includes('Ruka'),
      };
    }).sort((a, b) => a.final - b.final);
  }

  computeWipeoutData(wipeouts) {
    return wipeouts.map(run => {
      const tricks = [run.trick1, run.trick2, run.trick3, run.trick4, run.trick5].filter(t => t && t.length > 0);
      return {
        name: `${this.lastName(run.competitor)} R${run.run}`,
        tricks: tricks.length,
        score: parseFloat(run.final_score),
      };
    }).sort((a, b) => a.tricks - b.tricks || a.score - b.score);
  }

  computeSeverity(scored) {
    const stats = {};
    for (let j = 1; j <= 6; j++) stats[j] = { devs: [], exHigh: 0, exLow: 0 };

    scored.forEach(run => {
      const scores = this.getJudgeScores(run);
      if (scores.length < 6) return;
      const mean = scores.reduce((s, x) => s + x.score, 0) / 6;
      const max = Math.max(...scores.map(s => s.score));
      const min = Math.min(...scores.map(s => s.score));

      scores.forEach(s => {
        stats[s.j].devs.push(s.score - mean);
        if (s.score === max && scores.filter(x => x.score === max).length === 1) stats[s.j].exHigh++;
        if (s.score === min && scores.filter(x => x.score === min).length === 1) stats[s.j].exLow++;
      });
    });

    return Object.entries(stats).map(([j, s]) => ({
      judge: `J${j}`,
      name: this.judges[j]?.name?.split(' ')[0] || '',
      country: this.judges[j]?.country || '',
      avgDev: s.devs.reduce((a, b) => a + b, 0) / s.devs.length,
      devs: s.devs,
      exHigh: s.exHigh,
      exLow: s.exLow,
    }));
  }

  computeSpreads(scored) {
    return scored.map(run => {
      const scores = this.getJudgeScores(run);
      if (scores.length < 6) return null;
      const vals = scores.map(s => s.score);
      const final = parseFloat(run.final_score);
      return {
        label: `${this.lastName(run.competitor)} R${run.run}`,
        spread: Math.max(...vals) - Math.min(...vals),
        type: final >= 50 ? 'clean' : 'wipeout',
        score: final,
        isRuka: run.competitor.includes('Ruka'),
        allSame: new Set(vals).size === 1,
      };
    }).filter(Boolean);
  }

  computeReliefData() {
    const cleanRuns = [];
    for (let round = 1; round <= 3; round++) {
      const runs = this.rawScores
        .filter(r => r.run === round.toString())
        .sort((a, b) => parseInt(a.position) - parseInt(b.position));

      let streak = 0;
      runs.forEach(run => {
        const status = this.getRunStatus(run);
        if (status === 'clean') {
          cleanRuns.push({
            name: `${this.lastName(run.competitor)} R${round}`,
            competitor: run.competitor,
            position: parseInt(run.position),
            score: parseFloat(run.final_score),
            streak,
            round,
          });
        }
        if (status === 'wipeout' || status === 'crash') streak++;
        else if (status === 'clean' || status === 'did_not_improve' || status === 'strategic_skip') streak = 0;
      });
    }
    return cleanRuns;
  }

  computeDifficultyData() {
    const diffPath = path.join(__dirname, '../data/processed/enriched-judge-scores.csv');
    if (!fs.existsSync(diffPath)) return [];
    const data = this.loadCSV(diffPath);
    return data
      .filter(r => r.final_score && r.final_score !== 'DNI' && parseFloat(r.final_score) >= 50 && r.total_difficulty)
      .map(r => ({
        name: `${this.lastName(r.competitor)} R${r.run}`,
        score: parseFloat(r.final_score),
        difficulty: parseFloat(r.total_difficulty),
      }));
  }

  buildHTML(data) {
    const { sequenceData, judgeRunData, wipeoutData, severityData, spreadData, reliefData, difficultyData } = data;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Inside the Judges' Scores — Milano-Cortina 2026 Halfpipe</title>
<script src="https://cdn.plot.ly/plotly-2.35.0.min.js"></script>
<style>
  :root { --bg: #0d1117; --card: #161b22; --border: #30363d; --text: #e6edf3; --muted: #8b949e; --accent: #58a6ff; --green: #3fb950; --red: #f85149; --yellow: #d29922; --purple: #bc8cff; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; }
  .container { max-width: 960px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 36px; font-weight: 700; letter-spacing: -1px; margin-bottom: 4px; }
  .hero-sub { color: var(--muted); font-size: 16px; margin-bottom: 48px; }
  .section { margin-bottom: 64px; }
  .section-label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: var(--accent); margin-bottom: 8px; }
  h2 { font-size: 24px; font-weight: 600; margin-bottom: 16px; }
  .narrative { color: var(--muted); font-size: 15px; max-width: 680px; margin-bottom: 24px; }
  .narrative strong { color: var(--text); }
  .chart-container { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin: 16px 0; }
  .stat-row { display: flex; flex-wrap: wrap; gap: 16px; margin: 24px 0; }
  .stat-card { flex: 1; min-width: 160px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; text-align: center; }
  .stat-num { font-size: 32px; font-weight: 700; }
  .stat-num.green { color: var(--green); }
  .stat-num.red { color: var(--red); }
  .stat-num.yellow { color: var(--yellow); }
  .stat-num.accent { color: var(--accent); }
  .stat-label { font-size: 12px; color: var(--muted); margin-top: 4px; }
  .callout { border-left: 3px solid var(--accent); background: rgba(88,166,255,0.08); padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 14px; }
  .callout.warning { border-left-color: var(--yellow); background: rgba(210,153,34,0.08); }
  .seq-row { display: flex; gap: 4px; margin: 6px 0; align-items: center; }
  .seq-label { width: 32px; font-size: 12px; color: var(--muted); font-weight: 600; flex-shrink: 0; }
  .seq-cell { flex: 1; text-align: center; padding: 6px 2px; border-radius: 6px; font-size: 10px; line-height: 1.3; }
  .seq-clean { background: rgba(63,185,80,0.2); border: 1px solid rgba(63,185,80,0.3); }
  .seq-wipeout { background: rgba(248,81,73,0.2); border: 1px solid rgba(248,81,73,0.3); }
  .seq-crash { background: rgba(248,81,73,0.15); border: 1px solid rgba(248,81,73,0.2); }
  .seq-skip { background: rgba(139,148,158,0.15); border: 1px solid rgba(139,148,158,0.2); }
  .seq-name { font-weight: 600; font-size: 9px; }
  .seq-score { font-size: 11px; font-weight: 700; }
  .footer { text-align: center; color: var(--muted); font-size: 12px; margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border); }
  .plotly-chart { width: 100%; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 700px) { .two-col { grid-template-columns: 1fr; } .stat-row { flex-direction: column; } }
</style>
</head>
<body>
<div class="container">

<h1>🏂 Inside the Judges' Scores</h1>
<p class="hero-sub">What 144 individual judge scores reveal about halfpipe judging at the 2026 Olympics</p>

<!-- ═══ SECTION: THE COMPETITION ═══ -->
<div class="section">
<div class="section-label">The Competition</div>
<h2>A Chaotic Round 1, a Strategic Round 3</h2>
<p class="narrative">Twelve riders, three rounds, same order every time. The worst qualifier goes first, the best goes last. Round 1 was carnage — six consecutive wipeouts before a single clean landing. By Round 3, half the field had given up trying to improve.</p>

<div class="chart-container">
${this.buildSequenceHTML(sequenceData)}
</div>

<div class="stat-row">
<div class="stat-card"><div class="stat-num red">19</div><div class="stat-label">Witnessed crashes<br>(wipeout + DNI crash)</div></div>
<div class="stat-card"><div class="stat-num green">15</div><div class="stat-label">Clean runs scored</div></div>
<div class="stat-card"><div class="stat-num accent">144</div><div class="stat-label">Individual judge scores<br>to analyze</div></div>
</div>
</div>

<!-- ═══ SECTION: RUKA'S PERFECT SCORES ═══ -->
<div class="section">
<div class="section-label">Finding #1</div>
<h2>Six Judges, One Number — Twice</h2>
<p class="narrative">Ruka Hirano received <strong>identical scores from all six judges</strong> in both Round 1 and Round 2. Every judge independently wrote down "90." This happened zero times for any other competitor. How unusual is this?</p>

<div class="chart-container">
<div id="chart-spreads" class="plotly-chart"></div>
</div>

<div class="callout">
Of 24 scored performances, Ruka's two runs are the only ones where all six judges gave the exact same score. The next-tightest agreement was a spread of 1 point (Totsuka R2, Scotty R2). Wipeouts, by contrast, show spreads up to 7 points.
</div>
</div>

<!-- ═══ SECTION: WIPEOUT MECHANICS ═══ -->
<div class="section">
<div class="section-label">Finding #2</div>
<h2>Crash Early, Score Low</h2>
<p class="narrative">When a rider wipes out, their score is almost entirely determined by one thing: <strong>how many tricks they completed before falling</strong>. The correlation is r=0.836. A rider who completes 5 tricks before crashing scores 4× higher than one who crashes after 2.</p>

<div class="two-col">
<div class="chart-container"><div id="chart-wipeouts" class="plotly-chart"></div></div>
<div class="chart-container"><div id="chart-agreement" class="plotly-chart"></div></div>
</div>

<div class="callout">Judges also <strong>disagree more when scoring wipeouts</strong> — average spread of 3.4 points vs 2.0 for clean runs. Crashes introduce subjectivity that clean landings don't.</div>
</div>

<!-- ═══ SECTION: JUDGE PERSONALITIES ═══ -->
<div class="section">
<div class="section-label">Finding #3</div>
<h2>The Generous Judge and the Strict Judge</h2>
<p class="narrative">All six judges scored every run, so we can compare them directly — same tricks, same execution, different judge. Some judges are measurably and consistently different from the panel.</p>

<div class="chart-container"><div id="chart-severity" class="plotly-chart"></div></div>

<div class="stat-row">
<div class="stat-card"><div class="stat-num green">25%</div><div class="stat-label">Judge 5 (FRA) excluded<br>as HIGHEST scorer</div></div>
<div class="stat-card"><div class="stat-num red">17%</div><div class="stat-label">Judge 4 (SUI) excluded<br>as LOWEST scorer</div></div>
<div class="stat-card"><div class="stat-num accent">~17%</div><div class="stat-label">Expected by chance<br>(1 in 6)</div></div>
</div>

<div class="callout">Despite these tendencies, the scoring system's trimmed mean (drop highest and lowest) works: it shifts scores by only <strong>0.17 pts on average</strong>, and medal rankings are identical whether you use raw or trimmed scores.</div>
</div>

<!-- ═══ SECTION: RELIEF BIAS ═══ -->
<div class="section">
<div class="section-label">Finding #4</div>
<h2>The Relief Bias Question</h2>
<p class="narrative">The original question: <strong>do judges score you higher if the riders right before you all crashed?</strong> After a string of wipeouts, does a clean run look extra impressive by contrast?</p>

<div class="chart-container"><div id="chart-relief" class="plotly-chart"></div></div>

<div class="callout warning">
The between-groups difference is <strong>+1.96 pts</strong> (87.4 after crashes vs 85.4 after clean), with nearly balanced average positions. But the within-rider evidence tells a different story: <strong>Ruka Hirano scored highest (91) after zero crashes</strong>, Yamada scored identically (92) regardless, and Totsuka's +4 gain came with a trick upgrade. The data doesn't support a relief bias narrative.
</div>
</div>

<!-- ═══ SECTION: DIFFICULTY ═══ -->
<div class="section">
<div class="section-label">Finding #5</div>
<h2>Harder Tricks Don't Mean Higher Scores</h2>
<p class="narrative">Unlike diving or gymnastics, halfpipe has no difficulty multiplier. And the data shows it: <strong>trick difficulty barely predicts final score</strong> (r=0.195). Wang attempted the competition's hardest trick sequence (difficulty 51.5) and scored 76. Yamada did a simpler set (32.5) and scored 92.</p>

<div class="chart-container"><div id="chart-difficulty" class="plotly-chart"></div></div>
</div>

<div class="footer">
Data: <a href="https://www.olympics.com/en/milano-cortina-2026/results/sbd/je/m/hp----------------/fnl-/--------/result" style="color: var(--accent);">Olympics.com</a> — Milano-Cortina 2026 Men's Snowboard Halfpipe Final, February 13, 2026<br>
12 competitors · 3 rounds · 6 judges · Best score counts
</div>

</div>

<script>
const darkLayout = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { color: '#8b949e', family: 'Inter, system-ui, sans-serif', size: 12 },
  margin: { l: 50, r: 20, t: 40, b: 50 },
  xaxis: { gridcolor: '#21262d', zerolinecolor: '#30363d' },
  yaxis: { gridcolor: '#21262d', zerolinecolor: '#30363d' },
  hoverlabel: { bgcolor: '#161b22', bordercolor: '#30363d', font: { color: '#e6edf3' } },
};

const config = { responsive: true, displayModeBar: false };

// ── Chart: Score Spreads (Finding #1) ──
(function() {
  const spreads = ${JSON.stringify(spreadData.sort((a, b) => a.score - b.score))};
  
  Plotly.newPlot('chart-spreads', [{
    type: 'bar',
    x: spreads.map(s => s.label),
    y: spreads.map(s => s.spread),
    marker: {
      color: spreads.map(s => s.allSame ? '#bc8cff' : s.type === 'wipeout' ? '#f85149' : '#3fb950'),
    },
    hovertemplate: '<b>%{x}</b><br>Score: %{customdata[0]}<br>Spread: %{y} pts<extra></extra>',
    customdata: spreads.map(s => [s.score]),
  }], {
    ...darkLayout,
    title: { text: 'Judge Score Spread per Run (max − min)', font: { size: 14, color: '#e6edf3' } },
    yaxis: { ...darkLayout.yaxis, title: 'Spread (pts)', dtick: 1 },
    xaxis: { ...darkLayout.xaxis, tickangle: -45, tickfont: { size: 9 } },
    annotations: spreads.filter(s => s.allSame).map(s => ({
      x: s.label, y: 0.3, text: '← Perfect<br>consensus', showarrow: false,
      font: { color: '#bc8cff', size: 10 }, yanchor: 'bottom',
    })),
  }, config);
})();

// ── Chart: Wipeout Mechanics (Finding #2) ──
(function() {
  const wipeouts = ${JSON.stringify(wipeoutData)};
  
  Plotly.newPlot('chart-wipeouts', [{
    type: 'scatter',
    mode: 'markers+text',
    x: wipeouts.map(w => w.tricks),
    y: wipeouts.map(w => w.score),
    text: wipeouts.map(w => w.name),
    textposition: 'top center',
    textfont: { size: 9, color: '#8b949e' },
    marker: { size: 12, color: '#f85149', opacity: 0.8, line: { color: '#f8514966', width: 2 } },
    hovertemplate: '<b>%{text}</b><br>Tricks: %{x}<br>Score: %{y}<extra></extra>',
  }], {
    ...darkLayout,
    title: { text: 'Tricks Before Crash → Wipeout Score', font: { size: 14, color: '#e6edf3' } },
    xaxis: { ...darkLayout.xaxis, title: 'Tricks Completed', dtick: 1, range: [1.5, 5.5] },
    yaxis: { ...darkLayout.yaxis, title: 'Score' },
    annotations: [{ x: 4, y: 45, text: 'r = 0.836', showarrow: false, font: { color: '#f85149', size: 14 } }],
  }, config);
})();

// ── Chart: Agreement comparison (Finding #2b) ──
(function() {
  const spreads = ${JSON.stringify(spreadData)};
  const cleanSpreads = spreads.filter(s => s.type === 'clean').map(s => s.spread);
  const wipeSpreads = spreads.filter(s => s.type === 'wipeout').map(s => s.spread);
  
  Plotly.newPlot('chart-agreement', [{
    type: 'box',
    y: cleanSpreads,
    name: 'Clean Runs',
    marker: { color: '#3fb950' },
    boxpoints: 'all',
    jitter: 0.4,
    pointpos: -1.5,
  }, {
    type: 'box',
    y: wipeSpreads,
    name: 'Wipeouts',
    marker: { color: '#f85149' },
    boxpoints: 'all',
    jitter: 0.4,
    pointpos: -1.5,
  }], {
    ...darkLayout,
    title: { text: 'Judge Disagreement: Clean vs Wipeout', font: { size: 14, color: '#e6edf3' } },
    yaxis: { ...darkLayout.yaxis, title: 'Score Spread (pts)' },
    showlegend: false,
  }, config);
})();

// ── Chart: Judge Severity (Finding #3) ──
(function() {
  const sev = ${JSON.stringify(severityData)};
  
  Plotly.newPlot('chart-severity', [{
    type: 'box',
    x: sev.flatMap(s => s.devs.map(() => s.judge + ' (' + s.country + ')')),
    y: sev.flatMap(s => s.devs),
    marker: { color: sev.flatMap(s => s.devs.map(d => d > 0 ? '#3fb950' : '#f85149')), opacity: 0.5, size: 4 },
    boxpoints: 'all',
    jitter: 0.3,
    pointpos: 0,
    line: { color: '#58a6ff' },
    fillcolor: 'rgba(88,166,255,0.1)',
    hoverinfo: 'y',
  }], {
    ...darkLayout,
    title: { text: 'Per-Judge Deviation from Panel Mean (all 24 scored runs)', font: { size: 14, color: '#e6edf3' } },
    yaxis: { ...darkLayout.yaxis, title: 'Deviation (pts)', zeroline: true, zerolinecolor: '#58a6ff', zerolinewidth: 2 },
    xaxis: { ...darkLayout.xaxis },
    showlegend: false,
  }, config);
})();

// ── Chart: Relief Bias (Finding #4) ──
(function() {
  const relief = ${JSON.stringify(reliefData)};
  
  const colors = relief.map(r => {
    if (r.streak === 0) return '#58a6ff';
    if (r.streak <= 2) return '#d29922';
    return '#f85149';
  });

  Plotly.newPlot('chart-relief', [{
    type: 'scatter',
    mode: 'markers+text',
    x: relief.map(r => r.streak),
    y: relief.map(r => r.score),
    text: relief.map(r => r.name),
    textposition: relief.map(r => r.score > 90 ? 'top center' : 'bottom center'),
    textfont: { size: 9, color: '#8b949e' },
    marker: { size: 11, color: colors, opacity: 0.85, line: { width: 1, color: '#30363d' } },
    hovertemplate: '<b>%{text}</b><br>Crash streak: %{x}<br>Score: %{y}<br>Position: %{customdata}<extra></extra>',
    customdata: relief.map(r => r.position),
  }], {
    ...darkLayout,
    title: { text: 'Clean Run Score vs Consecutive Crashes Before', font: { size: 14, color: '#e6edf3' } },
    xaxis: { ...darkLayout.xaxis, title: 'Consecutive Crashes Immediately Before', dtick: 1 },
    yaxis: { ...darkLayout.yaxis, title: 'Score' },
    shapes: [{
      type: 'line', x0: -0.3, x1: 6.3,
      y0: ${(reliefData.reduce((s, r) => s + r.score, 0) / reliefData.length).toFixed(2)},
      y1: ${(reliefData.reduce((s, r) => s + r.score, 0) / reliefData.length).toFixed(2)},
      line: { color: '#30363d', dash: 'dash', width: 1 },
    }],
  }, config);
})();

// ── Chart: Difficulty vs Score (Finding #5) ──
(function() {
  const diff = ${JSON.stringify(difficultyData)};
  if (!diff.length) return;
  
  Plotly.newPlot('chart-difficulty', [{
    type: 'scatter',
    mode: 'markers+text',
    x: diff.map(d => d.difficulty),
    y: diff.map(d => d.score),
    text: diff.map(d => d.name),
    textposition: 'right',
    textfont: { size: 9, color: '#8b949e' },
    marker: { size: 10, color: '#bc8cff', opacity: 0.8, line: { width: 1, color: '#30363d' } },
    hovertemplate: '<b>%{text}</b><br>Difficulty: %{x}<br>Score: %{y}<extra></extra>',
  }], {
    ...darkLayout,
    title: { text: 'Trick Difficulty vs Score (Clean Runs Only, r=0.195)', font: { size: 14, color: '#e6edf3' } },
    xaxis: { ...darkLayout.xaxis, title: 'Total Trick Difficulty' },
    yaxis: { ...darkLayout.yaxis, title: 'Score' },
    annotations: [{
      x: 51, y: 76, text: 'Wang: hardest tricks,<br>scored 76', showarrow: true,
      arrowhead: 0, arrowcolor: '#bc8cff', font: { color: '#bc8cff', size: 10 },
      ax: 30, ay: -30,
    }, {
      x: 32.5, y: 92, text: 'Yamada: simpler tricks,<br>scored 92', showarrow: true,
      arrowhead: 0, arrowcolor: '#bc8cff', font: { color: '#bc8cff', size: 10 },
      ax: -40, ay: 30,
    }],
  }, config);
})();
</script>
</body>
</html>`;
  }

  buildSequenceHTML(rounds) {
    const statusClass = { clean: 'seq-clean', wipeout: 'seq-wipeout', crash: 'seq-crash', strategic_skip: 'seq-skip', did_not_improve: 'seq-skip' };
    let html = '';
    rounds.forEach((runs, i) => {
      html += `<div class="seq-row"><span class="seq-label">R${i + 1}</span>`;
      runs.forEach(r => {
        const cls = statusClass[r.status] || 'seq-skip';
        const scoreStr = r.score !== null ? r.score : '—';
        html += `<div class="seq-cell ${cls}"><span class="seq-name">${r.name}</span><br><span class="seq-score">${scoreStr}</span></div>`;
      });
      html += '</div>';
    });
    return html;
  }
}

const gen = new InteractiveReport();
gen.generate();
