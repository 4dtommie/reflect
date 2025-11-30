<script lang="ts">
	import { page } from '$app/stores';
	import { LayoutDashboard, Receipt, FileText, BarChart3 } from 'lucide-svelte';

	const navItems = [
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/transactions', label: 'Transactions', icon: Receipt },
		{ href: '/reports', label: 'Reports', icon: FileText },
		{ href: '/statistics', label: 'Statistics', icon: BarChart3 }
	];

	const isActive = (href: string) => {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	};
</script>

<nav class="mb-6 flex justify-center p-0">
	<div class="flex flex-wrap justify-center gap-2 md:gap-3">
		{#each navItems as item}
			<a
				href={item.href}
				class="btn {isActive(item.href)
					? 'btn-primary'
					: 'btn-ghost'} gap-2 shadow-md transition-all hover:shadow-lg"
			>
				<svelte:component this={item.icon} size={20} />
				<span class="hidden sm:inline">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
