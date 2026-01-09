/**
 * Shared date formatting utilities for Dutch translations
 */

/**
 * Map English interval names to Dutch translations
 */
export const intervalMap: Record<string, string> = {
    monthly: 'Maandelijks',
    weekly: 'Wekelijks',
    quarterly: 'Kwartaallijks',
    yearly: 'Jaarlijks',
    '4-weekly': 'Per 4 weken'
};

/**
 * Translate an interval to Dutch
 * @param interval - The interval in English (e.g., "monthly", "weekly")
 */
export function translateInterval(interval: string): string {
    return intervalMap[interval?.toLowerCase()] || interval || 'Maandelijks';
}

/**
 * Format days until a date in Dutch
 * @param days - Number of days until the date (0 = today, 1 = tomorrow, etc.)
 */
export function formatDaysLabel(days: number): string {
    if (days === 0) return 'vandaag';
    if (days === 1) return 'morgen';
    return `over ${days} dagen`;
}

/**
 * Format a recurring payment subtitle with interval and days
 * @param interval - The interval (can be English or Dutch)
 * @param days - Number of days until the next payment
 */
export function formatRecurringSubtitle(interval: string, days: number): string {
    const intervalLabel = translateInterval(interval);
    const daysLabel = days === 0 ? 'vandaag' : days === 1 ? 'morgen' : `over ${days} dagen`;
    return `${intervalLabel}, ${daysLabel}`;
}
