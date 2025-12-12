
import { describe, it, expect } from 'vitest';
import { identifyInternalTransfers } from './transactionAnalysis';

describe('identifyInternalTransfers', () => {
    it('should return empty set for empty input', () => {
        expect(identifyInternalTransfers([])).toEqual(new Set());
    });

    it('should identify a simple transfer pair', () => {
        const transactions = [
            { id: 1, date: '2023-01-01', amount: -100 },
            { id: 2, date: '2023-01-01', amount: 100 },
            { id: 3, date: '2023-01-05', amount: -50 }
        ];
        const result = identifyInternalTransfers(transactions);
        expect(result.has(1)).toBe(true);
        expect(result.has(2)).toBe(true);
        expect(result.has(3)).toBe(false);
    });

    it('should respect date window', () => {
        const transactions = [
            { id: 1, date: '2023-01-01', amount: -100 },
            { id: 2, date: '2023-01-10', amount: 100 } // Too far apart
        ];
        const result = identifyInternalTransfers(transactions, 3);
        expect(result.size).toBe(0);
    });

    it('should handle floating point approximations', () => {
        const transactions = [
            { id: 1, date: '2023-01-01', amount: -100.000001 },
            { id: 2, date: '2023-01-01', amount: 100.00 }
        ];
        // The implementation rounds to 2 decimals for grouping, so this might match if we implement rounding
        // Let's verify our implementation does rounding (it does in getAbsAmount)
        const result = identifyInternalTransfers(transactions);
        expect(result.has(1)).toBe(true);
        expect(result.has(2)).toBe(true);
    });

    it('should not match transactions with same sign', () => {
        const transactions = [
            { id: 1, date: '2023-01-01', amount: -100 },
            { id: 2, date: '2023-01-01', amount: -100 }
        ];
        const result = identifyInternalTransfers(transactions);
        expect(result.size).toBe(0);
    });

    it('should handle multiple pairs correctly', () => {
        const transactions = [
            { id: 1, date: '2023-01-01', amount: -100 },
            { id: 2, date: '2023-01-01', amount: 100 },
            { id: 3, date: '2023-01-02', amount: -200 },
            { id: 4, date: '2023-01-03', amount: 200 },
            { id: 5, date: '2023-01-05', amount: 50 }
        ];
        const result = identifyInternalTransfers(transactions);
        expect(result.has(1)).toBe(true);
        expect(result.has(2)).toBe(true);
        expect(result.has(3)).toBe(true);
        expect(result.has(4)).toBe(true);
        expect(result.has(5)).toBe(false);
    });
});
