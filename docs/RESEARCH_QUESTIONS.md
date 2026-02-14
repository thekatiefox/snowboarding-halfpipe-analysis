# Research Questions: What Can We Actually Answer?

Milano-Cortina 2026 Men's Snowboard Halfpipe Final — Critical Assessment

---

## What We Have

| Dimension | Count | Notes |
|-----------|-------|-------|
| Total performances | 36 | 12 athletes × 3 rounds |
| Scored performances | 24 | 15 clean + 9 wipeouts |
| Unscored (DNI) | 12 | 10 crashes, 1 completed-but-didn't-improve, 1 strategic skip |
| Individual judge scores | 144 | 24 scored × 6 judges |
| Judges | 6 | Same 6 judged every performance |
| Testable nationality pairs | 1 | Judge 6 (JPN) ↔ 4 JPN athletes |

**Key structural feature:** Competition order is fixed — position 1 (worst qualifier) always goes first, position 12 (best qualifier) always goes last. Same order every round. This creates a near-perfect confound between skill level and how many crashes a judge has witnessed before scoring a given run.

---

## THE CENTRAL QUESTION

### Q1: Relief/Contrast Bias — Do judges score clean runs higher after a streak of crashes?

**Verdict: ⚠️ PARTIALLY ANSWERABLE — data suggests little to no effect**

The question: if the one, two, three (etc.) performances immediately before yours were all crashes, do you score higher than you would have if the previous performance was clean? The streak resets whenever someone lands a clean/completed run.

**The full sequence data (15 clean runs mapped by consecutive crash streak):**

| Crash streak | n | Avg score | Avg position | Runs |
|-------------|---|-----------|-------------|------|
| 0 (after clean/completed) | 8 | 85.44 | 7.3 | Barbieri 75, Wang 76, Pates 77.5, Lee 87.5, Totsuka 91, Ruka 91, Yamada 92, Scotty 93.5 |
| 1 | 3 | 84.08 | 6.7 | Josey 70.25, Ruka 90, Yamada 92 |
| 2 | 2 | 91.50 | 9.0 | Guseli 88, Totsuka 95 |
| 3 | 1 | 86.50 | 6.0 | Ayumu 86.5 |
| 6 | 1 | 90.00 | 8.0 | Ruka 90 |

Binary split: after 0 crashes = **85.44** (n=8) vs after 1+ crashes = **87.39** (n=7). Difference: **+1.95 pts**.

Average position is nearly identical (7.3 vs 7.4), so the usual skill confound is roughly balanced here — this is a much fairer comparison than the naive "was there ever a crash before you" framing.

**However, the within-rider comparisons tell a clearer story:**

| Rider (pos) | Crash streak → Score | Pattern |
|-------------|---------------------|---------|
| Ruka Hirano (8) | 6→90, 1→90, **0→91** | Scored HIGHEST after zero crashes |
| Yamada (10) | 0→92, 1→92 | Identical regardless |
| Totsuka (11) | 0→91, 2→95 | +4 pts, BUT upgraded trick 1 (DC→TC) |

These within-rider comparisons hold position constant (same rider, same slot every round) and show **no relief effect** in 2 of 3 cases. The only positive case (Totsuka +4) is confounded by a trick difficulty upgrade.

**Why it's partial, not conclusive:**
- n=7 vs n=8 is small but usable for describing the pattern
- The within-rider comparisons (n=3) control for skill but are confounded by trick changes between rounds
- The between-group comparison (+1.95 pts) is small and within normal scoring variation
- Sample is too small for meaningful significance testing

**What would strengthen it:**
- Pooling data across multiple halfpipe finals to get more clean runs with varying crash-streak contexts
- A competition format where run order varies between rounds (some FIS events do this)

---

### Q2: Does a LONGER crash streak produce a bigger effect?

**Verdict: ⚠️ SUGGESTIVE BUT INCONCLUSIVE — interesting pattern, tiny cells**

If relief bias is real, more consecutive crashes should produce a bigger contrast effect. The data:

| Streak length | Avg score | n |
|--------------|-----------|---|
| 0 | 85.44 | 8 |
| 1 | 84.08 | 3 |
| 2 | 91.50 | 2 |
| 3 | 86.50 | 1 |
| 6 | 90.00 | 1 |

There's no clear dose-response pattern. Streak=1 actually scores LOWER than streak=0. Streak=2 is highest but n=2 (Totsuka 95 + Guseli 88, both strong riders in high positions). The data doesn't support a "more crashes = bigger boost" narrative.

**Why it's inconclusive:** Cell sizes of 1-3 make any pattern unreliable. Position confound partially explains the streak=2 result (avg position 9.0 vs 7.3 for streak=0).

---

## QUESTIONS WE CAN ACTUALLY ANSWER WELL

### Q3: Are some judges consistently harsher or more generous than others?

**Verdict: ✅ YES — strong design, clear findings**

This is the best-designed analysis we can do. Since all 6 judges score every performance, we get pure within-performance comparisons — same tricks, same execution, different judge → any systematic difference IS a judge effect.

**Analysis approach:**
- Compute each judge's deviation from the panel mean for every scored run
- Count how often each judge is excluded as the highest or lowest scorer
- Under random judging, each judge should be excluded ~4/24 times (17%) as high and ~4/24 as low

**Sample size:** 144 individual scores across 24 performances. Adequate for detecting persistent patterns.

**Known findings:**
- Judge 5 (HARICOT, FRA): Excluded as HIGH **11/24 times (46%)** — consistently the most generous scorer
- Judge 2 (WESSMAN VOGAN, GBR): Excluded as LOW **9/24 times (38%)** — consistently the strictest

**Why this works:** The within-performance design eliminates all confounds. Whatever makes Judge 5 score higher isn't about the rider, the round, or the conditions — it's about Judge 5.

---

### Q4: Does the trimmed mean (dropping highest and lowest) actually protect against individual judge bias?

**Verdict: ✅ YES — fully answerable with perfect data**

We have all 6 individual scores for every scored run. We can compute exactly what the score would have been with and without trimming, and test whether trimming successfully neutralizes the outlier judges identified in Q3.

**Analysis approach:**
- For each run: compute raw mean (all 6), trimmed mean (drop high/low), and the actual final score
- Calculate how much trimming shifts the score and in which direction
- Test: Does trimming consistently remove Judge 5's generosity and Judge 2's strictness?
- Test: Would any medal outcomes change if trimming wasn't used?

**Sample size:** 24 scored performances. Fully adequate.

**Why this matters:** This tells us whether the sport's built-in bias-mitigation mechanism is working.

---

### Q5: How do judges score wipeouts? Is there a systematic pattern?

**Verdict: ✅ YES — clear pattern visible even with small n**

9 scored wipeouts with known trick counts and all 6 individual judge scores.

**The raw data (sorted by tricks completed):**

| Rider | Tricks completed | Score |
|-------|-----------------|-------|
| Josey R1 | 2 | 11.75 |
| Wang R1 | 2 | 17.75 |
| Wang R2 | 3 | 17.25 |
| Lee R1 | 3 | 24.75 |
| Lee R2 | 3 | 24.75 |
| Ayumu R1 | 3 | 27.50 |
| Guseli R1 | 5 | 35.00 |
| Melville Ives R1 | 5 | 43.00 |
| Scotty James R1 | 5 | 48.75 |

**Analysis approach:**
- Correlate tricks completed with wipeout score
- Compute "per-trick credit" — how much each completed trick is worth
- Compare judge spread (agreement) on wipeouts vs clean runs
- Test: Do judges have more uncertainty when scoring wipeouts?

**Why this works:** The pattern is visually obvious and the n=9 is enough to establish the tricks↔score relationship.

---

### Q6: Do judges show groupthink / unusual consensus on certain runs?

**Verdict: ✅ YES — striking cases in the data**

Ruka Hirano received IDENTICAL scores from all 6 judges in two consecutive runs:
- R1: 90, 90, 90, 90, 90, 90
- R2: 90, 90, 90, 90, 90, 90

All six judges gave exactly the same number, twice. This is extremely unusual in a subjective sport.

**Analysis approach:**
- Compute the standard deviation and range of judge scores per run
- Rank runs by agreement level
- Compare: When do judges converge vs diverge?
- Test: Is Ruka's perfect consensus statistically unusual given the variance on other runs?
- Look for: Is consensus related to run quality tier (elite runs, mid-range, wipeouts)?

**Sample size:** 24 runs with 6 scores each. Good enough for distributional analysis.

**Why this matters:** Perfect consensus either means the performance was so unambiguous that all judges independently converge, or it suggests anchoring/groupthink. We can't distinguish these, but we can establish how unusual it is.

---

### Q7: Which judges are most/least correlated with each other?

**Verdict: ✅ YES — 15 pairwise correlations from 24 observations each**

With 6 judges and 24 scored performances, we can compute all 15 pairwise correlations (Judge 1↔2, 1↔3, ..., 5↔6).

**Analysis approach:**
- Pairwise Pearson correlations across all scored runs
- Identify judge "clusters" — do certain judges track each other more closely?
- Look for the most independent judge (lowest average correlation)
- Look for the most "conformist" judge (highest average correlation)

**Why this works:** 24 data points per pair is marginal but usable for correlations in the 0.95+ range (which we'd expect for judges scoring the same performances).

---

## QUESTIONS WE CAN PARTIALLY ADDRESS

### Q8: Nationality/Home Bias — Does Judge 6 (JPN) favor Japanese athletes?

**Verdict: ⚠️ PARTIALLY — effect visible but can't determine significance**

Only one judge-country pair is testable: Judge 6 (HASHIMOTO, JPN) scoring 4 Japanese athletes (Totsuka, Yamada, Ruka Hirano, Ayumu Hirano).

**What we found:**
- Judge 6 averages **+0.21** deviation from panel mean when scoring JPN athletes (n=8 scored)
- Judge 6 averages **-0.69** deviation when scoring non-JPN athletes (n=15 scored)
- Net home bias: **+0.90 pts**
- Biggest single case: Ayumu Hirano R2, Judge 6 scored 88 vs panel avg 86.5 (+1.5)

**Why it's partial:**
- n=8 is too small for statistical significance at conventional thresholds
- We're testing only 1 of 6 judges; the others have NO nationality overlap with any competitor (SLO, GBR, SWE, SUI, FRA judges; athletes from JPN, AUS, KOR, CHN, USA, NZL)
- We can't distinguish "home bias" from "Judge 6 happens to score certain skill profiles higher"
- With 6 judges and many possible comparisons, a +0.90 effect could be chance

**What would make it fully answerable:** Many more competitions, multiple judge-country pairs, or a design where we can test whether the effect disappears when the judge doesn't know the rider's nationality (impossible in practice).

---

### Q9: Does trick difficulty predict scores among clean runs?

**Verdict: ⚠️ PARTIALLY — correlation is weak and confounded**

Among 15 clean runs, we computed trick difficulty scores and found r=0.195 with final score.

**Why it's partial:**
- Better riders both attempt harder tricks AND execute them better — can't separate these
- The difficulty score is our own formula (rotation × cork multiplier + bonuses), not an official metric
- 15 data points is marginal for regression
- Within-rider difficulty variation (Totsuka R1→R2: 43.5→46.5 difficulty, 91→95 score) is confounded with execution improvement

**What it DOES tell us:** Execution and overall impression matter far more than raw difficulty. This is consistent with how halfpipe judging works (it's not diving, where difficulty has a fixed multiplier).

---

### Q10: Do judges' scoring standards drift across rounds?

**Verdict: ⚠️ PARTIALLY — patterns visible but heavily confounded**

**What we found:**
- Judges 1 and 2 become more generous R1→R3 (+0.80, +1.00 pts)
- Judges 4, 5, 6 become stricter R1→R3 (-0.60 to -1.00 pts)
- Overall panel: R1 avg 85.10, R2 avg 87.05, R3 avg 86.90 (among clean runs only)

**Why it's partial:**
- Different competitors are clean in different rounds — the R1 vs R3 clean run pool isn't the same people
- Only 3 riders have clean runs in multiple rounds for within-person comparison
- Strategic behavior changes: riders push harder in later rounds
- Environmental conditions change across rounds (temp went from -4.2°C to -0.8°C)
- n=5 clean runs per round is too small

**The biggest confound:** Scoring drift vs. compositional change. If the R3 clean run pool is just better riders doing better tricks, of course scores are higher — that's not drift.

---

### Q11: Is there an anchoring effect from the first score in each round?

**Verdict: ⚠️ MARGINALLY — interesting pattern but too few data points**

The first performer each round is Jake Pates (position 1, worst qualifier). His R1 score (77.50) is the first number judges commit to in the competition.

**What we can look at:**
- Do subsequent scores in R1 cluster relative to 77.50 more than in R2/R3?
- Does the first clean score in each round act as an anchor for later scoring?

**Why it's marginal:** Only 3 rounds, and the first performer is the worst qualifier every time. Can't separate "anchor" from "baseline score calibration against a mediocre run."

---

## QUESTIONS WE CANNOT ANSWER

### Q12: Does total crash exposure (not just immediate streak) inflate subsequent scores?

**Verdict: ❌ NOT ANSWERABLE — perfectly confounded with rider quality**

Unlike Q1 (immediate streak), asking "how many total crashes happened before this run?" is unanswerable because position in the round determines both total crash exposure and rider quality. Later positions always see more total crashes AND are better qualifiers. These cannot be separated.

### Q13: Does weather affect judging?

**Verdict: ❌ NOT ANSWERABLE — only 3 weather data points**

Weather varies by round, not by individual performance. With only 3 rounds, we can't attribute any score difference to weather vs. the dozen other things that change between rounds.

### Q14: Would a different run order have changed the medal results?

**Verdict: ❌ NOT ANSWERABLE — requires counterfactual data**

We can't know how riders would have scored in a different order because we don't know how much of their score is skill vs. context. We could build speculative models but they'd be unfalsifiable.

### Q15: Are early competitors systematically disadvantaged by the format?

**Verdict: ❌ NOT ANSWERABLE from this event — confounded by design**

Position 1 (worst qualifier) scores lowest, but that's because they're the worst qualifier. We can't separate format disadvantage from skill difference. This question requires cross-event analysis comparing qualification-ordered vs. random-ordered formats.

---

## HOW TO MAKE THESE QUESTIONS ANSWERABLE

| Approach | What it unlocks | Feasibility |
|----------|----------------|-------------|
| Pool data across multiple halfpipe finals | More variation in who crashes when; partially breaks the position confound | High — FIS World Cups, X Games, past Olympics all have similar formats |
| Compare competition formats | Random-order vs qualification-order events exist in some FIS events | Medium — need to find and collect the data |
| Within-rider repeated measures across events | Same judge scores same rider in different crash contexts across events | High — but requires building a much larger dataset |
| Simulation/resampling | Bootstrap test: shuffle run order, re-compute "relief effect" to build null distribution | High — can do with current data as a robustness check |
| Compare to other judged sports | Gymnastics, diving, figure skating have similar biases documented | Medium — published research exists |

---

## RECOMMENDED ANALYSIS PLAN

Given the above, here's what we should actually build, ranked by strength of evidence:

### Tier 1: Strong analyses (clear answers possible)
1. **Judge severity profiles** (Q3) — who's harsh, who's generous, how consistent
2. **Trimmed mean effectiveness** (Q4) — does the scoring system protect against outlier judges
3. **Wipeout scoring mechanics** (Q5) — how trick count maps to wipeout score
4. **Judge consensus patterns** (Q6) — when do judges agree perfectly vs disagree, and why
5. **Judge-to-judge correlations** (Q7) — which judges think alike

### Tier 2: Descriptive/exploratory (patterns visible, not statistically conclusive)
6. **Immediate crash-streak relief bias** (Q1) — +1.95 pts between groups, no within-rider effect; describe with caveats
7. **Crash streak dose-response** (Q2) — no clear pattern; present the data honestly
8. **Nationality bias** (Q8) — describe the JPN effect with appropriate caveats
9. **Difficulty vs. score relationship** (Q9) — execution dominates difficulty
10. **Round drift patterns** (Q10) — describe but note confounds

### Tier 3: Not worth pursuing with this data alone
11. ~~Total crash exposure~~ (Q12) — confounded with position/skill
12. ~~Weather effects~~ (Q13) — n=3 rounds
13. ~~Counterfactual ordering~~ (Q14) — unfalsifiable
14. ~~Format fairness~~ (Q15) — needs cross-event data

---

## Data Source

**Official**: https://www.olympics.com/en/milano-cortina-2026/results/sbd/je/m/hp----------------/fnl-/--------/result

- Event: Milano-Cortina 2026 Men's Snowboard Halfpipe Final
- Date: February 13, 2026
- Competitors: 12
- Rounds: 3 (round-robin, same order each round)
- Judges: 6 per run, high/low excluded, middle 4 averaged
- Data: Individual judge scores, trick sequences, final rankings

## Related Research

- **Contrast bias** in judging and evaluation (Damisch et al., 2006 — Olympic gymnastics)
- **Anchoring effects** in subjective scoring (Bruine de Bruin, 2005 — Eurovision, ice skating)
- **Nationalism bias** in judged sports (Zitzewitz, 2006 — figure skating)
- **Serial position effects** (Page & Page, 2010 — Eurovision voting)
- **Fairness in judged sports** — IOC judging reform literature
