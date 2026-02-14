/**
 * Generate Visual HTML Report
 * 
 * Reads analysis results and raw data, produces a self-contained HTML report
 * with inline SVG charts. No external dependencies needed.
 */

const fs = require('fs');
const path = require('path');

class ReportGenerator {
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
    const lines = content.trim().split('\n');
    const judges = {};
    lines.slice(1).forEach(line => {
      const v = line.split(',');
      judges[v[0].trim()] = { name: v[1]?.trim(), country: v[2]?.trim() };
    });
    return judges;
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
      const key = `${row.competitor}-${row.run}`;
      return this.dniMap[key]?.dni_reason || 'dni_unknown';
    }
    return parseFloat(row.final_score) >= 50 ? 'clean' : 'wipeout';
  }

  getJudgeScores(row) {
    const scores = [];
    for (let j = 1; j <= 6; j++) {
      const val = parseFloat(row[`judge${j}_score`]);
      if (!isNaN(val)) scores.push({ judgeNum: j, score: val });
    }
    return scores;
  }

  // ── SVG Helpers ─────────────────────────────────────────────

  svgBar({ data, width = 600, height = 300, barColor = '#4A90D9', title = '', yLabel = '', showValues = true }) {
    const margin = { top: 40, right: 20, bottom: 60, left: 50 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const maxVal = Math.max(...data.map(d => Math.abs(d.value)));
    const hasNegative = data.some(d => d.value < 0);
    const minVal = hasNegative ? -maxVal : 0;
    const range = maxVal - minVal;
    const barWidth = Math.min(50, (w / data.length) * 0.7);
    const gap = (w - barWidth * data.length) / (data.length + 1);

    const yScale = (v) => margin.top + h - ((v - minVal) / range) * h;
    const zeroY = yScale(0);

    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="font-family: system-ui, sans-serif; max-width: ${width}px;">`;

    // Title
    if (title) {
      svg += `<text x="${width / 2}" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">${title}</text>`;
    }

    // Y axis
    svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + h}" stroke="#ccc"/>`;
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const val = minVal + (range * i / ticks);
      const y = yScale(val);
      svg += `<line x1="${margin.left - 4}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="#999"/>`;
      svg += `<text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#666">${val.toFixed(1)}</text>`;
      svg += `<line x1="${margin.left}" y1="${y}" x2="${margin.left + w}" y2="${y}" stroke="#f0f0f0"/>`;
    }

    // Zero line
    if (hasNegative) {
      svg += `<line x1="${margin.left}" y1="${zeroY}" x2="${margin.left + w}" y2="${zeroY}" stroke="#999" stroke-dasharray="4,2"/>`;
    }

    // Bars
    data.forEach((d, i) => {
      const x = margin.left + gap + i * (barWidth + gap);
      const barH = Math.abs(d.value / range) * h;
      const y = d.value >= 0 ? zeroY - barH : zeroY;
      const color = d.color || barColor;

      svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" fill="${color}" rx="2"/>`;

      // Value label
      if (showValues) {
        const labelY = d.value >= 0 ? y - 5 : y + barH + 14;
        svg += `<text x="${x + barWidth / 2}" y="${labelY}" text-anchor="middle" font-size="10" fill="#333">${d.value > 0 ? '+' : ''}${d.value.toFixed(2)}</text>`;
      }

      // X label
      const labelLines = (d.label || '').split('\n');
      labelLines.forEach((line, li) => {
        svg += `<text x="${x + barWidth / 2}" y="${margin.top + h + 14 + li * 12}" text-anchor="middle" font-size="9" fill="#666">${this.escapeHtml(line)}</text>`;
      });
    });

    // Y label
    if (yLabel) {
      svg += `<text x="12" y="${margin.top + h / 2}" text-anchor="middle" font-size="11" fill="#666" transform="rotate(-90, 12, ${margin.top + h / 2})">${yLabel}</text>`;
    }

    svg += '</svg>';
    return svg;
  }

  svgScatter({ data, width = 500, height = 350, title = '', xLabel = '', yLabel = '' }) {
    const margin = { top: 40, right: 20, bottom: 50, left: 50 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const xVals = data.map(d => d.x);
    const yVals = data.map(d => d.y);
    const xMin = Math.min(...xVals) - 2;
    const xMax = Math.max(...xVals) + 2;
    const yMin = Math.min(...yVals) - 3;
    const yMax = Math.max(...yVals) + 3;

    const xScale = (v) => margin.left + ((v - xMin) / (xMax - xMin)) * w;
    const yScale = (v) => margin.top + h - ((v - yMin) / (yMax - yMin)) * h;

    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="font-family: system-ui, sans-serif; max-width: ${width}px;">`;

    if (title) {
      svg += `<text x="${width / 2}" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">${title}</text>`;
    }

    // Axes
    svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + h}" stroke="#ccc"/>`;
    svg += `<line x1="${margin.left}" y1="${margin.top + h}" x2="${margin.left + w}" y2="${margin.top + h}" stroke="#ccc"/>`;

    // Grid & ticks
    for (let i = 0; i <= 4; i++) {
      const yVal = yMin + (yMax - yMin) * i / 4;
      const y = yScale(yVal);
      svg += `<text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#666">${yVal.toFixed(0)}</text>`;
      svg += `<line x1="${margin.left}" y1="${y}" x2="${margin.left + w}" y2="${y}" stroke="#f0f0f0"/>`;

      const xVal = xMin + (xMax - xMin) * i / 4;
      const x = xScale(xVal);
      svg += `<text x="${x}" y="${margin.top + h + 16}" text-anchor="middle" font-size="10" fill="#666">${xVal.toFixed(0)}</text>`;
    }

    // Points
    data.forEach(d => {
      const color = d.color || '#4A90D9';
      svg += `<circle cx="${xScale(d.x)}" cy="${yScale(d.y)}" r="5" fill="${color}" opacity="0.8"/>`;
      if (d.label) {
        svg += `<text x="${xScale(d.x) + 7}" y="${yScale(d.y) + 4}" font-size="8" fill="#666">${this.escapeHtml(d.label)}</text>`;
      }
    });

    // Labels
    if (xLabel) svg += `<text x="${margin.left + w / 2}" y="${height - 8}" text-anchor="middle" font-size="11" fill="#666">${xLabel}</text>`;
    if (yLabel) svg += `<text x="12" y="${margin.top + h / 2}" text-anchor="middle" font-size="11" fill="#666" transform="rotate(-90, 12, ${margin.top + h / 2})">${yLabel}</text>`;

    svg += '</svg>';
    return svg;
  }

  svgHeatmap({ data, labels, width = 400, height = 400, title = '' }) {
    const margin = { top: 40, right: 20, bottom: 20, left: 100 };
    const n = labels.length;
    const cellSize = Math.min((width - margin.left - margin.right) / n, (height - margin.top - margin.bottom) / n);

    let svg = `<svg viewBox="0 0 ${margin.left + n * cellSize + margin.right} ${margin.top + n * cellSize + margin.bottom}" xmlns="http://www.w3.org/2000/svg" style="font-family: system-ui, sans-serif; max-width: ${width}px;">`;

    if (title) {
      svg += `<text x="${(margin.left + n * cellSize) / 2}" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">${title}</text>`;
    }

    for (let i = 0; i < n; i++) {
      // Row labels
      svg += `<text x="${margin.left - 5}" y="${margin.top + i * cellSize + cellSize / 2 + 4}" text-anchor="end" font-size="9" fill="#333">${this.escapeHtml(labels[i])}</text>`;
      // Column labels
      svg += `<text x="${margin.left + i * cellSize + cellSize / 2}" y="${margin.top - 5}" text-anchor="middle" font-size="9" fill="#333">J${i + 1}</text>`;

      for (let j = 0; j < n; j++) {
        const val = data[i][j];
        // Color scale: 0.996 → light, 1.000 → dark
        const intensity = Math.max(0, Math.min(1, (val - 0.996) / 0.004));
        const r = Math.round(240 - intensity * 170);
        const g = Math.round(240 - intensity * 100);
        const b = Math.round(245 - intensity * 50);
        svg += `<rect x="${margin.left + j * cellSize}" y="${margin.top + i * cellSize}" width="${cellSize}" height="${cellSize}" fill="rgb(${r},${g},${b})" stroke="white" stroke-width="1"/>`;
        svg += `<text x="${margin.left + j * cellSize + cellSize / 2}" y="${margin.top + i * cellSize + cellSize / 2 + 4}" text-anchor="middle" font-size="9" fill="${intensity > 0.6 ? 'white' : '#333'}">${val.toFixed(3)}</text>`;
      }
    }

    svg += '</svg>';
    return svg;
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Data Computation ────────────────────────────────────────

  computeJudgeSeverity() {
    const scored = this.rawScores.filter(r => r.final_score && r.final_score !== 'DNI');
    const judgeStats = {};
    for (let j = 1; j <= 6; j++) judgeStats[j] = { devs: [], exHigh: 0, exLow: 0, n: 0 };

    scored.forEach(run => {
      const scores = this.getJudgeScores(run);
      if (scores.length < 6) return;
      const mean = scores.reduce((s, x) => s + x.score, 0) / scores.length;
      const max = Math.max(...scores.map(s => s.score));
      const min = Math.min(...scores.map(s => s.score));

      scores.forEach(s => {
        judgeStats[s.judgeNum].devs.push(s.score - mean);
        judgeStats[s.judgeNum].n++;
        if (s.score === max && scores.filter(x => x.score === max).length === 1) judgeStats[s.judgeNum].exHigh++;
        if (s.score === min && scores.filter(x => x.score === min).length === 1) judgeStats[s.judgeNum].exLow++;
      });
    });

    return Object.entries(judgeStats).map(([j, s]) => ({
      judge: parseInt(j),
      name: this.judges[j]?.name || '',
      country: this.judges[j]?.country || '',
      avgDev: s.devs.reduce((a, b) => a + b, 0) / s.devs.length,
      exHigh: s.exHigh,
      exLow: s.exLow,
      n: s.n,
    }));
  }

  computeConsensus() {
    const scored = this.rawScores.filter(r => r.final_score && r.final_score !== 'DNI');
    return scored.map(run => {
      const scores = this.getJudgeScores(run);
      if (scores.length < 6) return null;
      const vals = scores.map(s => s.score);
      return {
        competitor: run.competitor,
        run: parseInt(run.run),
        score: parseFloat(run.final_score),
        spread: Math.max(...vals) - Math.min(...vals),
        scores: vals,
        type: parseFloat(run.final_score) >= 50 ? 'clean' : 'wipeout',
      };
    }).filter(Boolean);
  }

  computeCorrelationMatrix() {
    const scored = this.rawScores.filter(r => r.final_score && r.final_score !== 'DNI');
    const vecs = {};
    for (let j = 1; j <= 6; j++) vecs[j] = [];

    scored.forEach(run => {
      const scores = this.getJudgeScores(run);
      if (scores.length < 6) return;
      scores.forEach(s => vecs[s.judgeNum].push(s.score));
    });

    const matrix = [];
    for (let i = 1; i <= 6; i++) {
      const row = [];
      for (let j = 1; j <= 6; j++) {
        if (i === j) { row.push(1.0); continue; }
        const n = Math.min(vecs[i].length, vecs[j].length);
        const xm = vecs[i].slice(0, n).reduce((a, b) => a + b, 0) / n;
        const ym = vecs[j].slice(0, n).reduce((a, b) => a + b, 0) / n;
        let num = 0, dx = 0, dy = 0;
        for (let k = 0; k < n; k++) {
          num += (vecs[i][k] - xm) * (vecs[j][k] - ym);
          dx += (vecs[i][k] - xm) ** 2;
          dy += (vecs[j][k] - ym) ** 2;
        }
        row.push(num / Math.sqrt(dx * dy));
      }
      matrix.push(row);
    }
    return matrix;
  }

  computeCrashStreaks() {
    const all = [];
    for (let round = 1; round <= 3; round++) {
      const runs = this.rawScores
        .filter(r => r.run === round.toString())
        .sort((a, b) => parseInt(a.position) - parseInt(b.position));

      let streak = 0;
      runs.forEach(run => {
        const status = this.getRunStatus(run);
        const isCrash = status === 'wipeout' || status === 'crash';
        const isCompleted = status === 'clean' || status === 'did_not_improve' || status === 'strategic_skip';

        if (status === 'clean') {
          all.push({ competitor: run.competitor, position: parseInt(run.position), round, score: parseFloat(run.final_score), streak });
        }
        if (isCrash) streak++;
        else if (isCompleted) streak = 0;
      });
    }
    return all;
  }

  computeWipeouts() {
    const scored = this.rawScores.filter(r => r.final_score && r.final_score !== 'DNI' && parseFloat(r.final_score) < 50);
    return scored.map(run => {
      const tricks = [run.trick1, run.trick2, run.trick3, run.trick4, run.trick5].filter(t => t && t.length > 0);
      const scores = this.getJudgeScores(run);
      return {
        competitor: run.competitor,
        score: parseFloat(run.final_score),
        tricks: tricks.length,
        spread: scores.length >= 2 ? Math.max(...scores.map(s => s.score)) - Math.min(...scores.map(s => s.score)) : 0,
      };
    }).sort((a, b) => a.tricks - b.tricks || a.score - b.score);
  }

  computeRoundSequences() {
    const sequences = [];
    for (let round = 1; round <= 3; round++) {
      const runs = this.rawScores
        .filter(r => r.run === round.toString())
        .sort((a, b) => parseInt(a.position) - parseInt(b.position));

      runs.forEach(run => {
        const status = this.getRunStatus(run);
        const score = run.final_score === 'DNI' ? null : parseFloat(run.final_score);
        sequences.push({
          round,
          position: parseInt(run.position),
          competitor: run.competitor.split(' ').pop(),
          score,
          status,
        });
      });
    }
    return sequences;
  }

  // ── Build HTML ──────────────────────────────────────────────

  generate() {
    const severity = this.computeJudgeSeverity();
    const consensus = this.computeConsensus();
    const corrMatrix = this.computeCorrelationMatrix();
    const crashStreaks = this.computeCrashStreaks();
    const wipeouts = this.computeWipeouts();
    const sequences = this.computeRoundSequences();

    // ── Charts ──

    // 1. Judge severity bar chart
    const severityChart = this.svgBar({
      data: severity.map(s => ({
        value: s.avgDev,
        label: `J${s.judge}\n${s.country}`,
        color: s.avgDev > 0.2 ? '#5BA85B' : s.avgDev < -0.2 ? '#D94A4A' : '#999',
      })),
      title: 'Judge Severity: Average Deviation from Panel Mean',
      yLabel: 'Deviation (pts)',
      width: 500,
      height: 280,
    });

    // 2. Judge exclusion chart
    const exclusionChart = this.svgBar({
      data: severity.flatMap(s => [
        { value: s.exHigh, label: `J${s.judge}\nHIGH`, color: '#5BA85B' },
        { value: -s.exLow, label: `J${s.judge}\nLOW`, color: '#D94A4A' },
      ]),
      title: 'Judge Exclusion Frequency (Dropped as Highest or Lowest)',
      yLabel: 'Times excluded',
      width: 700,
      height: 280,
    });

    // 3. Wipeout tricks vs score scatter
    const wipeoutChart = this.svgScatter({
      data: wipeouts.map(w => ({
        x: w.tricks,
        y: w.score,
        label: w.competitor.split(' ').pop(),
        color: '#D94A4A',
      })),
      title: 'Wipeout Score vs Tricks Completed (r=0.836)',
      xLabel: 'Tricks Completed Before Crash',
      yLabel: 'Score',
      width: 450,
      height: 320,
    });

    // 4. Consensus by score tier
    const consensusData = [
      { tier: 'wipeout', runs: consensus.filter(c => c.score < 50) },
      { tier: 'mid', runs: consensus.filter(c => c.score >= 50 && c.score < 80) },
      { tier: 'strong', runs: consensus.filter(c => c.score >= 80 && c.score < 90) },
      { tier: 'elite', runs: consensus.filter(c => c.score >= 90) },
    ].filter(d => d.runs.length > 0);

    const consensusChart = this.svgBar({
      data: consensusData.map(d => ({
        value: d.runs.reduce((s, r) => s + r.spread, 0) / d.runs.length,
        label: `${d.tier}\n(n=${d.runs.length})`,
        color: d.tier === 'elite' ? '#4A90D9' : d.tier === 'strong' ? '#5BA85B' : d.tier === 'mid' ? '#F5A623' : '#D94A4A',
      })),
      title: 'Judge Disagreement by Score Tier (Average Spread)',
      yLabel: 'Avg Score Spread (pts)',
      width: 450,
      height: 280,
    });

    // 5. Correlation heatmap
    const corrLabels = severity.map(s => `J${s.judge} ${s.name.split(' ')[0]}`);
    const corrHeatmap = this.svgHeatmap({
      data: corrMatrix,
      labels: corrLabels,
      title: 'Judge-to-Judge Score Correlations',
      width: 500,
      height: 400,
    });

    // 6. Crash streak relief chart
    const streakGroups = {};
    crashStreaks.forEach(r => {
      const key = r.streak === 0 ? '0' : r.streak <= 2 ? '1-2' : '3+';
      if (!streakGroups[key]) streakGroups[key] = [];
      streakGroups[key].push(r);
    });
    const reliefChart = this.svgBar({
      data: Object.entries(streakGroups).map(([k, runs]) => ({
        value: runs.reduce((s, r) => s + r.score, 0) / runs.length,
        label: `${k} crashes\n(n=${runs.length})`,
        color: k === '0' ? '#999' : k === '1-2' ? '#F5A623' : '#D94A4A',
      })),
      title: 'Avg Clean Score by Immediate Crash Streak',
      yLabel: 'Avg Score',
      showValues: true,
      width: 400,
      height: 280,
    });

    // 7. Round sequence visualization
    const sequenceHtml = this.buildSequenceViz(sequences);

    // ── Assemble HTML ──

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Halfpipe Judging Analysis — Milano-Cortina 2026</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; color: #333; background: #fafafa; line-height: 1.6; }
  .container { max-width: 900px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 28px; margin-bottom: 8px; color: #1a1a1a; }
  h2 { font-size: 20px; margin: 40px 0 12px; padding-top: 24px; border-top: 2px solid #e0e0e0; color: #2c3e50; }
  h3 { font-size: 16px; margin: 20px 0 8px; color: #444; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
  .card { background: white; border-radius: 8px; padding: 24px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .chart-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
  .chart-row > * { flex: 1; min-width: 300px; }
  .verdict { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .verdict-yes { background: #d4edda; color: #155724; }
  .verdict-partial { background: #fff3cd; color: #856404; }
  .verdict-no { background: #f8d7da; color: #721c24; }
  .insight { background: #e8f4fd; border-left: 4px solid #4A90D9; padding: 12px 16px; margin: 12px 0; border-radius: 0 4px 4px 0; font-size: 14px; }
  .insight strong { color: #2c3e50; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; margin: 12px 0; }
  th { background: #f5f5f5; padding: 8px 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 600; }
  td { padding: 6px 12px; border-bottom: 1px solid #eee; }
  tr:hover td { background: #f9f9f9; }
  .sequence-round { margin: 8px 0; }
  .seq-item { display: inline-block; width: 68px; text-align: center; padding: 4px 2px; margin: 2px; border-radius: 4px; font-size: 11px; }
  .seq-clean { background: #d4edda; }
  .seq-wipeout { background: #f8d7da; }
  .seq-crash { background: #f5c6cb; }
  .seq-skip { background: #e2e3e5; }
  .seq-dni { background: #fff3cd; }
  .meta { font-size: 12px; color: #888; margin-top: 32px; }
  svg { width: 100%; height: auto; }
  @media (max-width: 640px) { .chart-row { flex-direction: column; } }
</style>
</head>
<body>
<div class="container">

<h1>🏂 Halfpipe Judging Analysis</h1>
<p class="subtitle">Milano-Cortina 2026 Men's Snowboard Halfpipe Final — 12 competitors, 3 rounds, 6 judges</p>

<h2>Competition Flow</h2>
<div class="card">
<h3>Round-by-Round Sequence</h3>
<p style="font-size:13px; color:#666; margin-bottom:8px;">Each round runs positions 1→12 (worst→best qualifier). Green = clean, red = wipeout/crash, gray = DNI.</p>
${sequenceHtml}
</div>

<h2>Q3: Judge Severity Profiles <span class="verdict verdict-yes">ANSWERABLE</span></h2>
<div class="card">
<div class="chart-row">
<div>${severityChart}</div>
<div>${exclusionChart}</div>
</div>
<div class="insight">
<strong>Finding:</strong> Judge 5 (FRA) is consistently the most generous — excluded as the highest scorer 25% of the time and never as the lowest.
Judge 4 (SUI) is consistently strict — excluded as the lowest 17% of the time and never as the highest. Expected by chance: ~17% in each direction.
</div>
</div>

<h2>Q4: Does the Trimmed Mean Protect Against Bias? <span class="verdict verdict-yes">ANSWERABLE</span></h2>
<div class="card">
<div class="insight">
<strong>Finding:</strong> Yes. The average shift from dropping high/low scores is just <strong>0.17 pts</strong>. The largest single shift was 0.67 pts.
Medal rankings are <strong>identical</strong> whether using raw mean or trimmed mean — the scoring system works as intended.
</div>
</div>

<h2>Q5: Wipeout Scoring Mechanics <span class="verdict verdict-yes">ANSWERABLE</span></h2>
<div class="card">
<div class="chart-row">
<div>${wipeoutChart}</div>
<div>${consensusChart}</div>
</div>
<div class="insight">
<strong>Finding:</strong> Tricks completed before crashing strongly predicts wipeout score (<strong>r=0.836</strong>).
Judges also <strong>disagree more on wipeouts</strong> (avg spread 3.44 pts) than clean runs (2.00 pts) — crashes introduce more subjectivity.
</div>
</div>

<h2>Q6: Judge Consensus Patterns <span class="verdict verdict-yes">ANSWERABLE</span></h2>
<div class="card">
<div class="insight">
<strong>Finding:</strong> Ruka Hirano received <strong>identical scores from all 6 judges (90)</strong> in two consecutive rounds — the only perfect consensus in the competition.
Near-consensus (spread ≤ 1) occurred in 6 of 24 runs. Elite runs (90+) show tighter agreement (avg spread 1.75) than wipeouts (3.44).
</div>
<table>
<tr><th>Run</th><th>Score</th><th>Spread</th><th>All 6 Scores</th><th>Type</th></tr>
${consensus.sort((a, b) => a.spread - b.spread).slice(0, 8).map(c => 
  `<tr><td>${this.escapeHtml(c.competitor)} R${c.run}</td><td>${c.score}</td><td>${c.spread}</td><td>[${c.scores ? c.scores.join(', ') : ''}]</td><td>${c.type}</td></tr>`
).join('\n')}
</table>
</div>

<h2>Q7: Judge-to-Judge Correlations <span class="verdict verdict-yes">ANSWERABLE</span></h2>
<div class="card">
${corrHeatmap}
<div class="insight">
<strong>Finding:</strong> All pairwise correlations are 0.997–0.999 — judges agree overwhelmingly on the rank ordering of performances.
The differences that DO exist (severity, exclusion patterns) are small but consistent, operating within a shared framework.
</div>
</div>

<h2>Q1/Q2: Relief Bias — Crash Streak Effect <span class="verdict verdict-partial">PARTIALLY ANSWERABLE</span></h2>
<div class="card">
${reliefChart}
<div class="insight">
<strong>Finding:</strong> Clean runs after 1+ consecutive crashes average <strong>+1.96 pts</strong> higher than those after clean runs (87.39 vs 85.44),
with nearly identical average positions (7.4 vs 7.3). However, within-rider comparisons show <strong>no effect</strong> in 2 of 3 cases:
Ruka Hirano scored <em>highest</em> (91) after zero crashes, and Yamada scored identically (92) regardless. The only positive case (Totsuka +4) involved a trick upgrade.
</div>
</div>

<h2>Q8: Nationality Bias <span class="verdict verdict-partial">PARTIALLY ANSWERABLE</span></h2>
<div class="card">
<div class="insight">
<strong>Finding:</strong> Judge 6 (HASHIMOTO, JPN) scores Japanese athletes <strong>+0.25 pts</strong> above panel mean vs −0.12 for others — a <strong>+0.37 pt</strong> home bias.
However, this is based on only 9 scored JPN performances, and other non-home judges show comparable or larger JPN-vs-other differences (J1: −0.64, J3: +0.27).
The effect is real but too small and under-powered to distinguish from noise.
</div>
</div>

<h2>Q9: Difficulty vs Score <span class="verdict verdict-partial">PARTIALLY ANSWERABLE</span></h2>
<div class="card">
<div class="insight">
<strong>Finding:</strong> Trick difficulty has only a <strong>weak correlation (r=0.195)</strong> with clean run scores.
Wang (difficulty 51.5) scored 76 while Yamada (difficulty 32.5) scored 92. <strong>Execution matters far more than difficulty</strong> in halfpipe judging — 
this is fundamentally different from diving or gymnastics where difficulty has a fixed multiplier.
</div>
</div>

<p class="meta">Generated ${new Date().toLocaleDateString()} — Data source: Olympics.com Milano-Cortina 2026 Official Results</p>

</div>
</body>
</html>`;

    const outPath = path.join(__dirname, '../results/report.html');
    fs.writeFileSync(outPath, html);
    console.log(`✓ Report generated: results/report.html`);
    console.log(`  Open in browser to view charts and findings.`);
  }

  buildSequenceViz(sequences) {
    let html = '';
    for (let round = 1; round <= 3; round++) {
      const runs = sequences.filter(s => s.round === round);
      html += `<div class="sequence-round"><strong>Round ${round}:</strong> `;
      runs.forEach(r => {
        let cls = 'seq-skip';
        if (r.status === 'clean') cls = 'seq-clean';
        else if (r.status === 'wipeout') cls = 'seq-wipeout';
        else if (r.status === 'crash') cls = 'seq-crash';
        else if (r.status === 'did_not_improve') cls = 'seq-dni';
        const scoreStr = r.score !== null ? r.score : 'DNI';
        html += `<span class="${cls}">${this.escapeHtml(r.competitor)}<br>${scoreStr}</span>`;
      });
      html += '</div>';
    }
    return html;
  }
}

const gen = new ReportGenerator();
gen.generate();
