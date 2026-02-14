# Methodology: Assumptions, Limitations & Confounds

## ⚠️ CRITICAL ASSUMPTIONS & LIMITATIONS

### What We're Testing (and NOT Testing)
✅ **CAN analyze**: Correlation patterns in clean runs, score variance, competitor trajectories
❌ **CANNOT prove**: Causation, individual judge bias, actual judge psychology, cross-competition validity

---

## CRITICAL MISSING DATA: DNI Ambiguity

### The Problem
When a competitor DNI (Did Not Improve), we **cannot distinguish**:
- **Crash/wipeout scenario**: Wiped out, contributing to wipeout context
- **High score scenario**: Didn't improve on strong score (e.g., 91 → DNI)

### Impact on Analysis
- **9 DNI cases affected**: Totsuka R3, James R2-R3, Yamada R2, Pates R2-R3, Guseli R2, Josey R3, Melville R2-R3
- **Wipeout context analysis invalidated** for rounds containing DNI
- **Recovery context may be incorrect** (we may be counting DNI as "wipeout" when it wasn't)

### What We Did
- Excluded all DNI from analyses (score = missing)
- Clearly flagged this limitation in all findings
- Recommend future work obtain raw video or official records

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

**Why we can't fully control it**:
- Olympics.com doesn't publish trick difficulty ratings
- Would need expert coaching review or crowd consensus

**Current approach**: Exploratory analysis suggests 1400° tricks +2.1 pts, but not scientific

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

**Unknowns**:
- Were the same 6 judges present for all 3 rounds?
- Did judges' standards shift between R1 (chaos) vs R3 (elite only)?
- Judge fatigue/attentiveness over 2+ hours

**Why this matters**: "Relief bonus" might actually be "fresh judges" or "judge fatigue"

### 6. Environmental Factors
**Issue**: No weather, snow, timing, or course data

**Unknowns**:
- Wind conditions (can significantly affect scoring)
- Snow quality/grooming changes
- Time between runs (fatigue effect on athletes)
- Ambient temperature/humidity

**Why this matters**: Could explain score variance better than wipeout context

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
| Same judges all rounds | Unknown |
| Judge names/countries | Known (see judges-metadata.csv) |
| Judge component scoring | Unknown (amplitude, difficulty, execution, variety, progression) |
| Judge outlier patterns | Not analyzed yet |
| Individual judge bias | Cannot isolate with current data |

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
| DNI ambiguity (9 cases) | 🔴 CRITICAL | Flag all findings |
| Trick difficulty uncontrolled | 🟡 HIGH | Limits causation claims |
| Small sample size (n=15 clean) | 🟡 HIGH | Variance could explain patterns |
| Selection bias across rounds | 🟡 HIGH | Better performers advance |
| Judge composition unknown | 🟡 HIGH | Standards may have shifted |
| Environmental data missing | 🟠 MEDIUM | Could explain some variance |
| No cross-competition data | 🟠 MEDIUM | Can't validate findings |

---

## Recommendations for Future Work

1. **Obtain DNI clarification** — Find official records or video showing crash vs didn't-improve
2. **Collect trick difficulty** — Contact FIS for official trick ratings or expert review
3. **Get judge scores by component** — Request breakdown: amplitude (X pts), difficulty (Y pts), etc.
4. **Cross-competition validation** — Collect other Olympic/World Cup halfpipe results
5. **Environmental logging** — Get wind, temperature, snow quality, timing data
6. **Statistical testing** — Run significance tests (t-tests, correlation tests) with current data

