/**
 * CSV Parser Utility
 * Handles parsing CSV files with automatic delimiter detection,
 * quoted field support, and error tracking
 */

export interface ParseError {
	row: number;
	column?: number;
	message: string;
}

export interface ParseWarning {
	row: number;
	column?: number;
	message: string;
}

export interface ParseResult {
	headers: string[];
	rows: string[][];
	errors: ParseError[];
	warnings: ParseWarning[];
	delimiter: string;
}

/**
 * Detects the delimiter used in the CSV file
 * Checks for comma, semicolon, and tab
 */
export function detectDelimiter(text: string): string {
	const firstLine = text.split('\n')[0];
	
	// Count occurrences of potential delimiters
	const commaCount = (firstLine.match(/,/g) || []).length;
	const semicolonCount = (firstLine.match(/;/g) || []).length;
	const tabCount = (firstLine.match(/\t/g) || []).length;
	
	// Return the delimiter with the most occurrences
	if (semicolonCount > commaCount && semicolonCount > tabCount) {
		return ';';
	}
	if (tabCount > commaCount && tabCount > semicolonCount) {
		return '\t';
	}
	
	// Default to comma
	return ',';
}

/**
 * Parses a single CSV line, handling quoted fields and escaped quotes
 * Supports: "field, with comma" and "field with ""escaped quotes"""
 */
export function parseCSVLine(line: string, delimiter: string): string[] {
	const fields: string[] = [];
	let currentField = '';
	let insideQuotes = false;
	let i = 0;
	
	while (i < line.length) {
		const char = line[i];
		const nextChar = line[i + 1];
		
		if (char === '"') {
			if (insideQuotes && nextChar === '"') {
				// Escaped quote: ""
				currentField += '"';
				i += 2; // Skip both quotes
			} else {
				// Toggle quote state
				insideQuotes = !insideQuotes;
				i++;
			}
		} else if (char === delimiter && !insideQuotes) {
			// End of field
			fields.push(currentField.trim());
			currentField = '';
			i++;
		} else {
			currentField += char;
			i++;
		}
	}
	
	// Add the last field
	fields.push(currentField.trim());
	
	return fields;
}

/**
 * Normalizes line endings to \n
 * Handles CRLF (\r\n) and CR (\r)
 */
function normalizeLineEndings(text: string): string {
	return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Removes BOM (Byte Order Mark) if present
 * UTF-8 BOM is \ufeff
 */
function removeBOM(text: string): string {
	if (text.charCodeAt(0) === 0xfeff) {
		return text.slice(1);
	}
	return text;
}

/**
 * Parses a CSV file from text content
 * Returns headers, rows, errors, and warnings
 */
export async function parseCSVFile(file: File): Promise<ParseResult> {
	const errors: ParseError[] = [];
	const warnings: ParseWarning[] = [];
	
	try {
		// Read file as text (UTF-8)
		let text = await file.text();
		
		// Remove BOM if present
		text = removeBOM(text);
		
		// Normalize line endings
		text = normalizeLineEndings(text);
		
		// Remove trailing newline
		text = text.trimEnd();
		
		if (!text) {
			errors.push({
				row: 0,
				message: 'File is empty'
			});
			return {
				headers: [],
				rows: [],
				errors,
				warnings,
				delimiter: ','
			};
		}
		
		// Detect delimiter from first line
		const delimiter = detectDelimiter(text);
		
		// Split into lines
		const lines = text.split('\n');
		
		if (lines.length === 0) {
			errors.push({
				row: 0,
				message: 'No data found in file'
			});
			return {
				headers: [],
				rows: [],
				errors,
				warnings,
				delimiter
			};
		}
		
		// First line is headers
		const headers = parseCSVLine(lines[0], delimiter).map((h) => h.trim());
		
		if (headers.length === 0) {
			errors.push({
				row: 1,
				message: 'No headers found'
			});
			return {
				headers: [],
				rows: [],
				errors,
				warnings,
				delimiter
			};
		}
		
		// Warn if duplicate headers
		const headerCounts = new Map<string, number>();
		headers.forEach((header, index) => {
			const count = headerCounts.get(header) || 0;
			headerCounts.set(header, count + 1);
			if (count > 0) {
				warnings.push({
					row: 1,
					column: index + 1,
					message: `Duplicate header: "${header}"`
				});
			}
		});
		
		// Parse data rows
		const rows: string[][] = [];
		
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i];
			const rowNumber = i + 1; // +1 because line 1 is headers
			
			// Skip empty lines
			if (!line.trim()) {
				warnings.push({
					row: rowNumber,
					message: 'Empty row skipped'
				});
				continue;
			}
			
			try {
				const fields = parseCSVLine(line, delimiter);
				
				// Warn if field count doesn't match headers
				if (fields.length !== headers.length) {
					warnings.push({
						row: rowNumber,
						message: `Row has ${fields.length} columns, expected ${headers.length}`
					});
				}
				
				rows.push(fields);
			} catch (error) {
				errors.push({
					row: rowNumber,
					message: error instanceof Error ? error.message : 'Failed to parse row'
				});
			}
		}
		
		return {
			headers,
			rows,
			errors,
			warnings,
			delimiter
		};
	} catch (error) {
		errors.push({
			row: 0,
			message: error instanceof Error ? error.message : 'Failed to read file'
		});
		
		return {
			headers: [],
			rows: [],
			errors,
			warnings,
			delimiter: ','
		};
	}
}

