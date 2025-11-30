<script lang="ts">
	import { onMount } from 'svelte';
	import { Sparkles, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-svelte';

	type EmbeddingStats = {
		total: number;
		withEmbedding: number;
		withoutEmbedding: number;
		lastUpdated: string | null;
	};

	let loading = $state(false);
	let generating = $state(false);
	let stats = $state<EmbeddingStats | null>(null);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let available = $state<boolean>(false);
	let sampleEmbedding = $state<{
		categoryId: number;
		categoryName: string;
		dimensions: number;
		first10: number[];
		last10: number[];
		updatedAt: string | null;
	} | null>(null);
	let loadingSample = $state(false);

	async function loadStats() {
		loading = true;
		error = null;

		try {
			const response = await fetch('/api/categories/generate-embeddings');
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to load stats');
			}

			available = data.available;
			if (data.stats) {
				stats = {
					...data.stats,
					lastUpdated: data.stats.lastUpdated ? new Date(data.stats.lastUpdated).toISOString() : null
				};
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load embedding status';
			console.error('Error loading stats:', err);
		} finally {
			loading = false;
		}
	}

	async function loadSampleEmbedding() {
		loadingSample = true;
		try {
			const response = await fetch('/api/categories/generate-embeddings?sample=true');
			const data = await response.json();

			if (response.ok && data.sample) {
				sampleEmbedding = {
					...data.sample,
					updatedAt: data.sample.updatedAt ? new Date(data.sample.updatedAt).toISOString() : null
				};
			}
		} catch (err) {
			console.error('Error loading sample embedding:', err);
		} finally {
			loadingSample = false;
		}
	}

	async function generateEmbeddings() {
		generating = true;
		error = null;
		success = null;

		try {
			const response = await fetch('/api/categories/generate-embeddings', {
				method: 'POST'
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to generate embeddings');
			}

			success = `Successfully generated embeddings for ${data.result.updated} categories.`;
			
			if (data.result.errors && data.result.errors.length > 0) {
				success += ` ${data.result.errors.length} errors occurred.`;
			}

			// Reload stats and sample after generation
			await Promise.all([loadStats(), loadSampleEmbedding()]);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate embeddings';
			console.error('Error generating embeddings:', err);
		} finally {
			generating = false;
		}
	}

	onMount(() => {
		loadStats();
		loadSampleEmbedding();
	});

	function formatDate(dateString: string | null): string {
		if (!dateString) return 'Never';
		try {
			const date = new Date(dateString);
			return date.toLocaleString('nl-NL', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return 'Unknown';
		}
	}

	const completionPercentage = $derived(
		stats && stats.total > 0
			? Math.round((stats.withEmbedding / stats.total) * 100)
			: 0
	);
</script>

<div class="max-w-4xl mx-auto">
	<div class="mb-6">
		<h1 class="text-3xl font-bold mb-2">Category embeddings</h1>
		<p class="text-base-content/70">
			Generate vector embeddings for all categories to enable semantic similarity search in transaction categorization.
		</p>
	</div>

	{#if !available}
		<div class="alert alert-warning mb-6">
			<XCircle class="h-5 w-5" />
			<div>
				<h3 class="font-semibold">OpenAI API not configured</h3>
				<p class="text-sm">Set the OPENAI_API_KEY environment variable to enable embedding generation.</p>
			</div>
		</div>
	{:else}
		<!-- Status Card -->
		<div class="card bg-base-200 shadow-sm mb-6">
			<div class="card-body">
				<h2 class="card-title">
					<Sparkles class="h-5 w-5" />
					Embedding status
				</h2>

				{#if loading}
					<div class="flex items-center gap-2">
						<Loader2 class="h-4 w-4 animate-spin" />
						<span>Loading status...</span>
					</div>
				{:else if stats}
					<div class="space-y-4">
						<!-- Progress Bar -->
						<div>
							<div class="flex justify-between items-center mb-2">
								<span class="text-sm font-medium">Completion</span>
								<span class="text-sm">{completionPercentage}%</span>
							</div>
							<progress
								class="progress progress-primary w-full"
								value={stats.withEmbedding}
								max={stats.total}
							></progress>
						</div>

						<!-- Stats Grid -->
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div class="stat bg-base-100 rounded-lg p-4">
								<div class="stat-title">Total categories</div>
								<div class="stat-value text-2xl">{stats.total}</div>
							</div>

							<div class="stat bg-base-100 rounded-lg p-4">
								<div class="stat-title">With embeddings</div>
								<div class="stat-value text-2xl text-success">{stats.withEmbedding}</div>
							</div>

							<div class="stat bg-base-100 rounded-lg p-4">
								<div class="stat-title">Without embeddings</div>
								<div class="stat-value text-2xl text-warning">{stats.withoutEmbedding}</div>
							</div>
						</div>

						<!-- Last Updated -->
						<div class="text-sm text-base-content/70">
							<strong>Last updated:</strong> {formatDate(stats.lastUpdated)}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Actions Card -->
		<div class="card bg-base-200 shadow-sm mb-6">
			<div class="card-body">
				<h2 class="card-title">Actions</h2>

				<div class="flex flex-col sm:flex-row gap-4">
					<button
						class="btn btn-primary"
						onclick={generateEmbeddings}
						disabled={generating || !available}
					>
						{#if generating}
							<Loader2 class="h-4 w-4 animate-spin" />
							<span>Generating embeddings...</span>
						{:else}
							<Sparkles class="h-4 w-4" />
							<span>Generate embeddings</span>
						{/if}
					</button>

					<button
						class="btn btn-ghost"
						onclick={loadStats}
						disabled={loading || generating}
					>
						<RefreshCw class="h-4 w-4" />
						<span>Refresh status</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Messages -->
		{#if error}
			<div class="alert alert-error mb-6">
				<XCircle class="h-5 w-5" />
				<div>
					<h3 class="font-semibold">Error</h3>
					<p class="text-sm">{error}</p>
				</div>
			</div>
		{/if}

		{#if success}
			<div class="alert alert-success mb-6">
				<CheckCircle class="h-5 w-5" />
				<div>
					<h3 class="font-semibold">Success</h3>
					<p class="text-sm">{success}</p>
				</div>
			</div>
		{/if}

		<!-- Sample Embedding Card -->
		{#if stats && stats.withEmbedding > 0}
			<div class="card bg-base-200 shadow-sm mb-6">
				<div class="card-body">
					<h2 class="card-title">
						<Sparkles class="h-5 w-5" />
						Sample embedding
					</h2>

					{#if loadingSample}
						<div class="flex items-center gap-2">
							<Loader2 class="h-4 w-4 animate-spin" />
							<span>Loading sample...</span>
						</div>
					{:else if sampleEmbedding}
						<div class="space-y-4">
							<div class="text-sm">
								<strong>Category:</strong> 
								<a href="/categories/{sampleEmbedding.categoryId}" class="link link-primary">
									{sampleEmbedding.categoryName}
								</a>
							</div>
								<div class="text-sm">
								<strong>Dimensions:</strong> {sampleEmbedding.dimensions} (text-embedding-3-small)
							</div>
							
							<div class="space-y-2">
								<div class="text-sm font-semibold">First 10 values:</div>
								<div class="text-xs bg-base-100 p-3 rounded overflow-x-auto">
									[{sampleEmbedding.first10.map(v => v.toFixed(6)).join(', ')}]
								</div>
							</div>

							<div class="space-y-2">
								<div class="text-sm font-semibold">Last 10 values:</div>
								<div class="text-xs bg-base-100 p-3 rounded overflow-x-auto">
									[{sampleEmbedding.last10.map(v => v.toFixed(6)).join(', ')}]
								</div>
							</div>

							<div class="text-xs text-base-content/50">
								Each embedding is a {sampleEmbedding.dimensions}-dimensional vector of floating-point numbers
								that represents the semantic meaning of the category text.
							</div>
						</div>
					{:else}
						<div class="text-sm text-base-content/70">
							No sample available. Generate embeddings first.
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Info Card -->
		<div class="card bg-base-200 shadow-sm">
			<div class="card-body">
				<h2 class="card-title text-lg">About embeddings</h2>
				<div class="text-sm space-y-2 text-base-content/70">
					<p>
						Category embeddings enable semantic similarity search for transaction categorization.
						Each category's name, description, and up to 20 manual keywords are converted into a
						vector representation that captures semantic meaning.
					</p>
					<p>
						<strong>When to regenerate:</strong> After adding new categories, updating category
						names/descriptions, or adding/removing keywords.
					</p>
					<p>
						<strong>Cost:</strong> Very low (~$0.00002 per category). Generating embeddings for
						all categories typically costs less than $0.01.
					</p>
					<p>
						<strong>Speed:</strong> Very fast! OpenAI's embedding API is optimized for speed,
						typically completing in just a few seconds for all categories.
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>

