import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
    const insights = [
        {
            id: 'duplicate_check',
            name: 'Double Trouble?',
            description: 'Detects duplicate transactions',
            category: 'urgent',
            priority: 90,
            trigger: 'duplicate_transaction',
            message_template: 'Paid €{{amount}} to {{merchant}} twice. Mistake?',
            icon: 'AlertTriangle',
            contexts: ['transaction_row'],
            is_active: true,
            cooldown_hours: 0
        },
        {
            id: 'new_merchant_found',
            name: 'Fresh Find',
            description: 'First time paying this merchant',
            category: 'insight',
            priority: 70,
            trigger: 'new_merchant',
            message_template: 'First time at {{merchant}}. Thoughts?',
            icon: 'Star',
            contexts: ['transaction_row'],
            is_active: true,
            cooldown_hours: 0
        },
        {
            id: 'price_hike_alert',
            name: 'Inflation Alert',
            description: 'Recurring payment increased',
            category: 'action',
            priority: 80,
            trigger: 'price_hike',
            message_template: '{{merchant}} just jumped by {{percent}}%. Rude. 📈',
            icon: 'TrendingUp',
            contexts: ['transaction_row'],
            is_active: true,
            cooldown_hours: 0
        },
        {
            id: 'refund_celebration',
            name: 'Money Back!',
            description: 'Credit matching a prior debit',
            category: 'celebration',
            priority: 60,
            trigger: 'refund_detected',
            message_template: 'Refund from {{date}} just landed. 💸',
            icon: 'ArrowDownLeft',
            contexts: ['transaction_row'],
            is_active: true,
            cooldown_hours: 0
        },
        {
            id: 'salary_incoming',
            name: 'Ka-ching!',
            description: 'Salary detection',
            category: 'celebration',
            priority: 95,
            trigger: 'salary_detected',
            message_template: 'Payday has arrived! +€{{amount}} 💰',
            icon: 'Sparkles',
            contexts: ['transaction_row'],
            is_active: true,
            cooldown_hours: 0
        },
        {
            id: 'big_spender',
            name: 'Whale Alert',
            description: 'Large expense alert',
            category: 'roast',
            priority: 50,
            trigger: 'large_expense',
            message_template: 'Dropped €{{amount}} at {{merchant}}. 🐳',
            icon: 'TrendingUp',
            contexts: ['transaction_row'],
            is_active: true,
            cooldown_hours: 0,
            trigger_params: { threshold: 500 }
        },
        {
            id: 'weekend_vibes',
            name: 'Weekend Vibes',
            description: 'High spending on Fri/Sat nights',
            category: 'roast',
            priority: 40,
            trigger: 'weekend_warrior',
            message_template: 'Living it up on {{day}} at {{merchant}}! 🎉',
            icon: 'PartyPopper',
            contexts: ['transaction_row'],
            is_active: true,
            cooldown_hours: 0
        },
        {
            id: 'late_night_snack',
            name: 'Night Owl',
            description: 'Spending between 11PM and 5AM',
            category: 'roast',
            priority: 30,
            trigger: 'late_night',
            message_template: '{{time}} snack at {{merchant}}? We won\'t tell. 🦉',
            icon: 'Moon',
            contexts: ['transaction_row'],
            is_active: true,
            cooldown_hours: 0
        },
        {
            id: 'round_and_round',
            name: 'Perfectly Balanced',
            description: 'Round number amounts',
            category: 'celebration',
            priority: 20,
            trigger: 'round_number',
            message_template: '€{{amount}} exactly. It\'s the little things. 👌',
            icon: 'CheckCircle',
            contexts: ['transaction_row'],
            is_active: true,
            cooldown_hours: 0
        },
        {
            id: 'sub_spotted',
            name: 'Sub Spotted?',
            description: 'Potential subscription detected',
            category: 'insight',
            priority: 65,
            trigger: 'potential_subscription',
            message_template: 'Monthly €{{amount}} at {{merchant}}. Subscription?',
            icon: 'Calendar',
            action_label: 'Track Subscription',
            action_href: '/transactions?search={{merchant}}',
            contexts: ['transaction_row'],
            is_active: true,
            cooldown_hours: 0
        }
    ];

    for (const insight of insights) {
        await db.insightDefinition.upsert({
            where: { id: insight.id },
            update: insight,
            create: insight
        });
    }

    return json({ success: true, count: insights.length });
};
