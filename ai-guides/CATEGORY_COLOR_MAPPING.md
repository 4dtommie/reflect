# Category color mapping proposal

**Status: ✅ IMPLEMENTED - Option B (Brand-aligned)**

## Selected color scheme

Using your custom Tailwind color scales:

| Group | Custom Color | Hex |
|-------|--------------|-----|
| Eten & drinken | green-500 | `#6dab65` |
| Vervoer & verzekeringen | gray-600 | `#8d8d8d` |
| Vrije tijd | mediumOrange-500 | `#f37b2b` |
| Thuis | blue-500 | `#75a0ce` |
| Gezin & verzorging | purple-500 | `#9b98c8` |
| Financiële zaken | sand-700 | `#947965` |
| Overig | purple-700 | `#7b77b6` |

## Color variants used

For subcategories, lighter variants are used:

| Color Scale | 500 | 400 | 300 |
|-------------|-----|-----|-----|
| green | `#6dab65` | `#9bc595` | `#bad7b6` |
| gray | `#9c9c9c` | `#bababa` | `#cecece` |
| mediumOrange | `#f37b2b` | `#f7a873` | `#fac39f` |
| blue | `#75a0ce` | `#9fbddd` | `#bbd0e7` |
| purple | `#9b98c8` | `#b9b7d8` | `#cdcce4` |
| sand | `#947965` | `#ac9686` | `#c6b7ac` |

---

## All categories with group assignments

Here's every category and its proposed color based on its logical group:

### Income (always green)
| Category | Hex |
|----------|-----|
| Salaris | `#22c55e` |
| Belasting & toeslagen | `#f7c948` |
| Overig inkomen | `#86efac` |

### Eten & drinken (green)
| Category | Parent | Hex |
|----------|--------|-----|
| Eten & boodschappen | - | `#22c55e` |
| Boodschappen | Eten & boodschappen | `#22c55e` |
| Slager | Eten & boodschappen | `#4ade80` |
| Bakker | Eten & boodschappen | `#4ade80` |
| Speciaalzaken | Eten & boodschappen | `#86efac` |
| Restaurants & uit eten | - | `#22c55e` |
| Koffie | Restaurants | `#4ade80` |
| Snacks | Restaurants | `#86efac` |
| Lunch | Restaurants | `#4ade80` |
| Uit eten | Restaurants | `#22c55e` |
| Bestellen | Restaurants | `#4ade80` |
| Uitgaan/bars | Restaurants | `#86efac` |

### Vervoer & verzekeringen (slate/gray)
| Category | Parent | Hex |
|----------|--------|-----|
| Vervoer | - | `#64748b` |
| Auto en fiets betalingen | Vervoer | `#64748b` |
| Brandstof | Vervoer | `#94a3b8` |
| Openbaar vervoer | Vervoer | `#94a3b8` |
| Parkeren | Vervoer | `#cbd5e1` |
| Onderhoud & reparaties | Vervoer | `#cbd5e1` |
| Taxi & ride-sharing | Vervoer | `#94a3b8` |
| Verzekeringen | - | `#64748b` |
| Autoverzekering | Verzekeringen | `#94a3b8` |
| Zorgverzekering | Verzekeringen | `#94a3b8` |
| Reisverzekering | Verzekeringen | `#cbd5e1` |
| Overige verzekering | Verzekeringen | `#cbd5e1` |

### Thuis (sky blue)
| Category | Parent | Hex |
|----------|--------|-----|
| Wonen | - | `#0ea5e9` |
| Huur/hypotheek | Wonen | `#0ea5e9` |
| Energie | Wonen | `#38bdf8` |
| Water | Wonen | `#38bdf8` |
| Internet & TV | Wonen | `#7dd3fc` |
| Onderhoud woning | Wonen | `#7dd3fc` |
| Meubels | Wonen | `#bae6fd` |
| Tuin | Wonen | `#bae6fd` |

### Vrije tijd (orange)
| Category | Parent | Hex |
|----------|--------|-----|
| Hobby's & vrije tijd | - | `#f97316` |
| Sport & fitness | Hobby's | `#f97316` |
| Entertainment | Hobby's | `#fb923c` |
| Vakantie & reizen | Hobby's | `#fb923c` |
| Boeken & media | Hobby's | `#fdba74` |
| Evenementen | Hobby's | `#fdba74` |
| Games | Hobby's | `#fed7aa` |

### Gezin & verzorging (pink)
| Category | Parent | Hex |
|----------|--------|-----|
| Gezondheid | - | `#ec4899` |
| Apotheek | Gezondheid | `#f472b6` |
| Dokter/ziekenhuis | Gezondheid | `#f472b6` |
| Tandarts | Gezondheid | `#f9a8d4` |
| Kinderopvang | - | `#ec4899` |
| Kleding | - | `#ec4899` |
| Schoenen | Kleding | `#f472b6` |
| Accessoires | Kleding | `#f9a8d4` |
| Huisdieren | - | `#ec4899` |
| Diervoeding | Huisdieren | `#f472b6` |
| Dierenarts | Huisdieren | `#f9a8d4` |
| Persoonlijke verzorging | - | `#ec4899` |
| Kapper | Verzorging | `#f472b6` |

### Financiële zaken (teal)
| Category | Parent | Hex |
|----------|--------|-----|
| Bankkosten | - | `#14b8a6` |
| Sparen | - | `#14b8a6` |
| Beleggen | - | `#2dd4bf` |
| Leningen | - | `#14b8a6` |
| Belastingen | - | `#14b8a6` |
| Giften & donaties | - | `#5eead4` |

### Overig (violet)
| Category | Parent | Hex |
|----------|--------|-----|
| Overig | - | `#8b5cf6` |
| Winkelen | - | `#8b5cf6` |
| Electronica | Winkelen | `#a78bfa` |
| Abonnementen | - | `#8b5cf6` |
| Onbekend | - | `#c4b5fd` |

---

## Next steps

1. **Choose Option A or B** (standard vs custom colors)
2. **Review the category-to-group assignments** - some may need adjustments
3. Once approved, I'll update `prisma/seed.ts` with the new colors

Let me know your preference!
