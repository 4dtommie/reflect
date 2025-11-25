# Default Categories Definition

This document defines all default categories for the Reflectie AI application. Categories are system-wide and available to all users.

## Category Properties

Each category has:
- `name`: Unique category name
- `description`: What this category is for
- `color`: Hex color code for UI display
- `icon`: Lucide icon identifier
- `keywords`: Array of keywords for auto-categorization (English and Dutch)
- `is_default`: `true` for system categories
- `created_by`: `null` for system categories
- `parent_id`: Optional parent category ID for hierarchy
- `group`: Top-level grouping for organization (`income`, `essential`, `lifestyle`, `financial`, `other`)
  - Subcategories inherit their parent's group
  - Custom categories default to `other` group

---

## Income Categories

**Group:** `income`

### 1. Salary
- **Description:** Regular employment income
- **Color:** `#22c55e` (green)
- **Icon:** `Briefcase`
- **Keywords:** `["salary", "wage", "income", "paycheck", "loon", "salaris", "inkomen"]`
- **Parent:** None
- **Group:** `income`

### 2. Freelance/Contract
- **Description:** Freelance or contract work income
- **Color:** `#10b981` (emerald)
- **Icon:** `User`
- **Keywords:** `["freelance", "contract", "consulting", "zzp", "zelfstandige"]`
- **Parent:** None
- **Group:** `income`

### 3. Investment Returns
- **Description:** Dividends, interest, capital gains
- **Color:** `#14b8a6` (teal)
- **Icon:** `TrendingUp`
- **Keywords:** `["dividend", "interest", "return", "profit", "dividend", "rente"]`
- **Parent:** None
- **Group:** `income`

### 4. Tax Returns & Subsidies
- **Description:** Tax refunds and government subsidies (Belastingdienst, RVO, etc.)
- **Color:** `#06b6d4` (cyan)
- **Icon:** `FileText`
- **Keywords:** `["tax return", "belastingdienst", "belasting", "teruggave", "aangifte", "belastingteruggave", "voorlopige teruggave", "advance tax", "voorlopige aanslag", "belasting voorlopig", "rvo", "subsidie", "subsidy", "rijksdienst", "ondernemend nederland", "kinderopvangtoeslag", "childcare allowance", "kinderopvang", "huurtoeslag", "rent allowance", "huur", "toeslag", "woningtoeslag"]`
- **Parent:** None
- **Group:** `income`

### 5. Refund
- **Description:** Money returned from purchases
- **Color:** `#06b6d4` (cyan)
- **Icon:** `RotateCcw`
- **Keywords:** `["refund", "terugbetaling", "reimbursement", "terug"]`
- **Parent:** None
- **Group:** `income`

### 6. Other Income
- **Description:** Miscellaneous income
- **Color:** `#3b82f6` (blue)
- **Icon:** `DollarSign`
- **Keywords:** `["income", "other", "overig", "inkomen"]`
- **Parent:** None
- **Group:** `income`

---

## Expense Categories

**Group:** `essential` (for needs) or `lifestyle` (for wants)

### 7. Food & Groceries
- **Description:** Parent category for food and grocery purchases (use subcategories for categorization)
- **Color:** `#f59e0b` (amber)
- **Icon:** `ShoppingCart`
- **Keywords:** `[]` (empty - parent category only, use subcategories)
- **Parent:** None
- **Group:** `essential`
- **Note:** This is an organizational parent category. Transactions should be categorized into the subcategories below, not this parent category. Subcategories inherit the `essential` group.

#### Subcategories of Food & Groceries:

##### 7a. Supermarket
- **Description:** Large grocery stores, supermarkets, convenience stores, and online grocery delivery
- **Color:** `#f59e0b` (amber)
- **Icon:** `ShoppingCart`
- **Keywords:** `["supermarket", "grocery store", "ah", "albert heijn", "jumbo", "aldi", "lidl", "plus", "coop", "ekoplaza", "supermarkt", "boodschappen", "convenience store", "corner shop", "buurtwinkel", "tankstation", "gas station shop", "spar", "small shop", "picnic", "online grocery", "grocery delivery", "bezorging boodschappen", "thuisbezorgd grocery", "ah bezorg", "jumbo bezorg"]`
- **Parent:** 7 (Food & Groceries)
- **Group:** `essential` (inherited from parent)

##### 7b. Butcher
- **Description:** Butcher shops and meat stores
- **Color:** `#dc2626` (red-600)
- **Icon:** `Drumstick`
- **Keywords:** `["butcher", "slager", "slagerij", "vlees", "meat", "vleeswaren"]`
- **Parent:** 7 (Food & Groceries)
- **Group:** `essential` (inherited from parent)

##### 7c. Baker
- **Description:** Bakeries and bread shops
- **Color:** `#fbbf24` (amber-400)
- **Icon:** `Wheat`
- **Keywords:** `["baker", "bakker", "bakkerij", "bread", "brood", "pastry", "gebak"]`
- **Parent:** 7 (Food & Groceries)
- **Group:** `essential` (inherited from parent)

##### 7d. Specialty Food Stores
- **Description:** Delicatessen, specialty food shops, organic stores, health food stores
- **Color:** `#10b981` (emerald-500)
- **Icon:** `Leaf`
- **Keywords:** `["delicatessen", "specialty", "organic", "health food", "natuurwinkel", "biologisch", "ekoplaza", "marqt", "specialty store"]`
- **Parent:** 7 (Food & Groceries)
- **Group:** `essential` (inherited from parent)

### 8. Restaurants & Dining
- **Description:** Parent category for dining-related expenses (use subcategories for categorization)
- **Color:** `#f97316` (orange)
- **Icon:** `Utensils`
- **Keywords:** `[]` (empty - parent category only, use subcategories)
- **Parent:** None
- **Group:** `lifestyle`
- **Note:** This is an organizational parent category. Transactions should be categorized into the subcategories below, not this parent category. Subcategories inherit the `lifestyle` group.

#### Subcategories of Restaurants & Dining:

##### 8a. Coffee
- **Description:** Coffee shops and cafes
- **Color:** `#ea580c` (orange-600)
- **Icon:** `Coffee`
- **Keywords:** `["coffee", "cafe", "koffie", "espresso", "latte", "cappuccino", "starbucks", "douwe egberts"]`
- **Parent:** 8 (Restaurants & Dining)
- **Group:** `lifestyle` (inherited from parent)

##### 8b. Lunch
- **Description:** Lunch meals and snacks
- **Color:** `#f97316` (orange)
- **Icon:** `Sandwich`
- **Keywords:** `["lunch", "lunchen", "middageten", "sandwich", "broodje"]`
- **Parent:** 8 (Restaurants & Dining)
- **Group:** `lifestyle` (inherited from parent)

##### 8c. Eating Out
- **Description:** Restaurant meals (dinner, etc.)
- **Color:** `#c2410c` (orange-700)
- **Icon:** `UtensilsCrossed`
- **Keywords:** `["restaurant", "dining", "dinner", "uit eten", "eten", "restaurant"]`
- **Parent:** 8 (Restaurants & Dining)
- **Group:** `lifestyle` (inherited from parent)

##### 8d. Ordering Food
- **Description:** Food delivery and takeout
- **Color:** `#ea580c` (orange-600)
- **Icon:** `ShoppingBag`
- **Keywords:** `["food delivery", "takeout", "thuisbezorgd", "uber eats", "deliveroo", "bezorging", "afhalen"]`
- **Parent:** 8 (Restaurants & Dining)
- **Group:** `lifestyle` (inherited from parent)

##### 8e. Uitgaan/Bars & Drinks
- **Description:** Going out, bars, drinks, nightlife
- **Color:** `#dc2626` (red-600)
- **Icon:** `Wine`
- **Keywords:** `["uitgaan", "bar", "drinks", "nightlife", "kroeg", "café", "bier", "wine", "cocktail", "uit"]`
- **Parent:** 8 (Restaurants & Dining)
- **Group:** `lifestyle` (inherited from parent)

### 9. Transportation
- **Description:** Parent category for transportation expenses (use subcategories for categorization)
- **Color:** `#6366f1` (indigo)
- **Icon:** `Car`
- **Keywords:** `[]` (empty - parent category only, use subcategories)
- **Parent:** None
- **Group:** `essential`
- **Note:** This is an organizational parent category. Transactions should be categorized into the subcategories below, not this parent category. Subcategories inherit the `essential` group.

#### Subcategories of Transportation:

##### 9a. Car Payment
- **Description:** Car loan payments, lease payments
- **Color:** `#6366f1` (indigo)
- **Icon:** `Car`
- **Keywords:** `["car payment", "auto loan", "lease", "autolening", "lease auto", "auto lease"]`
- **Parent:** 9 (Transportation)
- **Group:** `essential` (inherited from parent)

##### 9b. Fuel
- **Description:** Gas, diesel, charging for electric vehicles
- **Color:** `#4f46e5` (indigo-600)
- **Icon:** `Fuel`
- **Keywords:** `["fuel", "gas", "diesel", "benzine", "tankstation", "gas station", "charging", "laden", "elektrisch"]`
- **Parent:** 9 (Transportation)
- **Group:** `essential` (inherited from parent)

##### 9c. Public Transit
- **Description:** Public transportation, OV-chipkaart, train, bus, tram, metro
- **Color:** `#7c3aed` (violet-600)
- **Icon:** `Train`
- **Keywords:** `["public transport", "ov-chipkaart", "ns", "ov", "train", "trein", "bus", "tram", "metro", "openbaar vervoer"]`
- **Parent:** 9 (Transportation)
- **Group:** `essential` (inherited from parent)

##### 9d. Parking
- **Description:** Parking fees, parking permits
- **Color:** `#8b5cf6` (violet-500)
- **Icon:** `SquareParking`
- **Keywords:** `["parking", "parkeren", "parking fee", "parkeergeld", "parking permit"]`
- **Parent:** 9 (Transportation)
- **Group:** `essential` (inherited from parent)

##### 9e. Maintenance & Repairs
- **Description:** Car maintenance, repairs, inspections, tires
- **Color:** `#a855f7` (purple-500)
- **Icon:** `Wrench`
- **Keywords:** `["car maintenance", "repair", "inspection", "apk", "tires", "banden", "onderhoud", "garage", "auto reparatie"]`
- **Parent:** 9 (Transportation)
- **Group:** `essential` (inherited from parent)

##### 9f. Taxi & Rideshare
- **Description:** Taxis, Uber, Lyft, other rideshare services
- **Color:** `#9333ea` (purple-600)
- **Icon:** `Taxi`
- **Keywords:** `["taxi", "uber", "lyft", "rideshare", "taxi", "uber"]`
- **Parent:** 9 (Transportation)
- **Group:** `essential` (inherited from parent)

### 10. Shopping
- **Description:** Parent category for retail purchases (use subcategories for categorization)
- **Color:** `#8b5cf6` (violet)
- **Icon:** `ShoppingBag`
- **Keywords:** `[]` (empty - parent category only, use subcategories)
- **Parent:** None
- **Group:** `lifestyle`
- **Note:** This is an organizational parent category. Transactions should be categorized into the subcategories below, not this parent category. Subcategories inherit the `lifestyle` group.

#### Subcategories of Shopping:

##### 10a. Clothing
- **Description:** Clothing, shoes, accessories
- **Color:** `#8b5cf6` (violet)
- **Icon:** `Shirt`
- **Keywords:** `["clothing", "clothes", "kleding", "shoes", "schoenen", "accessories", "accessoires", "fashion", "mode"]`
- **Parent:** 10 (Shopping)
- **Group:** `lifestyle` (inherited from parent)

##### 10b. Electronics
- **Description:** Electronics, computers, phones, gadgets
- **Color:** `#7c3aed` (violet-600)
- **Icon:** `Smartphone`
- **Keywords:** `["electronics", "computer", "phone", "smartphone", "laptop", "tablet", "gadget", "elektronica", "telefoon"]`
- **Parent:** 10 (Shopping)
- **Group:** `lifestyle` (inherited from parent)

##### 10c. Home Goods
- **Description:** Furniture, home decor, appliances, household items
- **Color:** `#9333ea` (purple-600)
- **Icon:** `Home`
- **Keywords:** `["furniture", "home decor", "appliances", "household", "meubels", "woninginrichting", "huishoudelijk", "apparaten"]`
- **Parent:** 10 (Shopping)
- **Group:** `lifestyle` (inherited from parent)

##### 10d. General Retail
- **Description:** Other retail purchases that don't fit other subcategories
- **Color:** `#a855f7` (purple-500)
- **Icon:** `ShoppingBag`
- **Keywords:** `["shopping", "retail", "store", "winkel", "general", "algemeen"]`
- **Parent:** 10 (Shopping)
- **Group:** `lifestyle` (inherited from parent)

### 11. Bills & Utilities
- **Description:** Electricity, water, gas, internet, phone
- **Color:** `#ec4899` (pink)
- **Icon:** `Zap`
- **Keywords:** `["utility", "electricity", "water", "gas", "internet", "phone", "energie", "water", "gas", "internet", "telefoon", "ziggo", "kpn"]`
- **Parent:** None
- **Group:** `essential`

### 12. Housing
- **Description:** Rent, mortgage, maintenance
- **Color:** `#ef4444` (red)
- **Icon:** `Home`
- **Keywords:** `["rent", "mortgage", "housing", "maintenance", "huur", "hypotheek", "woning", "onderhoud"]`
- **Parent:** None
- **Group:** `essential`

### 13. Healthcare
- **Description:** Medical expenses, pharmacy, health subscriptions (gym, fitness apps)
- **Color:** `#f43f5e` (rose)
- **Icon:** `Heart`
- **Keywords:** `["health", "medical", "pharmacy", "doctor", "hospital", "gezondheid", "medisch", "apotheek", "arts", "ziekenhuis", "gym", "fitness", "sportschool", "strava", "myfitnesspal"]`
- **Parent:** None
- **Group:** `essential`
- **Note:** Includes health/fitness subscriptions. Use `is_recurring` flag to identify recurring payments.

### 14. Entertainment
- **Description:** Movies, streaming, games, hobbies, entertainment subscriptions
- **Color:** `#a855f7` (purple)
- **Icon:** `Film`
- **Keywords:** `["entertainment", "netflix", "spotify", "streaming", "movie", "game", "entertainment", "netflix", "spotify", "film", "spel", "disney", "hbo", "prime", "youtube premium", "twitch", "gaming", "playstation", "xbox", "nintendo"]`
- **Parent:** None
- **Group:** `lifestyle`
- **Note:** Includes entertainment subscriptions (Netflix, Spotify, etc.). Use `is_recurring` flag to identify recurring payments.

### 15. Education
- **Description:** Courses, books, tuition, educational subscriptions
- **Color:** `#06b6d4` (cyan)
- **Icon:** `GraduationCap`
- **Keywords:** `["education", "course", "tuition", "book", "school", "onderwijs", "cursus", "school", "boek", "udemy", "coursera", "skillshare", "masterclass"]`
- **Parent:** None
- **Group:** `lifestyle`
- **Note:** Includes educational subscriptions. Use `is_recurring` flag to identify recurring payments.

### 16. Software & Tools
- **Description:** Software licenses, SaaS subscriptions, productivity tools
- **Color:** `#8b5cf6` (violet)
- **Icon:** `Code`
- **Keywords:** `["software", "saas", "license", "adobe", "microsoft", "office", "dropbox", "google workspace", "notion", "figma", "slack", "zoom", "software", "tool", "productivity"]`
- **Parent:** None
- **Group:** `lifestyle`
- **Note:** Includes software subscriptions. Use `is_recurring` flag to identify recurring payments.

### 17. Travel
- **Description:** Hotels, flights, vacation expenses
- **Color:** `#0ea5e9` (sky)
- **Icon:** `Plane`
- **Keywords:** `["travel", "hotel", "flight", "vacation", "trip", "reizen", "hotel", "vlucht", "vakantie"]`
- **Parent:** None
- **Group:** `lifestyle`

### 18. Insurance
- **Description:** Health, car, home insurance
- **Color:** `#3b82f6` (blue)
- **Icon:** `Shield`
- **Keywords:** `["insurance", "verzekering", "zorgverzekering", "autoverzekering", "inboedelverzekering", "aansprakelijkheidsverzekering"]`
- **Parent:** None
- **Group:** `essential`
- **Note:** Insurance is typically recurring. Use `is_recurring` flag to identify recurring payments.

### 19. Fees & Charges
- **Description:** Bank fees, service charges
- **Color:** `#64748b` (slate)
- **Icon:** `CreditCard`
- **Keywords:** `["fee", "charge", "bank fee", "service fee", "kosten", "vergoeding", "bankkosten"]`
- **Parent:** None
- **Group:** `financial`

### 20. Charity & Donations
- **Description:** Charitable contributions
- **Color:** `#84cc16` (lime)
- **Icon:** `HeartHandshake`
- **Keywords:** `["donation", "charity", "donatie", "goede doel"]`
- **Parent:** None
- **Group:** `lifestyle`

### 21. Personal Care
- **Description:** Haircuts, cosmetics, personal items
- **Color:** `#f472b6` (pink)
- **Icon:** `Sparkles`
- **Keywords:** `["personal care", "haircut", "cosmetics", "personal", "kapper", "cosmetica", "persoonlijk"]`
- **Parent:** None
- **Group:** `lifestyle`

### 22. Loans & Debt Repayment
- **Description:** Loan payments and debt repayment
- **Color:** `#ef4444` (red)
- **Icon:** `CreditCard`
- **Keywords:** `["loan", "debt", "credit card payment", "student loan", "personal loan", "auto loan", "lening", "schuld", "creditcard", "studielening", "persoonlijke lening", "autolening"]`
- **Parent:** None
- **Group:** `essential`
- **Note:** Mortgage payments can be categorized here or under Housing, depending on preference.

### 23. Savings & Investments
- **Description:** Savings contributions and investment deposits
- **Color:** `#10b981` (emerald)
- **Icon:** `PiggyBank`
- **Keywords:** `["savings", "investment", "emergency fund", "retirement", "pension", "sparen", "investering", "spaargeld", "pensioen", "noodfonds"]`
- **Parent:** None
- **Group:** `financial`
- **Note:** Money transferred to savings or investment accounts. Use `is_recurring` flag for regular contributions.

### 24. Pet Care
- **Description:** Pet food, veterinary care, grooming, pet supplies
- **Color:** `#f59e0b` (amber)
- **Icon:** `Heart`
- **Keywords:** `["pet", "veterinary", "vet", "pet food", "dierenarts", "hondenvoer", "kattenvoer", "huisdier", "dier", "pet care", "dierenverzorging"]`
- **Parent:** None
- **Group:** `lifestyle`

### 25. Childcare & Dependent Care
- **Description:** Daycare, childcare services, school supplies, elder care
- **Color:** `#06b6d4` (cyan)
- **Icon:** `Baby`
- **Keywords:** `["childcare", "daycare", "babysitting", "school supplies", "elder care", "kinderopvang", "oppas", "schoolspullen", "ouderenzorg", "zorg"]`
- **Parent:** None
- **Group:** `essential`
- **Note:** Tuition fees can be categorized here or under Education, depending on preference.

### 26. Transfers Between Own Accounts
- **Description:** Transfers between your own bank accounts, savings accounts, investment accounts
- **Color:** `#94a3b8` (slate-400)
- **Icon:** `ArrowLeftRight`
- **Keywords:** `["transfer", "own account", "eigen rekening", "overboeking", "spaarrekening", "savings account", "investment account", "beleggingsrekening"]`
- **Parent:** None
- **Group:** `financial`
- **Note:** Internal transfers that don't represent actual income or expense. These are typically excluded from spending calculations.

### 27. Uncategorized
- **Description:** Transactions that haven't been categorized
- **Color:** `#94a3b8` (slate-400)
- **Icon:** `HelpCircle`
- **Keywords:** `[]` (empty - catch-all)
- **Parent:** None
- **Group:** `other`
- **Note:** This should always be available and cannot be disabled

---

## Summary

**Total Categories:**
- **6 Income Categories** (including 1 combined Tax Returns & Subsidies)
- **21 Expense Categories** (including 4 parents with subcategories: Food & Groceries with 4 subcategories, Restaurants & Dining with 5 subcategories, Transportation with 6 subcategories, Shopping with 4 subcategories)
- **1 System Category** (Uncategorized)
- **Total: 27 main categories + 19 subcategories = 46 categories**

**Note on Subscriptions:**
- Subscriptions are not a separate category - they should be categorized by what they're for
- Entertainment subscriptions (Netflix, Spotify) → Entertainment
- Software subscriptions (Adobe, Microsoft) → Software & Tools
- Educational subscriptions (Udemy, Coursera) → Education
- Health/fitness subscriptions (Gym, fitness apps) → Healthcare
- Use the `is_recurring` flag on transactions to identify recurring payments

**Subcategories:**
- **Food & Groceries** (category #7) has 4 subcategories:
  - Supermarket (7a) - includes convenience stores and online delivery
  - Butcher (7b)
  - Baker (7c)
  - Specialty Food Stores (7d)
- **Restaurants & Dining** (category #8) has 5 subcategories:
  - Coffee (8a)
  - Lunch (8b)
  - Eating Out (8c)
  - Ordering Food (8d)
  - Uitgaan/Bars & Drinks (8e)
- **Transportation** (category #9) has 6 subcategories:
  - Car Payment (9a)
  - Fuel (9b)
  - Public Transit (9c)
  - Parking (9d)
  - Maintenance & Repairs (9e)
  - Taxi & Rideshare (9f)
- **Shopping** (category #10) has 4 subcategories:
  - Clothing (10a)
  - Electronics (10b)
  - Home Goods (10c)
  - General Retail (10d)

**Category Groups:**
- **`income`** - All income categories (6 categories)
- **`essential`** - Essential expenses (needs): Housing, Bills & Utilities, Transportation, Food & Groceries, Healthcare, Insurance, Loans & Debt Repayment, Childcare & Dependent Care (8 main + 10 subcategories)
- **`lifestyle`** - Lifestyle expenses (wants): Restaurants & Dining, Shopping, Entertainment, Travel, Personal Care, Education, Software & Tools, Charity & Donations, Pet Care (9 main + 9 subcategories)
- **`financial`** - Financial management: Savings & Investments, Fees & Charges, Transfers Between Own Accounts (3 categories)
- **`other`** - Uncategorized and custom categories (custom categories default to `other`)

**Implementation Notes:**
- All categories are system defaults (`is_default: true`, `created_by: null`)
- Subcategories use `parent_id` to link to parent category
- Subcategories inherit their parent's `group` field
- Create parent category first, then subcategories with `parent_id` pointing to parent's ID
- Keywords support both English and Dutch for better auto-categorization
- Colors use Tailwind CSS color palette for consistency
- **Parent categories with subcategories should have empty keywords** - they are organizational only and transactions should be categorized into the subcategories, not the parent
- **Custom categories** (created by users) default to `group: "other"` but can be changed
- Groups are used for visual organization, spending reports, and budgeting guidance

