/**
 * Transaction Mapper Utility
 * Maps CSV columns to transaction fields with auto-detection
 */

export type TransactionField =
	| 'date'
	| 'merchantName'
	| 'iban'
	| 'counterpartyIban'
	| 'isDebit'
	| 'amount'
	| 'type'
	| 'description'
	| 'categoryId'
	| 'skip'; // For unmapped columns

export type TransactionType =
	| 'Payment'
	| 'Transfer'
	| 'DirectDebit'
	| 'Deposit'
	| 'Withdrawal'
	| 'Refund'
	| 'Fee'
	| 'Interest'
	| 'Other';

export interface ColumnMapping {
	[csvColumnIndex: number]: TransactionField;
}

export interface TransactionInput {
	date: Date;
	merchantName: string;
	iban: string;
	counterpartyIban?: string;
	isDebit: boolean;
	amount: number;
	type: TransactionType;
	description: string;
	categoryId?: number;
}

export interface MappingError {
	row: number;
	field: string;
	message: string;
}

/**
 * Normalizes header names for matching
 * Removes special chars, converts to lowercase, trims
 */
export function normalizeHeader(header: string): string {
	return header
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s]/g, '')
		.replace(/\s+/g, '');
}

/**
 * Header name variations for each transaction field
 */
const FIELD_VARIATIONS: Record<TransactionField, string[]> = {
	date: [
		'date',
		'transaction date',
		'transactiondate',
		'datum',
		'transactiedatum',
		'booking date',
		'valuta',
		'valutadatum'
	],
	merchantName: [
		'naam / omschrijving', // Check this first - most specific
		'naam omschrijving',
		'merchant name',
		'merchantname',
		'bedrijfsnaam',
		'merchant',
		'bedrijf',
		'name',
		'naam',
		'omschrijving', // Omschrijving can mean merchant name in Dutch banking
		'recipient',
		'payee'
	],
	iban: [
		'iban',
		'account iban',
		'accountiban',
		'rekening',
		'account',
		'account number',
		'from iban',
		'fromiban'
	],
	counterpartyIban: [
		'counterparty iban',
		'counterpartyiban',
		'counterparty',
		'tegenpartij',
		'tegenrekening',
		'to iban',
		'toiban',
		'destination iban',
		'recipient iban'
	],
	isDebit: [
		'is debit',
		'isdebit',
		'debit',
		'afschrift',
		'type',
		'direction',
		'credit debit',
		'af',
		'bij'
	],
	amount: [
		'amount',
		'bedrag',
		'value',
		'amount eur',
		'amounteur',
		'waarde',
		'transaction amount',
		'value date'
	],
	type: [
		'type',
		'transaction type',
		'transactiontype',
		'soort',
		'type transactie',
		'payment type',
		'transaction kind'
	],
	description: [
		'description',
		'mededelingen',
		'desc',
		'note',
		'notitie',
		'remarks',
		'comment',
		'details',
		'mededeling'
		// Note: 'omschrijving' is NOT here - it belongs to merchantName when combined with 'naam'
	],
	categoryId: ['category', 'category id', 'categorie', 'categoryid'],
	skip: []
};

/**
 * Auto-detects column mapping from CSV headers
 * Checks fields in priority order to handle conflicts (e.g., merchantName vs description)
 */
export function detectColumnMapping(headers: string[]): ColumnMapping {
	const mapping: ColumnMapping = {};
	const usedFields = new Set<TransactionField>();

	// Normalize headers
	const normalizedHeaders = headers.map((h) => normalizeHeader(h));

	// Define field priority order - check more specific/important fields first
	const fieldPriority: TransactionField[] = [
		'date',
		'iban',
		'amount',
		'merchantName', // Check merchantName before description to handle "naam / omschrijving"
		'counterpartyIban',
		'type',
		'isDebit',
		'description',
		'categoryId'
	];

	// First pass: exact matches with priority
	for (let i = 0; i < normalizedHeaders.length; i++) {
		const normalizedHeader = normalizedHeaders[i];

		// Check fields in priority order
		for (const field of fieldPriority) {
			if (usedFields.has(field)) continue;

			const variations = FIELD_VARIATIONS[field];

			// Check exact match
			if (variations.includes(normalizedHeader)) {
				mapping[i] = field;
				usedFields.add(field);
				break;
			}
		}
	}

	// Second pass: partial matches with priority (for cases like "naam / omschrijving")
	for (let i = 0; i < normalizedHeaders.length; i++) {
		if (mapping[i]) continue; // Already mapped

		const normalizedHeader = normalizedHeaders[i];

		for (const field of fieldPriority) {
			if (usedFields.has(field)) continue;

			const variations = FIELD_VARIATIONS[field];

			// Check if header contains any variation (with priority)
			for (const variation of variations) {
				if (normalizedHeader.includes(variation) || variation.includes(normalizedHeader)) {
					mapping[i] = field;
					usedFields.add(field);
					break;
				}
			}
			if (mapping[i]) break;
		}
	}

	// Mark unmapped columns as 'skip'
	for (let i = 0; i < headers.length; i++) {
		if (!mapping[i]) {
			mapping[i] = 'skip';
		}
	}

	return mapping;
}

/**
 * Parses a date string in various formats
 */
export function parseDate(dateString: string): Date | null {
	if (!dateString || !dateString.trim()) return null;

	const str = dateString.trim();

	// Try compact format YYYYMMDD (e.g., 20251121)
	const compactMatch = str.match(/^(\d{4})(\d{2})(\d{2})$/);
	if (compactMatch) {
		const year = parseInt(compactMatch[1]);
		const month = parseInt(compactMatch[2]) - 1;
		const day = parseInt(compactMatch[3]);
		if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
			const date = new Date(year, month, day);
			if (!isNaN(date.getTime()) && date.getFullYear() === year) return date;
		}
	}

	// Try ISO format (YYYY-MM-DD)
	const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (isoMatch) {
		const date = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
		if (!isNaN(date.getTime())) return date;
	}

	// Try DD/MM/YYYY or DD-MM-YYYY
	const europeanMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
	if (europeanMatch) {
		const date = new Date(
			parseInt(europeanMatch[3]),
			parseInt(europeanMatch[2]) - 1,
			parseInt(europeanMatch[1])
		);
		if (!isNaN(date.getTime())) return date;
	}

	// Try MM/DD/YYYY (US format)
	const usMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
	if (usMatch) {
		const date = new Date(
			parseInt(usMatch[3]),
			parseInt(usMatch[1]) - 1,
			parseInt(usMatch[2])
		);
		if (!isNaN(date.getTime())) return date;
	}

	// Try DD.MM.YYYY
	const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
	if (dotMatch) {
		const date = new Date(
			parseInt(dotMatch[3]),
			parseInt(dotMatch[2]) - 1,
			parseInt(dotMatch[1])
		);
		if (!isNaN(date.getTime())) return date;
	}

	// Fallback to native Date parsing
	const date = new Date(str);
	if (!isNaN(date.getTime())) return date;

	return null;
}

/**
 * Parses an amount string
 * Handles decimal separators (. or ,), currency symbols, negative values
 */
export function parseAmount(amountString: string): number | null {
	if (!amountString || !amountString.trim()) return null;

	// Remove currency symbols and whitespace
	let cleaned = amountString
		.trim()
		.replace(/[€$£¥₹]/g, '')
		.replace(/EUR|USD|GBP|JPY/gi, '')
		.trim();

	// Handle negative values (parentheses or minus sign)
	let isNegative = false;
	if (cleaned.startsWith('-')) {
		isNegative = true;
		cleaned = cleaned.substring(1);
	} else if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
		isNegative = true;
		cleaned = cleaned.slice(1, -1);
	}

	// Replace comma with dot for decimal separator (European format)
	cleaned = cleaned.replace(',', '.');

	// Remove thousand separators (spaces, dots, commas)
	cleaned = cleaned.replace(/[\s,\.]/g, (match, offset) => {
		// Only remove if it's likely a thousand separator
		// If there's another dot/comma after, this is probably thousand separator
		const rest = cleaned.substring(offset + 1);
		if (rest.includes('.') || rest.includes(',')) {
			return '';
		}
		return match;
	});

	// Final cleanup - remove any remaining non-numeric except decimal point
	cleaned = cleaned.replace(/[^\d.-]/g, '');

	const amount = parseFloat(cleaned);
	if (isNaN(amount)) return null;

	return isNegative ? -amount : amount;
}

/**
 * Validates IBAN format (basic check)
 * Full IBAN validation would require checksum calculation
 */
export function validateIBAN(iban: string): boolean {
	if (!iban || !iban.trim()) return false;
	const cleaned = iban.trim().replace(/\s/g, '');
	// Basic format: 2 letters + 2 digits + up to 30 alphanumeric
	return /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/i.test(cleaned);
}

/**
 * Maps a transaction type string to TransactionType enum
 * Supports both English and Dutch transaction types
 */
export function mapTransactionType(typeString: string): TransactionType | null {
	if (!typeString) return null;

	const normalized = typeString.trim().toLowerCase();

	const typeMap: Record<string, TransactionType> = {
		// English types
		payment: 'Payment',
		transfer: 'Transfer',
		'direct debit': 'DirectDebit',
		directdebit: 'DirectDebit',
		'direct-debit': 'DirectDebit',
		deposit: 'Deposit',
		withdrawal: 'Withdrawal',
		refund: 'Refund',
		fee: 'Fee',
		interest: 'Interest',
		other: 'Other',
		// Dutch types
		overschrijving: 'Transfer',
		overboeking: 'Transfer',
		betaalautomaat: 'Payment', // Card payment at terminal
		incasso: 'DirectDebit',
		ideal: 'Payment', // iDeal online payment method
		'online bankieren': 'Payment',
		onlinebankieren: 'Payment', // Online payment from app or web
		'online banking': 'Payment',
		diversen: 'Other', // Credit card or other
		verzamelbetaling: 'Deposit' // Salary or salary with reimbursements
	};

	// Exact match (case-insensitive)
	if (typeMap[normalized]) {
		return typeMap[normalized];
	}

	// Partial match - check if normalized string contains any key
	for (const [key, value] of Object.entries(typeMap)) {
		if (normalized.includes(key) || key.includes(normalized)) {
			return value;
		}
	}

	// Special case: handle "iDeal" with capital D
	if (/ideal/i.test(normalized)) {
		return 'Payment';
	}

	return null;
}

/**
 * Parses a boolean value from various formats
 */
export function parseBoolean(value: string | number): boolean | null {
	if (typeof value === 'number') {
		return value !== 0;
	}

	if (typeof value !== 'string') return null;

	const normalized = value.trim().toLowerCase();

	if (['true', '1', 'yes', 'y', 'debit', 'af'].includes(normalized)) {
		return true;
	}
	if (['false', '0', 'no', 'n', 'credit', 'bij'].includes(normalized)) {
		return false;
	}

	return null;
}

/**
 * Maps a CSV row to a TransactionInput object
 */
export function mapCSVRowToTransaction(
	row: string[],
	headers: string[],
	mapping: ColumnMapping
): { transaction: TransactionInput | null; errors: MappingError[] } {
	const errors: MappingError[] = [];
	const values: Record<TransactionField, string | undefined> = {
		date: undefined,
		merchantName: undefined,
		iban: undefined,
		counterpartyIban: undefined,
		isDebit: undefined,
		amount: undefined,
		type: undefined,
		description: undefined,
		categoryId: undefined,
		skip: undefined
	};

	// Extract values based on mapping
	for (let i = 0; i < row.length && i < headers.length; i++) {
		const field = mapping[i];
		if (field && field !== 'skip' && row[i] !== undefined && row[i] !== null && row[i] !== '') {
			const value = typeof row[i] === 'string' ? row[i].trim() : String(row[i]);
			if (value) {
				values[field] = value;
			}
		}
	}

	// Validate and parse required fields
	const date = values.date ? parseDate(values.date) : null;
	if (!date) {
		errors.push({
			row: 0, // Will be set by caller
			field: 'date',
			message: `Invalid or missing date: "${values.date || 'empty'}"`
		});
	}

	const merchantName = values.merchantName?.trim();
	if (!merchantName) {
		errors.push({
			row: 0,
			field: 'merchantName',
			message: 'Merchant name is required'
		});
	}

	const iban = values.iban?.trim();
	if (!iban || !validateIBAN(iban)) {
		errors.push({
			row: 0,
			field: 'iban',
			message: `Invalid or missing IBAN: "${iban || 'empty'}"`
		});
	}

	let amount = values.amount ? parseAmount(values.amount) : null;
	if (amount === null) {
		errors.push({
			row: 0,
			field: 'amount',
			message: `Invalid or missing amount: "${values.amount || 'empty'}"`
		});
	}

	// Determine isDebit from amount sign or explicit field
	let isDebit = true;
	if (values.isDebit !== undefined) {
		const parsedBool = parseBoolean(values.isDebit);
		if (parsedBool !== null) {
			isDebit = parsedBool;
		}
	} else if (amount !== null) {
		// Default: negative amounts are debits (outgoing)
		isDebit = amount < 0;
		// Make amount positive for storage
		if (amount < 0) {
			amount = Math.abs(amount);
		}
	}

	const type = values.type ? mapTransactionType(values.type) : null;
	if (!type) {
		// Default to 'Other' if not specified
		// errors.push({ row: 0, field: 'type', message: 'Transaction type is required' });
	}

	const description = values.description?.trim() || merchantName || 'No description';

	// If errors exist for required fields, return null
	if (!date || !merchantName || !iban || amount === null) {
		return { transaction: null, errors };
	}

	const transaction: TransactionInput = {
		date,
		merchantName,
		iban,
		counterpartyIban: values.counterpartyIban?.trim() || undefined,
		isDebit,
		amount: Math.abs(amount || 0), // Store as positive, isDebit indicates direction
		type: type || 'Other',
		description,
		categoryId: values.categoryId ? parseInt(values.categoryId) : undefined
	};

	// Validate categoryId if provided
	if (transaction.categoryId !== undefined && isNaN(transaction.categoryId)) {
		errors.push({
			row: 0,
			field: 'categoryId',
			message: `Invalid category ID: "${values.categoryId}"`
		});
		delete transaction.categoryId;
	}

	return { transaction, errors };
}

