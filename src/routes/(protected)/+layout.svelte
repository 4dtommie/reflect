<script lang="ts">
	import { goto } from '$app/navigation';
	import type { LayoutData } from './$types';

	let { data }: { data: LayoutData } = $props();

	async function signOut() {
		await fetch('/api/auth/signout', { method: 'POST' });
		goto('/');
	}
</script>

<div class="mb-4 flex justify-between items-center">
	<span class="text-gray-600">Logged in as: <strong>{data.user.username}</strong></span>
	<button
		onclick={signOut}
		class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
	>
		Sign Out
	</button>
</div>

<slot />

