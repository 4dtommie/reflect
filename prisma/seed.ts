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

async function main() {
	// Use console.error for seed logs - they're more reliably shown in terminal
	const log = (...args: any[]) => {
		console.error(...args);
	};

	log('🌱 Seeding database...');

	try {
		// Drop all data - start with a clean database
		// Order matters due to foreign key constraints
		log('🗑️  Dropping all existing data...');
		
		// Delete transactions first (they reference categories, merchants, users)
		const transactionCount = await prisma.transactions.deleteMany({});
		log(`   ✓ Deleted ${transactionCount.count} transactions`);
		
		// Delete category_keywords (references categories)
		const keywordCount = await (prisma as any).category_keywords.deleteMany({});
		log(`   ✓ Deleted ${keywordCount.count} category keywords`);
		
		// Delete user_categories (references categories and users)
		const userCategoryCount = await prisma.user_categories.deleteMany({});
		log(`   ✓ Deleted ${userCategoryCount.count} user category preferences`);
		
		// Delete categories (references users for created_by)
		const categoryCount = await prisma.categories.deleteMany({});
		log(`   ✓ Deleted ${categoryCount.count} categories`);
		
		// Delete merchants (references categories)
		const merchantCount = await prisma.merchants.deleteMany({});
		log(`   ✓ Deleted ${merchantCount.count} merchants`);
		
		log('✅ Database cleared - ready for fresh seed data');
		
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
				name: 'Salary',
				description: 'Regular employment income',
				color: '#22c55e',
				icon: 'Briefcase',
				is_default: true,
				created_by: null,
				group: 'income',
				updated_at: new Date()
			},
			['salary', 'wage', 'income', 'paycheck', 'loon', 'salaris', 'inkomen']
		);

		const freelance = await createCategoryWithKeywords(
			{
				name: 'Freelance/Contract',
				description: 'Freelance or contract work income',
				color: '#10b981',
				icon: 'User',
				is_default: true,
				created_by: null,
				group: 'income',
				updated_at: new Date()
			},
			['freelance', 'contract', 'consulting', 'zzp', 'zelfstandige']
		);

		const investmentReturns = await createCategoryWithKeywords(
			{
				name: 'Investment Returns',
				description: 'Dividends, interest, capital gains',
				color: '#14b8a6',
				icon: 'TrendingUp',
				is_default: true,
				created_by: null,
				group: 'income',
				updated_at: new Date()
			},
			['dividend', 'interest', 'return', 'profit', 'rente']
		);

		const taxReturns = await createCategoryWithKeywords(
			{
				name: 'Tax Returns & Subsidies',
				description: 'Tax refunds and government subsidies (Belastingdienst, RVO, etc.)',
				color: '#06b6d4',
				icon: 'FileText',
				is_default: true,
				created_by: null,
				group: 'income',
				updated_at: new Date()
			},
			[
				'tax return',
				'belastingdienst',
				'belasting',
				'teruggave',
				'aangifte',
				'belastingteruggave',
				'voorlopige teruggave',
				'advance tax',
				'voorlopige aanslag',
				'belasting voorlopig',
				'rvo',
				'subsidie',
				'subsidy',
				'rijksdienst',
				'ondernemend nederland',
				'kinderopvangtoeslag',
				'childcare allowance',
				'kinderopvang',
				'huurtoeslag',
				'rent allowance',
				'huur',
				'toeslag',
				'woningtoeslag'
			]
		);

		const refund = await createCategoryWithKeywords(
			{
				name: 'Refund',
				description: 'Money returned from purchases',
				color: '#06b6d4',
				icon: 'RotateCcw',
				is_default: true,
				created_by: null,
				group: 'income',
				updated_at: new Date()
			},
			['refund', 'terugbetaling', 'reimbursement', 'terug']
		);

		const otherIncome = await createCategoryWithKeywords(
			{
				name: 'Other Income',
				description: 'Miscellaneous income',
				color: '#3b82f6',
				icon: 'DollarSign',
				is_default: true,
				created_by: null,
				group: 'income',
				updated_at: new Date()
			},
			['income', 'other', 'overig', 'inkomen']
		);

		log('✅ Created 6 income categories');

		// ============================================
		// EXPENSE CATEGORIES - PARENTS FIRST
		// ============================================

		// Food & Groceries (parent)
		const foodGroceries = await createCategoryWithKeywords(
			{
				name: 'Food & Groceries',
				description: 'Parent category for food and grocery purchases (use subcategories for categorization)',
				color: '#f59e0b',
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
				name: 'Restaurants & Dining',
				description: 'Parent category for dining-related expenses (use subcategories for categorization)',
				color: '#f97316',
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
				name: 'Transportation',
				description: 'Parent category for transportation expenses (use subcategories for categorization)',
				color: '#6366f1',
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
				name: 'Shopping',
				description: 'Parent category for retail purchases (use subcategories for categorization)',
				color: '#8b5cf6',
				icon: 'ShoppingBag',
				is_default: true,
				created_by: null,
				group: 'lifestyle',
				updated_at: new Date()
			},
			[] // Empty - parent category only
		);

		// ============================================
		// FOOD & GROCERIES SUBCATEGORIES
		// ============================================

		await createCategoryWithKeywords(
			{
				name: 'Supermarket',
				description: 'Large grocery stores, supermarkets, convenience stores, and online grocery delivery',
				color: '#f59e0b',
				icon: 'ShoppingCart',
				is_default: true,
				created_by: null,
				parent_id: foodGroceries.id,
				group: 'essential',
				updated_at: new Date()
			},
			[
				'supermarket',
				'grocery store',
				'ah',
				'albert heijn',
				'jumbo',
				'aldi',
				'lidl',
				'plus',
				'coop',
				'ekoplaza',
				'supermarkt',
				'boodschappen',
				'convenience store',
				'corner shop',
				'buurtwinkel',
				'tankstation',
				'gas station shop',
				'spar',
				'small shop',
				'picnic',
				'online grocery',
				'grocery delivery',
				'bezorging boodschappen',
				'thuisbezorgd grocery',
				'ah bezorg',
				'jumbo bezorg'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Butcher',
				description: 'Butcher shops and meat stores',
				color: '#dc2626',
				icon: 'Drumstick',
				is_default: true,
				created_by: null,
				parent_id: foodGroceries.id,
				group: 'essential',
				updated_at: new Date()
			},
			['butcher', 'slager', 'slagerij', 'vlees', 'meat', 'vleeswaren']
		);

		await createCategoryWithKeywords(
			{
				name: 'Baker',
				description: 'Bakeries and bread shops',
				color: '#fbbf24',
				icon: 'Wheat',
				is_default: true,
				created_by: null,
				parent_id: foodGroceries.id,
				group: 'essential',
				updated_at: new Date()
			},
			['baker', 'bakker', 'bakkerij', 'bread', 'brood', 'pastry', 'gebak']
		);

		await createCategoryWithKeywords(
			{
				name: 'Specialty Food Stores',
				description: 'Delicatessen, specialty food shops, organic stores, health food stores',
				color: '#10b981',
				icon: 'Leaf',
				is_default: true,
				created_by: null,
				parent_id: foodGroceries.id,
				group: 'essential',
				updated_at: new Date()
			},
			[
				'delicatessen',
				'specialty',
				'organic',
				'health food',
				'natuurwinkel',
				'biologisch',
				'ekoplaza',
				'marqt',
				'specialty store'
			]
		);

		log('✅ Created Food & Groceries with 4 subcategories');

		// ============================================
		// RESTAURANTS & DINING SUBCATEGORIES
		// ============================================

		await createCategoryWithKeywords(
			{
				name: 'Coffee',
				description: 'Coffee shops and cafes',
				color: '#ea580c',
				icon: 'Coffee',
				is_default: true,
				created_by: null,
				parent_id: restaurantsDining.id,
				group: 'lifestyle',
				updated_at: new Date()
			},
			['coffee', 'cafe', 'koffie', 'espresso', 'latte', 'cappuccino', 'starbucks', 'douwe egberts']
		);

		await createCategoryWithKeywords(
			{
				name: 'Lunch',
				description: 'Lunch meals and snacks',
				color: '#f97316',
				icon: 'Sandwich',
				is_default: true,
				created_by: null,
				parent_id: restaurantsDining.id,
				group: 'lifestyle',
				updated_at: new Date()
			},
			['lunch', 'lunchen', 'middageten', 'sandwich', 'broodje']
		);

		await createCategoryWithKeywords(
			{
				name: 'Eating Out',
				description: 'Restaurant meals (dinner, etc.)',
				color: '#c2410c',
				icon: 'UtensilsCrossed',
				is_default: true,
				created_by: null,
				parent_id: restaurantsDining.id,
				group: 'lifestyle',
				updated_at: new Date()
			},
			['restaurant', 'dining', 'dinner', 'uit eten', 'eten']
		);

		await createCategoryWithKeywords(
			{
				name: 'Ordering Food',
				description: 'Food delivery and takeout',
				color: '#ea580c',
				icon: 'ShoppingBag',
				is_default: true,
				created_by: null,
				parent_id: restaurantsDining.id,
				group: 'lifestyle',
				updated_at: new Date()
			},
			['food delivery', 'takeout', 'thuisbezorgd', 'uber eats', 'deliveroo', 'bezorging', 'afhalen']
		);

		await createCategoryWithKeywords(
			{
				name: 'Uitgaan/Bars & Drinks',
				description: 'Going out, bars, drinks, nightlife',
				color: '#dc2626',
				icon: 'Wine',
				is_default: true,
				created_by: null,
				parent_id: restaurantsDining.id,
				group: 'lifestyle',
				updated_at: new Date()
			},
			['uitgaan', 'bar', 'drinks', 'nightlife', 'kroeg', 'café', 'bier', 'wine', 'cocktail', 'uit']
		);

		log('✅ Created Restaurants & Dining with 5 subcategories');

		// ============================================
		// TRANSPORTATION SUBCATEGORIES
		// ============================================

		await createCategoryWithKeywords(
			{
				name: 'Car Payment',
				description: 'Car loan payments, lease payments',
				color: '#6366f1',
				icon: 'Car',
				is_default: true,
				created_by: null,
				parent_id: transportation.id,
				group: 'essential',
				updated_at: new Date()
			},
			['car payment', 'auto loan', 'lease', 'autolening', 'lease auto', 'auto lease']
		);

		await createCategoryWithKeywords(
			{
				name: 'Fuel',
				description: 'Gas, diesel, charging for electric vehicles',
				color: '#4f46e5',
				icon: 'Fuel',
				is_default: true,
				created_by: null,
				parent_id: transportation.id,
				group: 'essential',
				updated_at: new Date()
			},
			['fuel', 'gas', 'diesel', 'benzine', 'tankstation', 'gas station', 'charging', 'laden', 'elektrisch']
		);

		await createCategoryWithKeywords(
			{
				name: 'Public Transit',
				description: 'Public transportation, OV-chipkaart, train, bus, tram, metro',
				color: '#7c3aed',
				icon: 'Train',
				is_default: true,
				created_by: null,
				parent_id: transportation.id,
				group: 'essential',
				updated_at: new Date()
			},
			[
				'public transport',
				'ov-chipkaart',
				'ns',
				'ov',
				'train',
				'trein',
				'bus',
				'tram',
				'metro',
				'openbaar vervoer'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Parking',
				description: 'Parking fees, parking permits',
				color: '#8b5cf6',
				icon: 'SquareParking',
				is_default: true,
				created_by: null,
				parent_id: transportation.id,
				group: 'essential',
				updated_at: new Date()
			},
			['parking', 'parkeren', 'parking fee', 'parkeergeld', 'parking permit']
		);

		await createCategoryWithKeywords(
			{
				name: 'Maintenance & Repairs',
				description: 'Car maintenance, repairs, inspections, tires',
				color: '#a855f7',
				icon: 'Wrench',
				is_default: true,
				created_by: null,
				parent_id: transportation.id,
				group: 'essential',
				updated_at: new Date()
			},
			[
				'car maintenance',
				'repair',
				'inspection',
				'apk',
				'tires',
				'banden',
				'onderhoud',
				'garage',
				'auto reparatie'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Taxi & Rideshare',
				description: 'Taxis, Uber, Lyft, other rideshare services',
				color: '#9333ea',
				icon: 'Taxi',
				is_default: true,
				created_by: null,
				parent_id: transportation.id,
				group: 'essential',
				updated_at: new Date()
			},
			['taxi', 'uber', 'lyft', 'rideshare']
		);

		log('✅ Created Transportation with 6 subcategories');

		// ============================================
		// SHOPPING SUBCATEGORIES
		// ============================================

		await createCategoryWithKeywords(
			{
				name: 'Clothing',
				description: 'Clothing, shoes, accessories',
				color: '#8b5cf6',
				icon: 'Shirt',
				is_default: true,
				created_by: null,
				parent_id: shopping.id,
				group: 'lifestyle',
				updated_at: new Date()
			},
			['clothing', 'clothes', 'kleding', 'shoes', 'schoenen', 'accessories', 'accessoires', 'fashion', 'mode']
		);

		await createCategoryWithKeywords(
			{
				name: 'Electronics',
				description: 'Electronics, computers, phones, gadgets',
				color: '#7c3aed',
				icon: 'Smartphone',
				is_default: true,
				created_by: null,
				parent_id: shopping.id,
				group: 'lifestyle',
				updated_at: new Date()
			},
			['electronics', 'computer', 'phone', 'smartphone', 'laptop', 'tablet', 'gadget', 'elektronica', 'telefoon']
		);

		await createCategoryWithKeywords(
			{
				name: 'Home Goods',
				description: 'Furniture, home decor, appliances, household items',
				color: '#9333ea',
				icon: 'Home',
				is_default: true,
				created_by: null,
				parent_id: shopping.id,
				group: 'lifestyle',
				updated_at: new Date()
			},
			[
				'furniture',
				'home decor',
				'appliances',
				'household',
				'meubels',
				'woninginrichting',
				'huishoudelijk',
				'apparaten'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'General Retail',
				description: 'Other retail purchases that don\'t fit other subcategories',
				color: '#a855f7',
				icon: 'ShoppingBag',
				is_default: true,
				created_by: null,
				parent_id: shopping.id,
				group: 'lifestyle',
				updated_at: new Date()
			},
			['shopping', 'retail', 'store', 'winkel', 'general', 'algemeen']
		);

		log('✅ Created Shopping with 4 subcategories');

		// ============================================
		// STANDALONE EXPENSE CATEGORIES
		// ============================================

		await createCategoryWithKeywords(
			{
				name: 'Bills & Utilities',
				description: 'Electricity, water, gas, internet, phone',
				color: '#ec4899',
				icon: 'Zap',
				is_default: true,
				created_by: null,
				group: 'essential',
				updated_at: new Date()
			},
			['utility', 'electricity', 'water', 'gas', 'internet', 'phone', 'energie', 'water', 'gas', 'internet', 'telefoon', 'ziggo', 'kpn']
		);

		await createCategoryWithKeywords(
			{
				name: 'Housing',
				description: 'Rent, mortgage, maintenance',
				color: '#ef4444',
				icon: 'Home',
				is_default: true,
				created_by: null,
				group: 'essential',
				updated_at: new Date()
			},
			['rent', 'mortgage', 'housing', 'maintenance', 'huur', 'hypotheek', 'woning', 'onderhoud']
		);

		await createCategoryWithKeywords(
			{
				name: 'Healthcare',
				description: 'Medical expenses, pharmacy, health subscriptions (gym, fitness apps)',
				color: '#f43f5e',
				icon: 'Heart',
				is_default: true,
				created_by: null,
				group: 'essential',
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
				'gym',
				'fitness',
				'sportschool',
				'strava',
				'myfitnesspal'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Entertainment',
				description: 'Movies, streaming, games, hobbies, entertainment subscriptions',
				color: '#a855f7',
				icon: 'Film',
				is_default: true,
				created_by: null,
				group: 'lifestyle',
				updated_at: new Date()
			},
			[
				'entertainment',
				'netflix',
				'spotify',
				'streaming',
				'movie',
				'game',
				'film',
				'spel',
				'disney',
				'hbo',
				'prime',
				'youtube premium',
				'twitch',
				'gaming',
				'playstation',
				'xbox',
				'nintendo'
			]
		);

		await createCategoryWithKeywords(
			{
				name: 'Education',
				description: 'Courses, books, tuition, educational subscriptions',
				color: '#06b6d4',
				icon: 'GraduationCap',
				is_default: true,
				created_by: null,
				group: 'lifestyle',
				updated_at: new Date()
			},
			['education', 'course', 'tuition', 'book', 'school', 'onderwijs', 'cursus', 'boek', 'udemy', 'coursera', 'skillshare', 'masterclass']
		);

		await createCategoryWithKeywords(
			{
				name: 'Software & Tools',
				description: 'Software licenses, SaaS subscriptions, productivity tools',
				color: '#8b5cf6',
				icon: 'Code',
				is_default: true,
				created_by: null,
				group: 'lifestyle',
				updated_at: new Date()
			},
			['software', 'saas', 'license', 'adobe', 'microsoft', 'office', 'dropbox', 'google workspace', 'notion', 'figma', 'slack', 'zoom', 'tool', 'productivity']
		);

		await createCategoryWithKeywords(
			{
				name: 'Travel',
				description: 'Hotels, flights, vacation expenses',
				color: '#0ea5e9',
				icon: 'Plane',
				is_default: true,
				created_by: null,
				group: 'lifestyle',
				updated_at: new Date()
			},
			['travel', 'hotel', 'flight', 'vacation', 'trip', 'reizen', 'vlucht', 'vakantie']
		);

		await createCategoryWithKeywords(
			{
				name: 'Insurance',
				description: 'Health, car, home insurance',
				color: '#3b82f6',
				icon: 'Shield',
				is_default: true,
				created_by: null,
				group: 'essential',
				updated_at: new Date()
			},
			['insurance', 'verzekering', 'zorgverzekering', 'autoverzekering', 'inboedelverzekering', 'aansprakelijkheidsverzekering']
		);

		await createCategoryWithKeywords(
			{
				name: 'Fees & Charges',
				description: 'Bank fees, service charges',
				color: '#64748b',
				icon: 'CreditCard',
				is_default: true,
				created_by: null,
				group: 'financial',
				updated_at: new Date()
			},
			['fee', 'charge', 'bank fee', 'service fee', 'kosten', 'vergoeding', 'bankkosten']
		);

		await createCategoryWithKeywords(
			{
				name: 'Charity & Donations',
				description: 'Charitable contributions',
				color: '#84cc16',
				icon: 'HeartHandshake',
				is_default: true,
				created_by: null,
				group: 'lifestyle',
				updated_at: new Date()
			},
			['donation', 'charity', 'donatie', 'goede doel']
		);

		await createCategoryWithKeywords(
			{
				name: 'Personal Care',
				description: 'Haircuts, cosmetics, personal items',
				color: '#f472b6',
				icon: 'Sparkles',
				is_default: true,
				created_by: null,
				group: 'lifestyle',
				updated_at: new Date()
			},
			['personal care', 'haircut', 'cosmetics', 'personal', 'kapper', 'cosmetica', 'persoonlijk']
		);

		await createCategoryWithKeywords(
			{
				name: 'Loans & Debt Repayment',
				description: 'Loan payments and debt repayment',
				color: '#ef4444',
				icon: 'CreditCard',
				is_default: true,
				created_by: null,
				group: 'essential',
				updated_at: new Date()
			},
			['loan', 'debt', 'credit card payment', 'student loan', 'personal loan', 'auto loan', 'lening', 'schuld', 'creditcard', 'studielening', 'persoonlijke lening', 'autolening']
		);

		await createCategoryWithKeywords(
			{
				name: 'Savings & Investments',
				description: 'Savings contributions and investment deposits',
				color: '#10b981',
				icon: 'PiggyBank',
				is_default: true,
				created_by: null,
				group: 'financial',
				updated_at: new Date()
			},
			['savings', 'investment', 'emergency fund', 'retirement', 'pension', 'sparen', 'investering', 'spaargeld', 'pensioen', 'noodfonds', 'spaarrekening']
		);

		await createCategoryWithKeywords(
			{
				name: 'Pet Care',
				description: 'Pet food, veterinary care, grooming, pet supplies',
				color: '#f59e0b',
				icon: 'Heart',
				is_default: true,
				created_by: null,
				group: 'lifestyle',
				updated_at: new Date()
			},
			['pet', 'veterinary', 'vet', 'pet food', 'dierenarts', 'hondenvoer', 'kattenvoer', 'huisdier', 'dier', 'pet care', 'dierenverzorging']
		);

		await createCategoryWithKeywords(
			{
				name: 'Childcare & Dependent Care',
				description: 'Daycare, childcare services, school supplies, elder care',
				color: '#06b6d4',
				icon: 'Baby',
				is_default: true,
				created_by: null,
				group: 'essential',
				updated_at: new Date()
			},
			['childcare', 'daycare', 'babysitting', 'school supplies', 'elder care', 'kinderopvang', 'oppas', 'schoolspullen', 'ouderenzorg', 'zorg']
		);

		await createCategoryWithKeywords(
			{
				name: 'Transfers Between Own Accounts',
				description: 'Transfers between your own bank accounts, savings accounts, investment accounts',
				color: '#94a3b8',
				icon: 'ArrowLeftRight',
				is_default: true,
				created_by: null,
				group: 'financial',
				updated_at: new Date()
			},
			['transfer', 'own account', 'eigen rekening', 'overboeking', 'savings account', 'investment account', 'beleggingsrekening']
		);

		// ============================================
		// SYSTEM CATEGORY
		// ============================================

		await createCategoryWithKeywords(
			{
				name: 'Uncategorized',
				description: 'Transactions that haven\'t been categorized',
				color: '#94a3b8',
				icon: 'HelpCircle',
				is_default: true,
				created_by: null,
				group: 'other',
				updated_at: new Date()
			},
			[] // Empty - catch-all
		);

		log('✅ Created all standalone expense categories');
		log('✅ Created Uncategorized system category');

		log('📊 Seed completed successfully!');
		log('   - 6 Income categories');
		log('   - 21 Expense categories (4 parents + 19 subcategories)');
		log('   - 1 System category (Uncategorized)');
		log('   - Total: 46 categories');
	} catch (error) {
		console.error('❌ Error during seeding:', error);
		throw error;
	}
}

main()
	.catch((e) => {
		console.error('❌ Fatal error seeding database:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
