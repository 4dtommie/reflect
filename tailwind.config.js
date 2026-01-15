/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class',
	// Safelist dynamic classes that JIT might miss
	safelist: [
		'text-mediumOrange-500',
		'text-mediumOrange-600',
		'bg-mediumOrange-500',
		'bg-sand-100',
		'bg-sand-50',
		'text-gray-600',
		'text-gray-800',
		'text-gray-900',
		'text-gray-1000',
	],
	theme: {
		extend: {
			colors: {
				brand: {
					white: '#ffffff'
				},
				gray: {
					50: '#f9f9f9',
					100: '#f0f0f0',
					200: '#e1e1e1',
					300: '#cecece',
					400: '#bababa',
					500: '#9c9c9c',
					600: '#8d8d8d',
					700: '#7e7e7e',
					800: '#6d6d6d',
					900: '#565656',
					1000: '#404040',
					1100: '#2b2b2b',
					1200: '#1a1a1a',
					1300: '#0a0a0a'
				},
				sand: {
					50: '#faf9f8',
					100: '#f3efed',
					200: '#e6dfda',
					300: '#d8cdc6',
					400: '#c6b7ac',
					500: '#ac9686',
					600: '#a28977',
					700: '#947965',
					800: '#816958',
					900: '#645245',
					1000: '#4b3d33',
					1100: '#332923',
					1200: '#1f1915',
					1300: '#0b0908'
				},
				purple: {
					50: '#f9f9fc',
					100: '#f0eff6',
					200: '#e1e0ee',
					300: '#cdcce4',
					400: '#b9b7d8',
					500: '#9b98c8',
					600: '#8c88bf',
					700: '#7b77b6',
					800: '#6a65ac',
					900: '#524e91',
					1000: '#3d3a6c',
					1100: '#292749',
					1200: '#19182c',
					1300: '#0a0911'
				},
				green: {
					50: '#f8fbf8',
					100: '#e9f2e7',
					200: '#d4e6d1',
					300: '#bad7b6',
					400: '#9bc595',
					500: '#6dab65',
					600: '#5d9c55',
					700: '#538b4c',
					800: '#487942',
					900: '#395f34',
					1000: '#2b4727',
					1100: '#1d301a',
					1200: '#111d10',
					1300: '#070b06'
				},
				blue: {
					50: '#f8fafc',
					100: '#eaf1f8',
					200: '#d5e2f0',
					300: '#bbd0e7',
					400: '#9fbddd',
					500: '#75a0ce',
					600: '#5f91c6',
					700: '#4881be',
					800: '#3c70a8',
					900: '#2e5783',
					1000: '#234263',
					1100: '#182d43',
					1200: '#0e1b28',
					1300: '#050a0f'
				},
				darkOrange: {
					50: '#fef8f6',
					100: '#fdede9',
					200: '#fbdad1',
					300: '#f8c2b3',
					400: '#f5a791',
					500: '#f07b5b',
					600: '#ed613a',
					700: '#e64415',
					800: '#c83a12',
					900: '#9e2d0e',
					1000: '#77220b',
					1100: '#521807',
					1200: '#330f05',
					1300: '#150602'
				},
				mediumOrange: {
					50: '#fef8f4',
					100: '#fdede2',
					200: '#fcdac4',
					300: '#fac39f',
					400: '#f7a873',
					500: '#f37b2b',
					600: '#ea650d',
					700: '#d15b0c',
					800: '#b54e0a',
					900: '#8e3e08',
					1000: '#6b2e06',
					1100: '#492004',
					1200: '#2d1302',
					1300: '#120801'
				},
				lightOrange: {
					50: '#fff9f2',
					100: '#ffedd9',
					200: '#ffdbb2',
					300: '#ffc37e',
					400: '#ffa742',
					500: '#ee7f00',
					600: '#d87300',
					700: '#c16700',
					800: '#a75900',
					900: '#834600',
					1000: '#623400',
					1100: '#432400',
					1200: '#291600',
					1300: '#0f0800'
				}
			},
			fontFamily: {
				nn: ['"Nitti Grotesk"', 'sans-serif'],
				heading: ['"Nitti Grotesk Heading"', 'sans-serif']
			},
			borderRadius: {
				// Additional radius options for theme variants
				'2xl': '1rem',
				'3xl': '1.5rem',
				'4xl': '2rem'
			}
		}
	},
	daisyui: {
		themes: [
			{
				// NN Original theme - matches current NN banking app
				'nn-theme': {
					'primary': '#f37b2b',           // mediumOrange-500
					'primary-content': '#ffffff',
					'secondary': '#f3efed',         // sand-100
					'secondary-content': '#1a1a1a', // gray-1200
					'accent': '#f37b2b',            // mediumOrange-500
					'accent-content': '#ffffff',
					'neutral': '#565656',           // gray-900
					'neutral-content': '#ffffff',
					'base-100': '#faf9f8',          // sand-50
					'base-200': '#f3efed',          // sand-100
					'base-300': '#e6dfda',          // sand-200
					'base-content': '#1a1a1a',      // gray-1200
					'info': '#75a0ce',              // blue-500
					'info-content': '#ffffff',
					'success': '#6dab65',           // green-500
					'success-content': '#ffffff',
					'warning': '#ee7f00',           // lightOrange-500
					'warning-content': '#ffffff',
					'error': '#f07b5b',             // darkOrange-500
					'error-content': '#ffffff',
					'--rounded-box': '1rem',
					'--rounded-btn': '9999px',      // pill buttons
					'--rounded-badge': '9999px',
					'--tab-radius': '0.5rem'
				}
			},
			{
				// Improved design theme - modern, cleaner aesthetic
				'nn-improved': {
					'primary': '#ea650d',           // mediumOrange-600 (slightly deeper)
					'primary-content': '#ffffff',
					'secondary': '#ffffff',         // pure white
					'secondary-content': '#1a1a1a',
					'accent': '#ea650d',
					'accent-content': '#ffffff',
					'neutral': '#404040',           // gray-1000
					'neutral-content': '#ffffff',
					'base-100': '#faf9f8',          // sand-50
					'base-200': '#ffffff',          // white for cards
					'base-300': '#f3efed',          // sand-100
					'base-content': '#1a1a1a',
					'info': '#4881be',              // blue-700
					'info-content': '#ffffff',
					'success': '#538b4c',           // green-700
					'success-content': '#ffffff',
					'warning': '#d87300',           // lightOrange-600
					'warning-content': '#ffffff',
					'error': '#e64415',             // darkOrange-700
					'error-content': '#ffffff',
					'--rounded-box': '1.25rem',     // larger radius
					'--rounded-btn': '0.75rem',     // square-ish buttons
					'--rounded-badge': '0.5rem',
					'--tab-radius': '0.75rem'
				}
			}
		]
	}
};
