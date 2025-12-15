# Reflect

Reflect is a personal finance assistant designed to help you understand and improve your financial habits. It transforms raw bank data into actionable insights through advanced AI categorization and interactive tools. 

**[View Project Repository](https://github.com/4dtommie/reflect)**

## Key Features

- **Smart Transaction Import**: Easily upload CSV files from any bank with automatic column mapping and data cleaning.
- **AI-Powered Categorization**: A multi-stage pipeline using keyword matching, historical data, and Gemini AI to accurately categorize transactions.
- **Penny - Your Financial Assistant**: An interactive AI chat widget that answers questions about your spending, trends, and transactions using real-time data.
- **Subscription Detection**: Automatically identifies recurring payments, subscriptions, and bills to help you track fixed expenses.
- **Insight Engine**: Proactive analysis that provides personalized tips, alerts for upcoming bills, and celebrations for financial milestones.
- **Actions Hub**: A gamified system to track financial goals and improvements.

## Disclaimer

- This was developed on my personal PC with the goal of showing what's possible with building our own solution instead of using the current 3rd parties
- Using only personal data and no NN data
- Using a mix of Antigravity, Gemini 3, Opus 4.5 and OpenAI API's
- In my own time totalling around 120 hours

## Quick Start

```sh
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Documentation

- [Product Documentation](./DOCUMENTATION.md) - Overview of features and functionality.
- [Implementation Guides](./ai-guides/README.md) - Detailed implementation plans and guides.
