import { PrismaClient, Prisma } from '@prisma/client';

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
            contexts: ['chat', 'card'],
            cooldown_hours: 24
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
            contexts: ['chat', 'card'],
            cooldown_hours: 24
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
            contexts: ['chat', 'card'],
            cooldown_hours: 24
        },

        // ========== ACTION (60-79) ==========
        {
            id: 'no_transactions',
            category: 'action',
            priority: 75,
            trigger: 'no_transactions',
            trigger_params: null,
            message_template: 'No transactions yet — upload your first batch to get started!',
            icon: null,
            action_label: 'Upload now',
            action_href: '/upload-transactions',
            contexts: ['chat', 'card'],
            cooldown_hours: 1
        },
        {
            id: 'uncategorized_high',
            category: 'action',
            priority: 70,
            trigger: 'uncategorized_high',
            trigger_params: { threshold_percent: 20 },
            message_template: "{{percent}}% of your transactions still need a category — let's sort them!",
            icon: null,
            action_label: 'Categorize now',
            action_href: '/categorize-all',
            contexts: ['chat', 'card'],
            cooldown_hours: 24
        },
        {
            id: 'detect_subscriptions',
            category: 'action',
            priority: 65,
            trigger: 'review_recurring',
            trigger_params: { min_categorized_percent: 50 },
            message_template: "Ready to hunt for sneaky subscriptions? Let's find them! 🔍",
            icon: null,
            action_label: 'Detect subscriptions',
            action_href: '/recurring?autostart=true',
            contexts: ['chat', 'card'],
            cooldown_hours: 24
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
            contexts: ['chat', 'card'],
            cooldown_hours: 72 // 3 days
        },
        {
            id: 'same_period_spending_down',
            category: 'insight',
            priority: 50,
            trigger: 'same_period_change',
            trigger_params: { direction: 'down', threshold_percent: 40, min_days: 5 },
            message_template: 'Nice! In the first {{days}} days of this month, you spent {{percent}}% less than last month.',
            icon: null,
            contexts: ['chat', 'card'],
            cooldown_hours: 72 // 3 days
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
            contexts: ['chat', 'card'],
            cooldown_hours: 168 // 1 week
        },
        {
            id: 'complete_month_spending_down',
            category: 'insight',
            priority: 45,
            trigger: 'complete_month_change',
            trigger_params: { direction: 'down', threshold_percent: 20 },
            message_template: 'Nice! {{lastMonth}} spending was {{percent}}% lower than {{twoMonthsAgo}}.',
            icon: null,
            contexts: ['chat', 'card'],
            cooldown_hours: 168 // 1 week
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
            action_href: '/transactions?category={{categoryId}}',
            contexts: ['chat', 'card'],
            cooldown_hours: 72 // 3 days
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
            contexts: ['chat', 'card'],
            cooldown_hours: 1
        },
        {
            id: 'first_upload_success',
            category: 'celebration',
            priority: 38,
            trigger: 'fresh_import', // Fires when transactions exist but are uncategorized
            trigger_params: null,
            message_template: "Your wallet just got its first residents! Time to give them a home.",
            icon: null,
            contexts: ['chat', 'card'],
            cooldown_hours: 168, // 1 week - only celebrate first upload once
            related_insight_id: 'no_transactions'
        },
        {
            id: 'categorization_good_progress',
            category: 'celebration',
            priority: 36, // Higher than complete so it fires first when in range
            trigger: 'categorization_good_progress',
            trigger_params: { min_percent: 50, max_percent: 99 },
            message_template: "Look at you go — {{percent}}% sorted! 🎉 A few stragglers left, want to wrangle them?",
            icon: null,
            action_label: 'Finish the job',
            action_href: '/categorize',
            contexts: ['chat', 'card'],
            cooldown_hours: 24,
            related_insight_id: 'fresh_import'
        },
        {
            id: 'categorization_complete',
            category: 'celebration',
            priority: 35,
            trigger: 'categorization_complete',
            trigger_params: null,
            message_template: "All transactions categorized! You're on fire! 🔥",
            icon: null,
            contexts: ['chat', 'card'],
            cooldown_hours: 24,
            related_insight_id: 'fresh_import'
        },
        {
            id: 'batch_categorize_success',
            category: 'celebration',
            priority: 33,
            trigger: 'categorization_complete',
            trigger_params: null,
            message_template: "That was a lot of transactions — and you crushed it! 💪",
            icon: null,
            contexts: ['chat', 'card'],
            cooldown_hours: 48,
            related_insight_id: 'uncategorized_high'
        },
        {
            id: 'savings_positive',
            category: 'celebration',
            priority: 30,
            trigger: 'savings_positive',
            trigger_params: null,
            message_template: 'You saved €{{amount}} this month!',
            icon: null,
            contexts: ['chat', 'card'],
            cooldown_hours: 168 // 1 week
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
            action_label: 'Batch categorize',
            action_href: '/categorize',
            contexts: ['chat'],
            cooldown_hours: 168,
            non_exclusive: true
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
            contexts: ['chat'],
            cooldown_hours: 168,
            non_exclusive: true
        },
        {
            id: 'tip_looking_good',
            category: 'tip',
            priority: 13,
            trigger: 'always',
            trigger_params: null,
            message_template: "You're nailing it. Keep going! ✨",
            icon: null,
            contexts: ['chat'],
            cooldown_hours: 48,
            non_exclusive: true
        },
        {
            id: 'tip_daily',
            category: 'tip',
            priority: 12,
            trigger: 'always',
            trigger_params: null,
            message_template: "Still here? That's dedication. Gold star. ⭐",
            icon: null,
            contexts: ['chat'],
            cooldown_hours: 48,
            non_exclusive: true
        },

        // ========== STREAKS (non_exclusive) ==========
        {
            id: 'streak_5_days',
            category: 'celebration',
            priority: 25,
            trigger: 'user_streak',
            trigger_params: { min_days: 5 },
            message_template: "5 days in a row! You're building a habit 🔥",
            icon: null,
            contexts: ['chat'],
            cooldown_hours: 168, // 1 week
            non_exclusive: true
        },
        {
            id: 'streak_7_days',
            category: 'celebration',
            priority: 26,
            trigger: 'user_streak',
            trigger_params: { min_days: 7 },
            message_template: "A full week of tracking! Legend status 🏆",
            icon: null,
            contexts: ['chat'],
            cooldown_hours: 168,
            non_exclusive: true
        },
        {
            id: 'streak_30_days',
            category: 'celebration',
            priority: 27,
            trigger: 'user_streak',
            trigger_params: { min_days: 30 },
            message_template: "30-day streak! You're officially a finance nerd 🤓",
            icon: null,
            contexts: ['chat'],
            cooldown_hours: 720, // 30 days
            non_exclusive: true
        },

        // ========== INACTIVITY ==========
        {
            id: 'nudge_inactive_7d',
            category: 'action',
            priority: 72,
            trigger: 'user_inactive',
            trigger_params: { days: 7 },
            message_template: "We miss you! Your transactions are piling up 📬",
            icon: null,
            action_label: 'Upload new',
            action_href: '/upload-transactions',
            contexts: ['chat', 'card'],
            cooldown_hours: 168
        },

        // ========== COMPARATIVE ==========
        {
            id: 'spending_high_early',
            category: 'insight',
            priority: 52,
            trigger: 'spending_high_early',
            trigger_params: { threshold_percent: 80 },
            message_template: "Heads up — you've already spent {{percent}}% of last month's total",
            icon: null,
            action_label: 'View spending',
            action_href: '/transactions',
            contexts: ['chat', 'card'],
            cooldown_hours: 72
        },

        // ========== CHRISTMAS ==========
        {
            id: 'christmas_cheer',
            category: 'tip',
            priority: 18,
            trigger: 'christmas_season',
            trigger_params: null,
            message_template: "'Tis the season! Set a holiday budget? 🎄",
            icon: null,
            action_label: 'View spending',
            action_href: '/transactions',
            contexts: ['chat', 'card'],
            cooldown_hours: 168,
            non_exclusive: true
        },
        {
            id: 'christmas_gift_tip',
            category: 'tip',
            priority: 17,
            trigger: 'christmas_season',
            trigger_params: null,
            message_template: "Pro tip: Track gifts in their own category 🎁",
            icon: null,
            contexts: ['chat'],
            cooldown_hours: 168,
            non_exclusive: true
        }
    ];

    for (const insight of insights) {
        try {
            console.log(`  Creating: ${insight.id}...`);
            await prisma.insightDefinition.create({
                data: {
                    id: insight.id,
                    category: insight.category,
                    priority: insight.priority,
                    trigger: insight.trigger,
                    trigger_params: insight.trigger_params ? (insight.trigger_params as any) : Prisma.JsonNull,
                    message_template: insight.message_template,
                    icon: insight.icon,
                    action_label: (insight as any).action_label ?? null,
                    action_href: (insight as any).action_href ?? null,
                    contexts: insight.contexts,
                    cooldown_hours: insight.cooldown_hours,
                    related_insight_id: (insight as any).related_insight_id ?? null,
                    non_exclusive: (insight as any).non_exclusive ?? false,
                    is_active: true
                }
            });
            console.log(`  ✅ Created: ${insight.id}`);
        } catch (error) {
            console.error(`  ❌ Failed to create ${insight.id}:`, error);
            throw error;
        }
    }
    console.log(`✅ Seeded ${insights.length} insights successfully!`);
}

async function main() {
    await seedInsights();
}

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
