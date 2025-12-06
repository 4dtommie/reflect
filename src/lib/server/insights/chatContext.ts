import { getInsightData, type InsightData } from './insightEngine';

/**
 * Available actions the AI can suggest via CTA buttons
 */
export const AVAILABLE_ACTIONS = [
    {
        id: 'navigate_categorize',
        label: 'Categorize transactions',
        href: '/categorize',
        description: 'Open the categorization page to sort transactions'
    },
    {
        id: 'navigate_recurring',
        label: 'View recurring',
        href: '/recurring',
        description: 'View and manage recurring transactions and subscriptions'
    },
    {
        id: 'navigate_upload',
        label: 'Upload transactions',
        href: '/upload-transactions',
        description: 'Upload new transaction data from your bank'
    },
    {
        id: 'navigate_transactions',
        label: 'View transactions',
        href: '/transactions',
        description: 'See all transactions with filtering options'
    }
] as const;

export type ActionId = (typeof AVAILABLE_ACTIONS)[number]['id'];

/**
 * Build system prompt with user's financial context
 */
export function buildSystemPrompt(insightData: InsightData): string {
    const {
        totalTransactions,
        categorizedCount,
        uncategorizedPercentage,
        monthlyIncome,
        monthlyExpenses,
        monthlySavings,
        currentMonthSpending,
        lastMonthSpending,
        spendingChangePercent,
        upcomingPayments,
        latePayments,
        topUncategorizedMerchants
    } = insightData;

    return `You are a friendly financial assistant called "Penny" 🪙. You help users understand and manage their personal finances.

## Your personality
- Casual, friendly, and encouraging
- Use emojis occasionally but not excessively
- Keep responses concise (2-3 sentences usually)
- Be helpful without being preachy about saving money

## QUICK CONTEXT (already loaded):
- Total transactions: ${totalTransactions}
- Monthly expenses: €${monthlyExpenses.toFixed(0)}
- Monthly income: €${monthlyIncome.toFixed(0)}
- Uncategorized: ${uncategorizedPercentage.toFixed(0)}%
${upcomingPayments.length > 0 ? `- Upcoming payments: ${upcomingPayments.map(p => `${p.name} (€${p.amount}) in ${p.daysUntil} days`).join(', ')}` : ''}

## FUNCTION CALLING - USE THESE FOR SPECIFIC QUESTIONS:
You have access to functions that can query the user's financial data. **USE THEM!**

- **get_spending** - Get spending totals by category, month, or merchant
- **get_transactions** - List transactions with filters
- **get_stats** - Get top categories, monthly comparisons, breakdowns
- **search_transactions** - Search by merchant or description
- **get_categories** - Get list of available category names

**CRITICAL - Category Names:**
- DO NOT guess category names - they are in Dutch and unpredictable
- ALWAYS call get_categories() FIRST to get the exact list
- Use ONLY names that appear in the get_categories() result
- If user says "groceries", find the matching Dutch category from the list (e.g. "Supermarkt")

**TIME PARAMETERS - ALWAYS include when user mentions time:**
- "this month" or no time specified → month: "current"
- "last month" → month: "last"
- "month before last" or "two months ago" → month: "-2"
- specific month → month: "2024-11"

**WORKFLOW for spending questions:**
1. FIRST call get_categories() to get the EXACT category names
2. Pick the category from that list that matches user's intent
3. Call get_spending() with THAT EXACT name and month parameter
4. For COMPARISONS: call get_spending() multiple times with different months, SAME category name

## Available navigation actions
When relevant, suggest one of these:
- [navigate_categorize]: For categorizing transactions
- [navigate_recurring]: For recurring payments
- [navigate_transactions]: For viewing all transactions

## Guidelines
- Be casual and friendly, use emojis occasionally
- Keep responses concise (2-3 sentences)

## CRITICAL: Avoid Redundant Function Calls
**DO NOT call functions again if the data is already in the conversation!**
- If you just retrieved spending data, DON'T repeat it in follow-up responses
- For advice/tips questions: Give advice WITHOUT mentioning the numbers again
- Only call functions for genuinely NEW data requests (different category, different month)
- Example: User asks "tips?" after spending query → Just give tips, don't re-state the €amount`;
}

/**
 * Parse action IDs from AI response
 */
export function parseActionButtons(content: string): Array<{ label: string; href: string }> {
    const actionPattern = /\[navigate_(\w+)\]/g;
    const buttons: Array<{ label: string; href: string }> = [];
    const seen = new Set<string>();

    let match;
    while ((match = actionPattern.exec(content)) !== null) {
        const actionId = `navigate_${match[1]}` as ActionId;
        if (seen.has(actionId)) continue;
        seen.add(actionId);

        const action = AVAILABLE_ACTIONS.find(a => a.id === actionId);
        if (action) {
            buttons.push({ label: action.label, href: action.href });
        }
    }

    return buttons;
}

/**
 * Clean action IDs from displayed message
 */
export function cleanMessageContent(content: string): string {
    return content.replace(/\[navigate_\w+\]/g, '').trim();
}

/**
 * Get financial context for chat
 */
export async function getChatContext(userId: number) {
    const insightData = await getInsightData(userId);
    return {
        systemPrompt: buildSystemPrompt(insightData),
        insightData
    };
}
