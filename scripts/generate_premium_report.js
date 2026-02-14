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

    const html = this.buildHTML({ sequences, dotStrip, wipeouts, severity, relief });
    const outPath = path.join(__dirname, '../results/interactive-report.html');
    const indexPath = path.join(__dirname, '../index.html');
    fs.writeFileSync(outPath, html);
    fs.writeFileSync(indexPath, html);
    console.log(`✓ Premium report: results/interactive-report.html + index.html`);
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


  buildHTML(data) {
    // Curate dot strip to ~10 most illustrative runs
    const curated = this.curateDotStrip(data.dotStrip);

    // Compute relief group averages
    const reliefGroups = {};
    data.relief.forEach(d => {
      const key = d.streak === 0 ? 0 : d.streak <= 2 ? 1 : 2;
      if (!reliefGroups[key]) reliefGroups[key] = { scores: [], label: key === 0 ? 'After 0 crashes' : key === 1 ? 'After 1–2 crashes' : 'After 3+ crashes' };
      reliefGroups[key].scores.push(d.score);
    });
    Object.values(reliefGroups).forEach(g => { g.avg = g.scores.reduce((a,b) => a+b, 0) / g.scores.length; g.n = g.scores.length; });

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
  --muted: #9898ac;
  --dim: #84849c;
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
  background: url('https://images.unsplash.com/photo-1611644667054-3533bccc66c3?w=1920&auto=format&fit=crop&q=80') center/cover no-repeat;
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(10,10,15,0.97) 0%, rgba(10,10,15,0.80) 35%, rgba(10,10,30,0.55) 65%, rgba(10,10,30,0.40) 100%);
}
.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 30% 50%, rgba(108,140,255,0.10) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 30%, rgba(167,139,250,0.08) 0%, transparent 50%);
  animation: drift 20s ease-in-out infinite;
}
@keyframes drift {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-3%, 2%); }
}
.hero-content { position: relative; z-index: 1; max-width: 800px; }
.hero-label { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 500; letter-spacing: 3px; text-transform: uppercase; color: var(--text); margin-bottom: 20px; text-shadow: 0 1px 8px rgba(0,0,0,0.6); }
.hero h1 { font-family: 'Space Grotesk', sans-serif; font-size: clamp(40px, 7vw, 72px); font-weight: 700; line-height: 1.05; letter-spacing: -2px; margin-bottom: 24px; }
.hero h1 span { background: linear-gradient(135deg, var(--accent), var(--purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hero-desc { font-size: 18px; color: var(--muted); max-width: 520px; line-height: 1.7; }
.hero-stats { display: flex; gap: 40px; margin-top: 48px; }
.hero-stat-num { font-family: 'Space Grotesk', sans-serif; font-size: 42px; font-weight: 700; }
.hero-stat-label { font-size: 12px; color: var(--muted); margin-top: 2px; }
.scroll-hint { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); color: var(--text); font-size: 12px; font-weight: 500; letter-spacing: 2px; animation: pulse 2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

/* Key Findings Cards */
.findings { padding: 60px 40px; max-width: 1100px; margin: 0 auto; }
.findings-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--dim); text-align: center; margin-bottom: 32px; }
.findings-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.finding-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px 20px;
  transition: border-color 0.3s, transform 0.3s;
}
.finding-card:hover { border-color: var(--accent); transform: translateY(-2px); }
.finding-icon { font-size: 28px; margin-bottom: 12px; }
.finding-title { font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 600; line-height: 1.3; margin-bottom: 8px; }
.finding-detail { font-size: 13px; color: var(--muted); line-height: 1.5; }
.finding-detail strong { color: var(--text); font-weight: 500; }

/* Sections */
.section { padding: 100px 40px; max-width: 1000px; margin: 0 auto; }
.section-alt { background: var(--surface); }
.section-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 16px;
  letter-spacing: 0.5px;
}
.section-tag::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 18px;
  background: var(--accent);
  border-radius: 2px;
}
.section h2 { font-family: 'Space Grotesk', sans-serif; font-size: clamp(26px, 3.5vw, 36px); font-weight: 700; letter-spacing: -0.5px; margin-bottom: 20px; line-height: 1.2; }
.prose { color: var(--muted); font-size: 16px; max-width: 600px; line-height: 1.8; margin-bottom: 32px; }
.prose strong { color: var(--text); font-weight: 500; }
.prose em { color: var(--accent); font-style: normal; font-weight: 500; }

/* Charts */
.chart-wrap { background: var(--surface2); border: 1px solid var(--border); border-radius: 16px; padding: 32px; margin: 32px 0; overflow-x: auto; }
.chart-wrap.full { padding: 24px 16px; }
.chart-title { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 600; margin-bottom: 4px; color: var(--text); }
.chart-subtitle { font-size: 12px; color: var(--dim); margin-bottom: 16px; }

/* Callouts */
.callout { border-left: 3px solid var(--accent); background: rgba(108,140,255,0.06); padding: 20px 24px; border-radius: 0 12px 12px 0; margin: 32px 0; }
.callout p { font-size: 15px; color: var(--muted); line-height: 1.7; }
.callout strong { color: var(--text); }
.callout.gold { border-left-color: var(--gold); background: rgba(251,191,36,0.06); }

/* Verdict — pull-quote style for key conclusions */
.verdict {
  text-align: center;
  padding: 48px 32px;
  margin: 40px 0;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 20px;
  position: relative;
}
.verdict::before {
  content: '';
  position: absolute;
  top: 0; left: 50%;
  transform: translateX(-50%);
  width: 60px; height: 3px;
  border-radius: 2px;
}
.verdict.green::before { background: var(--green); }
.verdict.gold::before { background: var(--gold); }
.verdict-text {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(20px, 3vw, 28px);
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 12px;
}
.verdict-sub { font-size: 14px; color: var(--muted); line-height: 1.6; max-width: 500px; margin: 0 auto; }

/* Big number row */
.big-nums { display: flex; flex-wrap: wrap; gap: 16px; margin: 32px 0; }
.big-num { flex: 1; min-width: 130px; text-align: center; padding: 24px 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: 16px; }
.big-num .num { font-family: 'Space Grotesk', sans-serif; font-size: 40px; font-weight: 700; line-height: 1; }
.big-num .label { font-size: 12px; color: var(--muted); margin-top: 8px; line-height: 1.4; }

/* Section divider */
.section-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border), transparent);
  max-width: 200px;
  margin: 0 auto;
}

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

/* Grid legend */
.grid-legend { display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap; }
.grid-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--muted); }
.grid-legend-swatch { width: 12px; height: 12px; border-radius: 4px; }

/* Fade in */
.reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.8s ease, transform 0.8s ease; }
.reveal.visible { opacity: 1; transform: translateY(0); }

/* Conclusion */
.conclusion { padding: 80px 40px; max-width: 700px; margin: 0 auto; text-align: center; }
.conclusion h2 { font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; margin-bottom: 24px; }
.conclusion p { font-size: 16px; color: var(--muted); line-height: 1.8; margin-bottom: 16px; }
.conclusion p strong { color: var(--text); font-weight: 500; }

/* Footer */
.footer { text-align: center; padding: 60px 40px; color: var(--dim); font-size: 12px; border-top: 1px solid var(--border); }
.footer a { color: var(--accent); text-decoration: none; }

@media (max-width: 900px) {
  .findings-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 700px) {
  .hero { padding: 40px 20px 60px; }
  .section { padding: 60px 20px; }
  .hero-stats { flex-direction: column; gap: 20px; }
  .big-nums { flex-direction: column; }
  .comp-grid { overflow-x: auto; min-width: 700px; }
  .findings-grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>

<!-- ═══ HERO ═══ -->
<div class="hero">
  <div class="hero-content">
    <div class="hero-label">Milano-Cortina 2026 · Men's Snowboard Halfpipe Final</div>
    <h1>What 144 Scores Reveal About <span>Olympic Judging</span></h1>
    <p class="hero-desc">For every scored performance in the final, we have all six individual judge ratings. Here's what the data shows about consensus, bias, and what actually drives the score.</p>
    <div class="hero-stats">
      <div><div class="hero-stat-num" style="color:var(--accent)">12</div><div class="hero-stat-label">Competitors</div></div>
      <div><div class="hero-stat-num" style="color:var(--green)">24</div><div class="hero-stat-label">Scored performances</div></div>
      <div><div class="hero-stat-num" style="color:var(--purple)">144</div><div class="hero-stat-label">Individual judge ratings</div></div>
    </div>
  </div>
  <div class="scroll-hint">SCROLL ↓</div>
</div>

<!-- ═══ KEY FINDINGS ═══ -->
<div class="findings reveal">
  <div class="findings-label">Key Findings at a Glance</div>
  <div class="findings-grid">
    <div class="finding-card">
      <div class="finding-icon">🎯</div>
      <div class="finding-title">Perfect Agreement</div>
      <div class="finding-detail">All 6 judges gave Ruka Hirano <strong>exactly 90</strong> — twice, on two different routines. Every other scored run had judges disagreeing by at least a point.</div>
    </div>
    <div class="finding-card">
      <div class="finding-icon">💥</div>
      <div class="finding-title">Crashes Create Confusion</div>
      <div class="finding-detail">When a rider falls, judges have to guess how much credit to give. The result: they <strong>disagree 70% more</strong> on crash scores than on clean landings.</div>
    </div>
    <div class="finding-card">
      <div class="finding-icon">⚖️</div>
      <div class="finding-title">The System Works</div>
      <div class="finding-detail">The scoring rules drop the highest and lowest judge to limit bias. It works — that adjustment only shifts scores by <strong>0.17 points</strong> on average.</div>
    </div>
    <div class="finding-card">
      <div class="finding-icon">🔍</div>
      <div class="finding-title">Relief Bias? Probably Not</div>
      <div class="finding-detail">Do judges score higher after watching a string of crashes? When we compare the <strong>same rider</strong> in different crash contexts, there's no effect.</div>
    </div>
  </div>
</div>

<div class="section-divider"></div>

<!-- ═══ SECTION 1: THE EVENT ═══ -->
<div class="section reveal">
  <div class="section-tag">The Event</div>
  <h2>Three Rounds of Chaos and Precision</h2>
  <p class="prose">The worst qualifier goes first. The best goes last. Same order, every round. Round 1 was carnage — <strong>six consecutive wipeouts</strong> before a single clean landing. By Round 3, four riders had crashed out entirely, and the gold medalist didn't even bother to drop in.</p>
  
  <div class="chart-wrap full">
    <div class="chart-title">Every Performance, Color-Coded</div>
    <div class="chart-subtitle">Positions 1–12 (left to right = worst to best qualifier) · Hover for details</div>
    ${this.buildGrid(data.sequences)}
    <div class="grid-legend">
      <div class="grid-legend-item"><div class="grid-legend-swatch" style="background:rgba(74,222,128,0.3); border:1px solid rgba(74,222,128,0.5)"></div> Clean run</div>
      <div class="grid-legend-item"><div class="grid-legend-swatch" style="background:rgba(248,113,113,0.3); border:1px solid rgba(248,113,113,0.5)"></div> Wipeout (scored)</div>
      <div class="grid-legend-item"><div class="grid-legend-swatch" style="background:rgba(248,113,113,0.15); border:1px solid rgba(248,113,113,0.25)"></div> Crash (DNI)</div>
      <div class="grid-legend-item"><div class="grid-legend-swatch" style="background:rgba(122,122,144,0.15); border:1px solid rgba(122,122,144,0.25)"></div> Skipped / No improvement</div>
    </div>
  </div>
</div>

<div class="section-divider"></div>

<!-- ═══ SECTION 2: THE CONSENSUS ═══ -->
<div class="section-alt">
<div class="section reveal" style="max-width:1000px; margin:0 auto;">
  <div class="section-tag">The Consensus</div>
  <h2>Six Judges Wrote the Same Number. Twice.</h2>
  <p class="prose">Ruka Hirano's Round 1 and Round 2 runs each received <em>identical scores from all six judges</em>: 90 across the board. The runs even featured different trick sequences — R2 included a triple cork upgrade over R1 — yet all six judges independently landed on the same number both times. The next-tightest agreement among all other runs was a 1-point spread.</p>
  
  <div class="chart-wrap">
    <div class="chart-title">Judge Score Spread Per Run</div>
    <div class="chart-subtitle">Each dot = one judge's score · Horizontal spread = disagreement · Purple = perfect consensus</div>
    <div id="chart-dotstrip"></div>
  </div>

  <div class="callout">
    <p>Perfect consensus either means the performance was so unambiguous that all judges independently converged — or it suggests <strong>anchoring</strong>, where early scores influence later ones. We can't distinguish which from this data, but we can say it's statistically remarkable.</p>
  </div>
</div>
</div>

<div class="section-divider"></div>

<!-- ═══ SECTION 3: THE DISAGREEMENT (merged wipeout + severity) ═══ -->
<div class="section reveal">
  <div class="section-tag">The Disagreement</div>
  <h2>When Do Judges Diverge?</h2>
  <p class="prose">Judges agree remarkably well on clean runs. But when a rider crashes mid-run, consensus breaks down. The question becomes: <em>how much credit for what they showed?</em></p>

  <div class="big-nums">
    <div class="big-num"><div class="num" style="color:var(--green)">2.0 pts</div><div class="label">Avg judge spread<br>on clean runs</div></div>
    <div class="big-num"><div class="num" style="color:var(--red)">3.4 pts</div><div class="label">Avg judge spread<br>on wipeouts</div></div>
    <div class="big-num"><div class="num" style="color:var(--gold)">70%</div><div class="label">More disagreement<br>on crashes</div></div>
  </div>

  <div class="chart-wrap">
    <div class="chart-title">Wipeout Scores: Tricks Completed Before Crash</div>
    <div class="chart-subtitle">More tricks landed = higher score, regardless of what they were attempting</div>
    <div id="chart-wipeouts"></div>
  </div>

  <p class="prose" style="margin-top: 32px">And some judges are <strong>consistently</strong> more generous or strict than others — across every run, not just wipeouts.</p>

  <div class="chart-wrap">
    <div class="chart-title">How Each Judge Deviates from the Panel Average</div>
    <div class="chart-subtitle">Each dot = one run's deviation · Lollipop = average tendency · Left = strict, Right = generous</div>
    <div id="chart-severity"></div>
  </div>

  <div class="verdict green">
    <div class="verdict-text">But the safety net works.</div>
    <div class="verdict-sub">The trimmed mean (drop the highest and lowest score) shifts the final result by just <strong>0.17 points on average</strong>. Medal rankings would be identical with or without it.</div>
  </div>
</div>

<div class="section-divider"></div>

<!-- ═══ SECTION 4: THE HYPOTHESIS ═══ -->
<div class="section-alt">
<div class="section reveal" style="max-width:1000px; margin:0 auto;">
  <div class="section-tag">The Hypothesis</div>
  <h2>Does a Crash Streak Help the Next Clean Run?</h2>
  <p class="prose">The hypothesis: after watching multiple riders crash in a row, judges feel <em>relief</em> when someone finally lands — and unconsciously score them higher. We tracked the number of consecutive crashes immediately before each clean run.</p>

  <div class="chart-wrap">
    <div id="chart-relief"></div>
  </div>

  <div class="verdict gold">
    <div class="verdict-text">Verdict: probably not.</div>
    <div class="verdict-sub">The group average is +1.96 pts higher after crash streaks — but within-rider comparisons tell a different story. Ruka scored <strong>highest after zero crashes</strong> (91 vs 90). Yamada scored identically (92) regardless. The one positive case came with a trick upgrade, not a bias effect.</div>
  </div>
</div>
</div>

<div class="section-divider"></div>

<!-- ═══ CONCLUSION ═══ -->
<div class="conclusion reveal">
  <h2>What We Learned</h2>
  <p>Olympic halfpipe judging is <strong>more consistent than you'd expect</strong>. Six independent judges land within 2 points of each other on clean runs, and the trimmed mean effectively neutralizes individual tendencies.</p>
  <p>The biggest source of disagreement isn't bias — it's <strong>ambiguity</strong>. Wipeouts force judges to estimate what could have been, and that's where scores diverge. As for contrast bias from watching crashes? The data from this competition says <strong>no</strong>.</p>
  <p style="color: var(--dim); margin-top: 32px; font-size: 14px;">Based on individual judge scores from 24 scored performances across 3 rounds.<br>All data from the official Olympics.com results.</p>
</div>

<div class="footer">
  <div style="margin-bottom: 12px; font-size: 14px; color: var(--muted);">✦</div>
  Data from <a href="https://www.olympics.com/en/milano-cortina-2026/results/sbd/je/m/hp----------------/fnl-/--------/result">Olympics.com Official Results</a><br>
  Milano-Cortina 2026 Men's Snowboard Halfpipe Final · February 13, 2026<br>
  12 competitors · 3 rounds · 6 judges · Best score counts<br>
  <span style="margin-top: 8px; display: inline-block; opacity: 0.6;">Hero photo by <a href="https://unsplash.com/@yannphoto">Yann Allegre</a> on <a href="https://unsplash.com">Unsplash</a></span>
</div>

<script>
// ── Shared config ──
const C = {
  bg: '#1a1a26', text: '#e8e8f0', muted: '#9898ac', dim: '#84849c', border: '#2a2a3a',
  accent: '#6c8cff', green: '#4ade80', red: '#f87171', gold: '#fbbf24', purple: '#a78bfa', teal: '#2dd4bf',
};

// ── Reveal on scroll ──
const obs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

// ═══════════════════════════════════════════════════════════
// CHART: Dot Strip (curated runs)
// ═══════════════════════════════════════════════════════════
(function() {
  const data = ${JSON.stringify(curated)};
  const margin = { top: 10, right: 30, bottom: 40, left: 140 };
  const rowH = 32;
  const width = 860;
  const height = margin.top + margin.bottom + data.length * rowH;

  const svg = d3.select('#chart-dotstrip')
    .append('svg')
    .attr('viewBox', \`0 0 \${width} \${height}\`)
    .style('width', '100%');

  const allScores = data.flatMap(d => d.scores.map(s => s.score));
  const xMin = Math.min(...allScores) - 3;
  const xMax = Math.max(...allScores) + 3;
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

  svg.selectAll('.tick-label')
    .data(ticks.filter(t => t % 10 === 0))
    .join('text')
    .attr('x', d => x(d)).attr('y', height - margin.bottom + 16)
    .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', C.dim)
    .text(d => d);

  data.forEach((run, i) => {
    const yPos = y(i);
    const dotColor = run.allSame ? C.purple : run.type === 'wipeout' ? C.red : C.green;
    const labelColor = run.allSame ? C.purple : run.type === 'wipeout' ? C.red : C.muted;

    // Row label
    svg.append('text')
      .attr('x', margin.left - 10).attr('y', yPos + 4)
      .attr('text-anchor', 'end').attr('font-size', 11).attr('fill', labelColor)
      .attr('font-weight', run.allSame ? 700 : 400)
      .text(run.label);

    // Spread annotation
    svg.append('text')
      .attr('x', margin.left - 10).attr('y', yPos + 15)
      .attr('text-anchor', 'end').attr('font-size', 9).attr('fill', C.dim)
      .text(\`±\${run.spread.toFixed(0)} pt spread\`);

    // Connecting line (range)
    const scores = run.scores.map(s => s.score);
    svg.append('line')
      .attr('x1', x(Math.min(...scores))).attr('x2', x(Math.max(...scores)))
      .attr('y1', yPos).attr('y2', yPos)
      .attr('stroke', dotColor).attr('stroke-width', 1.5).attr('opacity', 0.25);

    // Score dots
    run.scores.forEach(s => {
      svg.append('circle')
        .attr('cx', x(s.score)).attr('cy', yPos)
        .attr('r', run.allSame ? 6 : 4.5)
        .attr('fill', dotColor)
        .attr('opacity', run.allSame ? 0.9 : 0.7);
    });

    // Final score marker
    svg.append('line')
      .attr('x1', x(run.final)).attr('x2', x(run.final))
      .attr('y1', yPos - 8).attr('y2', yPos + 8)
      .attr('stroke', C.text).attr('stroke-width', 1.5).attr('opacity', 0.3);
  });

  // Legend
  const ly = height - 10;
  [{c: C.purple, t: 'Perfect consensus (spread = 0)'}, {c: C.green, t: 'Clean run'}, {c: C.red, t: 'Wipeout'}].forEach((l, i) => {
    svg.append('circle').attr('cx', margin.left + i * 180).attr('cy', ly).attr('r', 4).attr('fill', l.c).attr('opacity', 0.8);
    svg.append('text').attr('x', margin.left + i * 180 + 8).attr('y', ly + 4).attr('font-size', 10).attr('fill', C.muted).text(l.t);
  });
})();

// ═══════════════════════════════════════════════════════════
// CHART: Wipeout Scatter
// ═══════════════════════════════════════════════════════════
(function() {
  const data = ${JSON.stringify(data.wipeouts)};
  const margin = { top: 40, right: 40, bottom: 50, left: 60 };
  const width = 800, height = 340;

  const svg = d3.select('#chart-wipeouts')
    .append('svg')
    .attr('viewBox', \`0 0 \${width} \${height}\`)
    .style('width', '100%');

  const x = d3.scaleLinear().domain([1.5, 5.5]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([5, 55]).range([height - margin.bottom, margin.top]);

  [2, 3, 4, 5].forEach(v => {
    svg.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', margin.top).attr('y2', height - margin.bottom).attr('stroke', C.border).attr('stroke-width', 0.5);
    svg.append('text').attr('x', x(v)).attr('y', height - margin.bottom + 18).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', C.dim).text(\`\${v} tricks\`);
  });
  [10, 20, 30, 40, 50].forEach(v => {
    svg.append('line').attr('x1', margin.left).attr('x2', width - margin.right).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', C.border).attr('stroke-width', 0.5);
    svg.append('text').attr('x', margin.left - 10).attr('y', y(v) + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', C.dim).text(v);
  });

  svg.append('text').attr('x', 14).attr('y', height/2).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', C.muted).attr('transform', \`rotate(-90, 14, \${height/2})\`).text('Score');

  // Trend line
  const xs = data.map(d => d.tricks), ys = data.map(d => d.score);
  const n = xs.length;
  const xm = xs.reduce((a,b) => a+b) / n, ym = ys.reduce((a,b) => a+b) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i]-xm)*(ys[i]-ym); den += (xs[i]-xm)**2; }
  const slope = num/den, intercept = ym - slope*xm;

  svg.append('line')
    .attr('x1', x(1.5)).attr('x2', x(5.5))
    .attr('y1', y(slope*1.5+intercept)).attr('y2', y(slope*5.5+intercept))
    .attr('stroke', C.red).attr('stroke-width', 1.5).attr('stroke-dasharray', '6,4').attr('opacity', 0.5);

  data.forEach(d => {
    svg.append('circle')
      .attr('cx', x(d.tricks)).attr('cy', y(d.score))
      .attr('r', 7)
      .attr('fill', C.red).attr('opacity', 0.7);
    svg.append('text')
      .attr('x', x(d.tricks) + 10).attr('y', y(d.score) + 4)
      .attr('font-size', 10).attr('fill', C.muted)
      .text(d.name);
  });

  svg.append('text').attr('x', x(4.8)).attr('y', y(48)).attr('font-size', 16).attr('fill', C.red).attr('font-family', 'Space Grotesk').attr('font-weight', 700).attr('opacity', 0.4).text('r = 0.836');
})();

// ═══════════════════════════════════════════════════════════
// CHART: Judge Severity (Lollipop + dots)
// ═══════════════════════════════════════════════════════════
(function() {
  const data = ${JSON.stringify(data.severity)};
  const margin = { top: 20, right: 30, bottom: 40, left: 140 };
  const rowH = 55;
  const width = 860, height = margin.top + margin.bottom + data.length * rowH;

  const svg = d3.select('#chart-severity')
    .append('svg')
    .attr('viewBox', \`0 0 \${width} \${height}\`)
    .style('width', '100%');

  const x = d3.scaleLinear().domain([-3, 3]).range([margin.left, width - margin.right]);
  const yPos = (i) => margin.top + i * rowH + rowH / 2;

  [-2, -1, 0, 1, 2].forEach(v => {
    svg.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', margin.top).attr('y2', height - margin.bottom)
      .attr('stroke', v === 0 ? C.accent : C.border).attr('stroke-width', v === 0 ? 1.5 : 0.5)
      .attr('stroke-dasharray', v === 0 ? 'none' : '2,4');
    svg.append('text').attr('x', x(v)).attr('y', height - margin.bottom + 16).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', C.dim).text(v === 0 ? '0 (avg)' : (v > 0 ? '+' : '') + v);
  });

  data.forEach((judge, i) => {
    const yp = yPos(i);

    svg.append('text').attr('x', margin.left - 10).attr('y', yp - 4).attr('text-anchor', 'end').attr('font-size', 12).attr('fill', C.text).attr('font-weight', 600).text(\`J\${i+1} · \${judge.country}\`);
    svg.append('text').attr('x', margin.left - 10).attr('y', yp + 10).attr('text-anchor', 'end').attr('font-size', 10).attr('fill', C.dim).text(judge.name);

    judge.devs.forEach(d => {
      svg.append('circle')
        .attr('cx', x(d)).attr('cy', yp + (Math.random() - 0.5) * 14)
        .attr('r', 3)
        .attr('fill', d > 0 ? C.green : d < 0 ? C.red : C.muted)
        .attr('opacity', 0.45);
    });

    svg.append('line').attr('x1', x(0)).attr('x2', x(judge.avg)).attr('y1', yp).attr('y2', yp)
      .attr('stroke', judge.avg > 0.15 ? C.green : judge.avg < -0.15 ? C.red : C.muted).attr('stroke-width', 2.5);
    svg.append('circle').attr('cx', x(judge.avg)).attr('cy', yp).attr('r', 5)
      .attr('fill', judge.avg > 0.15 ? C.green : judge.avg < -0.15 ? C.red : C.muted);
  });
})();

// ═══════════════════════════════════════════════════════════
// CHART: Relief Bias (with group averages)
// ═══════════════════════════════════════════════════════════
(function() {
  const data = ${JSON.stringify(data.relief)};
  const groups = ${JSON.stringify(Object.values(reliefGroups))};
  const margin = { top: 40, right: 30, bottom: 60, left: 60 };
  const width = 860, height = 420;

  const svg = d3.select('#chart-relief')
    .append('svg')
    .attr('viewBox', \`0 0 \${width} \${height}\`)
    .style('width', '100%');

  const x = d3.scaleLinear().domain([-0.8, 7.5]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([65, 100]).range([height - margin.bottom, margin.top]);

  // Grid
  [70, 80, 90, 100].forEach(v => {
    svg.append('line').attr('x1', margin.left).attr('x2', width - margin.right).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', C.border).attr('stroke-width', 0.5);
    svg.append('text').attr('x', margin.left - 10).attr('y', y(v) + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', C.dim).text(v);
  });

  svg.append('text').attr('x', width/2).attr('y', height - 10).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', C.muted).text('Consecutive Crashes Immediately Before This Run');
  svg.append('text').attr('x', 14).attr('y', height/2).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', C.muted).attr('transform', \`rotate(-90, 14, \${height/2})\`).text('Score');
  svg.append('text').attr('x', width/2).attr('y', 24).attr('text-anchor', 'middle').attr('font-size', 14).attr('fill', C.text).attr('font-weight', 600).attr('font-family', 'Space Grotesk').text('Does a Crash Streak Boost the Next Clean Score?');

  // Group average bands
  const groupConfigs = [
    { streaks: [0], color: C.accent, xCenter: 0 },
    { streaks: [1, 2], color: C.gold, xCenter: 1.5 },
    { streaks: [3, 4, 5, 6], color: C.red, xCenter: 4.5 },
  ];

  groupConfigs.forEach((gc, gi) => {
    const pts = data.filter(d => gc.streaks.includes(d.streak));
    if (!pts.length) return;
    const avg = pts.reduce((s, d) => s + d.score, 0) / pts.length;
    const xL = x(Math.min(...gc.streaks) - 0.4);
    const xR = x(Math.max(...gc.streaks) + 0.4);

    // Shaded average band
    svg.append('rect')
      .attr('x', xL).attr('y', y(avg) - 2)
      .attr('width', xR - xL).attr('height', 4)
      .attr('fill', gc.color).attr('opacity', 0.3).attr('rx', 2);

    // Average label
    svg.append('text')
      .attr('x', xR + 6).attr('y', y(avg) + 4)
      .attr('font-size', 11).attr('fill', gc.color).attr('font-weight', 600)
      .attr('font-family', 'Space Grotesk')
      .text(\`avg: \${avg.toFixed(1)} (n=\${pts.length})\`);
  });

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
})();
</script>
</body>
</html>`;
  }

  curateDotStrip(allRuns) {
    // Pick ~10 representative runs to tell the consensus story clearly
    const perfect = allRuns.filter(r => r.allSame);
    const clean = allRuns.filter(r => !r.allSame && r.type === 'clean').sort((a, b) => a.spread - b.spread);
    const wipeouts = allRuns.filter(r => r.type === 'wipeout').sort((a, b) => b.spread - a.spread);

    const picks = new Set();
    // Always include perfect consensus runs
    perfect.forEach(r => picks.add(r));
    // Tightest clean spreads (2-3)
    clean.slice(0, 3).forEach(r => picks.add(r));
    // Widest clean spreads (1-2)
    clean.slice(-2).forEach(r => picks.add(r));
    // Widest wipeout spreads (2-3)
    wipeouts.slice(0, 3).forEach(r => picks.add(r));

    return [...picks].sort((a, b) => a.spread - b.spread);
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
