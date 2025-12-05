import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed insight definitions
 */
export async function seedInsights() {
    console.log('🧠 Seeding insight definitions...');

    // Clear existing insights
    await prisma.insightDefinition.deleteMany({});

    const insights = [
        // ========== URGENT (80-100) ==========
        {
            id: 'payment_late',
            category: 'urgent',
            priority: 95,
            trigger: 'payment_late',
            trigger_params: { max_days: 7 },
            message_template: '{{name}} was due {{daysText}} ago (€{{amount}})',
            icon: null,
            action_label: 'View recurring',
            action_href: '/recurring',
            contexts: ['chat', 'card']
        },
        {
            id: 'payment_due_today',
            category: 'urgent',
            priority: 90,
            trigger: 'payment_due_soon',
            trigger_params: { days: 0 },
            message_template: '€{{amount}} {{name}} payment is due today!',
            icon: null,
            action_label: 'View upcoming',
            action_href: '/recurring',
            contexts: ['chat', 'card']
        },
        {
            id: 'payment_due_soon',
            category: 'urgent',
            priority: 85,
            trigger: 'payment_due_soon',
            trigger_params: { days: 3 },
            message_template: 'Heads up! €{{amount}} {{name}} payment {{daysText}}',
            icon: null,
            action_label: 'View upcoming',
            action_href: '/recurring',
            contexts: ['chat', 'card']
        },

        // ========== ACTION (60-79) ==========
        {
            id: 'no_transactions',
            category: 'action',
            priority: 75,
            trigger: 'no_transactions',
            trigger_params: null,
            message_template: 'Your wallet looks lonely! Upload some transactions to get started.',
            icon: null,
            action_label: 'Upload now',
            action_href: '/upload-transactions',
            contexts: ['chat', 'card']
        },
        {
            id: 'uncategorized_high',
            category: 'action',
            priority: 70,
            trigger: 'uncategorized_high',
            trigger_params: { threshold_percent: 20 },
            message_template: '{{percent}}% of transactions need categorizing.',
            icon: null,
            action_label: 'Categorize now',
            action_href: '/categorize-all',
            contexts: ['chat', 'card']
        },

        // ========== INSIGHT (40-59) ==========
        // Same period comparison (first X days of this month vs last month) - only extreme changes
        {
            id: 'same_period_spending_up',
            category: 'insight',
            priority: 55,
            trigger: 'same_period_change',
            trigger_params: { direction: 'up', threshold_percent: 40, min_days: 5 },
            message_template: 'Heads up: spending the first {{days}} days of this month is {{percent}}% higher than the same period last month.',
            icon: null,
            action_label: 'View spending',
            action_href: '/transactions',
            contexts: ['chat', 'card']
        },
        {
            id: 'same_period_spending_down',
            category: 'insight',
            priority: 50,
            trigger: 'same_period_change',
            trigger_params: { direction: 'down', threshold_percent: 40, min_days: 5 },
            message_template: 'Nice! In the first {{days}} days of this month, you spent {{percent}}% less than last month.',
            icon: null,
            contexts: ['chat', 'card']
        },
        // Complete month comparison (last month vs 2 months ago) - fair comparison
        {
            id: 'complete_month_spending_up',
            category: 'insight',
            priority: 48,
            trigger: 'complete_month_change',
            trigger_params: { direction: 'up', threshold_percent: 20 },
            message_template: '{{lastMonth}} spending was {{percent}}% higher than {{twoMonthsAgo}}.',
            icon: null,
            action_label: 'View details',
            action_href: '/transactions',
            contexts: ['chat', 'card']
        },
        {
            id: 'complete_month_spending_down',
            category: 'insight',
            priority: 45,
            trigger: 'complete_month_change',
            trigger_params: { direction: 'down', threshold_percent: 20 },
            message_template: 'Nice! {{lastMonth}} spending was {{percent}}% lower than {{twoMonthsAgo}}.',
            icon: null,
            contexts: ['chat', 'card']
        },
        // Top spending category
        {
            id: 'top_category',
            category: 'insight',
            priority: 42,
            trigger: 'top_category',
            trigger_params: { min_percentage: 30 },
            message_template: '{{category}} is your biggest spending category at {{percent}}% of this month.',
            icon: null,
            action_label: 'View category',
            action_href: '/transactions',
            contexts: ['chat', 'card']
        },

        // ========== CELEBRATION (20-39) ==========
        {
            id: 'fresh_import',
            category: 'action',
            priority: 75,
            trigger: 'fresh_import',
            trigger_params: null,
            message_template: "Nice, you've imported some transactions! Ready to categorize them?",
            icon: null,
            action_label: 'Categorize now',
            action_href: '/categorize-all',
            contexts: ['chat', 'card']
        },
        {
            id: 'categorization_complete',
            category: 'celebration',
            priority: 35,
            trigger: 'categorization_complete',
            trigger_params: null,
            message_template: "All transactions categorized! You're on fire!",
            icon: null,
            contexts: ['chat', 'card']
        },
        {
            id: 'savings_positive',
            category: 'celebration',
            priority: 30,
            trigger: 'savings_positive',
            trigger_params: null,
            message_template: 'You saved €{{amount}} this month!',
            icon: null,
            contexts: ['chat', 'card']
        },

        // ========== TIP (1-19) ==========
        {
            id: 'tip_batch_categorize',
            category: 'tip',
            priority: 15,
            trigger: 'always',
            trigger_params: null,
            message_template: 'Pro tip: Batch-categorize by merchant!',
            icon: null,
            contexts: ['chat']
        },
        {
            id: 'tip_recurring',
            category: 'tip',
            priority: 14,
            trigger: 'always',
            trigger_params: null,
            message_template: "Check 'Recurring' for hidden subscriptions.",
            icon: null,
            action_label: 'View recurring',
            action_href: '/recurring',
            contexts: ['chat']
        },
        {
            id: 'tip_looking_good',
            category: 'tip',
            priority: 13,
            trigger: 'always',
            trigger_params: null,
            message_template: 'Your financial journey is looking great!',
            icon: null,
            contexts: ['chat']
        },
        {
            id: 'tip_daily',
            category: 'tip',
            priority: 12,
            trigger: 'always',
            trigger_params: null,
            message_template: 'Another day, another dollar tracked!',
            icon: null,
            contexts: ['chat']
        }
    ];

    for (const insight of insights) {
        await prisma.insightDefinition.create({
            data: {
                id: insight.id,
                category: insight.category,
                priority: insight.priority,
                trigger: insight.trigger,
                trigger_params: insight.trigger_params,
                message_template: insight.message_template,
                icon: insight.icon,
                action_label: insight.action_label ?? null,
                action_href: insight.action_href ?? null,
                contexts: insight.contexts,
                is_active: true
            }
        });
    }

    console.log(`✅ Seeded ${insights.length} insight definitions`);
}

// CLI entry point
async function main() {
    await seedInsights();
}

// Check if running directly
const isMainModule =
    process.argv[1]?.endsWith('seedInsights.ts') ||
    process.argv[1]?.includes('seedInsights');

if (isMainModule) {
    main()
        .catch((e) => {
            console.error('❌ Error seeding insights:', e);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
