import { db } from '$lib/server/db';
import { KNOWN_SUBSCRIPTION_PROVIDERS } from './subscriptionProviders';
import type { transactions } from '@prisma/client';

export interface RecurringCandidate {
    name: string;
    amount: number;
    interval: 'monthly' | 'weekly' | 'quarterly' | 'yearly' | '4-weekly' | 'irregular';
    confidence: number; // 0-1
    type: 'subscription' | 'salary' | 'bill' | 'other';
    source: 'known_list' | 'salary_rule' | 'interval_rule' | 'ai';
    transactions: transactions[];
}

export class RecurringDetectionService {
    async detectRecurringTransactions(userId: number): Promise<RecurringCandidate[]> {
        // Fetch last 6 months of transactions
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const transactions = await db.transactions.findMany({
            where: {
                user_id: userId,
                date: {
                    gte: sixMonthsAgo
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        const candidates: RecurringCandidate[] = [];

        // 1. Detect by Known List
        const knownCandidates = this.detectByKnownList(transactions);
        candidates.push(...knownCandidates);

        // 2. Detect Salary (Standard & Other)
        // TODO: Implement salary detection

        // 3. Detect by Interval
        // TODO: Implement interval detection

        // Deduplicate candidates (if multiple methods find the same one)
        // For now, just return what we have
        return candidates;
    }

    private detectByKnownList(transactions: transactions[]): RecurringCandidate[] {
        const candidates: RecurringCandidate[] = [];
        const groupedByProvider = new Map<string, transactions[]>();

        console.log(`[RecurringDetection] Scanning ${transactions.length} transactions`);

        // Group transactions by known providers
        for (const tx of transactions) {
            const description = (tx.description || '').toLowerCase();
            const merchantName = (tx.merchantName || '').toLowerCase();
            const cleanedMerchant = (tx.cleaned_merchant_name || '').toLowerCase();

            for (const provider of KNOWN_SUBSCRIPTION_PROVIDERS) {
                const matches = provider.keywords.some(
                    (keyword) => {
                        const keywordLower = keyword.toLowerCase();
                        return description.includes(keywordLower) ||
                            merchantName.includes(keywordLower) ||
                            cleanedMerchant.includes(keywordLower);
                    }
                );

                if (matches) {
                    const existing = groupedByProvider.get(provider.name) || [];
                    existing.push(tx);
                    groupedByProvider.set(provider.name, existing);
                    console.log(`[RecurringDetection] Matched "${provider.name}" for transaction: ${merchantName || description}`);
                    break; // Found a match, stop checking other providers
                }
            }
        }

        console.log(`[RecurringDetection] Found ${groupedByProvider.size} unique providers`);

        // Analyze groups
        for (const [providerName, txs] of groupedByProvider) {
            // Need at least 2 transactions to consider it recurring? 
            // Or even 1 if it's a very strong match like "Spotify"?
            // Let's say 1 is enough for "Potential" but confidence depends on count

            if (txs.length === 0) continue;

            // Calculate average amount
            const totalAmount = txs.reduce((sum, t) => sum + Number(t.amount), 0);
            const avgAmount = totalAmount / txs.length;

            // Determine interval (rough estimation)
            let interval: RecurringCandidate['interval'] = 'irregular';
            if (txs.length >= 2) {
                // Sort by date
                const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());
                const daysDiffs = [];
                for (let i = 1; i < sorted.length; i++) {
                    const diffTime = Math.abs(sorted[i].date.getTime() - sorted[i - 1].date.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    daysDiffs.push(diffDays);
                }

                const avgDays = daysDiffs.reduce((a, b) => a + b, 0) / daysDiffs.length;

                if (avgDays >= 25 && avgDays <= 35) interval = 'monthly';
                else if (avgDays >= 6 && avgDays <= 8) interval = 'weekly';
                else if (avgDays >= 85 && avgDays <= 95) interval = 'quarterly';
                else if (avgDays >= 360 && avgDays <= 370) interval = 'yearly';
                else if (avgDays >= 26 && avgDays <= 30) interval = '4-weekly';
            } else {
                // Default to monthly for common subs if only 1 found
                interval = 'monthly';
            }

            candidates.push({
                name: providerName,
                amount: avgAmount,
                interval,
                confidence: txs.length >= 3 ? 0.9 : txs.length === 2 ? 0.7 : 0.5,
                type: 'subscription',
                source: 'known_list',
                transactions: txs
            });
        }

        return candidates;
    }
}
