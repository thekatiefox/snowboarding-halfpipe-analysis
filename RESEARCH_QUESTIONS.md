# Research Questions: Judge Bias & Ordering Effects in Olympic Halfpipe

## Central Question

**Do judges unconsciously award higher scores for impressive performances when those performances immediately follow multiple wipeouts or poor performances?**

In other words: Is there a **contrast/relief effect** where judges boost scores beyond the trick quality alone, because they're impressed relative to the failures they just witnessed?

---

## Specific Hypotheses

### H1: Contrast Bias from Recent Wipeouts
Performers who land clean runs score HIGHER if preceded by wipeouts, compared to the same performer landing an identical run after seeing other clean runs.

**Current example**: 
- Chase JOSEY wiped out in R1 (11.75)
- In R2, judges saw only failures before him
- He scored 70.25 - was this partly a "relief" bonus?

### H2: Cumulative Wipeout Effect  
The MORE wipeouts immediately preceding a clean run, the HIGHER the score (controlling for trick difficulty).

**Current example**:
- Chaeun LEE: Wipeout → Wipeout → Score 87.50
- Ziyang WANG: Wipeout → Wipeout → Score 76.00
- Did the judges boost Chaeun's score because of the breakthrough?

### H3: Position/Ordering Bias Within Rounds
Later performers (who've watched more performances) benefit from or are disadvantaged by pattern effects.

**Current example**:
- R1 early (pos 1-7): Mostly wipeouts, then stronger athletes land clean runs
- Did judges' standards shift based on what they'd witnessed?

---

## What We're Testing With Available Data

### ✅ Can Analyze Now
1. **Wipeout context for each clean run**
   - How many wipeouts occurred in positions immediately before?
   - What was the average score of recent performances?

2. **Recovery score patterns**
   - Do performers score higher after their own wipeouts?
   - Do they score higher after watching others wipeout?

3. **Performer trajectories across rounds**
   - W-W-H (wipeout, wipeout, then high score)
   - W-H (wipeout, then high score)
   - Compare to performers with clean trajectories

4. **Within-round ordering**
   - Do later positions score systematically higher?
   - Does this correlate with preceding wipeout rate?

### ❌ Cannot Analyze (Need More Data)
- **Trick difficulty**: Need breakdown of tricks and difficulty ratings per run
- **Judge scores**: Need individual judge breakdowns (amplitude, difficulty, execution, variety, progression)
- **Environmental factors**: Weather, snow conditions, course setup changes
- **Timing**: Duration between runs, judge rest periods
- **Judge consistency**: Individual judge patterns vs. panel composition

---

## Why This Matters

This analysis could reveal:
1. **Systematic judging bias** in Olympic halfpipe (ordering effects)
2. **Psychological factors** in how judges evaluate performances
3. **Fairness implications** - are early competitors disadvantaged?
4. **Judge training needs** - awareness of contrast bias

---

## Current Dataset

- **Event**: Milano-Cortina 2026 Men's Snowboard Halfpipe Final
- **Format**: Round-robin (same competitor order each round: worst qualifiers first, best last)
- **Competitors**: 12
- **Rounds**: 3 (not all competitors completed all rounds)
- **Data Available**: Final scores by run, competitor order, qualifying rank

### Wipeout Rate by Round
| Round | Total | Clean (≥50) | Wipeouts (<50) | Rate |
|-------|-------|------------|----------------|------|
| R1 | 12 | 5 | 7 | 58.3% |
| R2 | 7 | 5 | 2 | 28.6% |
| R3 | 5 | 5 | 0 | 0.0% |

### Score Ranges
- **Excellent (90+)**: Medal level performances
- **Good (80-89)**: Strong, clean runs
- **Moderate (70-79)**: Clean but lower difficulty or minor mistake
- **Poor (60-69)**: Noticeable mistake or hand drag
- **Wipeout (<50)**: Fall or aborted run

---

## Analysis Approach

### Phase 1: Characterize Wipeout Context
For each clean run, calculate:
- Number of wipeouts in previous N positions
- Average score of previous N performers
- Whether performer is recovering from own wipeout
- Round position (early/middle/late)

### Phase 2: Compare Recovery Scores to Baseline
- Baseline: Mean of all clean runs in competition
- Recovery runs: Mean of clean runs preceded by wipeouts
- Statistical significance: Is recovery > baseline?

### Phase 3: Correlate Wipeout Frequency with Score
- Plot preceding wipeouts (x-axis) vs. score (y-axis)
- Look for linear/non-linear relationship
- Control for performer skill (qualifier rank)

### Phase 4: Within-Round Ordering Analysis
- Compare position effects (early vs. late in round)
- Separate skill effects from ordering effects
- Track judge standards by position

---

## Key Confounds to Monitor

1. **Performer skill**: Top qualifiers score higher (selection bias)
   - Control: Compare performer to their own baseline

2. **Trick difficulty**: Some runs have harder tricks
   - Control: Need trick difficulty data (future work)

3. **Physical factors**: Wind, snow, athlete fatigue
   - Control: Need environmental data (future work)

4. **Round learning**: Athletes improve across rounds
   - Control: Analyze only within-round effects

5. **Judge fatigue**: Standards might shift during round
   - Control: Track mean score progression by position

---

## Expected Findings

### If Contrast Bias Exists
- Recovery scores significantly > baseline
- More preceding wipeouts → higher score (curved relationship)
- Later positions score higher (after witnessing more failures)

### If No Contrast Bias
- Recovery scores ≈ baseline
- No correlation between wipeout frequency and score
- Position effects only reflect performer skill

### Mixed Scenario (Most Likely)
- Small contrast effect detected (+5-10 points)
- Skill differences explain most variance
- Subtle position ordering effects

---

## Related Research

This analysis connects to broader research on:
- **Contrast bias** in judging and evaluation
- **Anchoring effects** in subjective scoring
- **Recency bias** and performance context
- **Fairness in judged sports** (gymnastics, diving, figure skating)

Similar patterns have been found in:
- Olympic gymnastics (early routines scored lower)
- Figure skating (judging context effects)
- Wine competitions (ordering effects on ratings)

---

## Scoring Methodology (NEW DATA)

**Key Discovery**: Olympic halfpipe uses **trimmed mean** scoring:
- 6 judges score each run
- Exclude highest + lowest scores automatically
- Final score = average of middle 4 judges

**Implication**: Single judge bias is dampened. Relief bias requires 3+ judges showing consensus bias.

---

## Future Analysis Directions

Now that we have individual judge scores and trick data:

### A) Judge Outlier Analysis
**Question**: Which judges are most frequently excluded (high/low)?
- Track which judges are outliers most often
- Test: Do certain judges have systematic biases?
- Find: Are any judges consistently harsher/more lenient?

### B) Middle-4 Judge Consensus Bias
**Question**: Do 3+ judges simultaneously boost scores for same tricks?
- Filter to runs with identical or near-identical trick sequences
- Compare middle-4 judge averages across different contexts
- Test: Do they score the same execution higher after wipeouts?
- Example: Scotty James R1 vs R2 (identical tricks, 44-pt difference)

### C) Individual Judge Context Sensitivity
**Question**: Which judges show strongest relief bias patterns?
- For each judge, correlate their scores with preceding wipeout count
- Test: Judge 4 vs Judge 5 - do they respond differently?
- Find: Is relief bias universal or concentrated in certain judges?

### D) Context Effect Magnitude by Round
**Question**: Does relief bias change between R1, R2, R3?
- R1: Most wipeouts, judges "fresh"
- R2: Fewer wipeouts, judges "settling in"
- R3: No wipeouts, only elite performers remain
- Test: Does effect size diminish with fewer wipeouts to compare?

### E) Within-Score Variance Analysis
**Question**: When 4 middle judges disagree, what causes the spread?
- High variance = judges applying different standards
- Low variance = judges agreeing
- Test: Does variance increase after wipeouts (judges uncertain)?
- Pattern: Does variance predict relief bonus magnitude?

---

## Next Steps

1. **Immediate**: Analyze wipeout context and recovery scores (Phase 1-2) ✓
2. **Current**: Add individual judge data and scoring methodology ✓
3. **Phase 3**: Implement analysis direction A-E above
4. **Short-term**: Collect trick difficulty classification
5. **Medium-term**: Cross-competition validation
6. **Long-term**: Judge panel composition effects

---

## Questions for Exploration

- How much of the score variance is explained by position/context vs. performer skill?
- Do recovery runs get "relief bonuses" statistically significant enough to affect medal rankings?
- Which judges (if known) show the strongest contrast bias patterns?
- Does the effect increase with more preceding wipeouts, or is it binary?
- Do top qualifiers also show contrast effects, or only weaker competitors?
- **NEW**: Which judges are outliers (excluded) most frequently?
- **NEW**: For identical tricks, do 3+ judges score higher after wipeouts?
- **NEW**: Does relief bias magnitude differ by judge nationality or experience?
- **NEW**: Is relief bias stronger in R1 (post-wipeout chaos) vs R2-R3?
- **NEW**: When judges disagree on a score, is it because of relief bias or other factors?
