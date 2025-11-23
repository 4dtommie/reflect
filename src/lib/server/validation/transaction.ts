import { z } from 'zod';

/**
 * TransactionType enum values from Prisma schema
 */
export const TransactionTypeEnum = z.enum([
	'Payment',
	'Transfer',
	'DirectDebit',
	'Deposit',
	'Withdrawal',
	'Refund',
	'Fee',
	'Interest',
	'Other'
]);

/**
 * Validation schema for TransactionInput
 * Matches the Prisma Transaction model requirements
 */
export const TransactionInputSchema = z.object({
	date: z.coerce.date({
		required_error: 'Date is required',
		invalid_type_error: 'Invalid date format'
	}),
	merchantName: z
		.string()
		.min(1, 'Merchant name is required')
		.max(255, 'Merchant name must be 255 characters or less'),
	iban: z
		.string()
		.min(1, 'IBAN is required')
		.regex(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/i, 'Invalid IBAN format'),
	counterpartyIban: z
		.string()
		.regex(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/i, 'Invalid IBAN format')
		.optional()
		.nullable(),
	isDebit: z.boolean({
		required_error: 'isDebit is required'
	}),
	amount: z
		.number({
			required_error: 'Amount is required',
			invalid_type_error: 'Amount must be a number'
		})
		.positive('Amount must be positive')
		.max(99999999.99, 'Amount is too large'),
	type: TransactionTypeEnum,
	description: z
		.string()
		.min(1, 'Description is required')
		.max(1000, 'Description must be 1000 characters or less'),
	categoryId: z
		.number()
		.int('Category ID must be an integer')
		.positive('Category ID must be positive')
		.optional()
		.nullable()
});

/**
 * Schema for importing multiple transactions
 */
export const TransactionImportSchema = z.object({
	rows: z.array(z.array(z.string())).min(1, 'At least one row is required'),
	headers: z.array(z.string()).min(1, 'Headers are required'),
	mapping: z.record(z.string(), z.enum([
		'date',
		'merchantName',
		'iban',
		'counterpartyIban',
		'isDebit',
		'amount',
		'type',
		'description',
		'categoryId',
		'skip'
	])),
	options: z
		.object({
			skipDuplicates: z.boolean().default(true)
		})
		.optional()
});

export type TransactionInput = z.infer<typeof TransactionInputSchema>;
export type TransactionImportRequest = z.infer<typeof TransactionImportSchema>;

