/**
 * Generate Premium Visual Report
 * 
 * Editorial-quality data journalism piece using D3.js for custom charts,
 * Google Fonts for typography, and scroll-driven narrative layout.
 */

const fs = require('fs');
const path = require('path');

class PremiumReport {
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
      if (!isNaN(val)) scores.push({ j, score: val, country: this.judges[j]?.country });
    }
    return scores;
  }

  lastName(name) { return name.split(' ').pop(); }

  generate() {
    const scored = this.rawScores.filter(r => r.final_score && r.final_score !== 'DNI');

    // Compute all datasets
    const sequences = this.computeSequences();
    const dotStrip = this.computeDotStrip(scored);
    const wipeouts = this.computeWipeouts(scored.filter(r => parseFloat(r.final_score) < 50));
    const severity = this.computeSeverity(scored);
    const relief = this.computeRelief();
    const difficulty = this.computeDifficulty();

    const html = this.buildHTML({ sequences, dotStrip, wipeouts, severity, relief, difficulty });
    const outPath = path.join(__dirname, '../results/interactive-report.html');
    fs.writeFileSync(outPath, html);
    console.log(`✓ Premium report: results/interactive-report.html`);
  }

  computeSequences() {
    const rounds = [];
    for (let r = 1; r <= 3; r++) {
      const runs = this.rawScores
        .filter(row => row.run === r.toString())
        .sort((a, b) => parseInt(a.position) - parseInt(b.position));
      rounds.push(runs.map(run => ({
        pos: parseInt(run.position),
        name: this.lastName(run.competitor),
        fullName: run.competitor,
        country: run.country,
        score: run.final_score === 'DNI' ? null : parseFloat(run.final_score),
        status: this.getRunStatus(run),
        medal: run.medal || '',
      })));
    }
    return rounds;
  }

  computeDotStrip(scored) {
    return scored.map(run => {
      const scores = this.getJudgeScores(run);
      const final = parseFloat(run.final_score);
      return {
        label: `${this.lastName(run.competitor)} R${run.run}`,
        fullName: run.competitor,
        run: parseInt(run.run),
        final,
        scores: scores.map(s => ({ j: s.j, score: s.score, country: s.country })),
        spread: scores.length >= 2 ? Math.max(...scores.map(s => s.score)) - Math.min(...scores.map(s => s.score)) : 0,
        type: final >= 50 ? 'clean' : 'wipeout',
        allSame: new Set(scores.map(s => s.score)).size === 1,
      };
    }).sort((a, b) => b.final - a.final);
  }

  computeWipeouts(wipeouts) {
    return wipeouts.map(run => {
      const tricks = [run.trick1, run.trick2, run.trick3, run.trick4, run.trick5].filter(t => t && t.length > 0);
      const scores = this.getJudgeScores(run);
      return {
        name: `${this.lastName(run.competitor)} R${run.run}`,
        tricks: tricks.length,
        score: parseFloat(run.final_score),
        spread: scores.length >= 2 ? Math.max(...scores.map(s => s.score)) - Math.min(...scores.map(s => s.score)) : 0,
      };
    }).sort((a, b) => a.score - b.score);
  }

  computeSeverity(scored) {
    const stats = {};
    for (let j = 1; j <= 6; j++) stats[j] = [];

    scored.forEach(run => {
      const scores = this.getJudgeScores(run);
      if (scores.length < 6) return;
      const mean = scores.reduce((s, x) => s + x.score, 0) / 6;
      scores.forEach(s => stats[s.j].push(Math.round((s.score - mean) * 100) / 100));
    });

    return Object.entries(stats).map(([j, devs]) => ({
      judge: `J${j}`,
      name: this.judges[j]?.name || '',
      country: this.judges[j]?.country || '',
      devs,
      avg: devs.reduce((a, b) => a + b, 0) / devs.length,
    }));
  }

  computeRelief() {
    const runs = [];
    for (let round = 1; round <= 3; round++) {
      const roundRuns = this.rawScores
        .filter(r => r.run === round.toString())
        .sort((a, b) => parseInt(a.position) - parseInt(b.position));
      let streak = 0;
      roundRuns.forEach(run => {
        const status = this.getRunStatus(run);
        if (status === 'clean') {
          runs.push({
            name: `${this.lastName(run.competitor)} R${round}`,
            competitor: run.competitor,
            pos: parseInt(run.position),
            score: parseFloat(run.final_score),
            streak, round,
          });
        }
        if (status === 'wipeout' || status === 'crash') streak++;
        else if (status === 'clean' || status === 'did_not_improve' || status === 'strategic_skip') streak = 0;
      });
    }
    return runs;
  }

  computeDifficulty() {
    const diffPath = path.join(__dirname, '../data/processed/enriched-judge-scores.csv');
    if (!fs.existsSync(diffPath)) return [];
    return this.loadCSV(diffPath)
      .filter(r => r.final_score && r.final_score !== 'DNI' && parseFloat(r.final_score) >= 50 && r.total_difficulty)
      .map(r => ({
        name: `${this.lastName(r.competitor)} R${r.run}`,
        score: parseFloat(r.final_score),
        diff: parseFloat(r.total_difficulty),
      }));
  }

  buildHTML(data) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Inside the Judges' Scores — Milano-Cortina 2026</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="https://d3js.org/d3.v7.min.js"></script>
<style>
:root {
  --bg: #0a0a0f;
  --surface: #12121a;
  --surface2: #1a1a26;
  --border: #2a2a3a;
  --text: #e8e8f0;
  --muted: #7a7a90;
  --dim: #4a4a5e;
  --accent: #6c8cff;
  --green: #4ade80;
  --red: #f87171;
  --gold: #fbbf24;
  --purple: #a78bfa;
  --teal: #2dd4bf;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }

/* Hero */
.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 60px 40px 80px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0a0a2e 0%, #1a0a3e 30%, #0a1a3e 60%, #0a0a1e 100%);
}
.hero::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(ellipse at 30% 50%, rgba(108,140,255,0.08) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 30%, rgba(167,139,250,0.06) 0%, transparent 50%);
  animation: drift 20s ease-in-out infinite;
}
@keyframes drift {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-3%, 2%); }
}
.hero-content { position: relative; z-index: 1; max-width: 800px; }
.hero-label { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); margin-bottom: 20px; }
.hero h1 { font-family: 'Space Grotesk', sans-serif; font-size: clamp(40px, 7vw, 72px); font-weight: 700; line-height: 1.05; letter-spacing: -2px; margin-bottom: 24px; }
.hero h1 span { background: linear-gradient(135deg, var(--accent), var(--purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hero-desc { font-size: 18px; color: var(--muted); max-width: 520px; line-height: 1.7; }
.hero-stats { display: flex; gap: 40px; margin-top: 48px; }
.hero-stat-num { font-family: 'Space Grotesk', sans-serif; font-size: 42px; font-weight: 700; }
.hero-stat-label { font-size: 12px; color: var(--muted); margin-top: 2px; }
.scroll-hint { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); color: var(--dim); font-size: 12px; letter-spacing: 2px; animation: pulse 2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; } }

/* Sections */
.section { padding: 100px 40px; max-width: 1000px; margin: 0 auto; }
.section-alt { background: var(--surface); }
.section-num { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); margin-bottom: 12px; display: block; }
.section h2 { font-family: 'Space Grotesk', sans-serif; font-size: clamp(28px, 4vw, 40px); font-weight: 700; letter-spacing: -1px; margin-bottom: 20px; line-height: 1.15; }
.prose { color: var(--muted); font-size: 16px; max-width: 600px; line-height: 1.8; margin-bottom: 32px; }
.prose strong { color: var(--text); font-weight: 500; }
.prose em { color: var(--accent); font-style: normal; font-weight: 500; }

/* Charts */
.chart-wrap { background: var(--surface2); border: 1px solid var(--border); border-radius: 16px; padding: 32px; margin: 32px 0; overflow-x: auto; }
.chart-wrap.full { padding: 24px 16px; }
.chart-title { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 600; margin-bottom: 16px; color: var(--text); }
.chart-subtitle { font-size: 12px; color: var(--dim); margin-top: -12px; margin-bottom: 16px; }

/* Callouts */
.callout { border-left: 3px solid var(--accent); background: rgba(108,140,255,0.06); padding: 20px 24px; border-radius: 0 12px 12px 0; margin: 32px 0; }
.callout p { font-size: 15px; color: var(--muted); line-height: 1.7; }
.callout strong { color: var(--text); }
.callout.gold { border-left-color: var(--gold); background: rgba(251,191,36,0.06); }

/* Big number row */
.big-nums { display: flex; flex-wrap: wrap; gap: 24px; margin: 40px 0; }
.big-num { flex: 1; min-width: 140px; text-align: center; padding: 28px 16px; background: var(--surface2); border: 1px solid var(--border); border-radius: 16px; }
.big-num .num { font-family: 'Space Grotesk', sans-serif; font-size: 48px; font-weight: 700; line-height: 1; }
.big-num .label { font-size: 12px; color: var(--muted); margin-top: 8px; line-height: 1.4; }

/* Competition grid */
.comp-grid { display: grid; grid-template-columns: 40px repeat(12, 1fr); gap: 4px; margin: 24px 0; }
.comp-cell { border-radius: 8px; padding: 8px 4px; text-align: center; font-size: 10px; line-height: 1.3; transition: transform 0.2s; }
.comp-cell:hover { transform: scale(1.08); z-index: 1; }
.comp-cell .cname { font-weight: 600; font-size: 9px; opacity: 0.8; }
.comp-cell .cscore { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 13px; }
.comp-rlabel { display: flex; align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--dim); font-weight: 600; }
.cell-clean { background: rgba(74,222,128,0.15); border: 1px solid rgba(74,222,128,0.25); color: var(--green); }
.cell-wipeout { background: rgba(248,113,113,0.15); border: 1px solid rgba(248,113,113,0.25); color: var(--red); }
.cell-crash { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.15); color: #f8717199; }
.cell-skip { background: rgba(122,122,144,0.1); border: 1px solid rgba(122,122,144,0.15); color: var(--dim); }
.cell-medal { position: relative; }
.cell-medal::after { content: attr(data-medal); position: absolute; top: -4px; right: -2px; font-size: 10px; }

/* Fade in */
.reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.8s ease, transform 0.8s ease; }
.reveal.visible { opacity: 1; transform: translateY(0); }

/* Footer */
.footer { text-align: center; padding: 60px 40px; color: var(--dim); font-size: 12px; border-top: 1px solid var(--border); }
.footer a { color: var(--accent); text-decoration: none; }

@media (max-width: 700px) {
  .hero { padding: 40px 20px 60px; }
  .section { padding: 60px 20px; }
  .hero-stats { flex-direction: column; gap: 20px; }
  .big-nums { flex-direction: column; }
  .comp-grid { overflow-x: auto; min-width: 700px; }
}
</style>
</head>
<body>

<!-- ═══ HERO ═══ -->
<div class="hero">
  <div class="hero-content">
    <div class="hero-label">Milano-Cortina 2026 · Men's Snowboard Halfpipe Final</div>
    <h1>What 144 Scores Reveal About <span>Olympic Judging</span></h1>
    <p class="hero-desc">Six judges scored every run. We have all their individual numbers. Here's what the data shows about consensus, bias, and what actually drives the score.</p>
    <div class="hero-stats">
      <div><div class="hero-stat-num" style="color:var(--green)">15</div><div class="hero-stat-label">Clean runs</div></div>
      <div><div class="hero-stat-num" style="color:var(--red)">19</div><div class="hero-stat-label">Crashes witnessed</div></div>
      <div><div class="hero-stat-num" style="color:var(--accent)">6</div><div class="hero-stat-label">Judges, every run</div></div>
    </div>
  </div>
  <div class="scroll-hint">SCROLL ↓</div>
</div>

<!-- ═══ SECTION 1: THE COMPETITION ═══ -->
<div class="section reveal">
  <span class="section-num">01 · The Event</span>
  <h2>Three Rounds of Chaos and Precision</h2>
  <p class="prose">The worst qualifier goes first. The best goes last. Same order, every round. Round 1 was carnage — <strong>six consecutive wipeouts</strong> before a single clean landing. By Round 3, four riders had crashed out entirely, and the gold medalist didn't even bother to drop in.</p>
  
  <div class="chart-wrap full">
    <div class="chart-title">Every Performance, Color-Coded</div>
    <div class="chart-subtitle">Positions 1–12 (left to right = worst to best qualifier) · Hover for details</div>
    ${this.buildGrid(data.sequences)}
  </div>
</div>

<!-- ═══ SECTION 2: PERFECT CONSENSUS ═══ -->
<div class="section-alt">
<div class="section reveal" style="max-width:1000px; margin:0 auto;">
  <span class="section-num">02 · The Anomaly</span>
  <h2>Six Judges Wrote the Same Number. Twice.</h2>
  <p class="prose">Ruka Hirano's Round 1 and Round 2 runs each received <em>identical scores from all six judges</em>: 90 across the board. In a subjective sport where every judge watches independently, this is extraordinary. No other run came close — the tightest anyone else managed was a 1-point spread.</p>
  
  <div class="chart-wrap">
    <div class="chart-title">All Six Judge Scores Per Run</div>
    <div class="chart-subtitle">Each dot = one judge's score · Horizontal spread shows disagreement · Purple = perfect consensus</div>
    <div id="chart-dotstrip"></div>
  </div>

  <div class="callout">
    <p>Why does this matter? Perfect consensus either means the performance was so unambiguous that all judges independently converged — or it suggests <strong>anchoring</strong>, where early scores influence later ones. We can't distinguish which, but we can say it's statistically remarkable.</p>
  </div>
</div>
</div>

<!-- ═══ SECTION 3: WIPEOUT MECHANICS ═══ -->
<div class="section reveal">
  <span class="section-num">03 · The Formula</span>
  <h2>How Wipeouts Are Really Scored</h2>
  <p class="prose">When a rider crashes mid-run, what determines the score? Not the difficulty of what they attempted, not their reputation — it's almost entirely <strong>how many tricks they completed before falling</strong>.</p>

  <div class="chart-wrap">
    <div id="chart-wipeouts"></div>
  </div>

  <div class="big-nums">
    <div class="big-num"><div class="num" style="color:var(--red)">0.836</div><div class="label">Correlation between<br>tricks completed & score</div></div>
    <div class="big-num"><div class="num" style="color:var(--gold)">3.4</div><div class="label">Avg judge spread on<br>wipeouts (pts)</div></div>
    <div class="big-num"><div class="num" style="color:var(--green)">2.0</div><div class="label">Avg judge spread on<br>clean runs (pts)</div></div>
  </div>

  <div class="callout">
    <p>Judges <strong>disagree 70% more on wipeouts</strong> than clean runs. A crash introduces genuine uncertainty — was the rider going to land something spectacular? How much credit for what they showed? Clean runs leave much less room for interpretation.</p>
  </div>
</div>

<!-- ═══ SECTION 4: JUDGE SEVERITY ═══ -->
<div class="section-alt">
<div class="section reveal" style="max-width:1000px; margin:0 auto;">
  <span class="section-num">04 · The Personalities</span>
  <h2>Not All Judges Score Alike</h2>
  <p class="prose">Since all six judges score every run, we can isolate pure judge effects — same tricks, same execution, <strong>different scores</strong>. Some judges are measurably generous, others measurably strict.</p>
  
  <div class="chart-wrap">
    <div id="chart-severity"></div>
  </div>

  <div class="callout">
    <p>But here's the good news: the sport's built-in safeguard <strong>works</strong>. The trimmed mean (drop the highest and lowest score) shifts the final result by just <strong>0.17 points on average</strong>. Medal rankings would be identical with or without trimming.</p>
  </div>
</div>
</div>

<!-- ═══ SECTION 5: RELIEF BIAS ═══ -->
<div class="section reveal">
  <span class="section-num">05 · The Question</span>
  <h2>Does a Crash Streak Help the Next Clean Run?</h2>
  <p class="prose">The hypothesis: after watching multiple riders crash in a row, judges feel <em>relief</em> when someone finally lands — and unconsciously score them higher. We mapped every clean run against the number of consecutive crashes that immediately preceded it.</p>

  <div class="chart-wrap">
    <div id="chart-relief"></div>
  </div>

  <div class="callout gold">
    <p><strong>The verdict: probably not.</strong> The between-groups gap (+1.96 pts) sounds meaningful, but within-rider comparisons tell a different story. Ruka Hirano scored <strong>highest after zero crashes</strong> (91 vs 90). Yamada scored identically (92) regardless of context. The only positive case — Totsuka +4 after two crashes — came with a trick upgrade. The data doesn't support a relief bias narrative from this competition.</p>
  </div>
</div>

<!-- ═══ SECTION 6: DIFFICULTY ═══ -->
<div class="section-alt">
<div class="section reveal" style="max-width:1000px; margin:0 auto;">
  <span class="section-num">06 · The Surprise</span>
  <h2>Harder Tricks ≠ Higher Scores</h2>
  <p class="prose">In diving, difficulty has a fixed multiplier. In halfpipe, it doesn't — and the data shows it. Trick difficulty has a <em>weak</em> correlation of just r=0.195 with score. <strong>Execution is everything.</strong></p>

  <div class="chart-wrap">
    <div id="chart-difficulty"></div>
  </div>
</div>
</div>

<div class="footer">
  Data from <a href="https://www.olympics.com/en/milano-cortina-2026/results/sbd/je/m/hp----------------/fnl-/--------/result">Olympics.com Official Results</a><br>
  Milano-Cortina 2026 Men's Snowboard Halfpipe Final · February 13, 2026<br>
  12 competitors · 3 rounds · 6 judges · Best score counts
</div>

<script>
// ── Shared config ──
const C = {
  bg: '#1a1a26', text: '#e8e8f0', muted: '#7a7a90', dim: '#4a4a5e', border: '#2a2a3a',
  accent: '#6c8cff', green: '#4ade80', red: '#f87171', gold: '#fbbf24', purple: '#a78bfa', teal: '#2dd4bf',
};

// ── Reveal on scroll ──
const obs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

// ═══════════════════════════════════════════════════════════
// CHART: Dot Strip (Judge scores per run)
// ═══════════════════════════════════════════════════════════
(function() {
  const data = ${JSON.stringify(data.dotStrip)};
  const margin = { top: 10, right: 30, bottom: 30, left: 120 };
  const rowH = 22;
  const width = 860;
  const height = margin.top + margin.bottom + data.length * rowH;

  const svg = d3.select('#chart-dotstrip')
    .append('svg')
    .attr('viewBox', \`0 0 \${width} \${height}\`)
    .style('width', '100%');

  // Scales
  const allScores = data.flatMap(d => d.scores.map(s => s.score));
  const xMin = Math.min(...allScores) - 2;
  const xMax = Math.max(...allScores) + 2;
  const x = d3.scaleLinear().domain([xMin, xMax]).range([margin.left, width - margin.right]);
  const y = (i) => margin.top + i * rowH + rowH / 2;

  // Grid lines
  const ticks = x.ticks(10);
  svg.selectAll('.grid')
    .data(ticks)
    .join('line')
    .attr('x1', d => x(d)).attr('x2', d => x(d))
    .attr('y1', margin.top).attr('y2', height - margin.bottom)
    .attr('stroke', C.border).attr('stroke-width', 0.5);

  // Tick labels
  svg.selectAll('.tick-label')
    .data(ticks.filter(t => t % 10 === 0))
    .join('text')
    .attr('x', d => x(d)).attr('y', height - margin.bottom + 16)
    .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', C.dim)
    .text(d => d);

  // Rows
  data.forEach((run, i) => {
    const yPos = y(i);

    // Row background on hover
    svg.append('rect')
      .attr('x', 0).attr('y', yPos - rowH/2)
      .attr('width', width).attr('height', rowH)
      .attr('fill', 'transparent')
      .attr('class', 'row-bg');

    // Row label
    const labelColor = run.allSame ? C.purple : run.type === 'wipeout' ? C.red : C.muted;
    svg.append('text')
      .attr('x', margin.left - 8).attr('y', yPos + 4)
      .attr('text-anchor', 'end').attr('font-size', 10).attr('fill', labelColor)
      .attr('font-weight', run.allSame ? 600 : 400)
      .text(run.label);

    // Score dots
    run.scores.forEach(s => {
      const dotColor = run.allSame ? C.purple : run.type === 'wipeout' ? C.red : C.green;
      svg.append('circle')
        .attr('cx', x(s.score)).attr('cy', yPos)
        .attr('r', 3.5)
        .attr('fill', dotColor)
        .attr('opacity', 0.8);
    });

    // Final score marker
    svg.append('line')
      .attr('x1', x(run.final)).attr('x2', x(run.final))
      .attr('y1', yPos - 6).attr('y2', yPos + 6)
      .attr('stroke', C.text).attr('stroke-width', 1.5).attr('opacity', 0.4);
  });

  // Legend
  const legend = svg.append('g').attr('transform', \`translate(\${margin.left}, \${height - 6})\`);
  [{c: C.green, t: 'Clean run'}, {c: C.red, t: 'Wipeout'}, {c: C.purple, t: 'Perfect consensus'}].forEach((l, i) => {
    legend.append('circle').attr('cx', i * 120).attr('cy', 0).attr('r', 4).attr('fill', l.c);
    legend.append('text').attr('x', i * 120 + 8).attr('y', 4).attr('font-size', 10).attr('fill', C.muted).text(l.t);
  });
})();

// ═══════════════════════════════════════════════════════════
// CHART: Wipeout Scatter
// ═══════════════════════════════════════════════════════════
(function() {
  const data = ${JSON.stringify(data.wipeouts)};
  const margin = { top: 40, right: 40, bottom: 50, left: 60 };
  const width = 800, height = 360;

  const svg = d3.select('#chart-wipeouts')
    .append('svg')
    .attr('viewBox', \`0 0 \${width} \${height}\`)
    .style('width', '100%');

  const x = d3.scaleLinear().domain([1.5, 5.5]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([5, 55]).range([height - margin.bottom, margin.top]);

  // Grid
  [2, 3, 4, 5].forEach(v => {
    svg.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', margin.top).attr('y2', height - margin.bottom).attr('stroke', C.border).attr('stroke-width', 0.5);
  });
  [10, 20, 30, 40, 50].forEach(v => {
    svg.append('line').attr('x1', margin.left).attr('x2', width - margin.right).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', C.border).attr('stroke-width', 0.5);
    svg.append('text').attr('x', margin.left - 10).attr('y', y(v) + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', C.dim).text(v);
  });

  // Axis labels
  svg.append('text').attr('x', width/2).attr('y', height - 8).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', C.muted).text('Tricks Completed Before Crash');
  svg.append('text').attr('x', 14).attr('y', height/2).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', C.muted).attr('transform', \`rotate(-90, 14, \${height/2})\`).text('Wipeout Score');
  svg.append('text').attr('x', width/2).attr('y', 24).attr('text-anchor', 'middle').attr('font-size', 14).attr('fill', C.text).attr('font-weight', 600).attr('font-family', 'Space Grotesk').text('More Tricks Completed = Higher Wipeout Score');

  // Trend line (simple linear regression)
  const xs = data.map(d => d.tricks), ys = data.map(d => d.score);
  const n = xs.length;
  const xm = xs.reduce((a,b) => a+b) / n, ym = ys.reduce((a,b) => a+b) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i]-xm)*(ys[i]-ym); den += (xs[i]-xm)**2; }
  const slope = num/den, intercept = ym - slope*xm;

  svg.append('line')
    .attr('x1', x(1.5)).attr('x2', x(5.5))
    .attr('y1', y(slope*1.5+intercept)).attr('y2', y(slope*5.5+intercept))
    .attr('stroke', C.red).attr('stroke-width', 1.5).attr('stroke-dasharray', '6,4').attr('opacity', 0.6);

  // Points
  data.forEach(d => {
    const g = svg.append('g');
    g.append('circle')
      .attr('cx', x(d.tricks)).attr('cy', y(d.score))
      .attr('r', 7)
      .attr('fill', C.red).attr('opacity', 0.7)
      .attr('stroke', C.red).attr('stroke-width', 1).attr('stroke-opacity', 0.3);
    g.append('text')
      .attr('x', x(d.tricks) + 10).attr('y', y(d.score) + 4)
      .attr('font-size', 10).attr('fill', C.muted)
      .text(d.name);
  });

  // r value annotation
  svg.append('text').attr('x', x(4.5)).attr('y', y(45)).attr('font-size', 20).attr('fill', C.red).attr('font-family', 'Space Grotesk').attr('font-weight', 700).attr('opacity', 0.5).text('r = 0.836');
})();

// ═══════════════════════════════════════════════════════════
// CHART: Judge Severity (Lollipop + dots)
// ═══════════════════════════════════════════════════════════
(function() {
  const data = ${JSON.stringify(data.severity)};
  const margin = { top: 40, right: 30, bottom: 40, left: 140 };
  const rowH = 60;
  const width = 860, height = margin.top + margin.bottom + data.length * rowH;

  const svg = d3.select('#chart-severity')
    .append('svg')
    .attr('viewBox', \`0 0 \${width} \${height}\`)
    .style('width', '100%');

  const x = d3.scaleLinear().domain([-3, 3]).range([margin.left, width - margin.right]);
  const yPos = (i) => margin.top + i * rowH + rowH / 2;

  // Title
  svg.append('text').attr('x', width/2).attr('y', 20).attr('text-anchor', 'middle').attr('font-size', 14).attr('fill', C.text).attr('font-weight', 600).attr('font-family', 'Space Grotesk').text('How Each Judge Deviates from the Panel Average');

  // Grid
  [-2, -1, 0, 1, 2].forEach(v => {
    svg.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', margin.top).attr('y2', height - margin.bottom)
      .attr('stroke', v === 0 ? C.accent : C.border).attr('stroke-width', v === 0 ? 1.5 : 0.5)
      .attr('stroke-dasharray', v === 0 ? 'none' : '2,4');
    svg.append('text').attr('x', x(v)).attr('y', height - margin.bottom + 16).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', C.dim).text(v === 0 ? '0 (panel avg)' : (v > 0 ? '+' : '') + v);
  });

  data.forEach((judge, i) => {
    const yp = yPos(i);

    // Label
    svg.append('text').attr('x', margin.left - 10).attr('y', yp - 6).attr('text-anchor', 'end').attr('font-size', 12).attr('fill', C.text).attr('font-weight', 600).text(\`\${judge.judge} · \${judge.country}\`);
    svg.append('text').attr('x', margin.left - 10).attr('y', yp + 10).attr('text-anchor', 'end').attr('font-size', 10).attr('fill', C.dim).text(judge.name);

    // Deviation dots
    judge.devs.forEach(d => {
      svg.append('circle')
        .attr('cx', x(d)).attr('cy', yp + (Math.random() - 0.5) * 16)
        .attr('r', 3)
        .attr('fill', d > 0 ? C.green : d < 0 ? C.red : C.muted)
        .attr('opacity', 0.5);
    });

    // Average lollipop
    svg.append('line').attr('x1', x(0)).attr('x2', x(judge.avg)).attr('y1', yp).attr('y2', yp)
      .attr('stroke', judge.avg > 0.15 ? C.green : judge.avg < -0.15 ? C.red : C.muted).attr('stroke-width', 2.5);
    svg.append('circle').attr('cx', x(judge.avg)).attr('cy', yp).attr('r', 5)
      .attr('fill', judge.avg > 0.15 ? C.green : judge.avg < -0.15 ? C.red : C.muted);
  });

  // Legend
  svg.append('circle').attr('cx', margin.left).attr('cy', height - 10).attr('r', 3).attr('fill', C.green).attr('opacity', 0.6);
  svg.append('text').attr('x', margin.left + 8).attr('y', height - 6).attr('font-size', 10).attr('fill', C.dim).text('Scored above panel');
  svg.append('circle').attr('cx', margin.left + 130).attr('cy', height - 10).attr('r', 3).attr('fill', C.red).attr('opacity', 0.6);
  svg.append('text').attr('x', margin.left + 138).attr('y', height - 6).attr('font-size', 10).attr('fill', C.dim).text('Scored below panel');
  svg.append('text').attr('x', margin.left + 270).attr('y', height - 6).attr('font-size', 10).attr('fill', C.dim).text('● = average deviation');
})();

// ═══════════════════════════════════════════════════════════
// CHART: Relief Bias
// ═══════════════════════════════════════════════════════════
(function() {
  const data = ${JSON.stringify(data.relief)};
  const margin = { top: 40, right: 120, bottom: 50, left: 60 };
  const width = 860, height = 400;

  const svg = d3.select('#chart-relief')
    .append('svg')
    .attr('viewBox', \`0 0 \${width} \${height}\`)
    .style('width', '100%');

  const x = d3.scaleLinear().domain([-0.5, 7]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([65, 100]).range([height - margin.bottom, margin.top]);

  // Grid
  [70, 80, 90, 100].forEach(v => {
    svg.append('line').attr('x1', margin.left).attr('x2', width - margin.right).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', C.border).attr('stroke-width', 0.5);
    svg.append('text').attr('x', margin.left - 10).attr('y', y(v) + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', C.dim).text(v);
  });

  // Labels
  svg.append('text').attr('x', width/2).attr('y', height - 6).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', C.muted).text('Consecutive Crashes Immediately Before This Run');
  svg.append('text').attr('x', 14).attr('y', height/2).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', C.muted).attr('transform', \`rotate(-90, 14, \${height/2})\`).text('Score');
  svg.append('text').attr('x', width/2).attr('y', 24).attr('text-anchor', 'middle').attr('font-size', 14).attr('fill', C.text).attr('font-weight', 600).attr('font-family', 'Space Grotesk').text('Does a Crash Streak Boost the Next Clean Score?');

  // Average line
  const avg = data.reduce((s,d) => s + d.score, 0) / data.length;
  svg.append('line').attr('x1', margin.left).attr('x2', width - margin.right).attr('y1', y(avg)).attr('y2', y(avg))
    .attr('stroke', C.dim).attr('stroke-dasharray', '4,4').attr('stroke-width', 1);
  svg.append('text').attr('x', width - margin.right + 4).attr('y', y(avg) + 4).attr('font-size', 10).attr('fill', C.dim).text(\`avg: \${avg.toFixed(1)}\`);

  // Points
  data.forEach(d => {
    const color = d.streak === 0 ? C.accent : d.streak <= 2 ? C.gold : C.red;
    svg.append('circle')
      .attr('cx', x(d.streak + (Math.random() - 0.5) * 0.3))
      .attr('cy', y(d.score))
      .attr('r', 7)
      .attr('fill', color).attr('opacity', 0.75)
      .attr('stroke', color).attr('stroke-width', 1).attr('stroke-opacity', 0.3);

    svg.append('text')
      .attr('x', x(d.streak) + 12).attr('y', y(d.score) + 4)
      .attr('font-size', 9).attr('fill', C.muted)
      .text(d.name);
  });

  // Legend
  [{s: 0, c: C.accent, t: 'After clean run'}, {s: 1, c: C.gold, t: 'After 1-2 crashes'}, {s: 3, c: C.red, t: 'After 3+ crashes'}].forEach((l, i) => {
    svg.append('circle').attr('cx', width - margin.right + 10).attr('cy', margin.top + 20 + i * 20).attr('r', 5).attr('fill', l.c).attr('opacity', 0.75);
    svg.append('text').attr('x', width - margin.right + 20).attr('y', margin.top + 24 + i * 20).attr('font-size', 10).attr('fill', C.muted).text(l.t);
  });
})();

// ═══════════════════════════════════════════════════════════
// CHART: Difficulty vs Score
// ═══════════════════════════════════════════════════════════
(function() {
  const data = ${JSON.stringify(data.difficulty)};
  if (!data.length) return;
  const margin = { top: 40, right: 40, bottom: 50, left: 60 };
  const width = 800, height = 400;

  const svg = d3.select('#chart-difficulty')
    .append('svg')
    .attr('viewBox', \`0 0 \${width} \${height}\`)
    .style('width', '100%');

  const x = d3.scaleLinear().domain([25, 55]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([65, 100]).range([height - margin.bottom, margin.top]);

  // Grid
  [30, 35, 40, 45, 50].forEach(v => {
    svg.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', margin.top).attr('y2', height - margin.bottom).attr('stroke', C.border).attr('stroke-width', 0.5);
    svg.append('text').attr('x', x(v)).attr('y', height - margin.bottom + 16).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', C.dim).text(v);
  });
  [70, 80, 90].forEach(v => {
    svg.append('line').attr('x1', margin.left).attr('x2', width - margin.right).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', C.border).attr('stroke-width', 0.5);
    svg.append('text').attr('x', margin.left - 10).attr('y', y(v) + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', C.dim).text(v);
  });

  svg.append('text').attr('x', width/2).attr('y', height - 6).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', C.muted).text('Total Trick Difficulty (our computed score)');
  svg.append('text').attr('x', 14).attr('y', height/2).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', C.muted).attr('transform', \`rotate(-90, 14, \${height/2})\`).text('Final Score');
  svg.append('text').attr('x', width/2).attr('y', 24).attr('text-anchor', 'middle').attr('font-size', 14).attr('fill', C.text).attr('font-weight', 600).attr('font-family', 'Space Grotesk').text('Execution Beats Difficulty');

  // r annotation
  svg.append('text').attr('x', x(50)).attr('y', y(95)).attr('font-size', 16).attr('fill', C.purple).attr('font-family', 'Space Grotesk').attr('font-weight', 600).attr('opacity', 0.6).text('r = 0.195');
  svg.append('text').attr('x', x(50)).attr('y', y(95) + 16).attr('font-size', 10).attr('fill', C.dim).text('(weak correlation)');

  data.forEach(d => {
    const isOutlier = (d.diff > 49 && d.score < 80) || (d.diff < 34 && d.score > 90);
    svg.append('circle')
      .attr('cx', x(d.diff)).attr('cy', y(d.score))
      .attr('r', 7)
      .attr('fill', isOutlier ? C.gold : C.purple).attr('opacity', 0.7)
      .attr('stroke', isOutlier ? C.gold : C.purple).attr('stroke-width', 1).attr('stroke-opacity', 0.3);
    svg.append('text')
      .attr('x', x(d.diff) + (d.diff > 45 ? -8 : 10))
      .attr('y', y(d.score) + 4)
      .attr('text-anchor', d.diff > 45 ? 'end' : 'start')
      .attr('font-size', 9).attr('fill', isOutlier ? C.gold : C.dim)
      .attr('font-weight', isOutlier ? 600 : 400)
      .text(d.name);
  });
})();
</script>
</body>
</html>`;
  }

  buildGrid(sequences) {
    const statusCls = { clean: 'cell-clean', wipeout: 'cell-wipeout', crash: 'cell-crash', strategic_skip: 'cell-skip', did_not_improve: 'cell-skip' };
    const medalEmoji = { GOLD: '🥇', SILVER: '🥈', BRONZE: '🥉' };
    let html = '<div class="comp-grid">';
    sequences.forEach((runs, ri) => {
      html += `<div class="comp-rlabel">R${ri + 1}</div>`;
      runs.forEach(r => {
        const cls = statusCls[r.status] || 'cell-skip';
        const scoreStr = r.score !== null ? r.score : '—';
        const medalAttr = medalEmoji[r.medal] ? ` class="${cls} comp-cell cell-medal" data-medal="${medalEmoji[r.medal]}"` : ` class="${cls} comp-cell"`;
        html += `<div${medalAttr} title="${r.fullName} (${r.country}) — ${r.status}"><div class="cname">${r.name}</div><div class="cscore">${scoreStr}</div></div>`;
      });
    });
    html += '</div>';
    return html;
  }
}

const gen = new PremiumReport();
gen.generate();
