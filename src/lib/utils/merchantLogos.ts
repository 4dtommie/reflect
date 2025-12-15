/**
 * Merchant logo utilities
 * 
 * Maps merchant names to their domain for logo fetching via Clearbit Logo API.
 * Uses a simple domain mapping for common merchants, with fallback to category icons.
 */

import { PUBLIC_LOGO_DEV_KEY } from '$env/static/public';

// Mapping of normalized merchant names to their domains
// Keys should be lowercase and cleaned for fuzzy matching
const merchantDomainMap: Record<string, string> = {
    // Dutch Supermarkets & Grocery
    'albert heijn': 'ah.nl',
    'ah': 'ah.nl',
    'aldi': 'aldi.nl',
    'jumbo': 'jumbo.com',
    'plus': 'plus.nl',
    'lidl': 'lidl.nl',
    'dirk': 'dirk.nl',
    'dekamarkt': 'dekamarkt.nl',
    'coop': 'coop.nl',
    'spar': 'spar.nl',
    'picnic': 'picnic.app',

    // Dutch Retail
    'action': 'action.nl',
    'hema': 'hema.nl',
    'blokker': 'blokker.nl',
    'xenos': 'xenos.nl',
    'kruidvat': 'kruidvat.nl',
    'etos': 'etos.nl',
    'trekpleister': 'trekpleister.nl',
    'bijenkorf': 'debijenkorf.nl',
    'intertoys': 'intertoys.nl',
    'zeeman': 'zeeman.com',
    'primark': 'primark.com',
    'we fashion': 'wefashion.com',
    'vanharen': 'vanharen.nl',
    'van haren': 'vanharen.nl',
    'nelson': 'nelson.nl',
    'bristol': 'bristol.nl',
    'omoda': 'omoda.nl',

    // Fashion
    'zara': 'zara.com',
    'mango': 'mango.com',
    'uniqlo': 'uniqlo.com',
    'the sting': 'thesting.com',

    // Streaming & Entertainment
    'netflix': 'netflix.com',
    'spotify': 'spotify.com',
    'youtube': 'youtube.com',
    'youtube premium': 'youtube.com',
    'disney': 'disneyplus.com',
    'disney+': 'disneyplus.com',
    'viaplay': 'viaplay.nl',
    'videoland': 'videoland.com',
    'storytel': 'storytel.com',
    'podimo': 'podimo.com',
    'apple services': 'apple.com',
    'steam': 'steampowered.com',
    'steampowered': 'steampowered.com',

    // Tech & Online Shopping
    'amazon': 'amazon.com',
    'amazon prime': 'amazon.com',
    'amazon eu': 'amazon.com',
    'bol': 'bol.com',
    'coolblue': 'coolblue.nl',
    'mediamarkt': 'mediamarkt.nl',
    'alternate': 'alternate.nl',
    'azerty': 'azerty.nl',
    'megekko': 'megekko.nl',
    'bax-shop': 'bax-shop.nl',
    'wehkamp': 'wehkamp.nl',
    'zalando': 'zalando.nl',
    'aboutyou': 'aboutyou.nl',
    'about you': 'aboutyou.nl',
    'thuisbezorgd': 'thuisbezorgd.nl',
    'toogoodtogo': 'toogoodtogo.com',
    'microsoft': 'microsoft.com',
    'apple': 'apple.com',

    // Food & Restaurants
    'mcdonalds': 'mcdonalds.nl',
    'kfc': 'kfc.nl',
    'burger king': 'burgerking.nl',
    'subway': 'subway.com',
    'dominos': 'dominos.nl',
    'new york pizza': 'newyorkpizza.nl',
    'starbucks': 'starbucks.nl',

    // Transport
    'ns': 'ns.nl',
    'ns reizigers': 'ns.nl',
    'ns groep': 'ns.nl',
    'arriva': 'arriva.nl',
    'transavia': 'transavia.com',
    'klm': 'klm.nl',
    'uber': 'uber.com',
    'bolt': 'bolt.eu',
    'airbnb': 'airbnb.com',
    'swapfiets': 'swapfiets.nl',

    // Telecom
    'ziggo': 'ziggo.nl',
    'kpn': 'kpn.com',
    'vodafone': 'vodafone.nl',
    'tele2': 'tele2.nl',
    't-mobile': 't-mobile.nl',
    'odido': 'odido.nl',
    'simyo': 'simyo.nl',
    'youfone': 'youfone.nl',
    'belsimpel': 'belsimpel.nl',

    // Energy
    'vattenfall': 'vattenfall.nl',
    'eneco': 'eneco.nl',
    'essent': 'essent.nl',
    'greenchoice': 'greenchoice.nl',
    'oxxio': 'oxxio.nl',
    'anwb energie': 'anwb.nl',

    // Insurance & Finance
    'menzis': 'menzis.nl',
    'vgz': 'vgz.nl',
    'zilveren kruis': 'zilverenkruis.nl',
    'cz': 'cz.nl',
    'nationale-nederlanden': 'nn.nl',
    'aegon': 'aegon.nl',
    'ohra': 'nn.nl',
    'anwb': 'anwb.nl',
    'ing': 'ing.nl',
    'rabobank': 'rabobank.nl',
    'abn amro': 'abnamro.nl',
    'bunq': 'bunq.com',

    // Government & Public
    'belastingdienst': 'belastingdienst.nl',

    // Fuel & Parking
    'shell': 'shell.nl',
    'bp': 'bp.com',
    'esso': 'esso.nl',
    'total': 'totalenergies.nl',
    'q-park': 'q-park.nl',

    // Fitness
    'basic-fit': 'basic-fit.com',

    // Home & Garden
    'ikea': 'ikea.nl',
    'gamma': 'gamma.nl',
    'hornbach': 'hornbach.nl',
    'praxis': 'praxis.nl',
    'karwei': 'karwei.nl',
    'obelink': 'obelink.nl',

    // Payment Providers (generic logo)
    'tikkie': 'tikkie.me',
    'paypal': 'paypal.com',

    // Pharmacies
    'apotheek': '', // Generic - no domain

    // Rituals
    'rituals': 'rituals.com',

    // Museums & Entertainment
    'pathe': 'pathe.nl',
    'efteling': 'efteling.com',
    'madurodam': 'madurodam.nl',
};

/**
 * Normalize a merchant name for lookup
 */
function normalizeMerchantName(merchantName: string): string {
    if (typeof merchantName !== 'string') return '';
    return merchantName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}

/**
 * Find the domain for a merchant name using fuzzy matching
 */
export function getMerchantDomain(merchantName: string): string | null {
    const normalized = normalizeMerchantName(merchantName);

    // Exact match first
    if (merchantDomainMap[normalized]) {
        return merchantDomainMap[normalized];
    }

    // Try prefix matching (e.g., "Albert Heijn 1226" -> "Albert Heijn")
    for (const [key, domain] of Object.entries(merchantDomainMap)) {
        if (normalized.startsWith(key) && domain) {
            return domain;
        }
    }

    // Try contains matching for well-known brands
    const containsMatches = [
        'netflix',
        'spotify',
        'amazon',
        'apple',
        'microsoft',
        'shell',
        'mcdonalds',
        'albert heijn',
        'aldi',
        'lidl',
        'jumbo',
        'ziggo',
        'ns ',
        'ikea',
        'pathe'
    ];

    for (const brand of containsMatches) {
        if (normalized.includes(brand)) {
            return merchantDomainMap[brand.trim()] || null;
        }
    }

    return null;
}

// Logo.dev public key provided by user

/**
 * Get a logo URL using Logo.dev (reliable, works globally)
 */
export function getLogoUrl(domain: string): string {
    return `https://img.logo.dev/${domain}?token=${PUBLIC_LOGO_DEV_KEY}`;
}

/**
 * Get a logo URL for a merchant name
 * Returns null if no domain mapping exists
 */
export function getMerchantLogoUrl(merchantName: string, size: number = 128): string | null {
    const domain = getMerchantDomain(merchantName);
    if (!domain) return null;
    return getLogoUrl(domain);
}

/**
 * Check if a merchant has a known logo
 */
export function hasMerchantLogo(merchantName: string): boolean {
    return getMerchantDomain(merchantName) !== null;
}

