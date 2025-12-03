# Reflect AI - Application Documentation

**Version:** 1.0  
**Last Updated:** December 3, 2025

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Recurring Transaction Detection](#2-recurring-transaction-detection)
3. [Transaction Categorization](#3-transaction-categorization) _(Coming Soon)_
4. [Data Architecture](#4-data-architecture) _(Coming Soon)_
5. [User Interface Components](#5-user-interface-components) _(Coming Soon)_

---

## 1. System Overview

Reflect AI is a personal finance management application that helps users understand their spending patterns, categorize transactions, and identify recurring payments. The application processes bank transaction data to provide insights into subscriptions, regular expenses, and income sources.

### Core Features
- **Transaction Import & Processing**: Upload CSV files from various banks
- **Automatic Categorization**: AI-powered transaction categorization using Google's Gemini
- **Recurring Transaction Detection**: Intelligent identification of subscriptions, bills, and regular income
- **Financial Dashboard**: Visual overview of spending patterns and statistics
- **Subscription Management**: Track and manage all recurring payments in one place

---

## 2. Recurring Transaction Detection

The recurring transaction detection system is designed to automatically identify patterns in your financial transactions and classify them as subscriptions, regular income, or other recurring payments. The system uses a multi-phase approach to ensure accuracy while minimizing false positives.

### 2.1. Overview

The detection process analyzes all transactions in your account to find:
- **Subscriptions**: Regular payments to services (Netflix, Spotify, insurance, etc.)
- **Bills**: Utility payments, phone bills, internet services
- **Income**: Salary, government benefits, regular transfers
- **Other recurring payments**: Any other pattern of regular transactions

### 2.2. Detection Methods

The system employs three complementary detection methods, each with different strengths:

#### Method 1: Known List Detection
This method uses a database of known service providers that commonly offer subscriptions. 

**How it works:**
- Maintains a database of merchants marked as "potentially recurring" (insurance companies, telecom providers, streaming services, etc.)
- Scans all expense transactions (debits) to find matches based on merchant name, keywords, or bank account numbers
- Groups transactions by merchant and analyzes payment patterns

**Strengths:**
- High accuracy for well-known services
- Can identify subscriptions even with only 2-3 transactions
- Works immediately without needing extensive transaction history

**Limitations:**
- Only detects merchants in the known list
- Requires database maintenance to add new merchants

#### Method 2: Income Detection
Specialized detection for regular incoming money (non-debit transactions).

**How it works:**
- Identifies transactions based on keywords (salary, wages, benefits, taxes)
- Applies minimum thresholds (e.g., salary must be at least €1000)
- Analyzes payment regularity and amount consistency

**Categories detected:**
- **Salary**: Regular employment income
- **Tax**: Government benefits, tax refunds
- **Transfers**: Regular personal transfers

**Strengths:**
- Specifically tuned for income patterns
- Handles irregular amounts better than expense detection
- Special handling for salary weekend adjustments

#### Method 3: Interval Detection
Pattern-based detection that doesn't require prior knowledge of the merchant.

**How it works:**
- Groups transactions by merchant/IBAN
- Analyzes time intervals between transactions
- Checks for amount consistency
- Identifies regular patterns (weekly, monthly, quarterly, yearly)

**Strengths:**
- Discovers unknown recurring payments
- Works for any regular pattern
- No database maintenance needed

**Limitations:**
- Requires at least 3 transactions to establish a pattern
- May miss new subscriptions
- Sensitive to irregular payment schedules

### 2.3. Smart Clustering

One of the biggest challenges is handling merchants where you have multiple types of transactions with different amounts. For example:
- An insurance company where you have multiple policies with different premiums
- A telecom provider with separate mobile and internet subscriptions
- A store where you shop regularly but at varying amounts

The system uses **amount clustering** to solve this:

#### How Amount Clustering Works

1. **Grouping**: All transactions to the same merchant are grouped together
2. **Sorting**: Transactions are sorted by amount
3. **Cluster Formation**: Nearby amounts are grouped into clusters (within 20% of each other)
4. **Cluster Analysis**: Each cluster is evaluated independently

#### Example: Insurance Company
```
Insurance Company Transactions:
€5.35 (appears 10 times) → Cluster A
€32.13 (appears 3 times) → Cluster B  
€95.00 (appears 5 times) → Cluster C
€200.00 (appears 8 times) → Cluster D
```

The system would identify these as 4 separate insurance policies.

### 2.4. Preventing Over-Splitting

To avoid creating separate subscriptions for normal amount variations, the system implements multiple safeguards:

#### Minimum Transaction Requirements
- **Known Merchants**: Requires at least 5 transactions per cluster
- **Interval Detection**: Requires at least 3 transactions
- **Income Detection**: Requires at least 2 transactions (income is more regular)

#### Dominant Amount Detection
When a merchant has many transactions but they split into small clusters, the system identifies the "dominant amount":

**Example: Mobile Phone Provider**
```
€13.78 (appears 14 times) → 87% of transactions
€26.64 (appears 1 time) → 6% of transactions  
€31.11 (appears 1 time) → 6% of transactions
€42.99 (appears 1 time) → 6% of transactions
```

The system recognizes €13.78 as the dominant subscription and treats the others as one-off charges (possibly for extra usage or upgrades).

**Rule**: If one amount cluster represents more than 60% of all transactions, only that cluster is kept as a subscription.

### 2.5. Multiple Legitimate Subscriptions

The system can distinguish between over-splitting and legitimate multiple subscriptions:

**Example: Tax Authority**
```
€52 (appears 9 times) → Healthcare subsidy
€134 (appears 19 times) → Childcare benefit
€613 (appears 18 times) → Housing benefit
```

Since each cluster has **5 or more transactions**, they're all considered legitimate separate recurring payments.

### 2.6. Deduplication

After running all three detection methods, there may be duplicates (e.g., the same subscription found by both "Known List" and "Interval Detection"). The system merges duplicates while preserving the best data:

#### Deduplication Process
1. **Priority Ranking**: Known List > Income Detection > Interval Detection
2. **Matching Criteria**: 
   - Same merchant ID, OR
   - Similar name AND similar amount (within 33%)
3. **Transaction Merging**: Combines all unique transactions from both sources
4. **Special Handling for Income**: Never merges income sources based on name alone (only on exact amount match)

### 2.7. Confidence Scoring

Each detected recurring transaction receives a confidence score (0-100%) based on:

#### Factors Affecting Confidence
- **Number of transactions**:
  - 10+ transactions → 95% confidence
  - 5-9 transactions → 90% confidence
  - 3-4 transactions → 85% confidence
  - 2 transactions → 70% confidence

- **Amount consistency**:
  - Variance <5% → +15% confidence boost
  - Variance <12% → +8% confidence boost

- **Interval regularity**:
  - Monthly or 4-weekly → +10% confidence boost
  - Yearly → +5% confidence boost

- **Detection method**:
  - Known List → Higher base confidence
  - Interval Detection → Lower base confidence

#### Filtering by Confidence
Only subscriptions with **75% or higher confidence** are saved to the database and displayed to users. This threshold can be adjusted based on user preferences.

### 2.8. Interval Estimation

The system automatically determines the payment frequency by analyzing time gaps between transactions:

**Supported Intervals:**
- **Weekly**: 6-8 days between payments
- **4-Weekly**: 26-30 days (common for some subscriptions)
- **Monthly**: 25-35 days
- **Quarterly**: 85-95 days
- **Yearly**: 360-370 days
- **Irregular**: Anything that doesn't match above patterns

**Special Handling:**
- Salaries that fall on weekends are automatically adjusted to the preceding Friday in predictions
- Quarterly and yearly subscriptions have longer grace periods for recency checks

### 2.9. Recency Filtering

To avoid flagging old, cancelled subscriptions, the system checks when the last transaction occurred:

**Maximum Gap Rules:**
- Monthly subscriptions: Last transaction must be within 70 days (2 intervals)
- Weekly subscriptions: Last transaction must be within 20 days
- Quarterly subscriptions: Last transaction must be within 190 days
- Yearly subscriptions: Last transaction must be within 740 days

If the gap is too long, the pattern is considered inactive and not saved as a subscription.

### 2.10. Amount Filtering

Very small transactions are filtered out to avoid noise:
- Minimum amount: €10
- Exception: Income transactions have a lower threshold of €10 but different analysis rules

### 2.11. Next Payment Prediction

For each detected subscription, the system predicts the next payment date:

**Calculation Method:**
1. Take the date of the most recent transaction
2. Add the interval length (e.g., +1 month for monthly subscriptions)
3. Apply adjustments (e.g., weekend corrections for salaries)

This prediction is used to display upcoming payments and send reminders.

### 2.12. Database Storage

Detected recurring transactions are stored with:
- Link to the merchant
- Amount and interval
- Next expected payment date
- Status (active/inactive)
- Links to all transactions that are part of this recurring pattern

This allows the system to:
- Track history over time
- Update predictions as new transactions arrive
- Mark transactions as "recurring" for better categorization
- Identify divergent charges (one-off amounts that differ from the usual subscription)

---

## 3. Transaction Categorization
_(Coming Soon)_

---

## 4. Data Architecture
_(Coming Soon)_

---

## 5. User Interface Components
_(Coming Soon)_
