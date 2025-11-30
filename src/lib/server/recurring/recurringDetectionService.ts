import { db } from '$lib/server/db';
import type { transactions, merchants } from '@prisma/client';

const SALARY_MIN_AMOUNT = 1000;
const SALARY_KEYWORDS = [
    'salary',
    'salaris',
    'loon',
    'loonbetaling',
    'loonstrook',
    'loonverwerking',
    'betaling salaris',
    'salarisbetaling',
    'payroll',
    'inkomen',
    'income',
    'werkgever',
    'wage',
    'paycheck',
    'stipend'
];

export interface RecurringCandidate {
    name: string;
    amount: number;
    averageAmount?: number;
    interval: 'monthly' | 'weekly' | 'quarterly' | 'yearly' | '4-weekly' | 'irregular';
    confidence: number; // 0-1
    type: 'subscription' | 'salary' | 'bill' | 'other';
    source: 'known_list' | 'salary_rule' | 'interval_rule' | 'ai';
    transactions: transactions[];
    merchantId?: number;
}

export class RecurringDetectionService {
    async detectRecurringTransactions(userId: number): Promise<RecurringCandidate[]> {
        // Fetch all transactions
        const transactions = await db.transactions.findMany({
            where: {
                user_id: userId
            },
            orderBy: {
                date: 'desc'
            }
        });

        const candidates: RecurringCandidate[] = [];

        // 1. Detect by Known List (from DB)
        const knownCandidates = await this.detectByKnownList(transactions);
        candidates.push(...knownCandidates);

        // 2. Detect Salary (Standard & Other)
        const salaryCandidates = this.detectSalary(transactions);
        candidates.push(...salaryCandidates);

        // 3. Detect by Interval
        // TODO: Implement interval detection

        // Deduplicate candidates (if multiple methods find the same one)
        // For now, just return what we have
        return candidates;
    }

    private async detectByKnownList(transactions: transactions[]): Promise<RecurringCandidate[]> {
        const candidates: RecurringCandidate[] = [];
        const groupedByProvider = new Map<string, { txs: transactions[], merchantId: number }>();

        console.log(`[RecurringDetection] Scanning ${transactions.length} transactions`);

        // Fetch known recurring merchants from DB
        const knownMerchants = await db.merchants.findMany({
            where: {
                is_potential_recurring: true,
                is_active: true
            }
        });

        console.log(`[RecurringDetection] Loaded ${knownMerchants.length} known recurring merchants from DB`);

        // Group transactions by known providers
        for (const tx of transactions) {
            const description = (tx.description || '').toLowerCase();
            const merchantName = (tx.merchantName || '').toLowerCase();
            const cleanedMerchant = (tx.cleaned_merchant_name || '').toLowerCase();

            for (const merchant of knownMerchants) {
                // Check if transaction is already linked to this merchant
                if (tx.merchant_id === merchant.id) {
                    const existing = groupedByProvider.get(merchant.name) || { txs: [], merchantId: merchant.id };
                    existing.txs.push(tx);
                    groupedByProvider.set(merchant.name, existing);
                    break;
                }

                // Otherwise check keywords
                const matches = merchant.keywords.some(
                    (keyword) => {
                        const keywordLower = keyword.toLowerCase();
                        return description.includes(keywordLower) ||
                            merchantName.includes(keywordLower) ||
                            cleanedMerchant.includes(keywordLower);
                    }
                );

                if (matches) {
                    const existing = groupedByProvider.get(merchant.name) || { txs: [], merchantId: merchant.id };
                    existing.txs.push(tx);
                    groupedByProvider.set(merchant.name, existing);
                    console.log(`[RecurringDetection] Matched "${merchant.name}" for transaction: ${merchantName || description}`);
                    break; // Found a match, stop checking other providers
                }
            }
        }

        console.log(`[RecurringDetection] Found ${groupedByProvider.size} unique providers`);

        // Analyze groups
        for (const [providerName, data] of groupedByProvider) {
            const { txs, merchantId } = data;

            if (txs.length === 0) continue;

            const avgAmount = this.calculateAverageAmount(txs);
            const interval = this.estimateIntervalFromTransactions(txs);

            candidates.push({
                name: providerName,
                amount: Number(txs[0].amount), // Latest amount (txs are sorted desc by date from query)
                averageAmount: avgAmount,
                interval,
                confidence: txs.length >= 3 ? 0.9 : txs.length === 2 ? 0.7 : 0.5,
                type: 'subscription',
                source: 'known_list',
                transactions: txs,
                merchantId
            });
        }

        return candidates;
    }

    private detectSalary(transactions: transactions[]): RecurringCandidate[] {
        const candidates: RecurringCandidate[] = [];
        const grouped = new Map<string, transactions[]>();

        for (const tx of transactions) {
            if (tx.is_debit) continue;
            const amount = Number(tx.amount);
            if (amount < SALARY_MIN_AMOUNT) continue;
            if (!this.containsSalaryKeyword(tx)) continue;

            const key = this.getSalaryGroupKey(tx);
            const list = grouped.get(key) ?? [];
            list.push(tx);
            grouped.set(key, list);
        }

        for (const txs of grouped.values()) {
            if (txs.length < 2) continue;

            const sorted = [...txs].sort((a, b) => b.date.getTime() - a.date.getTime());
            const interval = this.estimateIntervalFromTransactions(sorted);
            const averageAmount = this.calculateAverageAmount(sorted);
            const relativeVariance = this.calculateRelativeVariance(sorted);

            let confidence = sorted.length >= 3 ? 0.75 : 0.6;
            if (interval === 'monthly' || interval === '4-weekly') confidence += 0.1;
            if (relativeVariance < 0.05) confidence += 0.15;
            else if (relativeVariance < 0.12) confidence += 0.08;
            confidence = Math.min(0.95, confidence);

            const merchantId = sorted.find((tx) => !!tx.merchant_id)?.merchant_id;

            candidates.push({
                name: this.pickSalaryCandidateName(sorted),
                amount: Number(sorted[0].amount),
                averageAmount,
                interval,
                confidence,
                type: 'salary',
                source: 'salary_rule',
                transactions: sorted,
                merchantId
            });
        }

        return candidates;
    }

    private containsSalaryKeyword(tx: transactions): boolean {
        const fields = [
            tx.description,
            tx.cleaned_merchant_name,
            tx.merchantName,
            tx.normalized_description
        ];
        for (const raw of fields) {
            if (!raw) continue;
            const lower = raw.toLowerCase();
            if (SALARY_KEYWORDS.some((keyword) => lower.includes(keyword))) {
                return true;
            }
        }
        return false;
    }

    private getSalaryGroupKey(tx: transactions): string {
        if (tx.merchant_id) return `merchant-${tx.merchant_id}`;
        if (tx.counterparty_iban) return `iban-${tx.counterparty_iban.toLowerCase()}`;
        if (tx.cleaned_merchant_name) return `cleaned-${tx.cleaned_merchant_name.toLowerCase()}`;
        if (tx.merchantName) return `merchant-${tx.merchantName.toLowerCase()}`;
        return `description-${(tx.description || 'salary').toLowerCase()}`;
    }

    private pickSalaryCandidateName(txs: transactions[]): string {
        const first = txs[0];
        return (
            first.cleaned_merchant_name ||
            first.merchantName ||
            first.description ||
            first.counterparty_iban ||
            'Salary'
        );
    }

    private estimateIntervalFromTransactions(txs: transactions[]): RecurringCandidate['interval'] {
        if (txs.length < 2) {
            return 'monthly';
        }

        const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());
        const daysDiffs: number[] = [];
        for (let i = 1; i < sorted.length; i++) {
            const diffTime = Math.abs(sorted[i].date.getTime() - sorted[i - 1].date.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            daysDiffs.push(diffDays);
        }

        const avgDays = daysDiffs.reduce((a, b) => a + b, 0) / daysDiffs.length;

        if (avgDays >= 25 && avgDays <= 35) return 'monthly';
        if (avgDays >= 6 && avgDays <= 8) return 'weekly';
        if (avgDays >= 85 && avgDays <= 95) return 'quarterly';
        if (avgDays >= 360 && avgDays <= 370) return 'yearly';
        if (avgDays >= 26 && avgDays <= 30) return '4-weekly';

        return 'irregular';
    }

    private calculateAverageAmount(txs: transactions[]): number {
        if (txs.length === 0) return 0;
        const totalAmount = txs.reduce((sum, t) => sum + Number(t.amount), 0);
        return totalAmount / txs.length;
    }

    private calculateRelativeVariance(txs: transactions[]): number {
        if (txs.length === 0) return 1;
        const amounts = txs.map((t) => Math.abs(Number(t.amount)));
        const mean = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
        if (mean === 0) return 1;
        const variance = amounts.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / amounts.length;
        return Math.sqrt(variance) / mean;
    }
}
