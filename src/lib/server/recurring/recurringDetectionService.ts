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

const TAX_KEYWORDS = [
    'belastingdienst',
    'toeslag',
    'voorlopige aanslag',
    'teruggave',
    'fiscus',
    'belasting'
];

export interface RecurringCandidate {
    name: string;
    amount: number;
    averageAmount?: number;
    interval: 'monthly' | 'weekly' | 'quarterly' | 'yearly' | '4-weekly' | 'irregular';
    confidence: number; // 0-1
    type: 'subscription' | 'salary' | 'bill' | 'tax' | 'transfer' | 'other';
    source: 'known_list' | 'salary_rule' | 'interval_rule' | 'ai';
    transactions: transactions[];
    nextPaymentDate?: Date;
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

        // 2. Detect Income (Salary, Tax, Transfers)
        const incomeCandidates = this.detectIncome(transactions);
        candidates.push(...incomeCandidates);

        // 3. Detect by Interval
        // 3. Detect by Interval
        const intervalCandidates = this.detectByInterval(transactions);
        candidates.push(...intervalCandidates);

        // Deduplicate candidates (if multiple methods find the same one)
        // We prioritize Known List > Income Rule > Interval Rule
        const uniqueCandidates = new Map<string, RecurringCandidate>();

        for (const candidate of candidates) {
            // Create a unique key for deduplication
            // We use a combination of name and amount (rounded) to identify duplicates
            const key = `${candidate.name.toLowerCase()}-${Math.round(candidate.amount)}`;

            if (!uniqueCandidates.has(key)) {
                uniqueCandidates.set(key, candidate);
            } else {
                // If we already have this candidate, check if the new one is "better"
                // For now, we just keep the first one (which respects our priority order)
                const existing = uniqueCandidates.get(key)!;

                // If the new one has higher confidence, take it
                if (candidate.confidence > existing.confidence) {
                    uniqueCandidates.set(key, candidate);
                }
            }
        }

        return Array.from(uniqueCandidates.values());
    }

    private detectByInterval(transactions: transactions[]): RecurringCandidate[] {
        const candidates: RecurringCandidate[] = [];
        const grouped = new Map<string, transactions[]>();

        // 1. Group transactions
        for (const tx of transactions) {
            // We only care about expenses (debits) for this check
            if (!tx.is_debit) continue;

            const key = this.getGroupKey(tx);
            const list = grouped.get(key) ?? [];
            list.push(tx);
            grouped.set(key, list);
        }

        // 2. Analyze groups
        for (const [key, txs] of grouped) {
            // Need at least 3 transactions to establish a pattern
            if (txs.length < 3) continue;

            // Cluster by amount to handle cases where a merchant has different charge types
            const amountClusters = this.clusterByAmount(txs);

            for (const cluster of amountClusters) {
                if (cluster.length < 3) continue;

                const sorted = [...cluster].sort((a, b) => b.date.getTime() - a.date.getTime());
                const interval = this.estimateIntervalFromTransactions(sorted);
                const averageAmount = this.calculateAverageAmount(sorted);
                const relativeVariance = this.calculateRelativeVariance(sorted);

                // Skip irregular intervals
                if (interval === 'irregular') continue;

                // Check recency: Last transaction should be within 2 intervals
                // (e.g. if monthly, last tx should be < 60 days ago)
                const lastDate = sorted[0].date;
                const daysSinceLast = (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
                let maxDaysGap = 35 * 2; // Default for monthly

                if (interval === 'weekly') maxDaysGap = 10 * 2;
                if (interval === 'quarterly') maxDaysGap = 95 * 2;
                if (interval === 'yearly') maxDaysGap = 370 * 2;
                if (interval === '4-weekly') maxDaysGap = 30 * 2;

                if (daysSinceLast > maxDaysGap) continue;

                // Skip small amounts (less than 10)
                if (averageAmount < 10) continue;

                // Check if it's likely groceries or shopping
                const name = sorted[0].cleaned_merchant_name || sorted[0].merchantName || sorted[0].description || '';
                const lowerName = name.toLowerCase();
                const isGroceries = ['albert heijn', 'jumbo', 'lidl', 'aldi', 'plus', 'dirk', 'coop', 'hoogvliet', 'picnic'].some(s => lowerName.includes(s));

                // Strictness rules
                let isCandidate = false;
                let confidence = 0.5;

                // Rule 1: Very stable amount (Subscription-like)
                // If it's groceries, we require EXACT amount stability (0 variance)
                // to avoid flagging weekly grocery runs as subscriptions.
                const varianceThreshold = isGroceries ? 0 : 0.05;

                if (relativeVariance <= varianceThreshold) {
                    isCandidate = true;
                    confidence = 0.8;
                }
                // Rule 2: Somewhat stable amount, but very regular interval (Utility-like)
                // We don't apply this to groceries, as they often have regular intervals but variable amounts
                else if (!isGroceries && relativeVariance < 0.20) {
                    isCandidate = true;
                    confidence = 0.6;
                }

                if (isCandidate) {
                    // Boost confidence for more transactions
                    if (sorted.length > 5) confidence += 0.1;
                    if (sorted.length > 12) confidence += 0.1;

                    // Boost confidence for monthly/yearly (common subs)
                    if (interval === 'monthly' || interval === 'yearly') confidence += 0.05;

                    confidence = Math.min(0.95, confidence);

                    const nextPaymentDate = this.calculateNextPaymentDate(sorted[0].date, interval, 'subscription');
                    const merchantId = sorted.find((tx) => !!tx.merchant_id)?.merchant_id || undefined;

                    // Determine name
                    const name = sorted[0].cleaned_merchant_name || sorted[0].merchantName || sorted[0].description;

                    candidates.push({
                        name: name,
                        amount: Number(sorted[0].amount),
                        averageAmount,
                        interval,
                        confidence,
                        type: 'subscription', // Default to subscription, user can change
                        source: 'interval_rule',
                        transactions: sorted,
                        merchantId,
                        nextPaymentDate
                    });
                }
            }
        }

        return candidates;
    }

    private getGroupKey(tx: transactions): string {
        if (tx.merchant_id) return `merchant-${tx.merchant_id}`;
        if (tx.counterparty_iban) return `iban-${tx.counterparty_iban.toLowerCase()}`;
        if (tx.cleaned_merchant_name) return `cleaned-${tx.cleaned_merchant_name.toLowerCase()}`;
        if (tx.merchantName) return `merchant-${tx.merchantName.toLowerCase()}`;
        // Fallback to normalized description, but be careful with generic ones
        return `desc-${(tx.normalized_description || tx.description).toLowerCase()}`;
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

            // Sort transactions by date descending (newest first)
            txs.sort((a, b) => b.date.getTime() - a.date.getTime());

            const avgAmount = this.calculateAverageAmount(txs);
            const interval = this.estimateIntervalFromTransactions(txs);
            const nextPaymentDate = this.calculateNextPaymentDate(txs[0].date, interval, 'subscription');

            candidates.push({
                name: providerName,
                amount: Number(txs[0].amount), // Latest amount
                averageAmount: avgAmount,
                interval,
                confidence: txs.length >= 3 ? 0.9 : txs.length === 2 ? 0.7 : 0.5,
                type: 'subscription',
                source: 'known_list',
                transactions: txs,
                merchantId,
                nextPaymentDate
            });
        }

        return candidates;
    }

    private detectIncome(transactions: transactions[]): RecurringCandidate[] {
        const candidates: RecurringCandidate[] = [];
        const grouped = new Map<string, transactions[]>();

        for (const tx of transactions) {
            if (tx.is_debit) continue;
            const amount = Number(tx.amount);
            if (amount < 10) continue; // Ignore very small incoming amounts

            const key = this.getSalaryGroupKey(tx);
            const list = grouped.get(key) ?? [];
            list.push(tx);
            grouped.set(key, list);
        }

        for (const txs of grouped.values()) {
            if (txs.length < 2) continue;

            // Cluster by amount - separate transactions with significantly different amounts
            const amountClusters = this.clusterByAmount(txs);

            for (const cluster of amountClusters) {
                if (cluster.length < 2) continue;

                const sorted = [...cluster].sort((a, b) => b.date.getTime() - a.date.getTime());
                const interval = this.estimateIntervalFromTransactions(sorted);
                const averageAmount = this.calculateAverageAmount(sorted);
                const relativeVariance = this.calculateRelativeVariance(sorted);

                let type: RecurringCandidate['type'] = 'other';
                let source: RecurringCandidate['source'] = 'ai';

                const isSalary = this.containsKeywords(sorted[0], SALARY_KEYWORDS) && averageAmount >= SALARY_MIN_AMOUNT;
                const isTax = this.containsKeywords(sorted[0], TAX_KEYWORDS);

                if (isSalary) {
                    type = 'salary';
                    source = 'salary_rule';
                } else if (isTax) {
                    type = 'tax';
                    source = 'ai';
                } else {
                    // Regular transfer?
                    // Only if variance is low and interval is regular
                    if (relativeVariance < 0.1 && interval !== 'irregular') {
                        type = 'transfer';
                        source = 'interval_rule';
                    } else {
                        continue; // Skip if it's just random incoming money
                    }
                }

                const nextPaymentDate = this.calculateNextPaymentDate(sorted[0].date, interval, type);

                let confidence = sorted.length >= 3 ? 0.75 : 0.6;
                if (interval === 'monthly' || interval === '4-weekly') confidence += 0.1;
                if (relativeVariance < 0.05) confidence += 0.15;
                else if (relativeVariance < 0.12) confidence += 0.08;
                confidence = Math.min(0.95, confidence);

                const merchantId = sorted.find((tx) => !!tx.merchant_id)?.merchant_id || undefined;

                // Add amount suffix if there are multiple clusters from the same source
                let candidateName = this.pickSalaryCandidateName(sorted);
                if (amountClusters.length > 1) {
                    candidateName += ` (€${Math.round(averageAmount)})`;
                }

                candidates.push({
                    name: candidateName,
                    amount: Number(sorted[0].amount),
                    averageAmount,
                    interval,
                    confidence,
                    type,
                    source,
                    transactions: sorted,
                    merchantId,
                    nextPaymentDate
                });
            }
        }

        return candidates;
    }

    private clusterByAmount(transactions: transactions[]): transactions[][] {
        if (transactions.length === 0) return [];

        // Sort by amount
        const sorted = [...transactions].sort((a, b) => Math.abs(Number(a.amount)) - Math.abs(Number(b.amount)));

        const clusters: transactions[][] = [];
        let currentCluster: transactions[] = [sorted[0]];

        for (let i = 1; i < sorted.length; i++) {
            const currentAmount = Math.abs(Number(sorted[i].amount));
            const clusterAvg = Math.abs(this.calculateAverageAmount(currentCluster));

            // If the amount is within 15% of the cluster average, add to current cluster
            const threshold = 0.15;
            if (Math.abs(currentAmount - clusterAvg) / clusterAvg <= threshold) {
                currentCluster.push(sorted[i]);
            } else {
                // Start a new cluster
                clusters.push(currentCluster);
                currentCluster = [sorted[i]];
            }
        }

        // Don't forget the last cluster
        clusters.push(currentCluster);

        return clusters;
    }

    private containsKeywords(tx: transactions, keywords: string[]): boolean {
        const fields = [
            tx.description,
            tx.cleaned_merchant_name,
            tx.merchantName,
            tx.normalized_description
        ];
        for (const raw of fields) {
            if (!raw) continue;
            const lower = raw.toLowerCase();
            if (keywords.some((keyword) => lower.includes(keyword))) {
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

    private calculateNextPaymentDate(lastDate: Date, interval: RecurringCandidate['interval'], type: RecurringCandidate['type']): Date | undefined {
        const nextDate = new Date(lastDate);
        switch (interval) {
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case '4-weekly':
                nextDate.setDate(nextDate.getDate() + 28);
                break;
            case 'quarterly':
                nextDate.setMonth(nextDate.getMonth() + 3);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
            case 'irregular':
                return undefined;
        }

        // Weekend adjustment for salary
        if (type === 'salary') {
            const day = nextDate.getDay();
            if (day === 6) { // Saturday
                nextDate.setDate(nextDate.getDate() - 1); // Move to Friday
            } else if (day === 0) { // Sunday
                nextDate.setDate(nextDate.getDate() - 2); // Move to Friday
            }
        }

        return nextDate;
    }
}

