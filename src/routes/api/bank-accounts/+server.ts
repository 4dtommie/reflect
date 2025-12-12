import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        // 1. Get saved bank accounts
        const savedAccounts = await (db as any).bankAccount.findMany({
            where: {
                user_id: locals.user.id
            },
            orderBy: {
                name: 'asc'
            }
        });

        // 2. Get all distinct IBANs from transactions
        // We use groupBy to find unique IBANs in transactions table
        const transactionIbans = await (db as any).transactions.groupBy({
            by: ['iban'],
            where: {
                user_id: locals.user.id
            }
        });

        // 3. Merge: Find IBANs that are in transactions but not in savedAccounts
        const savedIbanSet = new Set(savedAccounts.map((a: any) => a.iban));
        const discoveredAccounts = transactionIbans
            .filter((t: any) => t.iban && !savedIbanSet.has(t.iban))
            .map((t: any) => ({
                iban: t.iban,
                name: null, // No name yet
                is_own_account: true, // Assumption
                type: null,
                id: null // Not persisted yet
            }));

        // Combine saved and discovered
        // Saved first, then discovered
        const allAccounts = [...savedAccounts, ...discoveredAccounts];

        return json({ bankAccounts: allAccounts });
    } catch (err: any) {
        console.error('Error fetching bank accounts:', err);
        throw error(500, 'Failed to fetch bank accounts');
    }
};

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        const { iban, name, type, is_own_account } = await request.json();

        if (!iban || !name) {
            throw error(400, 'IBAN and Name are required');
        }

        console.log(`💾 Saving account: ${iban} -> ${name}`);

        const account = await (db as any).bankAccount.upsert({
            where: {
                user_id_iban: {
                    user_id: locals.user.id,
                    iban: iban
                }
            },
            update: {
                name,
                type,
                is_own_account
            },
            create: {
                user_id: locals.user.id,
                iban,
                name,
                type,
                is_own_account: is_own_account ?? true
            }
        });

        return json(account);
    } catch (err: any) {
        console.error('Error saving bank account:', err);
        throw error(500, 'Failed to save bank account');
    }
};
