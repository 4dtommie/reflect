# Reflect AI - Application Documentation

**Version:** 1.1.1  
**Last Updated:** December 3, 2025

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Recurring Transaction Detection](#2-recurring-transaction-detection)
   - 2.1-2.12: Fixed recurring (subscriptions, income)
   - 2.13: Variable spending detection (groceries, coffee, fuel)
3. [Transaction Categorization](#3-transaction-categorization) _(Coming Soon)_
4. [Data Architecture](#4-data-architecture) _(Coming Soon)_
5. [User Interface Components](#5-user-interface-components) _(Coming Soon)_
6. [Changelog](#6-changelog)
7. [Future Improvements (TODOs)](#7-future-improvements-todos)

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

The recurring transaction detection system is designed to automatically identify patterns in your financial transactions. It consists of **two separate services**:

1. **RecurringDetectionService** - For fixed-amount subscriptions and income
2. **VariableSpendingService** - For variable spending patterns (groceries, coffee, fuel, etc.)

### 2.1. Overview

The detection process analyzes all transactions in your account to find:
- **Subscriptions**: Regular fixed-amount payments (Netflix, Spotify, insurance, etc.)
- **Bills**: Utility payments, phone bills, internet services
- **Income**: Salary, government benefits, regular transfers
- **Variable Spending**: Habitual spending patterns grouped by category (groceries, coffee, fuel)

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

### 2.13. Variable Spending Detection

**NEW in v1.1**: Variable spending is now handled by a separate `VariableSpendingService` that groups transactions by **category** rather than individual merchants.

#### Why Separate Services?

Fixed subscriptions and variable spending have fundamentally different patterns:

| Aspect | Subscriptions | Variable Spending |
|--------|---------------|-------------------|
| Amount | Fixed or near-fixed | Varies significantly |
| Timing | Regular intervals | Frequent but irregular |
| Analysis | Per-merchant, amount clustering | Per-category aggregation |
| Insight | "Netflix costs €15.99/month" | "You spend €180/month on groceries" |

#### How Variable Spending Detection Works

1. **Category Filtering**: Only analyzes transactions in variable spending categories:
   - Supermarkt, Slager, Bakker, Speciaalzaken
   - Koffie, Lunch, Uit eten, Bestellen
   - Brandstof, Openbaar vervoer, Parkeren
   - Persoonlijke verzorging

2. **Category Grouping**: All transactions in a category are grouped together (not per-merchant)

3. **Metrics Calculated**:
   - `monthlyAverage`: Your typical monthly spend in this category
   - `visitsPerMonth`: How often you make purchases
   - `averagePerVisit`: Average transaction amount
   - `uniqueMerchants`: How many different places you visit
   - `topMerchants`: Top 5 merchants with their totals (for drill-down)

4. **Filtering**:
   - Minimum 3 transactions per category
   - Last transaction within 90 days (for category-level)

#### Example Output

```
🛒 VARIABLE SPENDING BY CATEGORY:
   Total: €450.00/month across 8 categories
   🛒 Supermarkt: €180.00/mo (8.5 visits/mo, 5 places)
      Top: Albert Heijn (€120), Jumbo (€35), Lidl (€25)
   ☕ Koffie: €45.00/mo (12 visits/mo, 8 places)
      Top: Starbucks (€20), Anne&Max (€15)
   ⛽ Brandstof: €80.00/mo (2.5 visits/mo, 3 places)
      Top: Shell (€50), Total (€30)
```

#### API Endpoints

- `POST /api/recurring/detect` - Runs both services, returns `candidates` (subscriptions) and `variableSpending` (categories)
- `GET /api/variable-spending` - Returns only variable spending patterns

#### Configuration

Variable spending categories are currently hardcoded in `variableSpendingService.ts`. 

**TODO**: Add `spending_type` field to `categories` table:
- `fixed` - Fixed recurring (subscriptions, bills)
- `variable` - Variable spending (groceries, coffee)
- `exclude` - Never recurring (one-off purchases)
- `null` - Default behavior

This would allow per-category configuration without code changes.

---

## 3. Transaction Categorization
_(Coming Soon)_

---

## 4. Data Architecture
_(Coming Soon)_

---

## 5. User Interface Components
_(Coming Soon)_

---

## 6. Changelog

### Version 1.1.1 (December 3, 2025)

#### Bug Fixes

**Fixed Loan Payment Detection (AXUS)**
- **Issue**: Transactions categorized as "Leningen & schuldaflossing" (Loans & debt repayment) were being excluded from recurring detection, even though loan payments are legitimate recurring transactions.
- **Solution**: Removed "Leningen & schuldaflossing" from the `exclude_from_recurring` category list in `categoryConfig.ts`.
- **Impact**: Loan payments (e.g., AXUS mortgage payments of €729/month) are now properly detected and tracked as recurring transactions.

**Fixed Multi-Category Merchant Detection (Nationale Nederlanden)**
- **Issue**: When a merchant had transactions in multiple categories (e.g., Nationale Nederlanden with both mortgage payments in "Woning" category and fuel purchases in "Brandstof" category), the system only checked the first transaction's category. If that category was excluded or variable_recurring, the entire merchant group was skipped, missing legitimate subscriptions.
- **Solution**: Updated `detectByKnownList()` in `recurringDetectionService.ts` to:
  1. Group transactions by category first (in addition to merchant grouping)
  2. Process each category group separately
  3. Only skip categories that should be excluded, not the entire merchant
  4. Add category name to display name when merchant has multiple categories (e.g., "Nationale-Nederlanden (Woning)")
- **Impact**: Merchants with mixed transaction types (mortgage payments, fuel, etc.) now correctly detect subscriptions for each category. Nationale Nederlanden mortgage payments (€1013.85/month) are now properly detected.

**Enhanced Delete Functionality**
- **Issue**: The "Delete all" button on the recurring transactions page only deleted fixed recurring transactions, but not variable spending patterns.
- **Solution**: Updated the `DELETE` handler in `/api/recurring/+server.ts` to also delete all `VariableSpendingPattern` records for the user.
- **Impact**: Users can now completely reset their recurring transaction detection, including variable spending patterns, with a single action.

#### Technical Improvements

**Improved Debug Logging**
- Added comprehensive debug logging for multi-category merchant detection
- Logs now show category distribution and processing decisions
- Helps identify why specific transactions might not be detected

**Code Quality**
- Improved code organization by processing categories separately
- Better handling of edge cases (merchants with 10+ different transaction categories)
- More descriptive candidate names when merchants have multiple subscription types

---

## 7. Future Improvements (TODOs)

### 6.1. Category-Based Spending Type (High Priority)

**Problem**: Variable spending categories are hardcoded in `variableSpendingService.ts`. Adding or removing categories requires code changes.

**Solution**: Add a `spending_type` enum field to the `categories` table:

```prisma
model categories {
  // ... existing fields ...
  spending_type    SpendingType?  // "fixed" | "variable" | "exclude"
}

enum SpendingType {
  fixed      // Fixed recurring (subscriptions, insurance)
  variable   // Variable spending (groceries, coffee, fuel)
  exclude    // Never recurring (clothing, electronics)
}
```

**Benefits**:
- Admin can configure categories via UI
- No code deployment needed to change behavior
- Category-specific thresholds can also be stored

### 6.2. Category-Specific Thresholds

**Problem**: Different variable spending categories have different natural patterns:
- Groceries: Weekly visits, €30-80 per visit
- Coffee: Frequent (daily?), €3-8 per visit
- Fuel: Bi-weekly, €40-80 per visit
- Dining out: Occasional, €20-100 per visit

**Solution**: Add category-specific configuration:

```typescript
interface CategorySpendingConfig {
  expectedFrequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'occasional';
  minTransactions: number;
  typicalAmountRange: { min: number; max: number };
}
```

### 6.3. Variable Spending Persistence

**Problem**: Currently, variable spending patterns are calculated on-the-fly and not stored in the database.

**Solution**: Create a `variable_spending_patterns` table to:
- Cache calculated patterns
- Track trends over time (is grocery spending increasing?)
- Enable budget alerts ("You've spent 80% of your typical grocery budget")

### 6.4. Budget Integration

**Problem**: Variable spending insights exist but aren't connected to budgeting.

**Solution**:
- Allow users to set budgets per category
- Show progress: "Groceries: €145/€200 (73%)"
- Alert when approaching or exceeding budget
- Suggest budgets based on historical spending

### 6.5. Trend Analysis

**Problem**: We show current monthly averages but not trends.

**Solution**: Track and display:
- Month-over-month changes
- Seasonal patterns (higher grocery spend in December)
- Anomaly detection (unusually high spending in a category)

### 6.6. Merchant Intelligence

**Problem**: Top merchants are shown but not analyzed.

**Solution**:
- Identify if spending is concentrated (70% at one store) or distributed
- Suggest alternatives ("You could save €20/month at Lidl vs Albert Heijn")
- Flag merchant changes (new frequent merchant, stopped visiting old one)
