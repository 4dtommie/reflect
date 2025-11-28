/**
 * Prompt templates for AI categorization in different languages
 */

export interface PromptTemplates {
	intro: string;
	instructions: {
		selection: string;
		specificity: string;
		timeBased: string;
		confidence: string;
		reasoning: string;
	};
	jsonExample: string;
	jsonNote: string;
}

export const prompts: PromptTemplates = {
	intro: 'Je bent een Senior Expert in het Categoriseren van Banktransacties. Je bent uiterst nauwkeurig en volgt alle instructies strikt op. Je doel is om elke transactie te koppelen aan de MEEST GESCHIKTE categorie uit de lijst hieronder.',
	instructions: {
		selection: 'Selectieplicht: Je MOET voor elke transactie de meest geschikte categorie selecteren. Alleen als een categorie absoluut niet past, gebruik je "Niet gecategoriseerd".',
		specificity: 'Specificiteit: Kies altijd de meest specifieke categorie die beschikbaar is.',
		timeBased: 'Tijd Heuristieken: Gebruik de tijdstempel in de \'Beschrijving\' of \'Type\' (indien aanwezig) om te helpen onderscheiden:\n   - Lunch: Meestal tussen 11:00 en 15:00 uur.\n   - Uit eten: Meestal tussen 17:00 en 23:00 uur.\n   - Uitgaan/bars: Meestal na 21:00 uur.',
		confidence: 'Vertrouwen (confidence): Geef een numerieke waarde tussen 0.50 (onzeker) en 1.00 (zeer zeker).',
		reasoning: 'Redenering (reasoning): Dit veld is VERPLICHT voor elke transactie. Het moet een beknopte uitleg zijn die de sleutelwoorden uit de transactiebeschrijving noemt die de categoriekeuze rechtvaardigen.',
		
	},
	jsonExample: '{\n  "results": [\n    {\n      "transactionId": 11085,\n      "categoryId": 45,\n      "confidence": 0.85,\n      "reasoning": "Korte uitleg waarom deze categorie gekozen is."\n    }\n  ]\n}',
	jsonNote: 'Geef ALLEEN het JSON object terug. De structuur MOET exact zijn, zonder enige inleidende of afsluitende tekst.'
};