# Snowboarding Halfpipe Judge Bias Analysis

Analysis of judge scoring patterns in the Milano-Cortina 2026 Men's Snowboard Halfpipe Final, testing for evidence of contrast/relief bias when judges evaluate performances following wipeouts.

**Data source**: [Olympics.com Official Results](https://www.olympics.com/en/milano-cortina-2026/results/sbd/je/m/hp----------------/fnl-/--------/result)

---

## Quick Summary

| Aspect | Finding |
|--------|---------|
| **Research Question** | Do judges award higher scores for impressive performances after wipeouts? (Contrast bias) |
| **Phase 1 Result** | Recovery runs average +2.78 pts higher than baseline |
| **Phase 2 Result** | Effect is largely selection bias, not judge bias (disappears when controlling for skill level) |
| **Phase 2 Confound** | Bottom-tier competitors go first each round → cannot show recovery context |
| **Conclusion** | Pattern is real but more complex than simple relief bonus |
| **Data Quality** | 15 clean runs analyzed (out of 36 performances); 9 DNI cases ambiguous |
| **Critical Limitation** | Cannot distinguish DNI=crash from DNI=didn't improve; see [METHODOLOGY.md](docs/METHODOLOGY.md) |

---

## Documentation

**Start here**: Read in this order for best understanding

1. **[RESEARCH_QUESTIONS.md](docs/RESEARCH_QUESTIONS.md)** (3 min read)
   - What we're testing and why it matters
   - Core hypotheses
   - Future analysis directions

2. **[ANALYSIS_PHASES.md](docs/ANALYSIS_PHASES.md)** (10 min read)
   - Phase 1: Recovery score findings (+2.78 pts)
   - Phase 2: Skill control discovery (effect disappears)
   - Detailed patterns and competing explanations

3. **[METHODOLOGY.md](docs/METHODOLOGY.md)** (15 min read)
   - ⚠️ **Critical: DNI ambiguity** (9 cases, reason unknown)
   - All assumptions and confounds
   - Data filtering rules
   - What we can/cannot conclude

4. **[DATA_GUIDE.md](docs/DATA_GUIDE.md)** (10 min read)
   - Data file structure and formats
   - Trick code explanations
   - Data reliability and quality assessment

---

## Results

All analysis outputs available as JSON files:

- `results/wipeout_context_analysis.json` — Phase 1: Recovery scores after wipeouts
- `results/position_controlled_analysis.json` — Phase 2: Skill-level controlled analysis
- `results/points_per_trick_analysis.json` — Baseline points per trick estimation
- `results/trick_difficulty_exploration.json` — Exploratory trick code analysis

---

## Key Findings

### Phase 1: Recovery Patterns (+2.78 pts bonus)

Clean runs that followed wipeouts scored **2.78 points higher** on average (89.13) compared to the overall baseline (86.35). Strong individual cases include:

- **Scotty James R2**: 48.75 (fall) → 93.50 (+44.75 recovery)
- **Valentino Guseli R3**: 35.0 (fall) → 88.0 (+53.0 recovery)
- **Chaeun Lee R3**: 24.75 → 24.75 → 87.5 (only competitor recovering after 2 wipeouts)

### Phase 2: The Plot Twist (Effect Disappears with Skill Control)

When breaking down by competitor tier (skill level), the relief effect **reverses or disappears**:

| Tier | Baseline | Recovery | Difference |
|------|----------|----------|-----------|
| Bottom | 77.81 | N/A (goes first) | N/A |
| Middle | 89.50 | 88.83 | **-0.67 pts** (penalty) |
| Top | 92.00 | 89.30 | **-2.70 pts** (penalty) |

**Why**: Better qualifiers naturally score higher, and better qualifiers are more likely to be in recovery situations. The Phase 1 bonus was **selection bias**, not judge bias.

**Exception**: Round 2 shows modest relief bonus (+1-3 pts) for top tier when preceded by fewer wipeouts.

### DNI Ambiguity: Critical Data Gap

9 performances marked "DNI" (Did Not Improve), but **reason unknown**:
- Could be: Competitor wiped out (crash)
- Or: Competitor didn't improve on their high score

**Impact**: Wipeout context analysis for these competitors is unreliable. See [METHODOLOGY.md](docs/METHODOLOGY.md) for details.

---

## Competition Context

- **Event**: Milano-Cortina 2026 Men's Snowboard Halfpipe Final
- **Competitors**: 12
- **Rounds**: 3 (same order each round)
- **Judging**: 6 judges per run, high/low scores excluded, final = average of middle 4
- **Wipeout rates**: R1=58.3%, R2=28.6%, R3=0% (only elite remain by Round 3)

**Key structural fact**: Position 1 (worst qualifier) goes first each round → **has zero wipeout context before their run**. This is a major confound in recovery analysis.

---

## Methodology Highlights

### Data Filtering
All analyses apply consistent filtering:
- ✅ **Include**: Scores ≥50 (clean, intentional execution)
- ❌ **Exclude**: Scores <50 (crashes/wipeouts)
- ❌ **Exclude**: DNI (reason unknown)
- **Result**: 15 clean runs analyzed out of 36 performances

### What We Can Conclude ✅
- Correlations in recovery patterns
- Selection bias explains Phase 1 finding
- Wipeout rates differ by round
- Some competitors show W→H trajectory

### What We Cannot Conclude ❌
- Whether relief bias actually exists (too many confounds)
- Individual judge bias (panel scores aggregated)
- Generalization to other competitions
- Causation (correlation only)

See [METHODOLOGY.md](docs/METHODOLOGY.md) for complete list of 7 major confounds.

---

## Running the Analysis

### Prerequisites
```bash
npm install
```

### Run All Analyses
```bash
node scripts/wipeout_context_analysis.js     # Phase 1
node scripts/position_controlled_analysis.js  # Phase 2
node scripts/points_per_trick_analysis.js    # Baseline
node scripts/trick_difficulty_exploration.js # Exploratory
```

### View Results
```bash
cat results/wipeout_context_analysis.json | jq
cat results/position_controlled_analysis.json | jq
cat results/points_per_trick_analysis.json | jq
cat results/trick_difficulty_exploration.json | jq
```

---

## Future Analysis Directions

From [RESEARCH_QUESTIONS.md](docs/RESEARCH_QUESTIONS.md):

- **Judge outlier analysis**: Which judges are excluded (high/low) most frequently?
- **Middle-4 consensus**: Do same judges bias identical tricks higher after wipeouts?
- **Judge sensitivity**: Which judges show strongest context-dependent scoring?
- **Round effects**: Does relief bias change between R1 (chaos) vs R3 (elite only)?
- **Within-score variance**: When judges disagree, is it due to relief bias?

---

## Critical Limitations

| Issue | Severity |
|-------|----------|
| **DNI ambiguity** (9 cases, reason unknown) | 🔴 CRITICAL |
| Trick difficulty uncontrolled | 🟡 HIGH |
| Small sample (n=15 clean) | 🟡 HIGH |
| Selection bias across rounds | 🟡 HIGH |
| Judge composition unknown | 🟡 HIGH |
| Environmental data missing | 🟠 MEDIUM |

See [METHODOLOGY.md](docs/METHODOLOGY.md) for detailed confound analysis.

---

## Project Structure

```
.
├── README.md (this file)
├── docs/
│   ├── RESEARCH_QUESTIONS.md (hypotheses & future work)
│   ├── ANALYSIS_PHASES.md (Phase 1-2 findings)
│   ├── METHODOLOGY.md (assumptions & confounds)
│   └── DATA_GUIDE.md (data structure & reliability)
├── data/raw/
│   ├── milano-cortina-2026-individual-judge-scores.csv (primary)
│   ├── milano-cortina-2026-mens-halfpipe.csv
│   └── judges-metadata.csv
├── scripts/
│   ├── wipeout_context_analysis.js
│   ├── position_controlled_analysis.js
│   ├── points_per_trick_analysis.js
│   └── trick_difficulty_exploration.js
├── results/
│   ├── wipeout_context_analysis.json
│   ├── position_controlled_analysis.json
│   ├── points_per_trick_analysis.json
│   └── trick_difficulty_exploration.json
└── package.json
```

---

## Key References

- **Event data**: https://www.olympics.com/en/milano-cortina-2026/results/sbd/je/m/hp----------------/fnl-/--------/result
- **Contrast bias research**: Wine competitions, gymnastics, figure skating all show ordering effects
- **Trimmed mean scoring**: Used in gymnastics and diving to prevent single-judge bias

---

## Status

**Phase 2 complete**: Selection bias identified, confound documented. Pattern is real but requires more sophisticated analysis to isolate judge bias from skill/trick effects.

**Data collected**: Full individual judge scores, trick sequences, competitor metadata. All verified and committed to repo.

**Recommendations**: Obtain DNI clarification (crash vs didn't improve), collect trick difficulty ratings, cross-validate with other competitions.

