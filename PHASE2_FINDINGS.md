# Phase 2 Analysis: Qualifying Position Control

## Question
Is the relief effect from Phase 1 **real**, or is it just **selection bias** (better-qualified competitors naturally score higher and are more likely to recover after wipeouts)?

## Method
Broke down recovery effect by qualifying tier:
- **Bottom Tier (Pos 1-4):** Worst qualifiers (75.50-82.00)
- **Middle Tier (Pos 5-8):** Mid qualifiers (84.75-87.50)
- **Top Tier (Pos 9-12):** Best qualifiers (88.50-94.00)

If relief effect is real, recovery scores should be elevated **within each tier**. If it's just skill effect, recovery and baseline scores will be similar within tiers.

## Critical Discovery: Selection Bias in Wipeout Context

**The problem:** Bottom qualifiers go first in each round, so they **never have wipeouts before them within a round**. This means:
- Zero recovery runs in bottom tier (can't recover from what didn't happen)
- Recovery effect only visible in middle/top tiers (who go later)
- This is a **fundamental structural confound** we didn't anticipate

### Wipeout Rates by Tier
- **Bottom Tier:** 5/12 runs (41.7%) wipeout rate
- **Middle Tier:** 3/12 runs (25.0%) wipeout rate
- **Top Tier:** 1/12 runs (8.3%) wipeout rate

Better qualifiers wipeout less frequently, so there are fewer recovery opportunities for them to demonstrate the effect.

## Within-Tier Analysis: Relief Effect

| Tier | Baseline Runs | Recovery Runs | Relief Bonus | Interpretation |
|---|---|---|---|---|
| **Bottom** | 4 runs (77.81 avg) | 0 runs | -77.81 | N/A - goes first each round |
| **Middle** | 2 runs (89.50 avg) | 3 runs (88.83 avg) | **-0.67 pts** ⬇️ | SLIGHT PENALTY |
| **Top** | 1 run (92.00) | 5 runs (89.30 avg) | **-2.70 pts** ⬇️ | SLIGHT PENALTY |

### Uncomfortable Finding
**Across tiers, recovery runs are LOWER than baseline, not higher.** This contradicts Phase 1's +2.78 point relief bonus.

## Why the Contradiction?

Phase 1 found +2.78 bonus when comparing recovery vs overall baseline (86.35). Phase 2 found -0.67 to -2.70 penalty when controlling for skill level within tiers.

**Explanation:** The Phase 1 bonus was **masking a skill effect**.
- Recovery runners tend to be better qualifiers (positions 5-12)
- Better qualifiers naturally score higher (89+ range)
- When we filter by tier, we remove this advantage
- Result: recovery effect disappears or reverses

## Detailed Recovery Patterns

### Middle Tier (5-8) - 3 Recovery Runs
1. **Ayumu HIRANO (R2):** 86.50 (after 2 wipeouts) 
   - 3.0 pts below middle baseline
   
2. **Ruka HIRANO (R1):** 90.00 (after 6 wipeouts)
   - 0.5 pts above middle baseline ✓
   
3. **Ruka HIRANO (R2):** 90.00 (after 2 wipeouts)
   - 0.5 pts above middle baseline ✓

### Top Tier (9-12) - 5 Recovery Runs
1. **Alessandro BARBIERI (R1):** 75.00 (after 6 wipeouts)
   - 17.0 pts below top baseline ✗ (massive penalty)
   
2. **Ryusei YAMADA (R1):** 92.00 (after 6 wipeouts)
   - On baseline (0 difference)
   
3. **Yuto TOTSUKA (R1):** 91.00 (after 6 wipeouts)
   - 1.0 pt below baseline
   
4. **Yuto TOTSUKA (R2):** 95.00 (after 2 wipeouts)
   - **+3.0 pts above baseline ✓** (strongest recovery)
   
5. **Scotty JAMES (R2):** 93.50 (after 2 wipeouts)
   - **+1.5 pts above baseline ✓** (modest recovery)

## Revised Interpretation

### What Changed
1. **Relief effect is NOT consistent across skill levels** as Phase 1 suggested
2. **Penalty effect appears for top qualifiers** in Round 1 (especially Barbieri)
3. **Strong recovery cases** are concentrated in Round 2 (Totsuka, Scotty James)
4. **Ruka Hirano** shows consistent strong performance regardless of context

### New Hypothesis: Round Affects Recovery Context
- **R1 (after many wipeouts):** Top qualifiers show penalty or neutral effect
- **R2 (after fewer wipeouts):** Top qualifiers show relief bonus

Could suggest judges are **fatigued** after Round 1's chaos, or recovery becomes more effective after fewer wipeouts?

## Confounds Still Present

✗ **Skill composition:** Not enough data to fully separate relief effect from performer skill  
✗ **Trick difficulty:** Don't know if recovery runs involve easier tricks (which would naturally score lower)  
✗ **Judge psychology by round:** Are judges more lenient/strict as rounds progress?  
✗ **Sample size:** Only 8 total recovery runs (3 in middle, 5 in top)

## Conclusion

**Phase 1's relief effect (+2.78 pts) was largely a skill effect**, not judges being lenient. When we control for qualifying tier:
- Relief effect is **not consistent** across skill levels
- Top qualifiers show **penalty** (not bonus) after many wipeouts
- Some recovery cases show modest bonus (+1-3 pts), but concentrated in specific conditions (R2, fewer wipeouts)

**The pattern is more nuanced than "judges give relief bonuses."** It may depend on:
- Number of wipeouts witnessed
- Round number
- Competitor skill level
- Specific circumstances

## Next Steps

1. **Separate by round:** Analyze R1 vs R2 vs R3 relief effect
2. **Examine position ordering:** Do top qualifiers suffer when going after elites?
3. **Look for judge-by-judge patterns:** Is effect real or specific judges?
4. **Collect trick difficulty:** Control for what was actually performed

**Key question:** Is the small R2 relief effect (+1-3 pts for select competitors) real relief bias, or just natural variation?
