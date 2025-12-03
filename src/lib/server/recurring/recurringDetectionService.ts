import { db } from '$lib/server/db';
import type { transactions, merchants, categories } from '@prisma/client';
import { getCategoryRecurringBehavior } from './categoryConfig';

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

const SAVINGS_KEYWORDS = [
    'spaarrekening',
    'savings account',
    'savings',
    'spaarre',
    'sparen',
    'save',
    'saving'
];

export interface RecurringCandidate {
    name: string;
    amount: number;
    averageAmount?: number;
    interval: 'monthly' | 'weekly' | 'quarterly' | 'yearly' | '4-weekly' | 'irregular';
    confidence: number; // 0-1
    type: 'subscription' | 'variable_cost' | 'salary' | 'bill' | 'tax' | 'transfer' | 'other';
    source: 'known_list' | 'salary_rule' | 'interval_rule' | 'ai';
    transactions: transactions[];
    nextPaymentDate?: Date;
    merchantId?: number;
}

export class RecurringDetectionService {
    async detectRecurringTransactions(userId: number): Promise<RecurringCandidate[]> {
        // Fetch all transactions WITH category data for Phase 3
        const transactions = await db.transactions.findMany({
            where: {
                user_id: userId
            },
            include: {
                categories: true // Include category for category-aware detection
            },
            orderBy: {
                date: 'desc'
            }
        });

        const candidates: RecurringCandidate[] = [];

        // 1. Detect by Known List (from DB)
        const knownCandidates = await this.detectByKnownList(transactions);
        console.log(`[RecurringDetection] Known List found ${knownCandidates.length} candidates:`);
        knownCandidates.forEach(c => console.log(`  - ${c.name}: €${c.amount.toFixed(2)} (${c.transactions.length} txs)`));
        candidates.push(...knownCandidates);

        // 2. Detect Income (Salary, Tax, Transfers)
        const incomeCandidates = this.detectIncome(transactions);
        console.log(`[RecurringDetection] Income detection found ${incomeCandidates.length} candidates:`);
        incomeCandidates.forEach(c => console.log(`  - ${c.name}: €${c.amount.toFixed(2)} (${c.transactions.length} txs, type: ${c.type})`));
        candidates.push(...incomeCandidates);

        // 3. Detect by Interval
        const intervalCandidates = this.detectByInterval(transactions);
        console.log(`[RecurringDetection] Interval detection found ${intervalCandidates.length} candidates:`);
        intervalCandidates.forEach(c => console.log(`  - ${c.name}: €${c.amount.toFixed(2)} (${c.transactions.length} txs)`));
        candidates.push(...intervalCandidates);

        // Deduplicate candidates
        // Priority: Known List > Salary > Interval
        console.log(`[RecurringDetection] Starting deduplication with ${candidates.length} total candidates`);
        // Sort by source priority
        const sourcePriority: Record<string, number> = { 'known_list': 3, 'salary_rule': 2, 'interval_rule': 1, 'ai': 0 };
        candidates.sort((a, b) => (sourcePriority[b.source] || 0) - (sourcePriority[a.source] || 0));

        const uniqueCandidates: RecurringCandidate[] = [];

        for (const candidate of candidates) {
            const duplicateIndex = uniqueCandidates.findIndex(existing => this.areCandidatesDuplicates(existing, candidate));

            if (duplicateIndex === -1) {
                uniqueCandidates.push(candidate);
            } else {
                // We found a duplicate. Since we sorted by priority, 'existing' is the higher priority one.
                const existing = uniqueCandidates[duplicateIndex];
                const beforeCount = existing.transactions.length;

                console.log(`[RecurringDetection] MERGING: "${candidate.name}" (${candidate.source}, ${candidate.transactions.length} txs) -> "${existing.name}" (${existing.source}, ${beforeCount} txs)`);

                // MERGE TRANSACTIONS
                // We want to combine the transactions found by both methods to get a complete picture.
                // e.g. Known List found 10, Interval found 12 (maybe 2 were missed by regex but caught by interval)
                const existingIds = new Set(existing.transactions.map(t => t.id));
                for (const tx of candidate.transactions) {
                    if (!existingIds.has(tx.id)) {
                        existing.transactions.push(tx);
                        existingIds.add(tx.id);
                    }
                }

                // Re-sort transactions by date
                existing.transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

                const afterCount = existing.transactions.length;
                console.log(`  → Result: ${afterCount} txs (added ${afterCount - beforeCount} new)`);
            }
        }

        // POST-PROCESSING: Merge over-split variable merchants
        // If a merchant has many small candidates from interval detection in a variable category,
        // merge them into a single variable_cost
        console.log(`[RecurringDetection] Post-processing: Checking for over-split variable merchants...`);
        const merchantGroups = new Map<number, RecurringCandidate[]>();

        for (const candidate of uniqueCandidates) {
            if (candidate.merchantId) {
                const group = merchantGroups.get(candidate.merchantId) || [];
                group.push(candidate);
                merchantGroups.set(candidate.merchantId, group);
            }
        }

        const candidatesToRemove = new Set<RecurringCandidate>();
        const candidatesToAdd: RecurringCandidate[] = [];

        for (const [merchantId, merchantCandidates] of merchantGroups) {
            // Only process if we have multiple candidates for this merchant
            if (merchantCandidates.length <= 2) continue;

            // Check if they're all from a variable category
            const firstCandidate = merchantCandidates[0];
            const firstTx = firstCandidate.transactions[0] as (transactions & { categories: categories | null });
            const categoryName = firstTx?.categories?.name || null;
            const categoryBehavior = getCategoryRecurringBehavior(categoryName);

            if (categoryBehavior.type === 'variable_recurring') {
                // Found over-split variable merchant! Merge them
                console.log(`[RecurringDetection] Merging ${merchantCandidates.length} over-split candidates for merchant ${merchantId} (${firstCandidate.name})`);

                // Collect all transactions
                const allTransactions: (transactions & { categories: categories | null })[] = [];
                const seenIds = new Set<number>();

                for (const candidate of merchantCandidates) {
                    for (const tx of candidate.transactions) {
                        if (!seenIds.has(tx.id)) {
                            allTransactions.push(tx as (transactions & { categories: categories | null }));
                            seenIds.add(tx.id);
                        }
                    }
                }

                // Sort by date
                allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());

                // Create merged variable_cost candidate
                const avgAmount = this.calculateAverageAmount(allTransactions);
                const interval = this.estimateIntervalFromTransactions(allTransactions);

                const mergedCandidate: RecurringCandidate = {
                    name: `${firstCandidate.name} (variable)`,
                    amount: Number(allTransactions[0].amount),
                    averageAmount: avgAmount,
                    interval,
                    confidence: 0.75,
                    type: 'variable_cost',
                    source: 'interval_rule',
                    transactions: allTransactions,
                    merchantId,
                    nextPaymentDate: undefined
                };

                // Mark old candidates for removal, add merged one
                merchantCandidates.forEach(c => candidatesToRemove.add(c));
                candidatesToAdd.push(mergedCandidate);

                console.log(`  → Merged into variable_cost: ${allTransactions.length} txs, ~€${avgAmount.toFixed(2)} avg`);
            }
        }

        // Apply the merges - filter and combine
        let finalCandidates = uniqueCandidates.filter(c => !candidatesToRemove.has(c));
        if (candidatesToAdd.length > 0) {
            finalCandidates.push(...candidatesToAdd);
            console.log(`[RecurringDetection] Post-processing complete: Removed ${candidatesToRemove.size} candidates, added ${candidatesToAdd.length} merged`);
        }

        // Final filter: Remove small amounts (< 10)
        // For variable costs, use average amount; for others use amount
        const beforeFilter = finalCandidates.length;
        const filtered = finalCandidates.filter(c => {
            const checkAmount = c.type === 'variable_cost' ? (c.averageAmount || c.amount) : c.amount;
            return Math.abs(checkAmount) >= 10;
        });
        const removed = beforeFilter - filtered.length;
        if (removed > 0) {
            console.log(`[RecurringDetection] Filtered out ${removed} candidates with amount < €10`);
        }
        console.log(`[RecurringDetection] Final result: ${filtered.length} unique candidates`);

        // Clean summary by type
        const subscriptions = filtered.filter(c => c.type === 'subscription');
        const variableCosts = filtered.filter(c => c.type === 'variable_cost');
        const income = filtered.filter(c => ['salary', 'tax', 'transfer'].includes(c.type));

        console.log(`\n📊 RECURRING DETECTION SUMMARY:`)
            ;
        console.log(`   💳 Subscriptions: ${subscriptions.length}`);
        subscriptions.forEach(s => console.log(`      - ${s.name}: €${Math.abs(s.amount).toFixed(2)} (${s.interval})`));

        console.log(`   🛒 Variable costs: ${variableCosts.length}`);
        variableCosts.forEach(v => console.log(`      - ${v.name}: ~€${Math.abs(v.averageAmount || v.amount).toFixed(2)} avg (${v.transactions.length} txs)`));

        console.log(`   💰 Income: ${income.length}`);
        income.forEach(i => console.log(`      - ${i.name}: €${Math.abs(i.amount).toFixed(2)} (${i.type})`));
        console.log(``);

        // Save to DB
        await this.saveRecurringTransactions(userId, filtered);

        return filtered;
    }

    private areCandidatesDuplicates(a: RecurringCandidate, b: RecurringCandidate): boolean {
        // SPECIAL CASE: Income splitting
        // If BOTH are income, we NEVER want to merge them here based on name similarity alone,
        // because we trust that 'detectIncome' (and now 'detectByKnownList') has already correctly split them by amount.
        // If we merge them now, we undo that work.
        // Exception: If they are EXACTLY the same candidate (same amount, same name), we do want to deduplicate.
        const isIncomeA = ['salary', 'tax', 'transfer'].includes(a.type);
        const isIncomeB = ['salary', 'tax', 'transfer'].includes(b.type);

        if (isIncomeA && isIncomeB) {
            // Only merge if amounts are nearly identical (1% diff) to catch duplicates from different sources
            // e.g. "Salary (€3000)" from KnownList vs "Salary (€3000)" from IncomeRule
            const amountA = Math.abs(a.amount);
            const amountB = Math.abs(b.amount);
            const diff = Math.abs(amountA - amountB);
            const avg = (amountA + amountB) / 2;

            if (avg === 0) return true;
            return diff / avg < 0.01;
        }

        // 1. Check for name match OR merchant match
        let hasNameMatch = false;

        if (a.merchantId && b.merchantId && a.merchantId === b.merchantId) {
            console.log(`[DedupeCheck] "${a.name}" vs "${b.name}": MATCH on merchantId (${a.merchantId})`);
            hasNameMatch = true;
        } else {
            // 2. Name similarity
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();

            // Check for token overlap or substring
            const tokensA = nameA.split(/[\s-_]+/);
            const tokensB = nameB.split(/[\s-_]+/);

            // Filter out common useless words
            const stopWords = ['bv', 'nv', 'gmbh', 'inc', 'corp', 'services', 'payments', 'pay', 'nl', 'com', 'nederland', 'netherlands'];
            const cleanTokensA = tokensA.filter(t => !stopWords.includes(t) && t.length > 2);
            const cleanTokensB = tokensB.filter(t => !stopWords.includes(t) && t.length > 2);

            const hasOverlap = cleanTokensA.some(ta => cleanTokensB.some(tb => tb.includes(ta) || ta.includes(tb)));

            hasNameMatch = (
                nameA.includes(nameB) ||
                nameB.includes(nameA) ||
                hasOverlap
            );
        }

        if (!hasNameMatch) return false;

        // 3. Amount similarity
        // If names match, amounts should be somewhat close.

        const amountA = Math.abs(a.amount);
        const amountB = Math.abs(b.amount);
        const diff = Math.abs(amountA - amountB);
        const avg = (amountA + amountB) / 2;

        if (avg === 0) return true; // Both zero?

        const variance = diff / avg;
        const threshold = 0.33;

        console.log(`[DedupeCheck] "${a.name}" (€${amountA.toFixed(2)}) vs "${b.name}" (€${amountB.toFixed(2)}): variance=${(variance * 100).toFixed(1)}%, threshold=${(threshold * 100)}%`);

        // For expenses, we allow a larger variance (e.g. 33%) because "Known List" might average ALL Ziggo transactions
        // while "Interval" might have found just one specific stream.
        if (variance < threshold) {
            console.log(`  → MATCH (variance < threshold)`);
            return true;
        }

        console.log(`  → NO MATCH (variance >= threshold)`);
        return false;
    }

    private detectByInterval(transactions: (transactions & { categories: categories | null })[]): RecurringCandidate[] {
        const candidates: RecurringCandidate[] = [];
        const grouped = new Map<string, (transactions & { categories: categories | null })[]>();

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
            // PHASE 3: Check category exclusion first
            const categoryName = txs[0]?.categories?.name || null;
            const categoryBehavior = getCategoryRecurringBehavior(categoryName);

            if (categoryBehavior.type === 'exclude') {
                console.log(`[RecurringDetection] Skipping excluded category: ${categoryName}`);
                continue;
            }

            // Need at least 3 transactions to establish a pattern (or category-specific minimum)
            if (txs.length < categoryBehavior.minTransactions) continue;

            // Cluster by amount to handle cases where a merchant has different charge types
            const amountClusters = categoryBehavior.type === 'variable_recurring' ? [txs] : this.clusterByAmount(txs);

            for (const cluster of amountClusters) {
                if (cluster.length < 3) continue;

                const sorted = [...cluster].sort((a, b) => b.date.getTime() - a.date.getTime());
                const interval = categoryBehavior.type === 'fixed_recurring'
                    ? this.estimateIntervalRobust(sorted)
                    : this.estimateIntervalFromTransactions(sorted);
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

                // Strictness rules - PHASE 3: Use category-specific thresholds
                let isCandidate = false;
                let confidence = 0.5;

                // PHASE 3: Apply category-specific variance threshold
                const categoryVarianceThreshold = categoryBehavior.varianceThreshold;

                // For groceries/variable categories, we're more lenient
                const isVariableCategory = categoryBehavior.type === 'variable_recurring';

                // Variable categories (groceries) SHOULD have variable amounts - always accept
                if (isVariableCategory) {
                    isCandidate = true;
                    confidence = 0.75;
                }
                else if (relativeVariance <= categoryVarianceThreshold) {
                    isCandidate = true;
                    confidence = isVariableCategory ? 0.7 : 0.8; // Slightly lower confidence for variable
                }
                // Only apply looser rule for non-groceries and non-variable categories
                else if (!isGroceries && !isVariableCategory && relativeVariance < 0.20) {
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

                    // PHASE 3.5: Set type based on category behavior
                    const candidateType: RecurringCandidate['type'] =
                        categoryBehavior.type === 'variable_recurring' ? 'variable_cost' : 'subscription';

                    // PHASE 3: Log category-aware detection
                    if (categoryName) {
                        console.log(`[RecurringDetection] Interval: Found ${candidateType} for "${name}" (${categoryName}): ${sorted.length} txs, ${relativeVariance.toFixed(2)} variance, ${interval}`);
                    }

                    candidates.push({
                        name: name,
                        amount: Number(sorted[0].amount),
                        averageAmount,
                        interval,
                        confidence,
                        type: candidateType,
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

    private getGroupKey(tx: transactions & { categories: categories | null }): string {
        if (tx.merchant_id) return `merchant-${tx.merchant_id}`;
        if (tx.counterparty_iban) return `iban-${tx.counterparty_iban.toLowerCase()}`;
        if (tx.cleaned_merchant_name) return `cleaned-${tx.cleaned_merchant_name.toLowerCase()}`;
        if (tx.merchantName) return `merchant-${tx.merchantName.toLowerCase()}`;
        // Fallback to normalized description, but be careful with generic ones
        return `desc-${(tx.normalized_description || tx.description).toLowerCase()}`;
    }

    private async detectByKnownList(transactions: (transactions & { categories: categories | null })[]): Promise<RecurringCandidate[]> {
        const candidates: RecurringCandidate[] = [];
        const groupedByProvider = new Map<string, { txs: (transactions & { categories: categories | null })[], merchantId: number }>();

        console.log(`[RecurringDetection] Scanning ${transactions.length} transactions`);

        // Fetch known recurring merchants from DB
        const knownMerchants = await db.merchants.findMany({
            where: {
                is_potential_recurring: true,
                is_active: true
            }
        });

        console.log(`[RecurringDetection] Loaded ${knownMerchants.length} known recurring merchants from DB`);

        // Group transactions by known providers (ONLY EXPENSES)
        for (const tx of transactions) {
            // PHASE 1 FIX: Only process expenses (debits) in Known List
            if (!tx.is_debit) continue;

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

            // PHASE 3: Check category exclusion
            const categoryName = txs[0]?.categories?.name || null;
            const categoryBehavior = getCategoryRecurringBehavior(categoryName);

            if (categoryBehavior.type === 'exclude') {
                console.log(`[RecurringDetection] Known List: Skipping excluded category: ${categoryName}`);
                continue;
            }

            // Cluster by amount to separate different subscriptions from the same provider
            // e.g. Ziggo Mobile (€20) vs Ziggo Internet (€60)
            // PHASE 2C: Using improved 20% threshold
            const amountClusters = this.clusterByAmount(txs);

            console.log(`[RecurringDetection] "${providerName}" - Found ${amountClusters.length} amount clusters from ${txs.length} transactions`);

            // PHASE 3.5: For variable_recurring, track all processed transactions
            // to later create a variable_cost if there are enough unmatched transactions
            const isVariableCategory = categoryBehavior.type === 'variable_recurring';
            const processedTransactionIds = new Set<number>();

            // PHASE 2B: Filter clusters - require minimum based on category
            // PHASE 3: Use category-specific minimum transactions
            const minTransactionsRequired = categoryBehavior.minTransactions;
            const significantClusters = amountClusters.filter(cluster => cluster.length >= minTransactionsRequired);

            // PHASE 2A: If we filtered out all clusters but have enough total transactions, check for dominant amount
            let clustersToProcess = significantClusters;
            if (significantClusters.length === 0 && txs.length >= 5) {
                // Find the dominant cluster (most transactions)
                const dominantCluster = amountClusters.reduce((max, cluster) =>
                    cluster.length > max.length ? cluster : max
                    , amountClusters[0]);

                // Only use dominant if it represents >60% of transactions
                if (dominantCluster.length / txs.length > 0.6) {
                    console.log(`[RecurringDetection] "${providerName}" - Using dominant cluster with ${dominantCluster.length}/${txs.length} txs (${Math.round(dominantCluster.length / txs.length * 100)}%)`);
                    clustersToProcess = [dominantCluster];
                } else {
                    console.log(`[RecurringDetection] "${providerName}" - No dominant cluster or significant clusters found, skipping`);
                    continue;
                }
            } else if (significantClusters.length === 0) {
                console.log(`[RecurringDetection] "${providerName}" - No clusters with >=${minTransactionsRequired} txs (${categoryBehavior.type}), skipping`);
                continue;
            } else {
                console.log(`[RecurringDetection] "${providerName}" - Processing ${significantClusters.length} significant clusters (${categoryBehavior.type})`);
            }

            for (const cluster of clustersToProcess) {
                // Sort transactions by date descending (newest first)
                cluster.sort((a, b) => b.date.getTime() - a.date.getTime());

                const avgAmount = this.calculateAverageAmount(cluster);

                if (clustersToProcess.length > 1) {
                    console.log(`[RecurringDetection] Known List: "${providerName}" cluster with €${avgAmount.toFixed(2)} avg (${cluster.length} txs)`);
                }

                // PHASE 3.5: Use robust interval detection for fixed recurring
                const interval = categoryBehavior.type === 'fixed_recurring'
                    ? this.estimateIntervalRobust(cluster)
                    : this.estimateIntervalFromTransactions(cluster);

                const nextPaymentDate = this.calculateNextPaymentDate(cluster[0].date, interval, 'subscription');

                // Determine confidence based on consistency
                let confidence = 0.5;
                if (cluster.length >= 10) confidence = 0.95;
                else if (cluster.length >= 5) confidence = 0.9;
                else if (cluster.length >= 3) confidence = 0.85;

                // Add name suffix if multiple clusters
                let displayName = providerName;
                if (clustersToProcess.length > 1) {
                    displayName += ` (€${Math.round(avgAmount)})`;
                }

                // PHASE 3.5: Set type based on cluster characteristics for variable categories
                let candidateType: RecurringCandidate['type'];

                if (isVariableCategory) {
                    // For variable categories (groceries), check if this cluster is subscription-like
                    const clusterVariance = this.calculateRelativeVariance(cluster);
                    const hasRegularInterval = interval !== 'irregular';

                    // If low variance (<10%) + regular interval -> it's a subscription (e.g., Picnic box)
                    // Otherwise skip this cluster for variable_cost consideration later
                    if (clusterVariance < 0.10 && hasRegularInterval && cluster.length >= 3) {
                        candidateType = 'subscription';
                        console.log(`[RecurringDetection] Found subscription pattern in variable category: \"${displayName}\" (${cluster.length} txs, ${clusterVariance.toFixed(2)} variance)`);

                        // Mark these as processed
                        cluster.forEach(tx => processedTransactionIds.add(tx.id));
                    } else {
                        // High variance or irregular - skip for now, will be part of variable_cost
                        console.log(`[RecurringDetection] Skipping high-variance cluster in variable category: \u20ac${avgAmount.toFixed(2)} (${cluster.length} txs, ${clusterVariance.toFixed(2)} variance)`);
                        continue;
                    }
                } else {
                    candidateType = 'subscription';
                }

                candidates.push({
                    name: displayName,
                    amount: Number(cluster[0].amount), // Latest amount
                    averageAmount: avgAmount,
                    interval,
                    confidence,
                    type: candidateType,
                    source: 'known_list',
                    transactions: cluster,
                    merchantId,
                    nextPaymentDate
                });
            }

            // PHASE 3.5: For variable categories, check if there are enough unprocessed transactions
            // to create a variable_cost pattern
            if (isVariableCategory) {
                const unprocessedTxs = txs.filter(tx => !processedTransactionIds.has(tx.id));

                if (unprocessedTxs.length >= 6) {
                    // Enough frequent variable transactions - create a variable_cost
                    unprocessedTxs.sort((a, b) => b.date.getTime() - a.date.getTime());

                    const avgAmount = this.calculateAverageAmount(unprocessedTxs);
                    const interval = this.estimateIntervalFromTransactions(unprocessedTxs);
                    const variance = this.calculateRelativeVariance(unprocessedTxs);

                    console.log(`[RecurringDetection] Creating variable_cost for "${providerName}": ${unprocessedTxs.length} txs, €${avgAmount.toFixed(2)} avg, ${variance.toFixed(2)} variance`);

                    candidates.push({
                        name: `${providerName} (variable)`,
                        amount: Number(unprocessedTxs[0].amount),
                        averageAmount: avgAmount,
                        interval,
                        confidence: 0.75,
                        type: 'variable_cost',
                        source: 'known_list',
                        transactions: unprocessedTxs,
                        merchantId,
                        nextPaymentDate: undefined // No specific next date for variable costs
                    });
                }
            }
        }

        return candidates;
    }

    private detectIncome(transactions: (transactions & { categories: categories | null })[]): RecurringCandidate[] {
        const candidates: RecurringCandidate[] = [];
        const grouped = new Map<string, (transactions & { categories: categories | null })[]>();

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
                const isSavings = this.containsKeywords(sorted[0], SAVINGS_KEYWORDS);

                // Skip savings transfers - these are manual/discretionary
                if (isSavings) {
                    console.log(`[RecurringDetection] Skipping savings transfer: ${this.pickSalaryCandidateName(sorted)}`);
                    continue;
                }

                if (isSalary) {
                    type = 'salary';
                    source = 'salary_rule';
                } else if (isTax) {
                    type = 'tax';
                    source = 'ai';
                } else {
                    // Regular transfer?
                    // Require at least 3 transactions for transfers (salary/tax can be 2)
                    if (sorted.length < 3) continue;

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

    private clusterByAmount(transactions: (transactions & { categories: categories | null })[]): (transactions & { categories: categories | null })[][] {
        if (transactions.length === 0) return [];

        // PHASE 3: Get category-specific clustering threshold
        const categoryName = transactions[0]?.categories?.name || null;
        const categoryBehavior = getCategoryRecurringBehavior(categoryName);

        // Use category variance as clustering threshold for consistency
        // Variable categories (groceries) get wider clusters (60%)
        // Fixed categories (subscriptions) get tighter clusters (5%)
        let threshold = categoryBehavior.varianceThreshold;

        // But for clustering, we use a slightly more lenient threshold than detection
        // to avoid over-splitting, especially for semi-variable (utilities)
        if (categoryBehavior.type === 'semi_variable') {
            threshold = 0.30; // 30% for utilities clustering (vs 25% detection)
        } else if (categoryBehavior.type === 'variable_recurring') {
            threshold = 0.40; // 40% for groceries clustering (vs 60% detection)
        } else {
            threshold = 0.20; // Default 20%
        }

        // Sort by amount
        const sorted = [...transactions].sort((a, b) => Math.abs(Number(a.amount)) - Math.abs(Number(b.amount)));

        const clusters: (transactions & { categories: categories | null })[][] = [];
        let currentCluster: (transactions & { categories: categories | null })[] = [sorted[0]];

        for (let i = 1; i < sorted.length; i++) {
            const currentAmount = Math.abs(Number(sorted[i].amount));
            const clusterAvg = Math.abs(this.calculateAverageAmount(currentCluster));

            // PHASE 3: Use dynamic threshold based on category
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

    private containsKeywords(tx: transactions & { categories: categories | null }, keywords: string[]): boolean {
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

    private getSalaryGroupKey(tx: transactions & { categories: categories | null }): string {
        if (tx.merchant_id) return `merchant-${tx.merchant_id}`;
        if (tx.counterparty_iban) return `iban-${tx.counterparty_iban.toLowerCase()}`;
        if (tx.cleaned_merchant_name) return `cleaned-${tx.cleaned_merchant_name.toLowerCase()}`;
        if (tx.merchantName) return `merchant-${tx.merchantName.toLowerCase()}`;
        return `description-${(tx.description || 'salary').toLowerCase()}`;
    }

    private pickSalaryCandidateName(txs: (transactions & { categories: categories | null })[]): string {
        const first = txs[0];
        return (
            first.cleaned_merchant_name ||
            first.merchantName ||
            first.description ||
            first.counterparty_iban ||
            'Salary'
        );
    }

    private estimateIntervalFromTransactions(txs: (transactions & { categories: categories | null })[]): RecurringCandidate['interval'] {
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

    // PHASE 3.5: Robust interval detection using mode (most common interval)
    // This handles outliers better for fixed recurring subscriptions
    private estimateIntervalRobust(txs: (transactions & { categories: categories | null })[]): RecurringCandidate['interval'] {
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

        // Categorize each interval
        const intervalCounts = {
            weekly: 0,
            '4-weekly': 0,
            monthly: 0,
            quarterly: 0,
            yearly: 0,
            outlier: 0
        };

        for (const days of daysDiffs) {
            if (days >= 6 && days <= 8) intervalCounts.weekly++;
            else if (days >= 25 && days <= 35) intervalCounts.monthly++;  // Check monthly FIRST
            else if (days >= 27 && days <= 29) intervalCounts['4-weekly']++;  // More specific (28 ±1)
            else if (days >= 85 && days <= 95) intervalCounts.quarterly++;
            else if (days >= 360 && days <= 370) intervalCounts.yearly++;
            else intervalCounts.outlier++;
        }

        // Find the mode (most common interval)
        const entries = Object.entries(intervalCounts) as Array<[RecurringCandidate['interval'] | 'outlier', number]>;
        const validEntries = entries.filter(([key]) => key !== 'outlier');

        if (validEntries.length === 0) {
            return 'irregular';
        }

        const [mostCommonInterval, mostCommonCount] = validEntries.reduce((max, current) =>
            current[1] > max[1] ? current : max
        );

        // If the most common interval represents at least 60% of intervals, use it
        const totalNonOutlier = daysDiffs.length - intervalCounts.outlier;
        if (totalNonOutlier > 0 && mostCommonCount / totalNonOutlier >= 0.6) {
            console.log(`[RecurringDetection] Robust interval: ${mostCommonInterval} (${mostCommonCount}/${totalNonOutlier} intervals, ${intervalCounts.outlier} outliers)`);
            return mostCommonInterval as RecurringCandidate['interval'];
        }

        // Otherwise fall back to irregular
        return 'irregular';
    }

    private calculateAverageAmount(txs: (transactions & { categories: categories | null })[]): number {
        if (txs.length === 0) return 0;
        const totalAmount = txs.reduce((sum, t) => sum + Number(t.amount), 0);
        return totalAmount / txs.length;
    }

    private calculateRelativeVariance(txs: (transactions & { categories: categories | null })[]): number {
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


    private async saveRecurringTransactions(userId: number, candidates: RecurringCandidate[]) {
        const highConfidence = candidates.filter(c => c.confidence >= 0.75);
        console.log(`[RecurringDetection] Saving ${highConfidence.length} high-confidence candidates to DB...`);

        for (const candidate of highConfidence) {
            // 1. ALWAYS get merchant_id (find or create)
            const merchantId = await this.findOrCreateMerchant(candidate);

            // 2. Find ALL existing recurring txs for this merchant
            const existingTxs = await db.recurringTransaction.findMany({
                where: {
                    user_id: userId,
                    merchant_id: merchantId,
                    status: 'active'
                }
            });

            // 3. Try to find a match by amount
            const match = existingTxs.find(existing => {
                const amountA = Math.abs(Number(existing.amount));
                const amountB = Math.abs(candidate.amount);
                const diff = Math.abs(amountA - amountB);
                const avg = (amountA + amountB) / 2;
                if (avg === 0) return true;
                // Use a tighter threshold for updating existing records (e.g. 15%)
                return (diff / avg) < 0.15;
            });

            if (match) {
                // 4. Update
                console.log(`[RecurringDetection] Updating existing recurring tx ${match.id} for merchant ${merchantId}`);
                await db.recurringTransaction.update({
                    where: { id: match.id },
                    data: {
                        amount: candidate.amount,
                        interval: candidate.interval,
                        type: candidate.type, // PHASE 3.6: Save type
                        next_expected_date: candidate.nextPaymentDate,
                        updated_at: new Date()
                    }
                });

                // 5. Link any new transactions
                await db.transactions.updateMany({
                    where: {
                        id: { in: candidate.transactions.map(t => t.id) },
                        recurring_transaction_id: null
                    },
                    data: { recurring_transaction_id: match.id }
                });

            } else {
                // 6. Create new
                console.log(`[RecurringDetection] Creating new recurring tx for merchant ${merchantId}`);
                const recurring = await db.recurringTransaction.create({
                    data: {
                        user_id: userId,
                        name: candidate.name,
                        amount: candidate.amount,
                        interval: candidate.interval,
                        type: candidate.type, // PHASE 3.6: Save type
                        merchant_id: merchantId,
                        next_expected_date: candidate.nextPaymentDate,
                        status: 'active'
                    }
                });

                // 7. Link all transactions
                await db.transactions.updateMany({
                    where: { id: { in: candidate.transactions.map(t => t.id) } },
                    data: {
                        recurring_transaction_id: recurring.id,
                        merchant_id: merchantId // Also update transaction's merchant!
                    }
                });
            }
        }
    }

    private async findOrCreateMerchant(candidate: RecurringCandidate): Promise<number> {
        // Try to find existing merchant
        if (candidate.merchantId) {
            return candidate.merchantId;
        }

        // Extract clean merchant name
        const cleanName = candidate.transactions[0].cleaned_merchant_name
            || candidate.transactions[0].merchantName
            || candidate.name;

        // Fuzzy search existing merchants
        const existingMerchant = await this.fuzzySearchMerchant(cleanName);

        if (existingMerchant) {
            return existingMerchant.id;
        }

        // Create new merchant
        console.log(`[RecurringDetection] Creating new merchant: "${cleanName}"`);
        const newMerchant = await db.merchants.create({
            data: {
                name: cleanName,
                keywords: [cleanName.toLowerCase()],
                ibans: [],
                is_active: true,
                is_potential_recurring: true,
                notes: `Auto-created from recurring detection`,
                updated_at: new Date()
            }
        });

        return newMerchant.id;
    }

    private async fuzzySearchMerchant(name: string): Promise<merchants | null> {
        const normalized = name.toLowerCase().trim();

        // 1. Exact match
        let merchant = await db.merchants.findFirst({
            where: { name: { equals: normalized, mode: 'insensitive' } }
        });

        if (merchant) return merchant;

        // 2. Keyword match
        merchant = await db.merchants.findFirst({
            where: {
                keywords: { hasSome: [normalized] }
            }
        });

        if (merchant) return merchant;

        // 3. Fuzzy: Check if name contains any merchant name (or vice versa)
        // Note: This might be slow if there are many merchants, but for now it's fine
        const allMerchants = await db.merchants.findMany({
            where: { is_active: true }
        });

        for (const m of allMerchants) {
            const merchantNameLower = m.name.toLowerCase();
            if (normalized.includes(merchantNameLower) || merchantNameLower.includes(normalized)) {
                // If similarity is high enough
                if (this.calculateSimilarity(normalized, merchantNameLower) > 0.7) {
                    return m;
                }
            }
        }

        return null;
    }

    private calculateSimilarity(a: string, b: string): number {
        // Simple token overlap similarity
        const tokensA = new Set(a.split(/[\s-_]+/).filter(t => t.length > 2));
        const tokensB = new Set(b.split(/[\s-_]+/).filter(t => t.length > 2));

        if (tokensA.size === 0 || tokensB.size === 0) return 0;

        const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
        const union = new Set([...tokensA, ...tokensB]);

        return intersection.size / union.size;
    }
}

