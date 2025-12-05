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
            message_template: '⚠️ {{name}} was due {{daysText}} ago (€{{amount}})',
            icon: '⚠️',
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
            message_template: '💸 €{{amount}} {{name}} payment is due today!',
            icon: '💸',
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
            message_template: 'Heads up! €{{amount}} {{name}} payment {{daysText}} 💸',
            icon: '💸',
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
            message_template: 'Your wallet looks lonely! Upload some transactions to get started 📤',
            icon: '📤',
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
            message_template: '{{percent}}% of transactions need categorizing 🏷️',
            icon: '🏷️',
            action_label: 'Categorize now',
            action_href: '/categorize-all',
            contexts: ['chat', 'card']
        },

        // ========== INSIGHT (40-59) ==========
        {
            id: 'spending_up',
            category: 'insight',
            priority: 55,
            trigger: 'spending_change',
            trigger_params: { direction: 'up', threshold_percent: 15 },
            message_template: 'Spending is up {{percent}}% compared to last month 📈',
            icon: '📈',
            action_label: 'View details',
            action_href: '/transactions',
            contexts: ['chat', 'card']
        },
        {
            id: 'spending_down',
            category: 'insight',
            priority: 50,
            trigger: 'spending_change',
            trigger_params: { direction: 'down', threshold_percent: 15 },
            message_template: 'Nice! You spent {{percent}}% less than last month 📉',
            icon: '📉',
            contexts: ['chat', 'card']
        },

        // ========== CELEBRATION (20-39) ==========
        {
            id: 'upload_complete',
            category: 'celebration',
            priority: 39,
            trigger: 'has_transactions',
            trigger_params: null,
            message_template: "Nice, you've uploaded some transactions! 🚀",
            icon: '🚀',
            contexts: ['chat', 'card']
        },
        {
            id: 'categorization_complete',
            category: 'celebration',
            priority: 35,
            trigger: 'categorization_complete',
            trigger_params: null,
            message_template: "All transactions categorized! You're on 🔥",
            icon: '🔥',
            contexts: ['chat', 'card']
        },
        {
            id: 'savings_positive',
            category: 'celebration',
            priority: 30,
            trigger: 'savings_positive',
            trigger_params: null,
            message_template: 'You saved €{{amount}} this month! 💪',
            icon: '💪',
            contexts: ['chat', 'card']
        },

        // ========== TIP (1-19) ==========
        {
            id: 'tip_batch_categorize',
            category: 'tip',
            priority: 15,
            trigger: 'always',
            trigger_params: null,
            message_template: 'Pro tip: Batch-categorize by merchant! 🚀',
            icon: '🚀',
            contexts: ['chat']
        },
        {
            id: 'tip_recurring',
            category: 'tip',
            priority: 14,
            trigger: 'always',
            trigger_params: null,
            message_template: "Check 'Recurring' for hidden subscriptions 🔍",
            icon: '🔍',
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
            message_template: 'Your financial journey is looking great! ✨',
            icon: '✨',
            contexts: ['chat']
        },
        {
            id: 'tip_daily',
            category: 'tip',
            priority: 12,
            trigger: 'always',
            trigger_params: null,
            message_template: 'Another day, another dollar tracked! 💰',
            icon: '💰',
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
