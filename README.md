# Snowboarding Halfpipe Analysis

Statistical analysis of scoring patterns in men's halfpipe snowboarding competitions, focusing on how scores are affected by the previous competitor's performance.

## Overview

This project analyzes whether competitors are psychologically or systematically affected by their predecessor's performance in halfpipe events. Specifically, we examine:

- **Performance clustering**: Do high scores tend to follow high scores or low scores?
- **Psychological effects**: Does a competitor's score change after witnessing a spectacular run or a fall?
- **Momentum patterns**: Are there statistical patterns suggesting "hot hand" effects or regression to the mean?
- **Score variance**: Does variance in scores increase or decrease following extreme performances?

## Data Source

Data is collected from the **2026 Beijing Winter Olympics Men's Halfpipe Final** (Competition date: ~Feb 14, 2026)

## Project Structure

```
├── README.md
├── .gitignore
├── data/
│   ├── raw/                  # Raw scraped data
│   └── processed/            # Cleaned and processed data
├── scripts/
│   ├── scrape_results.js     # Web scraper for competition results
│   └── analyze.js            # Statistical analysis
├── results/
│   ├── analysis.json         # Analysis output
│   └── visualizations/       # Charts and graphs
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Running the Analysis

```bash
# Scrape competition data
node scripts/scrape_results.js

# Analyze results
node scripts/analyze.js
```

## Statistical Methods

- Correlation analysis between consecutive scores
- Regression analysis to identify score predictors
- Distribution analysis of scores after high/low performance
- Time series analysis for momentum detection
- Chi-square tests for independence

## Results

See `results/analysis.json` for detailed findings and visualizations.

## Contributing

Feel free to fork, improve analysis methods, or add additional competitions to the dataset.

## License

MIT
