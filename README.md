# 🏂 Snowboarding Halfpipe Judging Analysis

> **[👉 View the Interactive Report](https://thekatiefox.github.io/snowboarding-halfpipe-analysis/)**

A data journalism piece exploring judge scoring patterns in the Milano-Cortina 2026 Men's Snowboard Halfpipe Final — testing for bias, consistency, and structural effects in subjective Olympic judging.

**Data source**: [Olympics.com Official Results](https://www.olympics.com/en/milano-cortina-2026/results/sbd/je/m/hp----------------/fnl-/--------/result)

---

## What This Project Does

We have individual scores from all 6 judges for every scored performance in the final, plus trick sequences, competitor metadata, and judge nationalities. This lets us ask which questions about judging bias are actually answerable — and which aren't.

See **[RESEARCH_QUESTIONS.md](docs/RESEARCH_QUESTIONS.md)** for a critical assessment of 15 research questions ranked by answerability.

---

## Key Findings So Far

### Answerable Questions (Strong Evidence)

| Finding | Detail |
|---------|--------|
| **Judge severity** | Judge 5 (FRA) excluded as highest scorer 46% of runs; Judge 2 (GBR) excluded as lowest 38% |
| **Scoring system works** | Trimmed mean (drop high/low) verified on all 24 scored runs — dampens individual judge bias |
| **Wipeout scoring** | Clear pattern: more tricks completed before crash → higher wipeout score (11.75 for 2 tricks → 48.75 for 5) |
| **Groupthink** | Ruka Hirano received identical scores from all 6 judges (90) in two consecutive rounds |

### Partially Answerable (Descriptive, Not Conclusive)

| Finding | Detail |
|---------|--------|
| **Relief bias** | +1.95 pts after immediate crash streak vs after clean (n=7 vs n=8), but within-rider comparisons show no effect in 2 of 3 cases |
| **Nationality bias** | Judge 6 (JPN) scores Japanese athletes +0.90 pts above panel mean, but n=8 and only 1 testable pair |
| **Round drift** | Judges 1 & 2 get more generous R1→R3; Judges 4, 5, 6 get stricter |

### Not Answerable From This Event

- **Total crash exposure effect** — confounded with rider quality (better riders go later, see more crashes)
- **Weather effects** — only 3 data points (one per round)
- **Format fairness** — can't separate going-first disadvantage from being-worst-qualifier disadvantage

---

## Competition Structure

- **12 competitors**, 3 rounds each, same order every round
- **Position 1** = worst qualifier (goes first) → **Position 12** = best qualifier (goes last)
- **6 judges** per run — highest and lowest scores excluded, final = average of middle 4
- **Best-of-3** — only the highest score across all rounds counts for final ranking

This fixed ordering creates a structural confound: later positions both see more crashes AND are better riders.

---

## Running the Analysis

```bash
npm install

# Data enrichment pipeline
node scripts/compute_trick_difficulty.js    # Parse trick codes → difficulty scores
node scripts/enrich_judge_data.js           # Per-judge deviations & exclusion patterns
node scripts/scrape_dni_details.js          # Resolve DNI cases (requires internet)
node scripts/build_master_dataset.js        # Merge everything → master CSV

# Analysis
node scripts/judge_bias_analysis.js         # Comprehensive bias analysis (7 tests)
node scripts/points_per_trick_analysis.js   # Trick-level scoring breakdown
```

---

## Project Structure

```
├── data/raw/                              # Source data from Olympics.com
│   ├── milano-cortina-2026-individual-judge-scores.csv
│   ├── milano-cortina-2026-mens-halfpipe.csv
│   └── judges-metadata.csv
├── data/processed/                        # Enriched data
│   ├── master_enriched_dataset.csv        # 32-column merged dataset
│   ├── dni_resolved.csv                   # DNI crash vs skip classifications
│   ├── trick_difficulty_scores.csv        # Per-trick difficulty breakdown
│   ├── enriched-judge-scores.csv          # Scores + difficulty columns
│   └── judge_analysis_data.csv            # Per-judge per-run analysis
├── scripts/                               # Analysis & enrichment scripts
├── results/                               # JSON outputs from analyses
└── docs/
    ├── RESEARCH_QUESTIONS.md              # ⭐ Critical question assessment
    ├── METHODOLOGY.md                     # Assumptions & confounds
    └── DATA_GUIDE.md                      # Data structure reference
```

---

## References

- **Event**: Milano-Cortina 2026 Men's Snowboard Halfpipe Final, February 13, 2026
- **Contrast bias**: Damisch et al. (2006) — Olympic gymnastics ordering effects
- **Nationalism bias**: Zitzewitz (2006) — figure skating judging
- **Serial position**: Page & Page (2010) — Eurovision voting patterns

