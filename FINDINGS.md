# Statistical Analysis Report: Milano-Cortina 2026 Men's Halfpipe

## Executive Summary

Analysis of the Milano-Cortina 2026 Men's Snowboard Halfpipe Final reveals **strong positive correlation (r = 0.897)** between consecutive scores, indicating that high-scoring performances tend to cluster together rather than alternate with low scores.

**Key Finding**: Competitors show **21.4-point score difference** between those following high performers vs. low performers, suggesting significant psychological or judging carry-over effects.

---

## Data Overview

- **Event**: Milano-Cortina 2026 - Men's Snowboard Halfpipe Final
- **Date**: February 13, 2026
- **Competitors**: 12
- **Scoring Range**: 43.00 - 95.00 points
- **Mean Score**: 81.27 ± 13.92 points

### Top 5 Competitors
1. Yuto TOTSUKA (JPN) - 95.00 ⭐ Gold
2. Scotty JAMES (AUS) - 93.50 🥈 Silver
3. Ryusei YAMADA (JPN) - 92.00 🥉 Bronze
4. Ruka HIRANO (JPN) - 91.00
5. Valentino GUSELI (AUS) - 88.00

---

## Statistical Findings

### 1. **Strong Positive Autocorrelation (r = 0.897)**

**Interpretation**: 
- This unusually high correlation (0.897 is "very strong") indicates that consecutive scores are NOT independent
- High-scoring runs create momentum/environment that carries into the next performance
- This is NOT typical regression-to-the-mean behavior; instead, we see clustering

**What this means**:
- If competitor N scores well (95), competitor N+1 is very likely to score well (93.5) ✓
- The top 6 competitors all scored 86.5-95, forming a tight cluster
- When scores drop below median, they drop hard and stay low

---

### 2. **Performance Stratification**

Scores after HIGH performers (>87):
- **Count**: 6 competitors
- **Mean**: 89.75 points
- **Range**: 86.5-93.5 (compact, 7-point spread)

Scores after LOW performers (<87):
- **Count**: 5 competitors  
- **Mean**: 68.35 points
- **Range**: 43-77.5 (loose, 34.5-point spread)

**Mean Difference**: +21.4 points

### 3. **Performance Distribution**

- **Exceptional** (>95.2): 0 competitors
- **Average** (±1 SD): 11 competitors
- **Poor** (<67.4): 1 competitor (Campbell Melville Ives, 43 points)

The single outlier (43) is Campbell Melville Ives—a massive 27.25-point drop from the previous competitor (Chase Josey, 70.25).

---

### 4. **Score Trajectory**

All 11 score differences are **negative** (consistently declining):
```
95.0 → 93.5 → 92.0 → 91.0 → 88.0 → 87.5 → 86.5 → 77.5 → 76.0 → 75.0 → 70.25 → 43.0
```

**Pattern**: Scores descend in small steps until a cliff drop at position 7→8 (86.5→77.5, -9 points), then continue small-step declines until the final catastrophic drop.

---

## Hypotheses & Interpretations

### Hypothesis 1: Selection Effect (Most Likely)
The competition format (12 competitors) likely had preliminary rounds. The finalists are naturally stronger, which means:
- Top competitors (best from qualifiers) score 86-95
- Lower-placed finalists score 70-88
- One outlier dropped significantly

**This is NOT evidence of psychological contagion**, but rather reflects athlete quality.

### Hypothesis 2: Judging Carry-Over (Possible)
Judges might be influenced by previous scores:
- If they just witnessed an excellent run (95), they might be more critical of the next run
- OR they might be biased to score similarly to maintain consistency
- The strong correlation could support either direction

### Hypothesis 3: Rising Pressure (Possible)
As stronger competitors perform well:
- Weaker competitors feel mounting pressure
- This causes performance degradation in the lower-ranked group
- **Evidence**: Clean separation at rank 7 (86.5 → 77.5 breakpoint)

### Hypothesis 4: Course/Conditions Effect (Unlikely)
If conditions degraded during competition:
- We'd expect gradual decline (which we see)
- But the strong positive correlation suggests something systematic about performance, not conditions

---

## Statistical Rigor Notes

### Limitations of This Dataset
1. **Small sample (n=12)**: High correlation can occur by chance with small samples
2. **Ranked data**: Scores are inherently ordered (highest to lowest by definition)
3. **No control group**: No comparable halfpipe competition to compare against
4. **Missing context**: Don't know run order, rest periods, weather conditions

### What We Can't Conclude
- ❌ That judges are biased
- ❌ That psychology significantly affects performance
- ❌ That the competition format is unfair
- ⚠️ The true causal mechanism

### What We Can Conclude
- ✅ Scores are highly correlated sequentially in this competition
- ✅ There's a clear performance stratification between top-6 and bottom-6
- ✅ One significant performance drop occurred (position 11→12)

---

## Recommendations for Future Analysis

1. **Expand dataset**: Collect multiple halfpipe competitions to establish baselines
2. **Track performance order**: Know the actual run sequence (not final ranking)
3. **Collect fall/crash data**: Identify if falls correlate with score drops
4. **Judge scoring patterns**: Analyze individual judge scores, not just finals
5. **Condition logging**: Weather, temperature, snow quality during each run
6. **Psychological interviews**: Post-competition debriefs with competitors
7. **Comparative analysis**: Compare with other sports (diving, gymnastics) that also use judge scoring

---

## Conclusion

The Milano-Cortina 2026 Men's Halfpipe Final shows **strong score clustering** (r = 0.897) with a clear performance stratification. While this could suggest psychological or judging effects, **the most likely explanation is that finalists naturally stratify by skill level**, with preliminary rounds already separating strong competitors from weaker ones.

The **21.4-point difference** between scores after high vs. low performers is substantial and warrants further investigation, but single-competition analysis cannot determine causation.

**Suggested headline**: *"Elite halfpipe competitors form tight performance clusters, but selection effects likely explain most correlation"*

---

## Appendix: Full Scoring Sequence

| Rank | Competitor | Country | Score | Notes |
|------|-----------|---------|-------|-------|
| 1 | Yuto TOTSUKA | JPN | 95.00 | Gold Medal, DNI after run 1 |
| 2 | Scotty JAMES | AUS | 93.50 | Silver Medal, DNI after run 2 |
| 3 | Ryusei YAMADA | JPN | 92.00 | Bronze Medal, DNI after run 2 |
| 4 | Ruka HIRANO | JPN | 91.00 | 3 runs completed |
| 5 | Valentino GUSELI | AUS | 88.00 | DNI after run 2 |
| 6 | Chaeun LEE | KOR | 87.50 | 3 runs completed |
| 7 | Ayumu HIRANO | JPN | 86.50 | DNI after run 2 |
| 8 | Jake PATES | USA | 77.50 | DNI after run 1 |
| 9 | Ziyang WANG | CHN | 76.00 | 3 runs completed |
| 10 | Alessandro BARBIERI | USA | 75.00 | DNI after run 1 |
| 11 | Chase JOSEY | USA | 70.25 | DNI after run 2 |
| 12 | Campbell MELVILLE IVES | NZL | 43.00 | DNI after run 1 |
