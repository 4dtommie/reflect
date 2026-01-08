
/**
 * Utility for shifting dates to simulate "time travel" for testing.
 */

/**
 * Applies a day offset to a given date.
 * Returns a NEW Date object.
 * @param date The original date
 * @param offsetDays Number of days to add (can be negative)
 */
export function applyDateOffset(date: Date, offsetDays: number): Date {
    if (!offsetDays || isNaN(offsetDays)) return new Date(date);

    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + offsetDays);
    return newDate;
}

/**
 * Extracts the 'offset' parameter from a URL and parses it as an integer.
 * Returns 0 if not found or invalid.
 */
export function getOffsetFromUrl(url: URL): number {
    const offsetParam = url.searchParams.get('offset');
    if (!offsetParam) return 0;

    const offset = parseInt(offsetParam, 10);
    return isNaN(offset) ? 0 : offset;
}
