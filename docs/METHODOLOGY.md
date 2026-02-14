# Methodology: Assumptions, Limitations & Confounds

## ⚠️ CRITICAL ASSUMPTIONS & LIMITATIONS

### What We're Testing (and NOT Testing)
✅ **CAN analyze**: Correlation patterns in clean runs, score variance, competitor trajectories
❌ **CANNOT prove**: Causation, individual judge bias, actual judge psychology, cross-competition validity

---

## CRITICAL MISSING DATA: DNI Ambiguity — Partially Resolved

### The Problem
When a competitor DNI (Did Not Improve), we initially **could not distinguish**:
- **Crash/wipeout scenario**: Wiped out, contributing to wipeout context
- **High score scenario**: Didn't improve on strong score (e.g., 91 → DNI)

### Resolution: 7/12 Cases Confirmed via News Sources
Web search of sports journalism resolved 7 of 12 DNI cases with high confidence:

| Competitor | Run | Resolution | Confidence | Key Evidence |
|-----------|-----|------------|------------|-------------|
| Scotty JAMES | R3 | 💥 Crash | High | Crashed on 1620 landing going for gold (NBC/ABC/Fox) |
| Valentino GUSELI | R2 | 💥 Crash | High | "Failed to land first two runs" (ABC News) |
| Alessandro BARBIERI | R2-R3 | 💥 Crash | High | "Struggled with landings" (KGW/Tahoe Tribune) |
| Campbell MELVILLE IVES | R2-R3 | 💥 Crash | High | "Ran out of halfpipe going too big" (NZ Sports Wire) |
| Yuto TOTSUKA | R3 | 🎯 Strategic skip | High | Gold already secured at 95.00 |

### 5 Remaining Unknowns
These cases have suggestive but inconclusive evidence:

| Competitor | Run | Evidence | Notes |
|-----------|-----|---------|-------|
| Ryusei YAMADA | R2 | Only 2 tricks listed (vs 5 normal) | "Couldn't improve" — could be crash or strategic |
| Ayumu HIRANO | R3 | 4 tricks (1 short) | Was 7th at 86.50; no explicit crash described |
| Jake PATES | R2-R3 | 3 tricks each (vs 5 normal) | "Unable to improve" — vague |
| Chase JOSEY | R3 | 5 tricks listed | "Did not bring improvement" — vague |

**Current status**: 6 confirmed crashes, 1 strategic skip, 5 unknown.

---

## Data Quality Assurances

✅ Official Olympics.com data
✅ All 6 individual judge scores captured
✅ Scoring system verified (high/low excluded, middle 4 averaged)
⚠️ Trick codes parsed but NOT verified — may not perfectly represent difficulty
⚠️ DNI values unknown — cannot determine crash vs "didn't improve"

---

## Major Confounds (Known & Uncontrollable)

### 1. Skill Level / Selection Bias
**Issue**: Better qualifiers naturally score higher and advance to later rounds

**Evidence**:
- Position 1-4 average: 77.81 (all wipeouts in R1)
- Position 5-8 average: 89.50
- Position 9-12 average: 92.00

**Why we can't fully control it**:
- Only 12 competitors, can't have enough "skill-matched" pairs
- Better performers both recover AND score naturally higher
- Small sample means random variation dominates

**Mitigation**: Phase 2 broke analysis by tier, revealing skill effect dominates recovery patterns

### 2. Trick Difficulty
**Issue**: No repeated sequences, can't control execution vs judging

**Evidence**: All 15 clean runs have different trick combinations
- Some runs are intrinsically harder (1600° tricks, 7-segment combos)
- Some are simpler (1080° tricks, 3-segment combos)

**Mitigation (NEW)**: `scripts/compute_trick_difficulty.js` computes difficulty scores from trick codes:
- Rotation base (360°=1 to 1600°=7), cork multiplier (DC=1.5×, TC=2.0×), switch/grab/special bonuses
- Correlation between total difficulty and final score: r=0.195 (weak positive)
- Difficulty scores now available in `data/processed/enriched-judge-scores.csv`
- **Finding**: Weak correlation suggests trick difficulty is NOT the primary score driver — execution and judging matter more

### 3. Sample Size
**Issue**: Very small sample

**Evidence**:
- Only 12 competitors
- Only 15 clean runs (out of 36 performances)
- Only 8 recovery runs
- Only 3 recovery runs in middle tier

**Why this matters**: Random variation can easily explain observed patterns

### 4. Round Effects
**Issue**: Different competitors appear in different rounds (selection bias)

**Evidence**:
- R1: 12 competitors, 7 wipeouts (58.3%)
- R2: 7 competitors (5 DNI), 2 wipeouts (28.6%)
- R3: 5 competitors (2 DNI), 0 wipeouts (0.0%)

**Why this matters**: Relief effect confounded with "only best competitors remain"

### 5. Judge Composition & Fatigue
**Issue**: Unknown if same judges scored all runs, or if judges' standards changed

**Known (NEW)**: `scripts/enrich_judge_data.js` analyzed all 6 judges across 24 scored runs:
- Same 6 judges scored all rounds (confirmed from data)
- Judge 5 (HARICOT, FRA) excluded as HIGH 11/24 times — consistently generous
- Judge 2 (WESSMAN VOGAN, GBR) excluded as LOW 9/24 times — consistently strict
- Judge 6 (HASHIMOTO, JPN) shows +0.25 pts home bias for Japanese competitors
- Overall nationality bias: +0.138 pts (small but present)

**Remaining unknowns**:
- Did judges' standards shift between R1 (chaos) vs R3 (elite only)?
- Judge fatigue/attentiveness over 2+ hours

### 6. Environmental Factors
**Issue**: Weather and course conditions can affect scoring

**Known (NEW)**: `scripts/scrape_environment.js` retrieved actual weather from Open-Meteo:
- Competition hours: -6.7°C to +1.1°C (warming through day)
- Wind: 0.9-9.0 km/h sustained, gusts up to 28.4 km/h
- Cloud cover: 21-100% (increasing through day)
- Data available per-round in `data/processed/environmental_context.csv`

**Remaining unknowns**:
- Exact start time for each round
- Snow quality/grooming changes between rounds
- Time between individual runs (athlete fatigue)

### 7. Wipeout Threshold Ambiguity
**Issue**: Score <50 assumed to be "wipeout," but may include other categories

**Current assumption**: Score <50 = crash/incomplete/significant mistake
**Possible reality**:
- DNI scores not recorded (we count as missing, not <50)
- Some <50 scores might be very low execution on hard tricks
- Some <50 scores might be incomplete runs due to course issues

**Mitigation**: Only using <50 threshold (conservative, likely accurate)

---

## Data Filtering Rules (Applied Uniformly)

All analyses filter consistently to **clean runs only**:

| Filter | Rule | Rationale |
|--------|------|-----------|
| Score ≥50 | Include | Completed, intentional execution |
| Score <50 | Exclude | Crashes, wipeouts, incomplete |
| DNI | Exclude | Unknown outcome (crash or didn't improve) |
| Result | **15 clean runs** | Out of 36 total performances |

---

## Wipeout Rate by Round

| Round | Total Performances | Clean (≥50) | Wipeouts (<50) | DNI | Rate |
|-------|-------------------|------------|----------------|-----|------|
| R1 | 12 | 5 | 7 | 0 | 58.3% |
| R2 | 7 | 5 | 2 | 5 DNI | 28.6% |
| R3 | 5 | 5 | 0 | 2 DNI | 0.0% |

---

## Scoring System: Trimmed Mean

**Key Discovery**: Olympic halfpipe uses **trimmed mean** scoring:
- 6 judges score each run independently
- Exclude highest + lowest scores automatically
- Final score = average of **middle 4 judges only**

**Implication**: Single judge bias is dampened. Relief bias requires **3+ judges showing consensus bias**.

---

## What We Know About Judges

| Aspect | Status |
|--------|--------|
| Same judges all rounds | ✅ Confirmed (6 judges, all rounds) |
| Judge names/countries | ✅ Known (see judges-metadata.csv) |
| Judge scoring tendencies | ✅ Analyzed (see results/judge_analysis.json) |
| Judge 5 (FRA) pattern | ✅ Consistently generous (excluded as HIGH 11/24 times) |
| Judge 2 (GBR) pattern | ✅ Consistently strict (excluded as LOW 9/24 times) |
| Judge 6 (JPN) home bias | ⚠️ +0.25 pts for Japanese competitors (small sample) |
| Judge component scoring | ❌ Unknown (amplitude, difficulty, execution, variety, progression) |

---

## Competition Structure

**Round-Robin Format**:
- Same competitor order each round (positions 1-12)
- Position 1 = worst qualifier (lowest qualifying score)
- Position 12 = best qualifier (highest qualifying score)
- Continuous performance (no breaks between rounds)
- Only best score counts for ranking; DNI means competitor stops trying

**Implication**: Position 1 goes first each round → zero within-round wipeout context before them

---

## What We Can & Cannot Conclude

### We CAN Conclude
- Correlations: Recovery runs average 2.78 higher (Phase 1)
- Skill effect: Tier analysis shows selection bias explains Phase 1 finding
- Wipeout rates differ by round
- Some competitors show pattern of W→H (wipeout then high)

### We CANNOT Conclude
- **Causation**: Relief bias causes the pattern (could be skill, trick difficulty, judge fatigue, etc.)
- **Magnitude**: How much relief bias affects medals/outcomes
- **Generalization**: Does effect exist in other competitions?
- **Mechanism**: What judges are thinking or why pattern exists
- **Individual judge bias**: Which judges bias relieves, if anyone

---

## Key Limitations Summary

| Limitation | Severity | Status |
|-----------|----------|--------|
| DNI ambiguity (12 cases) | 🔴 CRITICAL | Partially resolved — 7/12 confirmed, 5 unknown |
| Trick difficulty uncontrolled | 🟡 HIGH | ✅ Computed from codes (r=0.195) |
| Small sample size (n=15 clean) | 🟡 HIGH | Variance could explain patterns |
| Selection bias across rounds | 🟡 HIGH | Better performers advance |
| Judge composition unknown | 🟡 HIGH | ✅ Resolved — per-judge analysis done |
| Environmental data missing | 🟠 MEDIUM | ✅ Weather data retrieved |
| No cross-competition data | 🟠 MEDIUM | Beijing 2022 data available as reference |

---

## Recommendations for Future Work

1. **Obtain DNI clarification** — Find official records or video showing crash vs didn't-improve
2. **Collect trick difficulty** — Contact FIS for official trick ratings or expert review
3. **Get judge scores by component** — Request breakdown: amplitude (X pts), difficulty (Y pts), etc.
4. **Cross-competition validation** — Collect other Olympic/World Cup halfpipe results
5. **Environmental logging** — Get wind, temperature, snow quality, timing data
6. **Statistical testing** — Run significance tests (t-tests, correlation tests) with current data

