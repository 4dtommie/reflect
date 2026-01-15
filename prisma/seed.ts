import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to create category with keywords
async function createCategoryWithKeywords(
	categoryData: {
		name: string;
		description: string | null;
		color: string | null;
		icon: string | null;
		is_default: boolean;
		created_by: number | null;
		group: string | null;
		parent_id?: number | null;
		tier?: string | null; // 'most' | 'medium' | 'less' | null
		is_variable_spending?: boolean; // true = frequent variable purchases (groceries, coffee, fuel)
		updated_at: Date;
	},
	keywords: string[]
) {
	const category = await prisma.categories.create({
		data: categoryData
	});

	if (keywords.length > 0) {
		try {
			// Remove duplicates and empty strings
			const uniqueKeywords = [...new Set(keywords.map((k) => k.trim()).filter((k) => k.length > 0))];

			if (uniqueKeywords.length > 0) {
				await (prisma as any).category_keywords.createMany({
					data: uniqueKeywords.map((keyword) => ({
						category_id: category.id,
						keyword,
						source: 'manual'
					}))
				});
				console.error(`   ✓ Added ${uniqueKeywords.length} keywords to ${categoryData.name}`);
			}
		} catch (err) {
			console.error(`❌ Error creating keywords for category ${categoryData.name}:`, err);
			throw err;
		}
	}

	return category;
}

export async function seedDatabase() {
	// Use console.error for seed logs - they're more reliably shown in terminal
	const log = (...args: any[]) => {
		console.error(...args);
	};

	log('🌱 Checking database...');

	try {
		// Check if database is already seeded by looking for existing categories
		const existingCategories = await prisma.categories.count();
		if (existingCategories > 0) {
			log('✅ Database already seeded (' + existingCategories + ' categories found). Skipping seed.');
			return;
		}

		log('📦 Database is empty, seeding now...');

		// Drop all data - start with a clean database
		// Order matters due to foreign key constraints
		log('🗑️  Dropping all existing data...');

		// Delete transactions first (they reference recurring_transactions, categories, merchants, users)
		const transactionCount = await prisma.transactions.deleteMany({});
		log(`   ✓ Deleted ${transactionCount.count} transactions`);

		// Delete recurring_transactions (references merchants, categories, users)
		const recurringCount = await prisma.recurringTransaction.deleteMany({});
		log(`   ✓ Deleted ${recurringCount.count} recurring transactions`);

		// Delete chat messages first (references conversations)
		const chatMessageCount = await (prisma as any).chatMessage.deleteMany({});
		log(`   ✓ Deleted ${chatMessageCount.count} chat messages`);

		// Delete chat conversations (references users)
		const chatConversationCount = await (prisma as any).chatConversation.deleteMany({});
		log(`   ✓ Deleted ${chatConversationCount.count} chat conversations`);

		// Delete category_keywords (references categories)
		const keywordCount = await (prisma as any).category_keywords.deleteMany({});
		log(`   ✓ Deleted ${keywordCount.count} category keywords`);

		// Delete user_categories (references categories and users)
		const userCategoryCount = await prisma.user_categories.deleteMany({});
		log(`   ✓ Deleted ${userCategoryCount.count} user category preferences`);

		// Delete variable_spending_patterns (references categories)
		const variableSpendingCount = await prisma.variableSpendingPattern.deleteMany({});
		log(`   ✓ Deleted ${variableSpendingCount.count} variable spending patterns`);

		// Delete categories (references users for created_by)
		const categoryCount = await prisma.categories.deleteMany({});
		log(`   ✓ Deleted ${categoryCount.count} categories`);

		// Delete merchants (references categories)
		const merchantCount = await prisma.merchants.deleteMany({});
		log(`   ✓ Deleted ${merchantCount.count} merchants`);

		// Delete insight definitions
		const insightDefCount = await (prisma as any).insightDefinition.deleteMany({});
		log(`   ✓ Deleted ${insightDefCount.count} insight definitions`);

		log('✅ Database cleared - all transactions, categories, chats, and insights removed');

		// Verify category_keywords table is accessible
		try {
			const keywordCount = await (prisma as any).category_keywords.count();
			log(`✅ category_keywords table accessible (current count: ${keywordCount})`);
		} catch (err) {
			log('❌ Error accessing category_keywords table:', err);
			log('   Make sure you ran: npx prisma generate');
			throw err;
		}

		// ============================================
		// INCOME CATEGORIES (group: income)
		// ============================================

		const salary = await createCategoryWithKeywords(
			{
				name: 'Salaris',
				description: 'Loon uit dienstverband of als zelfstandige',
				color: '#f7c948',
				icon: 'Briefcase',
				is_default: true,
				created_by: null,
				group: 'income',
				tier: 'most',
				updated_at: new Date()
			},
			[
				'salaris',
				'salarisadministratie',
				'salarisverwerking',
				'loon',
				'loonbetaling',
				'loondienst',
				'loonstrook',
				'payroll',
				'werkgever',
				'salary',
				'wage',
				'income',
				'paycheck',
				'inkomen',
				'uitbetaling',
				'inkomsten',
				'maandloon',
				'nettoloon',
				'brutoloon'
			]
		);

        const taxReturns = await createCategoryWithKeywords(
			{
			name: 'Belasting & toeslagen',
			description: 'Alleen positieve bedragen mbt belasting en subsidies (NIET: kinderopvangtoeslag of huurtoeslag, die gaan naar Kinderopvang en woning categorie)',
			color: '#f7c948',
				icon: 'FileText',
				is_default: true,
				created_by: null,
				group: 'income',
				tier: 'medium',
				updated_at: new Date()
			},
			[
				'belastingdienst',
				'belasting',
				'teruggave',
				'belastingteruggave',
				'voorlopige teruggave',
				'voorlopige aanslag',
				'rvo',
				'subsidie',
				'rijksoverheid',
				'overheid',
				'gemeente',
				'toeslag',
				'zorgtoeslag',
				'kinderbijslag',
				'svb',
				'duo',
				'studiefinanciering',
				'belastingdienst.nl',
				'rijksoverheid.nl',
				'gemeente',
				'provincie',
				'waterschap',
				'belastingaangifte',
				'inkomstenbelasting',
				'teruggaaf',
				'belasting teruggaaf',
				'toeslagen',
				'overheidstoeslag',
				'overheidsbijdrage'
			]
		);

		const otherIncome = await createCategoryWithKeywords(
			{
				name: 'Overig inkomen',
				description: 'Divers inkomen, dit zal bijna niet voorkomen. Probeer eerst te kijken of het bijvoorbeeld een teruggave is voor de kleding categorie of vergelijkbare situaties.',
				color: '#f7c948',
				icon: 'DollarSign',
				is_default: true,
				created_by: null,
				group: 'income',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'inkomen',
				'income',
				'inkomsten',
				'overig',
				'other income',
				'divers inkomen',
				'extra inkomen',
				'bijverdienste',
				'neveninkomsten',
				'particulier inkomen',
				'particulier',
				'inkomsten overig',
				'overige inkomsten',
				'extra inkomsten',
				'bijbaan',
				'freelance',
				'zzp',
				'zelfstandige',
				'ondernemer',
				'inkomstenbron'
			]
		);

		log('✅ Created 3 income categories');

		// ============================================
		// EXPENSE CATEGORIES - PARENTS FIRST
		// ============================================

		// Food & Groceries (parent)
		const foodGroceries = await createCategoryWithKeywords(
			{
				name: 'Eten & boodschappen',
				description: 'Hoofdcategorie voor eten en boodschappen (gebruik subcategorieën voor categorisering)',
				color: '#6dab65',
				icon: 'ShoppingCart',
				is_default: true,
				created_by: null,
				group: 'essential',
				updated_at: new Date()
			},
			[] // Empty - parent category only
		);

		// Restaurants & Dining (parent)
		const restaurantsDining = await createCategoryWithKeywords(
			{
				name: 'Restaurants & uit eten',
				description: 'Hoofdcategorie voor uit-eten gerelateerde uitgaven (gebruik subcategorieën voor categorisering)',
				color: '#6dab65',
				icon: 'Utensils',
				is_default: true,
				created_by: null,
				group: 'lifestyle',
				updated_at: new Date()
			},
			[] // Empty - parent category only
		);

		// Transportation (parent)
		const transportation = await createCategoryWithKeywords(
			{
				name: 'Vervoer',
				description: 'Hoofdcategorie voor vervoerskosten (gebruik subcategorieën voor categorisering)',
				color: '#8d8d8d',
				icon: 'Car',
				is_default: true,
				created_by: null,
				group: 'essential',
				updated_at: new Date()
			},
			[] // Empty - parent category only
		);

		// Shopping (parent)
		const shopping = await createCategoryWithKeywords(
			{
				name: 'Winkelen',
				description: 'Hoofdcategorie voor retail aankopen (gebruik subcategorieën voor categorisering)',
				color: '#7b77b6',
				icon: 'ShoppingBag',
				is_default: true,
				created_by: null,
				group: 'lifestyle',
				updated_at: new Date()
			},
			[] // Empty - parent category only
		);

		// Hobbies & Leisure (parent)
		const hobbiesLeisure = await createCategoryWithKeywords(
			{
				name: 'Hobby\'s & vrije tijd',
				description: 'Hoofdcategorie voor hobby\'s en vrijetijdsactiviteiten (gebruik subcategorieën voor categorisering)',
				color: '#f37b2b',
				icon: 'Palette',
				is_default: true,
				created_by: null,
				group: 'lifestyle',
				updated_at: new Date()
			},
			[] // Empty - parent category only
		);

		// Housing (parent)
		const wonen = await createCategoryWithKeywords(
			{
				name: 'Wonen',
				description: 'Hoofdcategorie voor woonkosten (gebruik subcategorieën voor categorisering)',
				color: '#75a0ce',
				icon: 'Home',
				is_default: true,
				created_by: null,
				group: 'essential',
				updated_at: new Date()
			},
			[] // Empty - parent category only
		);

		// ============================================
		// FOOD & GROCERIES SUBCATEGORIES
		// ============================================

		await createCategoryWithKeywords(
			{
				name: 'Boodschappen',
				description: 'Grote supermarkten, buurtwinkels en online boodschappenbezorging',
				color: '#6dab65',
				icon: 'ShoppingCart',
				is_default: true,
				created_by: null,
				parent_id: foodGroceries.id,
				group: 'essential',
				tier: 'most',
				is_variable_spending: true,
				updated_at: new Date()
			},
			[
				'albert heijn',
				'ah',
				'jumbo',
				'aldi',
				'lidl',
				'plus',
				'coop',
				'spar',
				'vomar',
				'dirk',
				'hoogvliet',
				'picnic',
				'crisp',
				'flink',
				'supermarkt',
				'boodschappen',
				'deka markt',
				'jan linders',
				'poiesz',
				'ekoplaza'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Slager',
				description: 'Slagerijen en vleeswinkels',
				color: '#9bc595',
				icon: 'Drumstick',
				is_default: true,
				created_by: null,
				parent_id: foodGroceries.id,
				group: 'essential',
				tier: 'less',
				is_variable_spending: true,
				updated_at: new Date()
			},
			[
				'butcher',
				'slager',
				'slagerij',
				'vlees',
				'meat',
				'vleeswaren',
				'keurslager',
				'keurslagerij',
				'poelier',
				'poelierij',
				'vleeswarenwinkel',
				'vleeswinkel',
				'vleesboer',
				'vleesboerderij',
				'biologische slager',
				'biologisch vlees',
				'halal slager',
				'halal vlees'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Bakker',
				description: 'Bakkerijen en broodwinkels',
				color: '#9bc595',
				icon: 'Wheat',
				is_default: true,
				created_by: null,
				parent_id: foodGroceries.id,
				group: 'essential',
				tier: 'less',
				is_variable_spending: true,
				updated_at: new Date()
			},
			[
				'baker',
				'bakker',
				'bakkerij',
				'bread',
				'brood',
				'pastry',
				'gebak',
				'broodwinkel',
				'broodjeszaak',
				'patisserie',
				'banketbakker',
				'banketbakkerij',
				'ambachtelijke bakker',
				'biologische bakker',
				'brood & banket',
				'brood en banket',
				'warme bakker',
				'koud bakker'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Speciaalzaken',
				description: 'Delicatessenzaken, speciaalzaken, biologische winkels, natuurvoedingswinkels, kaaswinkels, etc.',
				color: '#bad7b6',
				icon: 'Leaf',
				is_default: true,
				created_by: null,
				parent_id: foodGroceries.id,
				group: 'essential',
				tier: 'less',
				is_variable_spending: true,
				updated_at: new Date()
			},
			[
				'marqt',
				'natuurwinkel',
				'biologisch',
				'delicatessen',
				'kaaswinkel',
				'kaasboer',
				'wijnhandel',
				'boerenmarkt',
				'speciaalzaak',
				'toko',
				'reformwinkel',
				'notenbar',
				'ekoplaza',
				'odin',
				'biowinkel',
				'biologische winkel',
				'natuurvoedingswinkel',
				'kaasboerderij',
				'kaashandel',
				'wijnwinkel',
				'wijnboer',
				'viswinkel',
				'visboer',
				'visboerderij',
				'zuivelboerderij',
				'boerenwinkel',
				'streekproducten',
				'ambachtelijke winkel',
				'ambachtelijke producten'
			]
		);

		log('✅ Created Food & Groceries with 4 subcategories');

		// ============================================
		// RESTAURANTS & DINING SUBCATEGORIES
		// ============================================

		await createCategoryWithKeywords(
			{
				name: 'Koffie',
				description: 'Koffiezaken en cafés, gebruik hiervoor ook de tijd als die beschikbaar is (vaak tussen 8:00 en 11:00), bedragen vaak tussen 3 en 6 euro',
				color: '#9bc595',
				icon: 'Coffee',
				is_default: true,
				created_by: null,
				parent_id: restaurantsDining.id,
				group: 'lifestyle',
				tier: 'most',
				is_variable_spending: true,
				updated_at: new Date()
			},
			[
				'starbucks',
				'coffeecompany',
				'coffee company',
				'bagels & beans',
				'koffie',
				'cafe',
				'café',
				'espresso',
				'barista',
				'lebkov',
				'anne & max',
				'koffiebar',
				'doppio',
				'illy',
				'nespresso'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Snacks',
				description: 'Automaten, kleine aankopen, snoep, snacks - vaak bedragen rond 1 tot 2 euro, vergelijkbaar met koffie maar goedkoper',
				color: '#bad7b6',
				icon: 'Cookie',
				is_default: true,
				created_by: null,
				parent_id: restaurantsDining.id,
				group: 'lifestyle',
				tier: 'less',
				is_variable_spending: true,
				updated_at: new Date()
			},
			[
				'vending',
				'automaat',
				'snack',
				'snoep',
				'candy',
				'selecta',
				'vendingmachine',
				'vending machine',
				'snackautomaat',
				'snack automaat',
				'snoepautomaat',
				'drankautomaat',
				'koekje',
				'chips'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Lunch',
				description: 'Lunchmaaltijden en snacks (dit zijn vaak restaurants, cafes, bakkers, tankstations en dergelijke maar dan te identificeren door bedragen rond 10 euro het tijstip (tussen 11:00 en 14:00',
				color: '#9bc595',
				icon: 'Sandwich',
				is_default: true,
				created_by: null,
				parent_id: restaurantsDining.id,
				group: 'lifestyle',
				tier: 'medium',
				is_variable_spending: true,
				updated_at: new Date()
			},
			[
				'lunch',
				'broodje',
				'broodjeszaak',
				'subway',
				'backwerk',
				'la place',
				'smullers',
				'febo',
				'kwalitaria',
				'sandwich',
				'saladebar',
				'lunchroom'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Uit eten',
				description: 'Restaurantmaaltijden (diner, avondeten, vooral te identificeren door tijdstip na 17:00)',
				color: '#6dab65',
				icon: 'UtensilsCrossed',
				is_default: true,
				created_by: null,
				parent_id: restaurantsDining.id,
				group: 'lifestyle',
				tier: 'medium',
				is_variable_spending: true,
				updated_at: new Date()
			},
			[
				'restaurant',
				'dining',
				'dinner',
				'uit eten',
				'eten',
				'eetcafé',
				'eetcafe',
				'brasserie',
				'bistro',
				'trattoria',
				'steakhouse',
				'grill',
				'pizzeria',
				'fine dining',
				'gastronomie',
				'avondeten',
				'dineren',
				'eten buiten de deur',
				'shabu shabu',
				'vapiano',
				'wagamama',
				'five guys',
				'mcdonald\'s',
				'mcdonalds',
				'burger king',
				'kfc',
				'domino\'s',
				'dominos',
				'new york pizza',
				'pizza hut',
				'la place',
				'smullers',
				'febo',
				'wok to walk',
				'sushi point',
				'sumo',
				'wok & roll',
				'wok away',
				'wok express',
				'wok to go'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Bestellen',
				description: 'Maaltijdbezorging en afhaalmaaltijden, verschilt vaak van uit eten door het bedrag dat lager is dan 50 euro',
				color: '#9bc595',
				icon: 'ShoppingBag',
				is_default: true,
				created_by: null,
				parent_id: restaurantsDining.id,
				group: 'lifestyle',
				tier: 'medium',
				is_variable_spending: true,
				updated_at: new Date()
			},
			[
				'food delivery',
				'takeout',
				'thuisbezorgd',
				'uber eats',
				'deliveroo',
				'bezorging',
				'afhalen',
				'thuisbezorgd.nl',
				'ubereats',
				'deliveroo.nl',
				'dominos',
				'domino\'s',
				'pizzahut',
				'new york pizza',
				'pizza hut',
				'pizza bestellen',
				'maaltijdbezorging',
				'maaltijd bezorging',
				'afhaalmaaltijd',
				'afhaal maaltijd',
				'bezorgmaaltijd',
				'bezorg maaltijd',
				'food ordering',
				'online bestellen',
				'eten bestellen',
				'maaltijd bestellen'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Uitgaan/bars',
				description: 'Uitgaan, bars, drankjes, discotheken, nachtleven (vooral te identificeren door tijdstip na 21:00)',
				color: '#bad7b6',
				icon: 'Wine',
				is_default: true,
				created_by: null,
				parent_id: restaurantsDining.id,
				group: 'lifestyle',
				tier: 'less',
				is_variable_spending: true,
				updated_at: new Date()
			},
			[
				'uitgaan',
				'bar',
				'kroeg',
				'café',
				'cafe',
				'cocktailbar',
				'wijnbar',
				'brouwerij',
				'discotheek',
				'nachtclub',
				'club',
				'bier',
				'borrel'
			]
		);

		log('✅ Created Restaurants & Dining with 5 subcategories');

		// ============================================
		// TRANSPORTATION SUBCATEGORIES
		// ============================================

		await createCategoryWithKeywords(
			{
				name: 'Auto en fiets betalingen',
				description: 'Lening of lease bedrag voor een auto of fiets (swapbike, fietsenwinkels), bedrag is vaak hoger dan 300 euro voor auto, rond 30-50 euro per maand voor fiets',
				color: '#8d8d8d',
				icon: 'Car',
				is_default: true,
				created_by: null,
				parent_id: transportation.id,
				group: 'essential',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'lease',
				'leaseplan',
				'ald automotive',
				'arval',
				'alphabet',
				'autolening',
				'autolease',
				'leasebetaling',
				'auto financiering',
				'terberg',
				'justlease',
				'swapfiets',
				'swap fiets',
				'swapbike',
				'swap bike',
				'fietslease',
				'fiets lease',
				'bike lease',
				'fietsabonnement',
				'fiets abonnement'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Brandstof',
				description: 'Benzine, diesel, opladen voor elektrische voertuigen, bedragen lager dan 15 euro zijn eerder lunch of boodschappen',
				color: '#9c9c9c',
				tier: 'most',
				icon: 'Fuel',
				is_default: true,
				created_by: null,
				parent_id: transportation.id,
				group: 'essential',
				is_variable_spending: true,
				updated_at: new Date()
			},
			[
				'shell',
				'bp',
				'esso',
				'total',
				'totalenergies',
				'tinq',
				'tango',
				'avia',
				'texaco',
				'q8',
				'gulf',
				'tankstation',
				'benzine',
				'diesel',
				'fastned',
				'allego',
				'laadpaal',
				'laadstation'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Openbaar vervoer',
				description: 'Openbaar vervoer',
				color: '#9c9c9c',
				icon: 'Train',
				is_default: true,
				created_by: null,
				parent_id: transportation.id,
				group: 'essential',
				tier: 'most',
				is_variable_spending: true,
				updated_at: new Date()
			},
			[
				'ns',
				'nederlandse spoorwegen',
				'ov-chipkaart',
				'ov chipkaart',
				'gvb',
				'ret',
				'htm',
				'connexxion',
				'arriva',
				'keolis',
				'qbuzz',
				'flixbus',
				'trein',
				'bus',
				'tram',
				'metro',
				'openbaar vervoer',
				'ovpay'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Parkeren',
				description: 'Parkeerkosten, parkeervergunningen',
				color: '#bababa',
				icon: 'SquareParking',
				is_default: true,
				created_by: null,
				parent_id: transportation.id,
				group: 'essential',
				tier: 'medium',
				is_variable_spending: true,
				updated_at: new Date()
			},
			[
				'parking',
				'parkeren',
				'parking fee',
				'parkeergeld',
				'parking permit',
				'q-park',
				'interparking',
				'parkbee',
				'parkmobile',
				'parkline',
				'parkeergarage',
				'parkeerplaats',
				'parkeerkaart',
				'parkeerautomaat',
				'parkeervergunning',
				'parkeertarief',
				'parkeerkosten',
				'betaald parkeren',
				'parkeer betaald',
				'parkeer betaalautomaat',
				'parkeer betaalpaal',
				'parkeer betaalterminal',
				'parkeer betaalzuil'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Onderhoud & reparaties',
				description: 'Auto-onderhoud, reparaties, keuringen, banden',
				color: '#bababa',
				icon: 'Wrench',
				is_default: true,
				created_by: null,
				parent_id: transportation.id,
				group: 'essential',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'apk',
				'garage',
				'autogarage',
				'kwikfit',
				'profile',
				'euromaster',
				'banden',
				'onderhoud',
				'reparatie',
				'wasstraat',
				'autowasstraat',
				'carwash',
				'autoschade',
				'carglass'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Taxi & deelvervoer',
				description: 'Taxis, Uber, Lyft, andere deelvervoersdiensten',
				color: '#9c9c9c',
				icon: 'Taxi',
				is_default: true,
				created_by: null,
				parent_id: transportation.id,
				group: 'essential',
				tier: 'less',
				is_variable_spending: true,
				updated_at: new Date()
			},
			[
				'uber',
				'bolt',
				'taxi',
				'taxicentrale',
				'greenwheels',
				'mywheels',
				'snappcar',
				'felyx',
				'lime',
				'go sharing',
				'check',
				'deelauto',
				'deelscooter',
				'sixt'
			]
		);

		log('✅ Created Transportation with 6 subcategories');

		// ============================================
		// SHOPPING SUBCATEGORIES
		// ============================================

		await createCategoryWithKeywords(
			{
				name: 'Kleding',
				description: 'Kleding, schoenen, accessoires',
				color: '#9b98c8',
				icon: 'Shirt',
				is_default: true,
				created_by: null,
				parent_id: shopping.id,
				group: 'lifestyle',
				tier: 'medium',
				updated_at: new Date()
			},
			[
				'clothing',
				'clothes',
				'kleding',
				'shoes',
				'schoenen',
				'accessories',
				'accessoires',
				'fashion',
				'mode',
				'h&m',
				'zara',
				'pull&bear',
				'bershka',
				'primark',
				'c&a',
				'we fashion',
				'bijenkorf',
				'wibra',
				'zeeman',
				'hm',
				'mango',
				'massimo dutti',
				'stradivarius',
				'only',
				'vero moda',
				'jack & jones',
				'selected',
				'name it',
				'reserved',
				'new yorker',
				'pepe jeans',
				'g-star',
				'scotch & soda',
				'denham',
				'denim',
				'kledingwinkel',
				'modezaak',
				'fashion store',
				'kledingzaak'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Elektronica',
				description: 'Elektronica, computers, telefoons, gadgets',
				color: '#8c88bf',
				icon: 'Smartphone',
				is_default: true,
				created_by: null,
				parent_id: shopping.id,
				group: 'lifestyle',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'mediamarkt',
				'coolblue',
				'bol.com',
				'amazon',
				'apple',
				'samsung',
				'alternate',
				'azerty',
				'belsimpel',
				'elektronica',
				'computer',
				'telefoon',
				'laptop',
				'tablet',
				'expert',
				'bcc'
			]);

		await createCategoryWithKeywords(
			{
				name: 'Algemene retail',
				description: 'Andere retail aankopen die niet in andere subcategorieën passen',
				color: '#b9b7d8',
				icon: 'ShoppingBag',
				is_default: true,
				created_by: null,
				parent_id: shopping.id,
				group: 'lifestyle',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'shopping',
				'retail',
				'store',
				'winkel',
				'general',
				'algemeen',
				'hema',
				'action',
				'kruidvat',
				'etos',
				'douglas',
				'ici paris xl',
				'rituals',
				'body shop',
				'lush',
				'bijenkorf',
				'de bijenkorf',
				'v&d',
				'vroom & dreesmann',
				'de bazaar',
				'big bazaar',
				'wibra',
				'zeeman',
				'retail store',
				'winkelcentrum',
				'shopping center',
				'winkelstraat',
				'retailwinkel',
				'algemene winkel',
				'diverse winkel'
			]
		);

		log('✅ Created Shopping with 4 subcategories');

		// ============================================
		// STANDALONE EXPENSE CATEGORIES
		// ============================================

		await createCategoryWithKeywords(
			{
				name: 'Energie/water',
				description: 'Elektriciteit, gas, water en gemeentelijke voorzieningen (afval, riool, gemeentelijke belastingen)',
				color: '#75a0ce',
				icon: 'Zap',
				is_default: true,
				created_by: null,
				group: 'essential',
				tier: 'most',
				updated_at: new Date()
			},
			[
				'eneco',
				'essent',
				'vattenfall',
				'greenchoice',
				'budgetenergie',
				'vandebron',
				'engie',
				'energiedirect',
				'oxxio',
				'pure energie',
				'om | nieuwe energie',
				'frank energie',
				'anwb energie',
				'energie van onbekend',
				'energyswitch',
				'energievergelijk',
				'vitens',
				'waternet',
				'evides',
				'brabant water',
				'pwn',
				'dunea',
				'energie',
				'water',
				'gas',
				'stroom',
				'elektriciteit',
				'nutstotaal',
				'liander',
				'stedin',
				'een',
				'westland infranet'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'TV/internet/telefoon',
				description: 'Internet, telefoon, TV en kabelabonnementen',
				color: '#9fbddd',
				icon: 'Wifi',
				is_default: true,
				created_by: null,
				group: 'essential',
				tier: 'most',
				updated_at: new Date()
			},
			[
				'ziggo',
				'kpn',
				'odido',
				't-mobile',
				'vodafone',
				'tele2',
				'youfone',
				'simyo',
				'hollandsnieuwe',
				'ben',
				'lebara',
				'internet',
				'telefoon',
				'tv',
				'glasvezel',
				'mobiel'
			]
		);

		// ============================================
		// WONEN SUBCATEGORIES
		// ============================================

		await createCategoryWithKeywords(
			{
				name: 'Huur/hypotheek',
				description: 'Maandelijkse huur of hypotheekbetalingen',
				color: '#75a0ce',
				icon: 'Home',
				is_default: true,
				created_by: null,
				parent_id: wonen.id,
				group: 'essential',
				tier: 'most',
				updated_at: new Date()
			},
			[
				'rent',
				'mortgage',
				'huur',
				'hypotheek',
				'hypotheken',
				'aflossing',
				'lening',
				'wooncorporatie',
				'woningcorporatie',
				'woningstichting',
				'huurtoeslag',
				'huurverhoging',
				'huurprijs',
				'maandhuur',
				'hypotheekrente',
				'hypotheekbetaling',
				'hypotheeklasten',
				'nationale nederlanden',
				'nn',
				'achmea',
				'vereniging eigen huis',
				'veh',
				'ozb',
				'ozb belasting',
				'woonlasten',
				'woonkosten'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Klussen',
				description: 'Bouwmarkten, gereedschap, klus- en verbouwmaterialen',
				color: '#9fbddd',
				icon: 'Wrench',
				is_default: true,
				created_by: null,
				parent_id: wonen.id,
				group: 'essential',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'karwei',
				'praxis',
				'gamma',
				'formido',
				'hornbach',
				'bouwmarkt',
				'bouwmaat',
				'gereedschap',
				'doe het zelf',
				'diy',
				'klussen',
				'verbouwen',
				'verf',
				'verfwinkel',
				'hout',
				'bouwmaterialen',
				'ijzerwaren',
				'toolstation',
				'hubo'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Tuin',
				description: 'Tuincentra, planten, tuinmeubels, tuingereedschap',
				color: '#bbd0e7',
				icon: 'Flower2',
				is_default: true,
				created_by: null,
				parent_id: wonen.id,
				group: 'lifestyle',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'intratuin',
				'tuincentrum',
				'garden center',
				'gardencenter',
				'tuin',
				'planten',
				'bloemen',
				'tuinmeubels',
				'tuingereedschap',
				'groenrijk',
				'ranzijn',
				'oosterik',
				'hamiplant',
				'de boet',
				'tuinland',
				'fonteyn',
				'outdoor',
				'terras'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Woninginrichting',
				description: 'Meubels, woningdecoratie, huishoudelijke apparaten',
				color: '#bbd0e7',
				icon: 'Sofa',
				is_default: true,
				created_by: null,
				parent_id: wonen.id,
				group: 'lifestyle',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'ikea',
				'leen bakker',
				'loods 5',
				'kwantum',
				'blokker',
				'xenos',
				'hema',
				'meubels',
				'furniture',
				'meubelwinkel',
				'meubelzaak',
				'woningdecoratie',
				'decoratie',
				'woonaccessoires',
				'woonwinkel',
				'woonwinkels',
				'woonketen',
				'woonboulevard',
				'woonmall',
				'bank',
				'bed',
				'matras',
				'gordijnen',
				'vloerkleed',
				'lamp',
				'lampen'
			]
		);

		log('✅ Created Wonen with 4 subcategories');

		await createCategoryWithKeywords(
			{
				name: 'Gezondheidszorg',
				description: 'Medische kosten, apotheek, gezondheidsapps (NIET: sportschool/fitness - gebruik Sport categorie)',
				color: '#9b98c8',
				icon: 'Heart',
				is_default: true,
				created_by: null,
				group: 'essential',
				tier: 'medium',
				updated_at: new Date()
			},
			[
				'health',
				'medical',
				'pharmacy',
				'doctor',
				'hospital',
				'gezondheid',
				'medisch',
				'apotheek',
				'arts',
				'ziekenhuis',
				'health app',
				'myfitnesspal',
				'kruidvat',
				'etos',
				'davipharm',
				'apotheek',
				'apotheek online',
				'medicijnen',
				'medicatie',
				'huisarts',
				'tandarts',
				'fysiotherapeut',
				'fysio',
				'psycholoog',
				'psychiater',
				'ziekenfonds',
				'zorgverzekering',
				'zorgverzekeraar',
				'zilveren kruis',
				'cz',
				'vgz',
				'menzis',
				'ditzo',
				'zorgkosten',
				'eigen risico',
				'medische kosten',
				'gezondheidszorg',
				'zorg'
			]
		);

		// ============================================
		// HOBBIES & LEISURE SUBCATEGORIES
		// ============================================

		await createCategoryWithKeywords(
			{
				name: 'Entertainment',
				description: 'Films, streaming, games, entertainmentabonnementen.',
				color: '#f37b2b',
				icon: 'Film',
				is_default: true,
				created_by: null,
				parent_id: hobbiesLeisure.id,
				group: 'lifestyle',
				tier: 'most',
				updated_at: new Date()
			},
			[
				'netflix',
				'spotify',
				'disney+',
				'disney plus',
				'hbo max',
				'videoland',
				'prime video',
				'amazon prime',
				'apple tv',
				'youtube premium',
				'playstation',
				'xbox',
				'nintendo',
				'steam',
				'pathe',
				'bioscoop',
				'streaming',
				'gaming'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Sport',
				description: 'Sportschoolabonnementen, fitness, sportartikelen',
				color: '#f7a873',
				icon: 'Dumbbell',
				is_default: true,
				created_by: null,
				parent_id: hobbiesLeisure.id,
				group: 'lifestyle',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'gym',
				'fitness',
				'sportschool',
				'sports',
				'workout',
				'personal trainer',
				'yoga',
				'pilates',
				'sports equipment',
				'sporting goods',
				'sports events',
				'tickets',
				'strava',
				'basic fit',
				'fit for free',
				'fit'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Boeken/tijdschriften/games',
				description: 'Boeken, tijdschriften en tijdschrift abonnementen, e-books, audioboeken, games',
				color: '#fac39f',
				icon: 'BookOpen',
				is_default: true,
				created_by: null,
				parent_id: hobbiesLeisure.id,
				group: 'lifestyle',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'book',
				'books',
				'boek',
				'boeken',
				'magazine',
				'e-book',
				'ebook',
				'audiobook',
				'kindle',
				'kobo',
				'bookstore',
				'bookshop',
				'boekenwinkel',
				'library',
				'bibliotheek',
				'bruna',
				'libris',
				'slegte',
				'donner'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Hobby',
				description: 'Hobby\'s, contributies zoals toneel of muziekverenigingen NIET: sportverenigingen (gebruik Sport), entertainment abonnementen (gebruik Entertainment)',
				color: '#f7a873',
				icon: 'Palette',
				is_default: true,
				created_by: null,
				parent_id: hobbiesLeisure.id,
				group: 'lifestyle',
				tier: 'medium',
				updated_at: new Date()
			},
			[
				'hobby',
				'hobbies',
				'vereniging',
				'verenigingscontributie',
				'contributie',
				'lidmaatschap',
				'hobbywinkel',
				'knutselen',
				'knutselspullen',
				'creatief',
				'creatieve materialen',
				'modelbouw',
				'fotografie',
				'fotoprint',
				'muziekinstrument',
				'muziekles',
				'muzieklessen',
				'hobbyclub',
				'kunst',
				'handwerk',
				'breien',
				'haken',
				'naaien',
				'schilderen',
				'tekenen',
				'puzzel',
				'legpuzzel',
				'boardgame',
				'bordspel',
				'verenigingslidmaatschap',
				'club',
				'verenigingslid',
				'culturele vereniging',
				'muziekvereniging',
				'fanfare',
				'harmonie',
				'orkest',
				'koor',
				'toneelvereniging',
				'zangvereniging'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Uitjes & activiteiten',
				description: 'Uitjes, dagjes uit, attracties, musea, theaters, concerten, festivals en andere activiteiten',
				color: '#f7a873',
				icon: 'Ticket',
				is_default: true,
				created_by: null,
				parent_id: hobbiesLeisure.id,
				group: 'lifestyle',
				tier: 'medium',
				updated_at: new Date()
			},
			[
				'uitje',
				'dagje uit',
				'attractiepark',
				'pretpark',
				'themapark',
				'museum',
				'musea',
				'theater',
				'concert',
				'concerten',
				'dierentuin',
				'zwembad',
				'festival',
				'evenement',
				'beurs',
				'tentoonstelling',
				'activiteit',
				'uitstapje',
				'culturele activiteit',
				'vrije tijd'
			]
		);

		log('✅ Created Hobbies & Leisure with 5 subcategories');

		await createCategoryWithKeywords(
			{
				name: 'Onderwijs',
				description: 'Cursussen, collegegeld, educatieve abonnementen NIET: algemene boeken of entertainment',
				color: '#fac39f',
				icon: 'GraduationCap',
				is_default: true,
				created_by: null,
				group: 'lifestyle',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'education',
				'course',
				'tuition',
				'school',
				'onderwijs',
				'cursus',
				'udemy',
				'coursera',
				'skillshare',
				'masterclass',
				'educational software',
				'duo',
				'studiefinanciering',
				'collegegeld',
				'schoolgeld',
				'lesgeld',
				'studie',
				'universiteit',
				'hogeschool',
				'mbo',
				'havo',
				'vwo',
				'basisschool',
				'voortgezet onderwijs',
				'online cursus',
				'e-learning',
				'elearning',
				'studiemateriaal',
				'studieboeken',
				'college',
				'les',
				'opleiding',
				'training',
				'workshop',
				'seminar',
				'conferentie',
				'educatie',
				'leermateriaal'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Reizen',
				description: 'Hotels, vluchten, campings, zaken in andere landen dan nederland (behalve als je een specifiekere categorie kunt vinden)',
				color: '#f7a873',
				icon: 'Plane',
				is_default: true,
				created_by: null,
				group: 'lifestyle',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'travel',
				'hotel',
				'flight',
				'vacation',
				'trip',
				'reizen',
				'vlucht',
				'vakantie',
				'booking.com',
				'expedia',
				'trivago',
				'airbnb',
				'klm',
				'transavia',
				'easyjet',
				'ryanair',
				'vueling',
				'brussels airlines',
				'lufthansa',
				'hotel',
				'resort',
				'vakantiepark',
				'camping',
				'hostel',
				'pension',
				'bed & breakfast',
				'b&b',
				'reisbureau',
				'tui',
				'corendon',
				'kras',
				'vakantie',
				'vliegticket',
				'vliegtickets',
				'hotelboeking',
				'hotel booking',
				'reis',
				'reisje',
				'citytrip',
				'city trip',
				'weekendje weg',
				'vakantiebestemming'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Verzekering',
				description: 'Zorg auto inboedel reisverzekering etc.',
				color: '#8d8d8d',
				icon: 'Shield',
				is_default: true,
				created_by: null,
				group: 'essential',
				tier: 'medium',
				updated_at: new Date()
			},
			[
				'verzekering',
				'insurance',
				'inshared',
				'centraal beheer',
				'nationale nederlanden',
				'nn',
				'ohra',
				'interpolis',
				'unive',
				'aegon',
				'asr',
				'achmea',
				'zilveren kruis',
				'cz',
				'vgz',
				'menzis',
				'ditzo',
				'fbto',
				'allianz'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Belastingen & boetes',
				description: 'Belastingen en boetes die je moet betalen (alleen negatieve bedragen, anders bij categorie belastingteruggaven)',
				color: '#a28977',
				icon: 'FileText',
				is_default: true,
				created_by: null,
				group: 'essential',
				tier: 'medium',
				updated_at: new Date()
			},
			[
				'belastingdienst',
				'belastingdienst.nl',
				'inkomstenbelasting',
				'voorlopige aanslag',
				'definitieve aanslag',
				'belastingaanslag',
				'boete',
				'verkeersboete',
				'parkeerboete',
				'cjib',
				'centraal justitieel incassobureau',
				'belasting betalen',
				'rijksoverheid',
				'gemeente belasting'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Kosten & vergoedingen',
				description: 'Voornamelijk bankkosten, deze categorie komt weinig voor',
				color: '#947965',
				icon: 'CreditCard',
				is_default: true,
				created_by: null,
				group: 'financial',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'fee',
				'charge',
				'bank fee',
				'service fee',
				'kosten',
				'bankkosten',
				'rabobank',
				'bankkosten',
				'bank kosten',
				'servicekosten',
				'service kosten',
				'administratiekosten',
				'administratie kosten',
				'beheerkosten',
				'beheer kosten',
				'kostenvergoeding',
				'vergoeding',
				'kosten',
				'fee',
				'charges',
				'bank charges',
				'bankkosten',
				'maandkosten',
				'jaarkosten',
				'periodiek kosten',
				'periodieke kosten'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Geldopnames',
				description: 'Geldopnames bij pinautomaten en geldautomaten',
				color: '#a28977',
				icon: 'Wallet',
				is_default: true,
				created_by: null,
				group: 'financial',
				tier: 'medium',
				updated_at: new Date()
			},
			['geldmaat', 'geldopname', 'cash withdrawal', 'atm', 'pinautomaat', 'geldautomaat', 'withdrawal', 'cash', 'geld opname']
		);

		await createCategoryWithKeywords(
			{
				name: 'Goede doelen & donaties',
				description: 'Goede doelen bijdragen, gebruik hier voornamelijk de bekendere organisaties of als de beschrijving duidelijk is',
				color: '#b9b7d8',
				icon: 'HeartHandshake',
				is_default: true,
				created_by: null,
				group: 'lifestyle',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'donation',
				'charity',
				'donatie',
				'goede doel',
				'unicef',
				'rode kruis',
				'wereld natuur fonds',
				'wwf',
				'greenpeace',
				'oxfam',
				'novib',
				'cordaid',
				'kippen',
				'kika',
				'kankerfonds',
				'hartstichting',
				'diabetesfonds',
				'longfonds',
				'maag lever darm stichting',
				'ms fonds',
				'parkinson vereniging',
				'alzheimer nederland',
				'goede doelen',
				'goed doel',
				'charity',
				'charitatieve organisatie',
				'donatie',
				'giften',
				'gift',
				'steun',
				'steunactie',
				'actie',
				'collecte',
				'collecteren',
				'fondsenwerving',
				'sponsoring',
				'steunactie'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Persoonlijke verzorging',
				description: 'Kappers, cosmetica, persoonlijke artikelen en drogisterijen als kruidvat of etos',
				color: '#b9b7d8',
				icon: 'Sparkles',
				is_default: true,
				created_by: null,
				group: 'lifestyle',
				tier: 'less',
				is_variable_spending: true,
				updated_at: new Date()
			},
			[
				'personal care',
				'haircut',
				'cosmetics',
				'personal',
				'kapper',
				'cosmetica',
				'persoonlijk',
				'kapper',
				'kapsalon',
				'hairdresser',
				'haar',
				'knippen',
				'föhnen',
				'verven',
				'kleuren',
				'douglas',
				'ici paris xl',
				'rituals',
				'body shop',
				'lush',
				'kruidvat',
				'etos',
				'de tuinen',
				'cosmetica',
				'parfumerie',
				'parfum',
				'geuren',
				'verzorging',
				'gezichtsverzorging',
				'bodyverzorging',
				'handverzorging',
				'voetverzorging',
				'manicure',
				'pedicure',
				'nagelstudio',
				'nagelsalon',
				'beauty salon',
				'schoonheidssalon',
				'wellness',
				'spa',
				'massage',
				'fysiotherapie',
				'fysio'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Leningen & schuldaflossing',
				description: 'Leningen en aflossingen (NIET: creditcard betalingen - gebruik Creditcard betalingen categorie)',
				color: '#947965',
				icon: 'CreditCard',
				is_default: true,
				created_by: null,
				group: 'essential',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'loan',
				'debt',
				'student loan',
				'personal loan',
				'auto loan',
				'lening',
				'schuld',
				'studielening',
				'persoonlijke lening',
				'autolening',
				'duo',
				'studiefinanciering',
				'studielening',
				'studie lening',
				'persoonlijke lening',
				'consumptief krediet',
				'consumptief krediet',
				'flitskrediet',
				'minilening',
				'kleine lening',
				'grote lening',
				'hypotheek',
				'woonhypotheek',
				'huurkoop',
				'koop op afbetaling',
				'afbetaling',
				'aflossing',
				'schuldaflossing',
				'schuld aflossing',
				'rente',
				'leningrente',
				'krediet',
				'kredietverstrekker',
				'kredietbank',
				'financiering',
				'financieringsmaatschappij',
				'betaalregeling',
				'regeling',
				'betalingsregeling'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Sparen & beleggen',
				description: 'Overboekingen naar spaar, beleggings en crypto rekeningen of wallets.',
				color: '#a28977',
				icon: 'PiggyBank',
				is_default: true,
				created_by: null,
				group: 'financial',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'savings',
				'investment',
				'emergency fund',
				'retirement',
				'pension',
				'sparen',
				'investering',
				'spaargeld',
				'pensioen',
				'noodfonds',
				'spaarrekening',
				'notprovided',
				'degiro',
				'lynx',
				'bolero',
				'brand new day',
				'meesman',
				'beleggen',
				'beleggingsrekening',
				'beleggingsrekening',
				'effectenrekening',
				'effecten',
				'aandelen',
				'obligaties',
				'fondsen',
				'indexfondsen',
				'etf',
				'pensioensparen',
				'pensioen sparen',
				'lijfrente',
				'banksparen',
				'bank sparen',
				'spaardeposito',
				'deposito',
				'spaarplan',
				'maandelijks sparen',
				'automatisch sparen',
				'spaardoel',
				'spaarrekening',
				'spaarrekening',
				'rente',
				'spaarrente',
				'beleggingsrente',
				'winst',
				'dividend',
				'koerswinst',
				'verkoop effecten',
				'aankoop effecten'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Huisdierenverzorging',
				description: 'Voer, dierenarts, uitlaatservice',
				color: '#cdcce4',
				icon: 'Heart',
				is_default: true,
				created_by: null,
				group: 'lifestyle',
				tier: 'less',
				is_variable_spending: true,
				updated_at: new Date()
			},
			['pet', 'veterinary', 'vet', 'pet food', 'dierenarts', 'hondenvoer', 'kattenvoer', 'huisdier', 'dier', 'pet care', 'dierenverzorging']
		);

		await createCategoryWithKeywords(
			{
				name: 'Kinderopvang & zorg',
				description: 'Kinderopvang, oppasdiensten, ouderenzorg, ook positieve bedragen zoals kinderopvang toeslag, kindergeld, etc.',
				color: '#9b98c8',
				icon: 'Baby',
				is_default: true,
				created_by: null,
				group: 'essential',
				tier: 'less',
				updated_at: new Date()
			},
			[
				'childcare',
				'daycare',
				'babysitting',
				'school supplies',
				'elder care',
				'kinderopvang',
				'oppas',
				'schoolspullen',
				'ouderenzorg',
				'zorg',
				'kinderopvang',
				'kinderdagverblijf',
				'kinderdagopvang',
				'peuterspeelzaal',
				'buitenschoolse opvang',
				'bso',
				'gastouder',
				'oppas',
				'oppasdienst',
				'babysit',
				'babysitter',
				'oppasdienst',
				'oppas service',
				'kinderopvangtoeslag',
				'kinderopvang toeslag',
				'kindergeld',
				'kinderbijslag',
				'svb',
				'sociale verzekeringsbank',
				'schoolspullen',
				'schoolbenodigdheden',
				'schoolmateriaal',
				'schoolboeken',
				'schooltas',
				'schoolkleding',
				'schoolgeld',
				'lesgeld',
				'ouderenzorg',
				'thuiszorg',
				'verpleging',
				'verzorging',
				'zorg',
				'zorgverlener',
				'zorgverlening',
				'zorginstelling',
				'verzorgingshuis',
				'verpleeghuis',
				'zorgcentrum',
				'zorgwoning',
				'zorgverzekering',
				'wmo',
				'wet maatschappelijke ondersteuning',
				'persoonsgebonden budget',
				'pgb',
				'zorgbudget',
				'zorgtoeslag',
				'zorg toeslag'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Betaalverzoeken',
				description: 'Betaalverzoeken en betaallinks zoals Tikkie, betaalverzoek, LET OP: als er uit de beschrijving een echte categorie op te maken is gebruik die dan, LET OP: als het niet heel duidelijk een betaalverzoek is dan deze categorie niet gebruiken.',
				color: '#ac9686',
				icon: 'Send',
				is_default: true,
				created_by: null,
				group: 'financial',
				tier: 'medium',
				updated_at: new Date()
			},
			[
				'betaalverzoek',
				'tikkie',
				'tikkie.nl',
				'payment request',
				'pay request',
				'payment link',
				'betaallink',
				'paylink',
				'request payment',
				'payment invitation',
				'betaaluitnodiging',
				'pay request',
				'payment link',
				'betaal link',
				'pay link'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Creditcard betalingen',
				description: 'Creditcard betalingen en afschriften (NIET: leningen - gebruik Leningen & schuldaflossing categorie)',
				color: '#947965',
				icon: 'CreditCard',
				is_default: true,
				created_by: null,
				group: 'financial',
				tier: 'medium',
				updated_at: new Date()
			},
			[
				'creditcard',
				'credit card',
				'creditcard payment',
				'credit card payment',
				'cc payment',
				'visa',
				'mastercard',
				'amex',
				'american express',
				'creditcardafschrift',
				'credit card statement',
				'creditcard statement',
				'cc statement',
				'creditcard betaling',
				'credit card betaling'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Overboekingen eigen rekeningen',
				description: 'Overboekingen tussen je eigen bankrekeningen, spaarrekeningen, beleggingsrekeningen',
				color: '#ac9686',
				icon: 'ArrowLeftRight',
				is_default: true,
				created_by: null,
				group: 'financial',
				tier: 'less',
				updated_at: new Date()
			},
			['transfer', 'own account', 'eigen rekening', 'overboeking', 'savings account', 'investment account', 'beleggingsrekening']
		);

		// ============================================
		// OTHER CATEGORIES
		// ============================================

		await createCategoryWithKeywords(
			{
				name: 'Niet gecategoriseerd',
				description: 'Systeemcategorie voor transacties die niet automatisch zijn gecategoriseerd',
				color: '#7b77b6',
				icon: 'HelpCircle',
				is_default: true,
				created_by: null,
				group: 'other',
				tier: 'less',
				updated_at: new Date()
			},
			[] // Empty - system category only
		);

		await createCategoryWithKeywords(
			{
				name: 'Overig',
				description: 'Diverse uitgaven die niet in andere categorieën passen (gebruiker selecteerbaar)',
				color: '#8c88bf',
				icon: 'MoreHorizontal',
				is_default: true,
				created_by: null,
				group: 'other',
				tier: 'less',
				updated_at: new Date()
			},
			['other', 'miscellaneous', 'overig', 'diversen']
		);

		log('✅ Created all standalone expense categories');
		log('✅ Created Uncategorized and Other system categories');

		// ============================================
		// RECURRING MERCHANTS
		// ============================================
		log('🏪 Creating recurring merchants...');

		// Get category IDs for merchant associations
		const entertainmentCategory = await prisma.categories.findFirst({
			where: { name: 'Entertainment' }
		});
		const tvInternetCategory = await prisma.categories.findFirst({
			where: { name: 'TV/internet/telefoon' }
		});
		const healthCategory = await prisma.categories.findFirst({
			where: { name: 'Gezondheidszorg' }
		});
		const sportCategory = await prisma.categories.findFirst({
			where: { name: 'Sport' }
		});

		// Streaming Services
		const streamingMerchants = [
			{ name: 'Spotify', keywords: ['spotify'] },
			{ name: 'Netflix', keywords: ['netflix'] },
			{ name: 'Disney+', keywords: ['disney+', 'disney plus'] },
			{ name: 'Amazon Prime', keywords: ['amazon prime', 'prime video'] },
			{ name: 'HBO Max', keywords: ['hbo max', 'hbo'] },
			{ name: 'Videoland', keywords: ['videoland'] },
			{ name: 'Viaplay', keywords: ['viaplay'] },
			{ name: 'YouTube Premium', keywords: ['youtube premium', 'google *youtube'] },
			{ name: 'Apple Services', keywords: ['apple.com/bill', 'itunes', 'apple tv'] }
		];

		for (const merchant of streamingMerchants) {
			await prisma.merchants.create({
				data: {
					name: merchant.name,
					keywords: [...merchant.keywords, merchant.name.toLowerCase()],
					is_potential_recurring: true,
					is_active: true,
					default_category_id: entertainmentCategory?.id,
					updated_at: new Date()
				}
			});
		}
		log(`   ✓ Created ${streamingMerchants.length} streaming service merchants`);

		// Telecom & Internet
		const telecomMerchants = [
			{ name: 'Ziggo', keywords: ['ziggo'] },
			{ name: 'KPN', keywords: ['kpn'] },
			{ name: 'Odido', keywords: ['odido', 't-mobile'] },
			{ name: 'Vodafone', keywords: ['vodafone'] },
			{ name: 'Tele2', keywords: ['tele2'] },
			{ name: 'Youfone', keywords: ['youfone'] },
			{ name: 'Simyo', keywords: ['simyo'] },
			{ name: 'HollandsNieuwe', keywords: ['hollandsnieuwe', 'hollands nieuwe'] },
			{ name: 'Lebara', keywords: ['lebara'] }
		];

		for (const merchant of telecomMerchants) {
			await prisma.merchants.create({
				data: {
					name: merchant.name,
					keywords: [...merchant.keywords, merchant.name.toLowerCase()],
					is_potential_recurring: true,
					is_active: true,
					default_category_id: tvInternetCategory?.id,
					updated_at: new Date()
				}
			});
		}
		log(`   ✓ Created ${telecomMerchants.length} telecom merchants`);

		// Health Insurance
		const insuranceMerchants = [
			{ name: 'Zilveren Kruis', keywords: ['zilveren kruis'] },
			{ name: 'CZ', keywords: ['cz', 'cz zorgverzekering', 'cz groep'] },
			{ name: 'VGZ', keywords: ['vgz'] },
			{ name: 'Menzis', keywords: ['menzis'] },
			{ name: 'Ditzo', keywords: ['ditzo'] },
			{ name: 'Inshared', keywords: ['inshared'] },
			{ name: 'Centraal Beheer', keywords: ['centraal beheer', 'centraalbeheer'] },
			{ name: 'OHRA', keywords: ['ohra'] },
			{ name: 'FBTO', keywords: ['fbto'] },
			{ name: 'Nationale-Nederlanden', keywords: ['nationale nederlanden', 'nationale-nederlanden', 'nn'] },
			{ name: 'Aegon', keywords: ['aegon'] },
			{ name: 'ANWB', keywords: ['anwb'] }
		];

		for (const merchant of insuranceMerchants) {
			await prisma.merchants.create({
				data: {
					name: merchant.name,
					keywords: [...merchant.keywords, merchant.name.toLowerCase()],
					is_potential_recurring: true,
					is_active: true,
					default_category_id: healthCategory?.id,
					updated_at: new Date()
				}
			});
		}
		log(`   ✓ Created ${insuranceMerchants.length} insurance merchants`);

		// Fitness
		const fitnessMerchants = [
			{ name: 'Basic-Fit', keywords: ['basic-fit', 'basic fit', 'basicfit'] },
			{ name: 'Fit For Free', keywords: ['fit for free'] }
		];

		for (const merchant of fitnessMerchants) {
			await prisma.merchants.create({
				data: {
					name: merchant.name,
					keywords: [...merchant.keywords, merchant.name.toLowerCase()],
					is_potential_recurring: true,
					is_active: true,
					default_category_id: sportCategory?.id,
					updated_at: new Date()
				}
			});
		}
		log(`   ✓ Created ${fitnessMerchants.length} fitness merchants`);

		log('✅ Created all recurring merchants');

		log('✅ Created all standalone expense categories');
		log('✅ Created Uncategorized and Other system categories');

		// ============================================
		// SEED INSIGHT DEFINITIONS
		// ============================================
		log('💡 Seeding insight definitions...');

		const insightDefinitions = [
			{
				id: 'duplicate_check',
				name: 'Double Trouble?',
				description: 'Detects duplicate transactions',
				category: 'urgent',
				priority: 90,
				trigger: 'duplicate_transaction',
				message_template: 'Paid €{{amount}} to {{merchant}} twice. Mistake?',
				icon: 'AlertTriangle',
				contexts: ['transaction_row'],
				is_active: true,
				cooldown_hours: 0
			},
			{
				id: 'new_merchant_found',
				name: 'Fresh Find',
				description: 'First time paying this merchant',
				category: 'insight',
				priority: 70,
				trigger: 'new_merchant',
				message_template: 'First time at {{merchant}}. Thoughts?',
				icon: 'Star',
				contexts: ['transaction_row'],
				is_active: true,
				cooldown_hours: 0
			},
			{
				id: 'price_hike_alert',
				name: 'Inflation Alert',
				description: 'Recurring payment increased',
				category: 'action',
				priority: 80,
				trigger: 'price_hike',
				message_template: '{{merchant}} just jumped by {{percent}}%. Rude. 📈',
				icon: 'TrendingUp',
				contexts: ['transaction_row'],
				is_active: true,
				cooldown_hours: 0
			},
			{
				id: 'refund_celebration',
				name: 'Money Back!',
				description: 'Credit matching a prior debit',
				category: 'celebration',
				priority: 60,
				trigger: 'refund_detected',
				message_template: 'Refund from {{date}} just landed. 💸',
				icon: 'ArrowDownLeft',
				contexts: ['transaction_row'],
				is_active: true,
				cooldown_hours: 0
			},
			{
				id: 'salary_incoming',
				name: 'Ka-ching!',
				description: 'Salary detection',
				category: 'celebration',
				priority: 95,
				trigger: 'salary_detected',
				message_template: 'Payday has arrived! +€{{amount}} 💰',
				icon: 'Sparkles',
				contexts: ['transaction_row'],
				is_active: true,
				cooldown_hours: 0
			},
			{
				id: 'big_spender',
				name: 'Whale Alert',
				description: 'Large expense alert',
				category: 'roast',
				priority: 50,
				trigger: 'large_expense',
				message_template: 'Dropped €{{amount}} at {{merchant}}. 🐳',
				icon: 'TrendingUp',
				contexts: ['transaction_row'],
				is_active: true,
				cooldown_hours: 0,
				trigger_params: { threshold: 500 }
			},
			{
				id: 'weekend_vibes',
				name: 'Weekend Vibes',
				description: 'High spending on Fri/Sat nights',
				category: 'roast',
				priority: 40,
				trigger: 'weekend_warrior',
				message_template: 'Living it up on {{day}} at {{merchant}}! 🎉',
				icon: 'PartyPopper',
				contexts: ['transaction_row'],
				is_active: true,
				cooldown_hours: 0
			},
			{
				id: 'late_night_snack',
				name: 'Night Owl',
				description: 'Spending between 11PM and 5AM',
				category: 'roast',
				priority: 30,
				trigger: 'late_night',
				message_template: '{{time}} snack at {{merchant}}? We won\'t tell. 🦉',
				icon: 'Moon',
				contexts: ['transaction_row'],
				is_active: true,
				cooldown_hours: 0
			},
			{
				id: 'round_and_round',
				name: 'Perfectly Balanced',
				description: 'Round number amounts',
				category: 'celebration',
				priority: 20,
				trigger: 'round_number',
				message_template: '€{{amount}} exactly. It\'s the little things. 👌',
				icon: 'CheckCircle',
				contexts: ['transaction_row'],
				is_active: true,
				cooldown_hours: 0
			},
			{
				id: 'sub_spotted',
				name: 'Sub Spotted?',
				description: 'Potential subscription detected',
				category: 'insight',
				priority: 65,
				trigger: 'potential_subscription',
				message_template: 'Monthly €{{amount}} at {{merchant}}. Subscription?',
				icon: 'Calendar',
				action_label: 'Track Subscription',
				action_href: '/transactions?search={{merchant}}',
				contexts: ['transaction_row'],
				is_active: true,
				cooldown_hours: 0
			},
			// ============================================
			// CHAT/DASHBOARD CONTEXT INSIGHTS
			// ============================================
			{
				id: 'fresh_import',
				name: 'Welcome! Let\'s get started',
				description: 'All transactions are uncategorized (fresh import)',
				category: 'action',
				priority: 100,
				trigger: 'fresh_import',
				message_template: 'I see you\'ve got {{count}} fresh transactions! Ready to categorize them?',
				icon: 'Sparkles',
				action_label: 'Start Categorizing',
				action_href: '/categorize-all',
				contexts: ['chat'],
				is_active: true,
				cooldown_hours: 24
			},
			{
				id: 'uncategorized_pile',
				name: 'Uncategorized Transactions',
				description: 'High percentage of uncategorized transactions',
				category: 'action',
				priority: 85,
				trigger: 'uncategorized_high',
				message_template: 'You have {{percent}}% uncategorized. Top merchant: {{topMerchant}} ({{topMerchantCount}}x). Want to tackle those?',
				icon: 'AlertTriangle',
				action_label: 'Categorize',
				action_href: '/categorize-all',
				contexts: ['chat'],
				is_active: true,
				cooldown_hours: 12
			},
			{
				id: 'all_categorized',
				name: 'All Done!',
				description: 'All transactions are categorized',
				category: 'celebration',
				priority: 75,
				trigger: 'categorization_complete',
				message_template: 'Amazing! All {{count}} transactions are categorized. You\'re a machine! 🎉',
				icon: 'CheckCircle',
				contexts: ['chat'],
				is_active: true,
				cooldown_hours: 24
			},
			{
				id: 'spending_up',
				name: 'Spending Alert',
				description: 'Spending increased compared to last month',
				category: 'insight',
				priority: 70,
				trigger: 'complete_month_change',
				trigger_params: { threshold_percent: 15, direction: 'up' },
				message_template: 'Last month you spent {{percent}}% more than {{twoMonthsAgo}}. That\'s €{{lastMonthAmount}} vs €{{twoMonthsAgoAmount}}.',
				icon: 'TrendingUp',
				contexts: ['chat'],
				is_active: true,
				cooldown_hours: 48
			},
			{
				id: 'spending_down',
				name: 'Nice Savings!',
				description: 'Spending decreased compared to last month',
				category: 'celebration',
				priority: 70,
				trigger: 'complete_month_change',
				trigger_params: { threshold_percent: 15, direction: 'down' },
				message_template: 'You spent {{percent}}% less last month compared to {{twoMonthsAgo}}! That\'s savings of €{{diff}}. 🙌',
				icon: 'TrendingDown',
				contexts: ['chat'],
				is_active: true,
				cooldown_hours: 48
			},
			{
				id: 'payment_due',
				name: 'Payment Coming Up',
				description: 'A recurring payment is due soon',
				category: 'urgent',
				priority: 90,
				trigger: 'payment_due_soon',
				trigger_params: { days: 3 },
				message_template: '{{name}} (€{{amount}}) is due {{daysText}}.',
				icon: 'Calendar',
				contexts: ['chat'],
				is_active: true,
				cooldown_hours: 24
			},
			{
				id: 'check_recurring',
				name: 'Review Subscriptions',
				description: 'Suggest reviewing recurring payments',
				category: 'tip',
				priority: 40,
				trigger: 'review_recurring',
				trigger_params: { min_categorized_percent: 50 },
				message_template: 'With {{categorizedPercent}}% categorized, you might want to review your recurring payments!',
				icon: 'RefreshCw',
				action_label: 'View Recurring',
				action_href: '/recurring',
				contexts: ['chat'],
				is_active: true,
				cooldown_hours: 72
			},
			{
				id: 'no_transactions',
				name: 'Upload Transactions',
				description: 'No transactions found',
				category: 'action',
				priority: 95,
				trigger: 'no_transactions',
				message_template: 'Let\'s start by uploading some transactions!',
				icon: 'Upload',
				action_label: 'Upload',
				action_href: '/upload-transactions',
				contexts: ['chat'],
				is_active: true,
				cooldown_hours: 0
			}
		];

		for (const insight of insightDefinitions) {
			await (prisma as any).insightDefinition.upsert({
				where: { id: insight.id },
				update: insight,
				create: insight
			});
		}
		log(`   ✓ Seeded ${insightDefinitions.length} insight definitions`);

		log('📊 Seed completed successfully!');
		log('   - 3 Income categories');
		log('   - Expense categories: 4 parents + subcategories');
		log('     * Food & Groceries: 4 subcategories');
		log('     * Restaurants & Dining: 5 subcategories');
		log('     * Transportation: 6 subcategories');
		log('     * Shopping: 4 subcategories');
		log('     * Hobbies & Leisure: 4 subcategories');
		log('   - Standalone expense categories: 15');
		log('   - Financial management categories: 5 (Geldopnames, Betaalverzoeken, Creditcard betalingen, Sparen & beleggen, Overboekingen eigen rekeningen)');
		log('   - Other categories: 2 (Uncategorized, Other)');
	} catch (error) {
		console.error('❌ Error during seeding:', error);
		throw error;
	}
}

// CLI entry point
async function main() {
	await seedDatabase();
}

// Only run if called directly (not imported)
// Check if this file is being run directly by checking if it's the main module
const isMainModule = process.argv[1]?.endsWith('seed.ts') ||
	(import.meta.url && import.meta.url === `file://${process.argv[1]}`);

if (isMainModule) {
	main()
		.catch((e) => {
			console.error('❌ Fatal error seeding database:', e);
			process.exit(1);
		})
		.finally(async () => {
			await prisma.$disconnect();
		});
}
