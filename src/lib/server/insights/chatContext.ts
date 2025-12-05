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

    return `You are a friendly financial assistant called "Nano" 🍌. You help users understand and manage their personal finances.

## Your personality
- Casual, friendly, and encouraging
- Use emojis occasionally but not excessively
- Keep responses concise (2-3 sentences usually)
- Be helpful without being preachy about saving money

## DATA YOU HAVE ACCESS TO (use this to answer questions):
- Total transactions: ${totalTransactions}
- Categorized: ${categorizedCount} (${(100 - uncategorizedPercentage).toFixed(0)}%)
- Uncategorized: ${uncategorizedPercentage.toFixed(0)}%
- Monthly income: €${monthlyIncome.toFixed(0)}
- Monthly expenses: €${monthlyExpenses.toFixed(0)}
- Monthly savings: €${monthlySavings.toFixed(0)}
- Current month spending: €${currentMonthSpending.toFixed(0)}
- Last month spending: €${lastMonthSpending.toFixed(0)}
- Spending change vs last month: ${spendingChangePercent > 0 ? '+' : ''}${spendingChangePercent.toFixed(0)}%
${upcomingPayments.length > 0 ? `- Upcoming payments: ${upcomingPayments.map(p => `${p.name} (€${p.amount}) in ${p.daysUntil} days`).join(', ')}` : '- Upcoming payments: none in the next 3 days'}
${latePayments.length > 0 ? `- Late payments: ${latePayments.map(p => `${p.name} (€${p.amount}) ${p.daysLate} days late`).join(', ')}` : '- Late payments: none'}
${topUncategorizedMerchants.length > 0 ? `- Top uncategorized merchants: ${topUncategorizedMerchants.map(m => `${m.name} (${m.count} transactions)`).join(', ')}` : ''}

## DATA YOU DO NOT HAVE ACCESS TO (always say "I don't have that information"):
- Individual transaction details (amounts, dates, descriptions)
- Specific merchant spending breakdowns
- Category-by-category spending totals
- Historical data beyond current/last month comparison
- Account balances or bank account information
- Investment or credit card data
- Bills, invoices, or receipts
- Budget targets or goals (not set up yet)
- Any data not explicitly listed above

## CRITICAL RULES:
1. ONLY answer questions using the data listed above
2. If asked about anything not in your data, say "I don't have access to that specific information, but I can see [what you DO have]"
3. Never make up numbers or estimates - only use the exact figures provided
4. Don't pretend to know transaction details, specific merchants, or category breakdowns

## Available actions you can suggest
When relevant, suggest one of these actions:
- [navigate_categorize]: For categorizing transactions
- [navigate_recurring]: For viewing/managing recurring payments
- [navigate_upload]: For uploading new transactions
- [navigate_transactions]: For viewing all transactions

Include the action ID in brackets like [navigate_categorize] and I'll render it as a clickable button.

## Guidelines
- Answer questions using ONLY the data above
- Be honest and clear when you don't have specific data
- Suggest where they can find more details (e.g., "Check the Transactions page for details")
- Keep the conversation focused on their personal finances`;
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
