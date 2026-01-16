import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import { applyDateOffset, getOffsetFromUrl } from '$lib/server/utils/dateShifter';

export const load: PageServerLoad = async ({ locals, url }) => {
    const userId = locals.user?.id;
    const manualOffset = getOffsetFromUrl(url);

    if (!userId) {
        return {
            summary: { balance: 0, expected: 0, remaining: 0 },
            confirmedPayments: [],
            predictedPayments: [],
            missedPayments: []
        };
    }

    // 1. Determine baseOffset (Time Curtain logic)
    const latestTransaction = await db.transactions.findFirst({
        where: { user_id: userId },
        orderBy: { date: 'desc' },
        select: { date: true }
    });

    let baseOffset = 0;
    if (latestTransaction) {
        const latestDate = new Date(latestTransaction.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        latestDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
        baseOffset = diffDays + 26; // Shifted 4 days back so salaries appear on 24th
    }

    const simulatedToday = new Date();
    simulatedToday.setHours(0, 0, 0, 0);
    simulatedToday.setDate(simulatedToday.getDate() + manualOffset);

    // Range selector from URL: 'this-period' | '2months' | 'year'
    const range = url.searchParams.get('range') || 'this-period';

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - baseOffset + manualOffset);
    cutoffDate.setHours(23, 59, 59, 999);

    // 2. Fetch future recurring transactions (Aankomende)
    // These are transactions with date > cutoffDate
    const rawAankomend = await db.transactions.findMany({
        where: {
            user_id: userId,
            date: { gt: cutoffDate },
            recurring_transaction_id: { not: null }
        },
        orderBy: { date: 'asc' },
        include: {
            categories: true,
            merchants: true,
            recurring_transaction: true
        }
    });

    // 3. Fetch past recurring transactions that haven't happened yet? 
    // Or rather, "missed" ones. For now, let's look for recurring_transactions with next_expected_date < cutoffDate
    // and no recent transaction.

    // Simplify: confirmed = has a future transaction record. 
    // predicted = recurring definition with next_expected_date but no trans yet.
    // missed = next_expected_date is in the past (relative to cutoff) but no matching trans.

    const intervalMap: Record<string, string> = {
        monthly: 'Maandelijks',
        weekly: 'Wekelijks',
        quarterly: 'Kwartaallijks',
        yearly: 'Jaarlijks',
        '4-weekly': 'Per 4 weken'
    };

    const aankomendRawMapped = rawAankomend.map((t) => {
        const displayedDate = applyDateOffset(new Date(t.date), baseOffset);
        displayedDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil(
            (displayedDate.getTime() - simulatedToday.getTime()) / (1000 * 60 * 60 * 24)
        );

        const intervalRaw = t.recurring_transaction?.interval || 'monthly';
        const intervalLabel = intervalMap[intervalRaw] || 'Maandelijks';

        return {
            id: t.id,
            merchant: t.merchants?.name || t.merchantName,
            amount: Number(t.amount),
            isDebit: t.is_debit,
            category: t.categories?.name,
            icon: t.categories?.icon,
            date: displayedDate,
            daysUntil: diffDays,
            interval: intervalLabel,
            type: t.recurring_transaction?.type
        };
    });

    // 3. Fetch missed payments (next_expected_date < cutoffDate and active)
    const rawMissed = await db.recurringTransaction.findMany({
        where: {
            user_id: userId,
            status: 'active',
            next_expected_date: { lt: cutoffDate }
        },
        include: {
            merchants: true,
            categories: true
        }
    });

    const missedPayments = rawMissed.map((rt) => {
        const expectedDate = rt.next_expected_date ? applyDateOffset(new Date(rt.next_expected_date), baseOffset) : new Date();
        const diffDays = Math.floor((simulatedToday.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));

        const intervalLabel = intervalMap[rt.interval] || 'Maandelijks';

        return {
            id: rt.id,
            merchant: rt.merchants?.name || rt.name,
            amount: Number(rt.amount),
            isDebit: rt.is_debit,
            category: rt.categories?.name,
            icon: rt.categories?.icon,
            date: expectedDate,
            subtitle: `${intervalLabel}, ${diffDays} dagen geleden`,
            interval: intervalLabel
        };
    });

    // 4. Separate upcoming into current and next period
    // Only consider salary if amount >= 1000 to avoid false positives
    const SALARY_MIN_AMOUNT = 1000;
    const currentPeriod: typeof aankomendRawMapped = [];
    const nextPeriod: typeof aankomendRawMapped = [];
    let foundSalary = false;

    for (const item of aankomendRawMapped) {
        const isRealSalary = item.type === 'salary' && item.amount >= SALARY_MIN_AMOUNT;
        if (isRealSalary && !foundSalary) {
            foundSalary = true;
            nextPeriod.push(item);
            continue;
        }

        if (!foundSalary) {
            currentPeriod.push(item);
        } else if (nextPeriod.length < 4) { // Salary + next 3
            nextPeriod.push(item);
        }
    }

    // 5. Graph Data Calculation for multiple ranges
    // Find the previous salary date to start the graph (amount >= 1000 to match salary filter)
    const previousSalary = await db.transactions.findFirst({
        where: {
            user_id: userId,
            date: { lte: cutoffDate },
            is_debit: false,
            amount: { gte: 1000 },
            recurring_transaction: { type: 'salary' }
        },
        orderBy: { date: 'desc' },
        select: { date: true, amount: true }
    });

    async function buildGraphFor(rangeKey: string) {
        let graphStartDate: Date;
        if (rangeKey === 'this-period') {
            graphStartDate = previousSalary ? new Date(previousSalary.date) : new Date(simulatedToday.getTime() - 30 * 24 * 60 * 60 * 1000);
            graphStartDate.setDate(graphStartDate.getDate() - 3);
        } else if (rangeKey === '2months') {
            graphStartDate = new Date(cutoffDate.getTime() - 60 * 24 * 60 * 60 * 1000);
        } else if (rangeKey === 'year') {
            graphStartDate = new Date(cutoffDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        } else {
            graphStartDate = new Date(simulatedToday.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        graphStartDate.setHours(0, 0, 0, 0);

        const periodTransactions = await db.transactions.findMany({
            where: {
                user_id: userId,
                date: { gte: graphStartDate, lte: cutoffDate }
            },
            orderBy: { date: 'asc' }
        });

        const totalNetSinceStart = periodTransactions.reduce((sum, t) => sum + (t.is_debit ? -Number(t.amount) : Number(t.amount)), 0);
        let runningBalance = 1200 - totalNetSinceStart;

        const graphDataLocal: { date: string, balance: number, type: 'history' | 'projection' }[] = [];
        graphDataLocal.push({
            date: applyDateOffset(graphStartDate, baseOffset).toISOString(),
            balance: runningBalance,
            type: 'history'
        });

        for (const t of periodTransactions) {
            runningBalance += (t.is_debit ? -Number(t.amount) : Number(t.amount));
            graphDataLocal.push({
                date: applyDateOffset(new Date(t.date), baseOffset).toISOString(),
                balance: runningBalance,
                type: 'history'
            });
        }

        let projectionBalance = runningBalance;
        for (const item of aankomendRawMapped) {
            projectionBalance += (item.isDebit ? -item.amount : item.amount);
            const projDate = applyDateOffset(new Date(item.date), baseOffset);
            projDate.setHours(0, 0, 0, 0);
            graphDataLocal.push({
                date: projDate.toISOString(),
                balance: projectionBalance,
                type: 'projection'
            });
        }

        return graphDataLocal;
    }

    const ranges = ['this-period', '2months', 'year'];
    const graphDataByRange: Record<string, typeof graphData> = {} as any;
    for (const r of ranges) {
        graphDataByRange[r] = await buildGraphFor(r);
    }
    // Keep backward-compatible single graphData for requested range
    const graphData = graphDataByRange[range] || graphDataByRange['this-period'];

    // 6. Summary calculation (Current period only, excluding salary)
    const currentPeriodExpenses = currentPeriod.reduce((sum, t) => sum + (t.isDebit ? t.amount : 0), 0);
    const currentPeriodIncome = currentPeriod.reduce((sum, t) => sum + (!t.isDebit ? t.amount : 0), 0);
    const netFlow = currentPeriodIncome - currentPeriodExpenses;

    // 7. Get new period start date and days until salary
    let nextPeriodStartDate = '';
    let daysUntilSalary = 0;
    const salaryItem = nextPeriod.find(item => item.type === 'salary' && item.amount >= SALARY_MIN_AMOUNT);
    if (salaryItem) {
        nextPeriodStartDate = salaryItem.date.toLocaleString('nl-NL', { day: 'numeric', month: 'long' });
        daysUntilSalary = salaryItem.daysUntil;
    }

    // 8. Calculate projected surplus
    const projectedSurplus = 1200 + netFlow;

    return {
        summary: {
            balance: 1200,
            expected: Math.abs(netFlow),
            remaining: projectedSurplus,
            monthName: simulatedToday.toLocaleString('nl-NL', { month: 'long' })
        },
        daysUntilSalary,
        projectedSurplus,
        graphData,
        graphDataByRange,
        previousSalaryDate: previousSalary ? applyDateOffset(new Date(previousSalary.date), baseOffset).toISOString() : null,
        nextSalaryDate: salaryItem ? salaryItem.date.toISOString() : null,
        confirmedPayments: currentPeriod,
        nextPeriodPayments: nextPeriod,
        nextPeriodStartDate,
        predictedPayments: [] as typeof currentPeriod,
        missedPayments: missedPayments
    };
};
