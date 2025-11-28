/**
 * Description Cleaning Service
 * 
 * Aggressively strips noise from transaction descriptions to prepare them for embedding generation.
 * Removes transaction references, timestamps, dates, IBANs, account numbers, and common prefixes/suffixes.
 */

/**
 * Normalize a transaction description by removing noise
 */
export function normalizeDescription(description: string): string {
	if (!description || typeof description !== 'string') {
		return '';
	}

	let cleaned = description.trim();

	// ===== STEP 1: Remove "Naam: X" section (merchant name is in separate field) =====
	// Pattern: "Naam: ... Omschrijving: ..." → keep only the part after "Omschrijving:"
	
	// First, check if we have "Omschrijving:" anywhere in the string
	const omschrijvingIndex = cleaned.toLowerCase().indexOf('omschrijving:');
	if (omschrijvingIndex !== -1) {
		// Extract everything after "Omschrijving:"
		const afterOmschrijving = cleaned.substring(omschrijvingIndex + 'omschrijving:'.length).trim();
		cleaned = afterOmschrijving;
	} else if (cleaned.toLowerCase().startsWith('naam:')) {
		// No "Omschrijving:" found, but starts with "Naam:" - remove the entire "Naam: X" part
		// Match until we hit IBAN:, Kenmerk:, Valutadatum:, Pasvolgnr:, or end
		cleaned = cleaned.replace(/^Naam:\s*[^\s]+(?:\s+[^\s]+)*?\s+(?=IBAN:|Kenmerk:|Valutadatum:|Pasvolgnr:|$)/i, '');
	}
	// Also handle if it starts with "Omschrijving:" directly (after previous processing)
	cleaned = cleaned.replace(/^Omschrijving:\s*/i, '');

	// ===== STEP 2: Remove IBAN with value =====
	// Pattern: "IBAN: NL86INGB0002445588" or just the IBAN itself
	cleaned = cleaned.replace(/\bIBAN:\s*[A-Z]{2}\d{2}[A-Z0-9\s]{4,30}\b/gi, '');
	cleaned = cleaned.replace(/\b[A-Z]{2}\d{2}[A-Z]{4}\d{4,}\b/g, ''); // Standalone IBANs

	// ===== STEP 3: Remove Kenmerk with all following alphanumeric =====
	// Pattern: "Kenmerk: COAXX529027890202511171030116804183" or "Kenmerk: 20251117 02629 22012 9960271 011 1"
	cleaned = cleaned.replace(/\bKenmerk:\s*[A-Z0-9\s\-]+/gi, '');

	// ===== STEP 4: Remove Valutadatum with date =====
	// Pattern: "Valutadatum: 21-11-2025" or "Valutadatum: 2025-11-21"
	cleaned = cleaned.replace(/\bValutadatum:\s*\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4}\b/gi, '');
	cleaned = cleaned.replace(/\bValutadatum:\s*\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2}\b/gi, '');

	// ===== STEP 5: Remove URLs =====
	// Pattern: "WWW.TOESLAGEN.NL", "HTTP://...", "HTTPS://..."
	cleaned = cleaned.replace(/\bMEER\s+INFO\s+OP\s+/gi, ''); // Remove "MEER INFO OP" prefix
	cleaned = cleaned.replace(/\bWWW\.[A-Z0-9\-\.]+\.[A-Z]{2,}\b/gi, '');
	cleaned = cleaned.replace(/\bhttps?:\/\/[^\s]+/gi, '');

	// ===== STEP 6: Remove Pasvolgnr with number =====
	// Pattern: "Pasvolgnr: 904"
	cleaned = cleaned.replace(/\bPasvolgnr:\s*\d+\b/gi, '');

	// ===== STEP 7: Remove Transactie with number =====
	// Pattern: "Transactie: P00343"
	cleaned = cleaned.replace(/\bTransactie:\s*[A-Z]?\d+\b/gi, '');

	// ===== STEP 8: Remove Term/Terminal with number =====
	// Pattern: "Term: CT938159"
	cleaned = cleaned.replace(/\bTerm:\s*[A-Z]{0,2}\d+\b/gi, '');
	cleaned = cleaned.replace(/\bTerminal:\s*[A-Z]{0,2}\d+\b/gi, '');

	// ===== STEP 9: Remove Datum/Tijd with timestamp =====
	// Pattern: "Datum/Tijd: 18-11-2025 15:55:49"
	cleaned = cleaned.replace(/\bDatum\/Tijd:\s*\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4}\s+\d{1,2}:\d{2}(:\d{2})?\b/gi, '');

	// ===== STEP 10: Remove transaction codes with dots =====
	// Pattern: "INSH.1291853.00", "ABC.123.45"
	cleaned = cleaned.replace(/\b[A-Z]{2,6}\.\d+\.?\d*\b/gi, '');

	// ===== STEP 11: Remove Machtiging ID and Incassant ID =====
	// Pattern: "Machtiging ID: 304774470001", "Incassant ID: NL35ZZZ404094950000"
	cleaned = cleaned.replace(/\bMachtiging\s+ID:\s*[A-Z0-9\-]+\b/gi, '');
	cleaned = cleaned.replace(/\bIncassant\s+ID:\s*[A-Z0-9\-]+\b/gi, '');

	// ===== STEP 12: Remove "Doorlopende incasso" / "Eerste incasso" =====
	cleaned = cleaned.replace(/\b(Doorlopende|Eerste)\s+incasso\b/gi, '');

	// ===== STEP 13: Remove standalone dates (keep times - not in date field) =====
	// Pattern: "12-11-2025", "2025-11-21"
	cleaned = cleaned.replace(/\b\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4}\b/g, '');
	cleaned = cleaned.replace(/\b\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2}\b/g, '');
	// Note: Times like "15:53" are kept - they're useful context not stored elsewhere

	// ===== STEP 14: Remove long numeric sequences (account numbers, references) =====
	// Pattern: 10+ digit numbers (keep shorter ones like invoice numbers "17048892")
	cleaned = cleaned.replace(/\b\d{10,}\b/g, '');

	// ===== STEP 15: Remove NR. with number =====
	// Pattern: "NR. 189039188T500011"
	cleaned = cleaned.replace(/\bNR\.\s*[A-Z0-9]+\b/gi, '');

	// ===== STEP 16: Remove Polis (insurance policy) numbers =====
	// Pattern: "Polis 7259360"
	cleaned = cleaned.replace(/\bPolis\s+\d+\b/gi, '');

	// ===== STEP 17: Remove Factuurnummer/Invoice numbers =====
	// Pattern: "FACTUURNUMMER:91381682", "Factuur Nr 320132572487"
	cleaned = cleaned.replace(/\bFACTUURNUMMER\s*:?\s*\d+\b/gi, '');
	cleaned = cleaned.replace(/\bFactuur\s+Nr\.?\s*\d+\b/gi, '');

	// ===== STEP 18: Remove Klant Nr (customer number) =====
	// Pattern: "Klant Nr 14955558/381592919"
	cleaned = cleaned.replace(/\bKlant\s+Nr\.?\s*[\d\/]+\b/gi, '');

	// ===== STEP 19: Remove No. with reference numbers =====
	// Pattern: "No.304774476628508/26.9.2025"
	cleaned = cleaned.replace(/\bNo\.\s*[\d\/\.]+\b/gi, '');

	// ===== STEP 20: Remove loan/mortgage references =====
	// Pattern: "INZ LENING 31469191", "VERVALDAT 01.11.2025", "LD 31469191101", "VVDNR 109"
	cleaned = cleaned.replace(/\bINZ\s+LENING\s+\d+\b/gi, '');
	cleaned = cleaned.replace(/\bVERVALDAT\s+[\d\.\-\/]+\b/gi, '');
	cleaned = cleaned.replace(/\bLD\s+\d+\b/gi, '');
	cleaned = cleaned.replace(/\bVVDNR\s+\d+\b/gi, '');

	// ===== STEP 21: Remove long alphanumeric codes/hashes =====
	// Pattern: "2uaw4w08hfgahjizn3rxpzdlukmd54eni97", "SDDD2143B0CD2C24B9A8729325F4CBAAC3E"
	// Match 20+ character alphanumeric strings (likely random codes)
	cleaned = cleaned.replace(/\b[A-Za-z0-9]{20,}\b/g, '');

	// ===== STEP 22: Remove UUIDs =====
	// Pattern: "4e83537c-b09f-416a-83c5-ec44751b285f"
	cleaned = cleaned.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '');

	// ===== STEP 23: Remove "ZIE DETAILS OP" / portal references =====
	// Pattern: "ZIE DETAILS OP MIJN.NN", "zie ziggo.nl/mijnziggo"
	cleaned = cleaned.replace(/\bZIE\s+DETAILS\s+OP\s+[A-Z0-9\.\/]+\b/gi, '');
	cleaned = cleaned.replace(/\bzie\s+[a-z0-9\.]+\.nl\/[a-z0-9]+\b/gi, '');

	// ===== STEP 24: Remove "Betaling van X" prefix =====
	// Pattern: "Betaling van J ENGELSMAN CJ"
	cleaned = cleaned.replace(/\bBetaling\s+van\s+[A-Z][A-Za-z\s]+\b/gi, '');

	// ===== STEP 25: Remove "via X" intermediary (except Tikkie - useful for categorization) =====
	// Pattern: "via Worldline NV/SA", "via Rabo Zakelijk Betaalverzoek" but NOT "via Tikkie"
	cleaned = cleaned.replace(/\bvia\s+(?!Tikkie)[A-Za-z0-9\s\/\.]+(?:NV|SA|BV|Betaalverzoek|Stichting)\b/gi, '');

	// ===== STEP 26: Remove MAAND prefix =====
	// Pattern: "MAAND DEC.", "MAAND NOV."
	cleaned = cleaned.replace(/\bMAAND\s+[A-Z]{3,}\.?\b/gi, '');

	// ===== STEP 27: Remove savings account reference NUMBERS (keep "Naar/Van Oranje spaarrekening") =====
	// Pattern: Keep "Naar Oranje spaarrekening" but remove "Z16452116 Afronding"
	cleaned = cleaned.replace(/\b(Oranje\s+spaarrekening)\s+[A-Z]\d+\s*(Afronding|over)?\b/gi, '$1');
	// Also remove standalone Z-numbers (savings account refs)
	cleaned = cleaned.replace(/\bZ\d{8,}\b/g, '');

	// ===== STEP 28: Remove credit card account references =====
	// Pattern: "Accountnr 210023808855"
	cleaned = cleaned.replace(/\bAccountnr\s+\d+\b/gi, '');
	// Pattern: "Voor info zie creditcardoverzicht"
	cleaned = cleaned.replace(/\bVoor\s+info\s+zie\s+creditcardoverzicht\b/gi, '');
	// Pattern: "ZIE REKENINGOVERZICHT 03-01-2025"
	cleaned = cleaned.replace(/\bZIE\s+REKENINGOVERZICHT\s*[\d\-\/]*\b/gi, '');

	// ===== STEP 29: Remove bank cost date ranges =====
	// Pattern: "1 okt t/m 31 okt 2025" (keep ING BANK N.V. - might be useful)
	cleaned = cleaned.replace(/\b\d{1,2}\s+[a-z]{3}\s+t\/m\s+\d{1,2}\s+[a-z]{3}\s+\d{4}\b/gi, '');
	// Pattern: "Periode oktober 2025", "Periode 2025-03S"
	cleaned = cleaned.replace(/\bPeriode\s+[a-z]+\s+\d{4}\b/gi, '');
	cleaned = cleaned.replace(/\bPeriode\s+\d{4}[\-\/][A-Z0-9]+\b/gi, '');

	// ===== STEP 30: Remove payment processor transaction IDs =====
	// Pattern: Short hex codes like "tra425425f0e281" (12-16 chars)
	cleaned = cleaned.replace(/\btra[a-f0-9]{10,14}\b/gi, '');
	// Pattern: 32-char hex hashes (MD5)
	cleaned = cleaned.replace(/\b[a-f0-9]{32}\b/gi, '');
	// Pattern: TX-prefixed codes like "TX52924172800XT"
	cleaned = cleaned.replace(/\bTX[A-Z0-9]{10,}\b/gi, '');
	// Pattern: "trnsnr:710600616"
	cleaned = cleaned.replace(/\btrnsnr:\d+\b/gi, '');

	// ===== STEP 31: Remove merchant-specific order/transaction codes =====
	// Pattern: bol.com codes like "P1568762473", "1499444398"
	// Pattern: Coolblue codes like "FXZMVBMXBDTSZBG62GKII"
	// Pattern: Thomann codes like "74U5VLK", "71Q6YMV"
	// These are typically 7-21 char alphanumeric codes that appear alone
	// Note: 20+ char codes already handled in step 21

	// ===== STEP 32: Remove healthcare/insurance specific patterns =====
	// Pattern: "Uw eigen bijdrage voor declaratie(s): 105915013 106412548"
	cleaned = cleaned.replace(/\bUw\s+eigen\s+bijdrage\s+voor\s+declaratie\(s\):\s*[\d\s]+/gi, '');
	// Pattern: "Zie toegezonden specificatie."
	cleaned = cleaned.replace(/\bZie\s+toegezonden\s+specificatie\.?\b/gi, '');
	// Pattern: "declaratie(s): XXXX"
	cleaned = cleaned.replace(/\bdeclaratie\(s\):\s*[\d\s]+/gi, '');

	// ===== STEP 33: Remove telecom-specific patterns =====
	// Pattern: "Simyo:0644218486" - phone number after provider
	cleaned = cleaned.replace(/\bSimyo:\d{10}\b/gi, '');
	// Generic phone number pattern after colon
	cleaned = cleaned.replace(/:\s*06\d{8}\b/g, '');

	// ===== STEP 34: Remove insurance premium verbose patterns =====
	// Pattern: "cooperatie DELA premie voor DELA LeefdoorPlan polis XXXXXXX"
	cleaned = cleaned.replace(/\bcooperatie\s+DELA\s+premie\s+voor\s+DELA\s+LeefdoorPlan\s+polis\s+\d+\b/gi, '');
	// Keep just "PREMIE" and month if present
	cleaned = cleaned.replace(/\bpremie\s+voor\s+[A-Za-z\s]+polis\s+\d+\b/gi, '');

	// ===== STEP 35: Remove debtor/customer number patterns =====
	// Pattern: "Debiteurnummer: 10001649"
	cleaned = cleaned.replace(/\bDebiteurnummer:\s*\d+\b/gi, '');
	// Pattern: "Klantnummer XXXXX-X"
	cleaned = cleaned.replace(/\bKlantnummer\s+[\d\-]+\b/gi, '');
	// Pattern: "Klantnr:K018009973-2583 ER 214"
	cleaned = cleaned.replace(/\bKlantnr:[A-Z]?\d+[\-\d]*\s*[A-Z]+\s*\d*\b/gi, '');

	// ===== STEP 36: Remove BTW/VAT patterns =====
	// Pattern: "BTW-bedrag:8 97 EUR"
	cleaned = cleaned.replace(/\bBTW[\-\s]?bedrag:\s*[\d\s,\.]+\s*EUR?\b/gi, '');
	// Pattern: "BTW 67.97"
	cleaned = cleaned.replace(/\bBTW\s+[\d,\.]+\b/gi, '');

	// ===== STEP 37: Remove "Betaling via iDEAL QR-code" =====
	cleaned = cleaned.replace(/\bBetaling\s+via\s+iDEAL\s+QR[\-\s]?code\b/gi, '');

	// ===== STEP 38: Remove payment method indicators =====
	// Pattern: "Google Pay", "Apple Pay", "Samsung Pay", etc.
	cleaned = cleaned.replace(/\bGoogle\s+Pay\b/gi, '');
	cleaned = cleaned.replace(/\bApple\s+Pay\b/gi, '');
	cleaned = cleaned.replace(/\bSamsung\s+Pay\b/gi, '');
	cleaned = cleaned.replace(/\bContactloos\b/gi, '');
	cleaned = cleaned.replace(/\bContactless\b/gi, '');

	// ===== STEP 39: Remove common prefixes/suffixes =====
	const removePatterns = [
		/\b(BETALING|PAYMENT|OVERBOEKING|TRANSFER|SEPA|IDEAL|PIN|CONTACTLESS)\s*:?\s*/gi,
		/\b(INCASSO|DIRECT\s+DEBIT)\s*:?\s*/gi,
		/\bAUTOMATISCHE\s+INCASSO\s+VOOR\s+\d+\s+FACTUREN\s*:?\s*/gi,
		/\bVerzamel\s+overschrijving\s+salaris\b/gi,
		/\bBETALINGSPERIODE\s+\d+\b/gi,
		/\bOverige\s+partij:\s*/gi,
	];
	for (const pattern of removePatterns) {
		cleaned = cleaned.replace(pattern, '');
	}

	// ===== STEP 40: Remove "Naam: X" that might remain (without specific following pattern) =====
	cleaned = cleaned.replace(/\bNaam:\s*[^\s]+(\s+[^\s]+)*/i, '');

	// ===== FINAL CLEANUP =====
	// Remove extra whitespace and normalize
	cleaned = cleaned.replace(/\s+/g, ' '); // Multiple spaces to single space
	cleaned = cleaned.trim();

	// Remove leading/trailing punctuation
	cleaned = cleaned.replace(/^[,\-\.\s\(\):]+|[,\-\.\s\(\):]+$/g, '');

	// Final trim
	cleaned = cleaned.trim();

	// Return cleaned result (empty string is OK - means all was noise)
	return cleaned;
}
