/**
 * Merchant Merger Service
 * 
 * Detects and merges duplicate merchants using PostgreSQL pg_trgm similarity.
 * Uses smart name selection to pick the best merchant name.
 */

import { db } from '$lib/server/db';

// Store suffixes to penalize in name scoring
const STORE_SUFFIXES = [
    'xl', 'xtra', 'express', 'to go', 'togo', 'city', 'compact',
    'mini', 'super', 'mega', 'plus', 'extra', 'local'
];

export interface MergeCandidate {
    merchant1: { id: number; name: string; transactionCount: number };
    merchant2: { id: number; name: string; transactionCount: number };
    similarity: number;
}

export interface MergeResult {
    targetId: number;
    targetName: string;
    sourceIds: number[];
    sourceNames: string[];
    transactionsReassigned: number;
}

export interface MergeProgress {
    stage: 'detecting' | 'merging' | 'done';
    candidatesFound: number;
    merchantsMerged: number;
    mergeResults: MergeResult[];
}

/**
 * Check if a name is in Title Case
 */
function isTitleCase(name: string): boolean {
    const words = name.split(/\s+/);
    return words.every(word => {
        if (word.length === 0) return true;
        // Allow all-caps abbreviations (2-4 chars like "AH", "ING")
        if (word.length <= 4 && word === word.toUpperCase()) return true;
        // Otherwise first char should be uppercase
        return word[0] === word[0].toUpperCase() && word.slice(1) !== word.slice(1).toUpperCase();
    });
}

/**
 * Check if name has a store suffix (XL, To Go, etc.)
 */
function hasStoreSuffix(name: string): boolean {
    const lower = name.toLowerCase();
    return STORE_SUFFIXES.some(suffix =>
        lower.endsWith(` ${suffix}`) || lower.endsWith(`-${suffix}`)
    );
}

/**
 * Score a merchant name to determine the "best" name
 * Higher score = better name
 */
function scoreName(name: string, transactionCount: number): number {
    let score = 0;

    // Longer names are usually more descriptive
    score += name.length;

    // Prefer names with more transactions (established)
    score += transactionCount * 2;

    // Prefer Title Case
    if (isTitleCase(name)) score += 10;

    // Penalize ALL CAPS (except short abbreviations)
    if (name.length > 4 && name === name.toUpperCase()) score -= 5;

    // Avoid store suffixes (prefer base name)
    if (!hasStoreSuffix(name)) score += 5;

    return score;
}

/**
 * Find duplicate merchant candidates using pg_trgm similarity
 * 
 * @param threshold - Similarity threshold (0.0 to 1.0), default 0.95 for auto-merge
 * @returns Array of merge candidates
 */
export async function findMergeCandidates(threshold: number = 0.75): Promise<MergeCandidate[]> {
    console.log(`🔗 Merchant deduplication: Scanning (threshold: ${threshold})...`);

    try {
        // Use pg_trgm similarity to find duplicate pairs
        // This is much faster than in-memory comparison for large datasets
        const results = await db.$queryRaw<Array<{
            id1: number;
            name1: string;
            txn_count1: bigint;
            id2: number;
            name2: string;
            txn_count2: bigint;
            sim: number;
        }>>`
			SELECT 
				m1.id as id1, 
				m1.name as name1,
				(SELECT COUNT(*) FROM transactions WHERE merchant_id = m1.id) as txn_count1,
				m2.id as id2, 
				m2.name as name2,
				(SELECT COUNT(*) FROM transactions WHERE merchant_id = m2.id) as txn_count2,
				similarity(lower(m1.name), lower(m2.name)) as sim
			FROM merchants m1
			JOIN merchants m2 ON m1.id < m2.id
			WHERE m1.is_active = true 
				AND m2.is_active = true
				AND similarity(lower(m1.name), lower(m2.name)) >= ${threshold}
			ORDER BY sim DESC
		`;

        const candidates: MergeCandidate[] = results.map((r: any) => ({
            merchant1: { id: r.id1, name: r.name1, transactionCount: Number(r.txn_count1) },
            merchant2: { id: r.id2, name: r.name2, transactionCount: Number(r.txn_count2) },
            similarity: r.sim
        }));

        console.log(`   Found ${candidates.length} duplicate pairs (>=${threshold} similarity)`);

        return candidates;
    } catch (error: any) {
        // Check if pg_trgm extension is not available
        if (error.message?.includes('similarity') || error.message?.includes('pg_trgm')) {
            console.warn('   ⚠️  pg_trgm extension not available, falling back to in-memory comparison');
            return findMergeCandidatesInMemory(threshold);
        }
        throw error;
    }
}

/**
 * Fallback: Find duplicates using in-memory Levenshtein distance
 * Used when pg_trgm is not available
 */
async function findMergeCandidatesInMemory(threshold: number): Promise<MergeCandidate[]> {
    // Get all active merchants with transaction counts
    const merchants = await db.$queryRaw<Array<{
        id: number;
        name: string;
        txn_count: bigint;
    }>>`
		SELECT m.id, m.name, COUNT(t.id) as txn_count
		FROM merchants m
		LEFT JOIN transactions t ON t.merchant_id = m.id
		WHERE m.is_active = true
		GROUP BY m.id, m.name
	`;

    const candidates: MergeCandidate[] = [];

    // Simple Levenshtein-based similarity
    for (let i = 0; i < merchants.length; i++) {
        for (let j = i + 1; j < merchants.length; j++) {
            const m1 = merchants[i];
            const m2 = merchants[j];
            const sim = calculateSimilarity(m1.name.toLowerCase(), m2.name.toLowerCase());

            if (sim >= threshold) {
                candidates.push({
                    merchant1: { id: m1.id, name: m1.name, transactionCount: Number(m1.txn_count) },
                    merchant2: { id: m2.id, name: m2.name, transactionCount: Number(m2.txn_count) },
                    similarity: sim
                });
            }
        }
    }

    return candidates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    const longerLength = longer.length;
    const distance = levenshteinDistance(longer, shorter);

    return (longerLength - distance) / longerLength;
}

/**
 * Levenshtein distance implementation
 */
function levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }

    return dp[m][n];
}

/**
 * Merge multiple merchants into one, keeping the best name
 * 
 * @param candidates - Array of merge candidates
 * @returns Array of merge results
 */
export async function mergeMerchants(candidates: MergeCandidate[]): Promise<MergeResult[]> {
    if (candidates.length === 0) return [];

    console.log(`🔗 Merging ${candidates.length} duplicate pairs...`);

    const results: MergeResult[] = [];
    const processedIds = new Set<number>();

    // Group candidates by connected merchants (in case of chains like A-B, B-C)
    const groups = groupConnectedMerchants(candidates);

    for (const group of groups) {
        // Skip if any merchant in group was already processed
        if (group.some(m => processedIds.has(m.id))) continue;

        // Find the best name in the group
        let best = group[0];
        let bestScore = scoreName(best.name, best.transactionCount);

        for (const merchant of group.slice(1)) {
            const score = scoreName(merchant.name, merchant.transactionCount);
            if (score > bestScore) {
                best = merchant;
                bestScore = score;
            }
        }

        // Merge all others into the best one
        const sources = group.filter(m => m.id !== best.id);
        const sourceIds = sources.map(m => m.id);

        if (sourceIds.length === 0) continue;

        // Execute merge in a transaction
        const result = await db.$transaction(async (tx: any) => {
            // 1. Reassign all transactions (single UPDATE)
            const reassigned = await tx.$executeRaw`
				UPDATE transactions 
				SET merchant_id = ${best.id}, updated_at = NOW()
				WHERE merchant_id = ANY(${sourceIds}::int[])
			`;

            // 2. Combine IBANs from all sources into target
            await tx.$executeRaw`
				UPDATE merchants 
				SET ibans = (
					SELECT array_agg(DISTINCT iban) 
					FROM (
						SELECT unnest(ibans) as iban 
						FROM merchants 
						WHERE id = ${best.id} OR id = ANY(${sourceIds}::int[])
					) sub
					WHERE iban IS NOT NULL
				),
				updated_at = NOW()
				WHERE id = ${best.id}
			`;

            // 3. Reassign recurring transactions
            await tx.$executeRaw`
                UPDATE recurring_transactions 
                SET merchant_id = ${best.id}, updated_at = NOW()
                WHERE merchant_id = ANY(${sourceIds}::int[])
            `;

            // 4. Hard-delete source merchants
            await tx.$executeRaw`
                DELETE FROM merchants 
                WHERE id = ANY(${sourceIds}::int[])
            `; return reassigned;
        });

        // Mark as processed
        group.forEach(m => processedIds.add(m.id));

        const mergeResult: MergeResult = {
            targetId: best.id,
            targetName: best.name,
            sourceIds,
            sourceNames: sources.map(m => m.name),
            transactionsReassigned: Number(result)
        };

        results.push(mergeResult);

        console.log(`   ✓ "${best.name}" ← [${sources.map(m => `"${m.name}"`).join(', ')}] (${result} txn, score: ${bestScore})`);
    }

    console.log(`🔗 Done. ${results.length} merchant groups merged.`);

    return results;
}

/**
 * Group connected merchants (A-B, B-C becomes [A, B, C])
 */
function groupConnectedMerchants(candidates: MergeCandidate[]): Array<Array<{ id: number; name: string; transactionCount: number }>> {
    const parent = new Map<number, number>();
    const merchants = new Map<number, { id: number; name: string; transactionCount: number }>();

    const find = (x: number): number => {
        if (!parent.has(x)) parent.set(x, x);
        if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
        return parent.get(x)!;
    };

    const union = (x: number, y: number) => {
        const px = find(x), py = find(y);
        if (px !== py) parent.set(px, py);
    };

    for (const candidate of candidates) {
        merchants.set(candidate.merchant1.id, candidate.merchant1);
        merchants.set(candidate.merchant2.id, candidate.merchant2);
        union(candidate.merchant1.id, candidate.merchant2.id);
    }

    // Group by root
    const groups = new Map<number, Array<{ id: number; name: string; transactionCount: number }>>();
    for (const [id, merchant] of merchants) {
        const root = find(id);
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root)!.push(merchant);
    }

    return Array.from(groups.values());
}

/**
 * Auto-merge high-confidence duplicates
 * Called after transaction import
 * 
 * @param onProgress - Optional callback for progress updates
 * @returns Merge progress with results
 */
export async function autoMergeDuplicates(
    onProgress?: (progress: MergeProgress) => void
): Promise<MergeProgress> {
    const progress: MergeProgress = {
        stage: 'detecting',
        candidatesFound: 0,
        merchantsMerged: 0,
        mergeResults: []
    };

    onProgress?.(progress);

    // Find high-confidence duplicates (>= 0.75 similarity)
    const candidates = await findMergeCandidates(0.75);
    progress.candidatesFound = candidates.length;

    if (candidates.length === 0) {
        // VERBOSE LOGGING: If no candidates found, log top similarties for debugging
        console.log('   No high-confidence matches found. Checking top similarity pairs (>= 0.6) for context...');
        try {
            // Run a quick check with lower threshold just for logging
            const debugCandidates = await findMergeCandidates(0.6);
            if (debugCandidates.length > 0) {
                console.log('   Potential close matches (skipped):');
                debugCandidates.slice(0, 5).forEach(c => {
                    console.log(`     - "${c.merchant1.name}" ↔ "${c.merchant2.name}" (${(c.similarity * 100).toFixed(1)}%)`);
                });
            } else {
                console.log('   No close matches found even at 0.6 similarity.');
            }
        } catch (err) {
            console.warn('   ⚠️  Failed to run debug similarity check:', err);
        }

        progress.stage = 'done';
        onProgress?.(progress);
        return progress;
    }

    progress.stage = 'merging';
    onProgress?.(progress);

    // Execute merges
    const results = await mergeMerchants(candidates);
    progress.mergeResults = results;
    progress.merchantsMerged = results.length;
    progress.stage = 'done';

    onProgress?.(progress);

    return progress;
}
