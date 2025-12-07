<script lang="ts">
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';
	import { Bot, Navigation, Activity, Terminal } from 'lucide-svelte';

	let { data } = $props();
	let { functions, actions } = data;
</script>

<svelte:head>
	<title>Chat Capabilities | Reflect</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4">
	<!-- Header -->
	<div class="mb-6 flex items-center gap-3">
		<div class="rounded-lg bg-primary/10 p-2 text-primary">
			<Bot size={24} />
		</div>
		<div>
			<h1 class="text-2xl font-bold">Chat Capabilities</h1>
			<p class="text-sm text-base-content/60">
				Available tools and actions for the Penny AI assistant.
			</p>
		</div>
	</div>

	{#snippet terminalIcon()}
		<Terminal class="h-6 w-6 text-primary" />
	{/snippet}

	{#snippet navIcon()}
		<Navigation class="h-6 w-6 text-secondary" />
	{/snippet}

	<div class="grid gap-6">
		<!-- AI Functions -->
		<DashboardWidget title="AI Functions ({functions.length})" icon={terminalIcon}>
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
				{#each functions as func}
					<div
						class="group relative flex flex-col justify-between rounded-xl border border-base-300 bg-base-100 p-4 transition-all hover:border-primary/50 hover:shadow-sm"
					>
						<div>
							<div class="mb-2 flex items-center justify-between">
								<code
									class="rounded bg-base-200 px-2 py-1 font-mono text-sm font-bold text-primary"
								>
									{func.function.name}
								</code>
							</div>
							<p class="mb-4 text-sm text-base-content/70">
								{func.function.description}
							</p>

							{#if Object.keys(func.function.parameters.properties || {}).length > 0}
								<div class="space-y-2 rounded-lg bg-base-200/50 p-3 text-xs">
									<h4 class="font-semibold text-base-content/50">Parameters</h4>
									<div class="space-y-1">
										{#each Object.entries(func.function.parameters.properties) as [name, schema]}
											<div class="grid grid-cols-[100px_1fr] gap-2">
												<div class="font-mono text-secondary">{name}</div>
												<div class="text-base-content/70">
													<span class="opacity-50">{(schema as any).type}</span>
													<span> - {(schema as any).description}</span>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{:else}
								<div class="text-xs text-base-content/50 italic">No parameters</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</DashboardWidget>

		<!-- Navigation Actions -->
		<DashboardWidget title="Navigation Actions ({actions.length})" icon={navIcon}>
			<div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
				{#each actions as action}
					<div
						class="rounded-xl border border-base-300 bg-base-100 p-4 transition-all hover:border-secondary/50"
					>
						<div class="mb-1 font-mono text-xs font-medium text-base-content/50">
							{action.id}
						</div>
						<div class="mb-2 font-semibold">{action.label}</div>
						<div class="text-xs text-base-content/70">{action.description}</div>
						<div class="mt-3 text-xs opacity-50">
							Link: <span class="font-mono">{action.href}</span>
						</div>
					</div>
				{/each}
			</div>
		</DashboardWidget>
	</div>
</div>
