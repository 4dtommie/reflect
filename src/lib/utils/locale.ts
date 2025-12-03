/**
 * Centralized locale utilities for Dutch (nl-NL) formatting
 */

const LOCALE = 'nl-NL';

/**
 * Format a date in Dutch locale
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
	date: string | Date,
	options?: Intl.DateTimeFormatOptions
): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return dateObj.toLocaleDateString(LOCALE, options);
}

/**
 * Format a date without year if it's the current year
 * @param date - Date string or Date object
 * @param includeYear - Force include year even if current year
 * @returns Formatted date string (e.g., "27 okt." or "27 okt. 2024")
 */
export function formatDateShort(date: string | Date, includeYear = false): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	const now = new Date();
	const isCurrentYear = dateObj.getFullYear() === now.getFullYear();

	if (!includeYear && isCurrentYear) {
		return formatDate(dateObj, {
			month: 'short',
			day: 'numeric'
		});
	}

	return formatDate(dateObj, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

/**
 * Format a date with full month name
 * @param date - Date string or Date object
 * @returns Formatted date string (e.g., "27 oktober 2024")
 */
export function formatDateLong(date: string | Date): string {
	return formatDate(date, {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});
}

/**
 * Format a date for month/year display
 * @param date - Date string or Date object
 * @returns Formatted date string (e.g., "oktober 2024")
 */
export function formatMonthYear(date: string | Date): string {
	return formatDate(date, {
		month: 'long',
		year: 'numeric'
	});
}

/**
 * Format a number in Dutch locale
 * @param value - Number to format
 * @param options - Intl.NumberFormatOptions
 * @returns Formatted number string
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
	return new Intl.NumberFormat(LOCALE, options).format(value);
}

/**
 * Get the locale code
 */
export function getLocale(): string {
	return LOCALE;
}

