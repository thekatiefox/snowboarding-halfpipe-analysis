# Data Guide: Sources, Structure & Reliability

## Data Source

**Official**: https://www.olympics.com/en/milano-cortina-2026/results/sbd/je/m/hp----------------/fnl-/--------/result

- **Event**: Milano-Cortina 2026 Men's Snowboard Halfpipe Final
- **Date**: February 13, 2026
- **Location**: Livigno Olympic Halfpipe
- **Competitors**: 12
- **Rounds**: 3 (round-robin, same order each round)
- **Judges**: 6 per run, high/low excluded, middle 4 averaged

---

## Data Files

### Primary Data: Individual Judge Scores
**File**: `data/raw/milano-cortina-2026-individual-judge-scores.csv`

Contains all 36 performances (12 competitors × 3 rounds max):

| Column | Type | Notes |
|--------|------|-------|
| competitor_id | Number | 1-12 (position in round) |
| competitor_name | Text | Full name + country |
| run_number | Number | 1, 2, or 3 |
| final_score | Number | Official score (or empty for DNI) |
| judge_1 to judge_6 | Number | Individual judge scores (or empty) |
| trick_1 to trick_5 | Text | Trick codes (see Trick Codes below) |

**Scoring verification**: All non-DNI runs verified to use trimmed mean
- Example: [50,45,50,46,49,50] → exclude 45 & 50 → (46+49+50+50)/4 = 48.75

### Secondary Data: Competition Overview
**File**: `data/raw/milano-cortina-2026-mens-halfpipe.csv`

Basic competition metadata:

| Column | Type | Notes |
|--------|------|-------|
| position | Number | 1-12 (qualifier rank) |
| competitor_name | Text | Full name |
| country | Text | 3-letter code |
| qualifying_score | Number | Score from qualification round |
| best_final_score | Number | Best score from final (R1-R3) |
| medal | Text | G/S/B or empty |

### Metadata: Judges
**File**: `data/raw/judges-metadata.csv`

Judge information:

| Column | Type | Notes |
|--------|------|-------|
| judge_number | Number | 1-6 (position on panel) |
| judge_name | Text | Full name |
| country | Text | 3-letter code |

---

## Trick Code Format

Trick codes describe the aerial maneuver. Format: `[spin]-[cork]-[rotation]-[grab]`

### Examples
- `Cab-DC-14-Mu` = Cab (backflip) + double cork + 1440° + mute grab
- `f-DC-16-Tdr` = Frontflip + double cork + 1600° + tail drag
- `x-b-D-AO-Rd-9-St` = Complex with backflip, dub, air-out, rider, 900°, stomp
- `b-DC-12-Mu` = Backflip + double cork + 1260° + mute grab

### Rotation Estimates (Pattern Observed)
- 9 = 900°
- 10 = 1080°
- 12 = 1260°
- 14 = 1440°
- 16 = 1600°

### Complexity Analysis
Segments per trick (count dashes):
- 3-4 segments = simpler tricks (~75-80 pts avg)
- 5-6 segments = moderate tricks (~86-88 pts avg)
- 7+ segments = complex tricks (~90+ pts avg)

---

## Data Quality & Reliability

### High Confidence ✅
- Official competitor names and countries
- Official scores (final_score column)
- Qualifying positions (reverse order: 1=worst, 12=best)
- Individual judge scores (6 per run, all captured)
- Scoring system (trimmed mean verified on all 24 non-DNI runs)

### Medium Confidence 🟡
- Trick codes (parsed from Olympics.com, not verified)
- Trick difficulty estimates (based on pattern observation, not official)
- Judge identity (assumed judges same across rounds, not confirmed)

### Low Confidence / Unknown 🔴
- **DNI reason** (crash vs didn't improve on high score) — **CRITICAL LIMITATION**
- Trick difficulty (need official FIS ratings)
- Judge component scores (amplitude, difficulty, execution, variety, progression)
- Environmental factors (weather, timing, snow conditions)

---

## Wipeout Definition

**Wipeout** (crash, fall, incomplete): `final_score < 50`

Evidence from data:
- Scores <50 show patterns consistent with crashes/incomplete runs
- Examples: 11.75, 17.75, 24.75, 27.50, 35.00, 43.00, 48.75 (all visibly low with reasonable tricks)
- Threshold 50 separates clearly: 50+ are smooth runs, <50 appear to be wipeouts

---

## Competition Structure

### Round-Robin Format
- 12 competitors perform in identical order each round (positions 1-12)
- Position 1 = worst qualifier → goes first each round
- Position 12 = best qualifier → goes last each round
- **Implication**: Position 1 never has wipeout context before them (they go first)

### Round Progression
| Round | Performers | Clean | Wipeouts | DNI | Rate |
|-------|-----------|-------|----------|-----|------|
| R1 | 12 | 5 | 7 | 0 | 58.3% wipeout |
| R2 | 7 | 5 | 2 | 5 DNI | 28.6% wipeout |
| R3 | 5 | 5 | 0 | 2 DNI | 0.0% wipeout |

**Takeaway**: R1 has chaos (many wipeouts, judges fresh), R3 has only elite (no wipeouts, judges tired)

---

## Scoring System: Trimmed Mean

**Verified Pattern (100% consistent across 24 non-DNI runs)**:
1. 6 judges score the run independently
2. Highest and lowest scores excluded automatically
3. Final score = average of middle 4 judges

**Example**: Judges [89, 95, 91, 91, 91, 91] → exclude 89 & 95 → (91+91+91+91)/4 = 91.00

**Implication**: Single judge bias is dampened; relief bias requires 3+ judge consensus

---

## Competitor Tier Breakdown

### Bottom Tier (Positions 1-4): Worst Qualifiers
- Avg qualifying score: ~50-65
- R1 avg clean score: 77.81
- Wipeout rate: 41.7%
- **Key property**: Goes FIRST each round → zero wipeout context before them

### Middle Tier (Positions 5-8): Mid Qualifiers
- Avg qualifying score: ~75-85
- R1 avg clean score: 89.50
- Wipeout rate: 25.0%

### Top Tier (Positions 9-12): Best Qualifiers
- Avg qualifying score: ~88-95
- R1 avg clean score: 92.00
- Wipeout rate: 8.3%

---

## Known Limitations of This Dataset

| Issue | Impact |
|-------|--------|
| DNI reason unknown | Can't distinguish crash from didn't-improve |
| No trick difficulty ratings | Can't control for trick complexity |
| No judge component scores | Can't isolate amplitude vs difficulty bias |
| No environmental data | Can't account for wind, snow, timing |
| Small sample (n=15 clean) | Limited statistical power |
| Single competition | Can't validate cross-competition |

See `docs/METHODOLOGY.md` for detailed analysis of confounds.

---

## Using This Data

### Recommended Use Cases ✅
- Correlational analysis (recovery patterns)
- Descriptive statistics (wipeout rates, score distributions)
- Exploratory visualization (competitor trajectories)
- Hypothesis generation for future study

### Not Recommended ❌
- Causation claims (too many confounds)
- Individual judge bias assessment (scores aggregated by panel)
- Cross-competition generalization (single event)
- Outcome prediction (insufficient data)

---

## Accessing the Data

All data files are in `data/raw/`:
```
data/raw/
├── milano-cortina-2026-individual-judge-scores.csv (primary)
├── milano-cortina-2026-mens-halfpipe.csv
└── judges-metadata.csv
```

All analyses run via Node.js scripts in `scripts/`:
```
node scripts/wipeout_context_analysis.js
node scripts/position_controlled_analysis.js
node scripts/points_per_trick_analysis.js
node scripts/trick_difficulty_exploration.js
```

Results output to `results/*.json`

