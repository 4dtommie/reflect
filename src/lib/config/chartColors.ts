/**
 * Shared chart color configuration for consistent styling across all graphs.
 * 
 * Color palette designed for financial data visualization:
 * - Income: Green (positive, money coming in)
 * - Expenses: Dark purple (recurring/fixed costs) + Light purple (variable costs)
 * - Savings: Yellow/amber (money set aside)
 * - Remaining/Free: Sky blue (disposable income)
 */

// Core color definitions (RGB values)
export const chartColorRGB = {
    income: '34, 197, 94',           // Green (success)
    recurring: '139, 92, 246',       // Dark purple (violet-500)
    variable: '196, 181, 253',       // Light purple (violet-300)
    expenses: '139, 92, 246',        // Uses recurring purple for combined expenses
    savings: '234, 179, 8',          // Yellow (amber-500)
    remaining: '14, 165, 233',       // Sky blue (sky-500)
} as const;

// Hex colors for border/solid use
export const chartColorHex = {
    income: '#22C55E',
    recurring: '#8B5CF6',
    variable: '#C4B5FD',
    expenses: '#8B5CF6',
    savings: '#EAB308',
    remaining: '#0EA5E9',
} as const;

// Background colors with opacity (for fills)
export const chartColorBg = {
    income: `rgba(${chartColorRGB.income}, 0.8)`,
    recurring: `rgba(${chartColorRGB.recurring}, 0.8)`,
    variable: `rgba(${chartColorRGB.variable}, 0.7)`,
    expenses: `rgba(${chartColorRGB.expenses}, 0.8)`,
    savings: `rgba(${chartColorRGB.savings}, 0.8)`,
    remaining: `rgba(${chartColorRGB.remaining}, 0.7)`,
} as const;

// Border colors (solid)
export const chartColorBorder = {
    income: `rgb(${chartColorRGB.income})`,
    recurring: `rgb(${chartColorRGB.recurring})`,
    variable: `rgb(${chartColorRGB.variable})`,
    expenses: `rgb(${chartColorRGB.expenses})`,
    savings: `rgb(${chartColorRGB.savings})`,
    remaining: `rgb(${chartColorRGB.remaining})`,
} as const;

// For area charts with softer fills
export const chartColorAreaFill = {
    income: 'transparent',
    recurring: `rgba(${chartColorRGB.recurring}, 0.6)`,
    variable: `rgba(${chartColorRGB.variable}, 0.5)`,
    savings: `rgba(${chartColorRGB.savings}, 0.6)`,
    remaining: `rgba(${chartColorRGB.remaining}, 0.4)`,
} as const;

// Default export for convenience
export default {
    rgb: chartColorRGB,
    hex: chartColorHex,
    bg: chartColorBg,
    border: chartColorBorder,
    areaFill: chartColorAreaFill,
};
