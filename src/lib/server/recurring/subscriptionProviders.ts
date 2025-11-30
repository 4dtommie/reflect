export interface SubscriptionProvider {
    name: string;
    keywords: string[];
    category?: string;
    expectedAmount?: number; // Optional: if it's a fixed price service
}

/**
 * @deprecated This list is now replaced by the `merchants` table in the database with `is_potential_recurring = true`.
 * Use `RecurringDetectionService.detectByKnownList` which fetches from the DB.
 */
export const KNOWN_SUBSCRIPTION_PROVIDERS: SubscriptionProvider[] = [
    // Streaming
    { name: 'Spotify', keywords: ['spotify'], category: 'Entertainment' },
    { name: 'Netflix', keywords: ['netflix'], category: 'Entertainment' },
    { name: 'Disney+', keywords: ['disney plus', 'disney+'], category: 'Entertainment' },
    { name: 'Amazon Prime', keywords: ['amazon prime', 'prime video'], category: 'Entertainment' },
    { name: 'HBO Max', keywords: ['hbo max', 'hbo'], category: 'Entertainment' },
    { name: 'Videoland', keywords: ['videoland'], category: 'Entertainment' },
    { name: 'Viaplay', keywords: ['viaplay'], category: 'Entertainment' },
    { name: 'YouTube Premium', keywords: ['google *youtube', 'youtube premium'], category: 'Entertainment' },
    { name: 'Apple Services', keywords: ['apple.com/bill', 'itunes'], category: 'Entertainment' },

    // Utilities / Dutch Providers - Energy & Telecom
    { name: 'Ziggo', keywords: ['ziggo'], category: 'Utilities' },
    { name: 'KPN', keywords: ['kpn'], category: 'Utilities' },
    { name: 'Odido', keywords: ['odido', 't-mobile'], category: 'Utilities' },
    { name: 'Vattenfall', keywords: ['vattenfall', 'nuon'], category: 'Utilities' },
    { name: 'Eneco', keywords: ['eneco'], category: 'Utilities' },
    { name: 'Essent', keywords: ['essent'], category: 'Utilities' },
    { name: 'Greenchoice', keywords: ['greenchoice'], category: 'Utilities' },
    { name: 'ANWB Energie', keywords: ['anwb energie', 'anwb energy'], category: 'Utilities' },
    { name: 'Budget Energie', keywords: ['budget energie'], category: 'Utilities' },
    { name: 'Vandebron', keywords: ['vandebron'], category: 'Utilities' },
    { name: 'Waternet', keywords: ['waternet'], category: 'Utilities' },
    { name: 'Vitens', keywords: ['vitens'], category: 'Utilities' },

    // Insurance
    { name: 'Inshared', keywords: ['inshared'], category: 'Insurance' },
    { name: 'Centraal Beheer', keywords: ['centraal beheer', 'centraalbeheer'], category: 'Insurance' },
    { name: 'OHRA', keywords: ['ohra'], category: 'Insurance' },
    { name: 'Zilveren Kruis', keywords: ['zilveren kruis'], category: 'Insurance' },
    { name: 'VGZ', keywords: ['vgz'], category: 'Insurance' },
    { name: 'CZ', keywords: ['cz zorgverzekering', 'cz groep'], category: 'Insurance' },
    { name: 'Menzis', keywords: ['menzis'], category: 'Insurance' },
    { name: 'FBTO', keywords: ['fbto'], category: 'Insurance' },
    { name: 'Nationale Nederlanden', keywords: ['nationale nederlanden', 'nn'], category: 'Insurance' },
    { name: 'Aegon', keywords: ['aegon'], category: 'Insurance' },
    { name: 'ANWB', keywords: ['anwb'], category: 'Insurance' },

    // Software / Cloud
    { name: 'Google One', keywords: ['google *storage', 'google one'], category: 'Software' },
    { name: 'iCloud', keywords: ['icloud'], category: 'Software' },
    { name: 'Microsoft 365', keywords: ['microsoft*365', 'msft *365'], category: 'Software' },
    { name: 'Adobe', keywords: ['adobe'], category: 'Software' },
    { name: 'Dropbox', keywords: ['dropbox'], category: 'Software' },
    { name: 'GitHub', keywords: ['github'], category: 'Software' },

    // Other
    { name: 'Swapfiets', keywords: ['swapfiets'], category: 'Transport' },
    { name: 'NS', keywords: ['ns groep', 'ns reizigers'], category: 'Transport' },
    { name: 'Basic-Fit', keywords: ['basic-fit', 'basic fit'], category: 'Health' },
    { name: 'Fit For Free', keywords: ['fit for free'], category: 'Health' },
    { name: 'HelloFresh', keywords: ['hellofresh'], category: 'Food' },
    { name: 'Albert Heijn Premium', keywords: ['albert heijn premium'], category: 'Groceries' }
];
