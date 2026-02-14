# Snowboarding Halfpipe Analysis

Statistical analysis of judge scoring patterns in men's halfpipe snowboarding competitions, focusing on whether judges award higher scores after witnessing wipeouts or poor performances (contrast/relief effect).

## Research Question

**Do judges unconsciously award higher scores for impressive performances when those performances immediately follow multiple wipeouts or poor performances?**

## Data Source

Official results from the **Milano-Cortina 2026 Winter Olympics Men's Halfpipe Final**

- **URL**: https://www.olympics.com/en/milano-cortina-2026/results/sbd/je/m/hp----------------/fnl-/--------/result
- **Date**: February 13, 2026
- **Competitors**: 12 elite men halfpipe riders
- **Format**: Round-robin, 3 runs per competitor (best score used for ranking)
- **Judges**: 6 judges per run, high/low scores excluded, average of middle 4 used for final score

## Project Structure

```
├── README.md
├── RESEARCH_QUESTIONS.md          # Central research questions & hypotheses
├── PHASE1_FINDINGS.md              # Wipeout context & recovery analysis
├── PHASE2_FINDINGS.md              # Skill-level control analysis
├── data/
│   └── raw/
│       ├── milano-cortina-2026-mens-halfpipe.csv              # Basic competition data
│       ├── milano-cortina-2026-individual-judge-scores.csv    # Individual judge scores + tricks
│       └── judges-metadata.csv                                 # Judge information
├── scripts/
│   ├── wipeout_context_analysis.js              # Phase 1: Recovery scores after wipeouts
│   ├── position_controlled_analysis.js          # Phase 2: Skill-level controls
│   ├── points_per_trick_analysis.js             # Trick value estimation
│   └── trick_difficulty_exploration.js          # Exploratory: trick code analysis
├── results/
│   ├── wipeout_context_analysis.json
│   ├── position_controlled_analysis.json
│   ├── points_per_trick_analysis.json
│   └── trick_difficulty_exploration.json
└── package.json
```

## Analysis Phases

- **Phase 1**: Wipeout context & recovery scores - Found +2.78 pt relief bonus
- **Phase 2**: Skill-level control - Relief effect disappears when controlling for skill
- **Phase 3**: Points per trick - Estimated ~17.27 pts per trick baseline
- **Phase 4**: Trick difficulty - Exploratory parsing of trick codes

## Key Findings

1. **Phase 1**: Recovery runs (after wipeouts) averaged 89.13 vs baseline 86.35 (+2.78 pts)
2. **Phase 2**: When controlling for competitor skill level, relief effect largely disappears
3. **Confound**: Better qualifiers score higher AND have fewer recovery opportunities, creating selection bias
4. **Sample**: Only 15 clean runs out of 36 total (rest were DNI or crashes <50 score)

## Assumptions & Limitations

### Data Quality Assumptions
- ✅ **Official source**: All data from Olympics.com official results
- ✅ **Individual judge scores**: All 6 judge scores recorded and verified
- ✅ **Scoring methodology**: High + low excluded automatically, middle 4 averaged
- ⚠️ **Trick data**: Coded by official Olympics system, codes parsed but NOT verified for difficulty

### Analytical Limitations
- ❌ **Trick difficulty**: Cannot control for trick complexity differences - no competitor repeated exact same tricks twice
- ❌ **Execution quality**: Crash runs (score <50) filtered out - can't compare "same tricks, different execution"
- ❌ **Judge composition**: Don't know if same 6 judges scored all runs
- ❌ **Environmental factors**: No weather, snow, timing data
- ❌ **Individual judge bias**: Can analyze patterns but can't isolate bias from single judges
- ❌ **Cross-competition validation**: Only 1 event analyzed - no external validation

### Methodological Confounds
1. **Skill effect**: Better qualifiers naturally score higher
2. **Selection bias**: Only stronger competitors continue to later rounds
3. **Sample size**: Only 12 competitors, 15 clean runs (very small)
4. **Round effects**: Later rounds have fewer competitors (DNI filtering)
5. **Judge standards drift**: Could change within round as judges get fatigued/settle

### What We CAN'T Prove
- Whether judge bias actually affects medal outcomes
- Causation vs correlation in relief effects
- Individual judge bias patterns
- Whether effect exists in other competitions
- Whether effect is unconscious bias or deliberate scoring

### What We CAN Explore
- Correlation patterns in clean runs
- Score variance after wipeouts
- Competitor trajectories (wipeout → recovery → high score)
- Judge disagreement patterns
- Trick difficulty proxies from codes

## Data Filtering Rules

**All analyses use consistent filtering:**
- ✅ Include: Final scores ≥50 (clean runs, landed tricks)
- ❌ Exclude: Scores <50 (crashes, wipeouts, incomplete runs)
- ❌ Exclude: DNI (Did Not Improve - competitor dropped out)

**Result**: 15 clean runs analyzed out of 24 non-DNI attempts

## Reproducibility

To run analyses:

```bash
npm install
node scripts/wipeout_context_analysis.js
node scripts/position_controlled_analysis.js
node scripts/points_per_trick_analysis.js
node scripts/trick_difficulty_exploration.js
```

Results saved to `results/` in JSON format.

## Contributing

If you have access to:
- Individual judge score breakdowns (amplitude, difficulty, execution, etc)
- Trick difficulty ratings
- Other halfpipe competitions' data
- Weather/environmental data

Please submit an issue or PR.

## License

MIT - Analysis code and methodology are free to use for research purposes.

---

**Note**: This analysis makes no claims about actual judge bias in Olympics scoring. It explores patterns in publicly available data and acknowledges significant limitations in causality claims.
