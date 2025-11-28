<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';

	let { username }: { username: string } = $props();

	const greetings = [
		"Let's make your money work smarter!",
		'Ready to reflect on your finances?',
		'Time to get those numbers in order!',
		'Your financial journey starts here!',
		"Let's dive into your spending patterns!",
		'Looking good! Time to check those insights.',
		'Another day, another dollar tracked!',
		'Your wallet called - it wants attention!',
		'Money talks, but are you listening?',
		"Let's turn those receipts into insights!",
		'Financial clarity, coming right up!',
		'Ready to make sense of those expenses?',
		'Your money story unfolds here.',
		'Time to see where the magic (money) happens!',
		'Budgets are just goals with numbers!'
	];

	const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
</script>

<DashboardWidget size="wide">
	<div class="px-6 pt-3 pb-6">
		<h1 class="mb-2 text-7xl font-bold">Welcome back, {username}! 👋</h1>
		<p class="text-2xl opacity-70">{randomGreeting}</p>
	</div>
</DashboardWidget>
