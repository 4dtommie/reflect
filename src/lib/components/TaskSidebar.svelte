<script lang="ts">
	import { page } from '$app/stores';
	import { ChevronRight, ChevronLeft } from 'lucide-svelte';
	
	let { onExpandedChange }: { onExpandedChange?: (expanded: boolean) => void } = $props();
	
	// Mock task data - this will come from the API later
	const tasks = [
		{
			key: 'upload_transactions',
			title: 'Upload Transactions',
			category: 'setup',
			route: '/upload-transactions',
			isCompleted: true
		},
		{
			key: 'categorize_transactions',
			title: 'Categorize Transactions',
			category: 'enrichment',
			route: '/enrich/categorize',
			isCompleted: false
		},
		{
			key: 'detect_salary',
			title: 'Detect Salary',
			category: 'analysis',
			route: '/analyze/salary',
			isCompleted: false
		},
		{
			key: 'detect_subscriptions',
			title: 'Detect Subscriptions',
			category: 'analysis',
			route: '/analyze/subscriptions',
			isCompleted: false
		}
	];
	
	// Get current route from page store
	const currentRoute = $derived($page.url.pathname);
	
	// Add step numbers (1-4) to tasks
	const tasksWithNumbers = $derived(
		tasks.map((task, index) => ({
			...task,
			stepNumber: index + 1
		}))
	);
	
	const completedCount = $derived(tasks.filter(t => t.isCompleted).length);
	const totalCount = tasks.length;
	
	// Collapsible state for mobile
	let isExpanded = $state(false);
	
	// Notify parent when expansion state changes
	$effect(() => {
		if (onExpandedChange) {
			onExpandedChange(isExpanded);
		}
	});
	
	function getStepClass(task: typeof tasks[0]): string {
		const isCurrent = currentRoute === task.route;
		if (task.isCompleted) {
			return 'step step-success';
		}
		if (isCurrent) {
			return 'step step-primary';
		}
		return 'step';
	}
</script>

<div class="bg-base-200 rounded shadow-sm flex flex-col transition-all duration-300 {isExpanded ? 'w-80 sidebar-expanded' : 'w-16'} lg:w-80 p-2 lg:p-4 overflow-x-hidden" style="height: 100%;">
	<!-- Top section: Expand/collapse button and step numbers (when collapsed) -->
	{#if isExpanded}
		<!-- Expanded: Button at top -->
		<div class="mb-4">
			<button 
				onclick={() => isExpanded = !isExpanded}
				class="btn btn-primary btn-sm btn-circle lg:hidden"
				aria-label="Collapse sidebar"
			>
				<ChevronLeft class="h-4 w-4" />
			</button>
		</div>
	{:else}
		<!-- Collapsed: Button and steps centered -->
		<div class="flex flex-col items-center mb-4 lg:hidden overflow-x-hidden w-full">
			<button 
				onclick={() => isExpanded = !isExpanded}
				class="btn btn-primary btn-sm btn-circle mb-4"
				aria-label="Expand sidebar"
			>
				<ChevronRight class="h-4 w-4" />
			</button>
			<div class="flex justify-center w-full overflow-x-hidden">
				<ul class="steps steps-vertical overflow-x-hidden">
					{#each tasksWithNumbers as task (task.key)}
						<li 
							class={getStepClass(task)}
							data-content={task.isCompleted ? '✓' : task.stepNumber}
						>
							<span class="sr-only">{task.title}</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}
	
	<!-- Expanded content - hidden on mobile when collapsed, always visible on desktop -->
	<div class="flex-1 {isExpanded ? '' : 'hidden'} lg:block">
		<!-- Progress Header -->
		<div class="mb-6">
			<h2 class="text-lg font-semibold text-base-content">Your plan</h2>
			<div class="badge badge-primary badge-lg mt-2">
				{completedCount} of {totalCount} reflections completed
			</div>
		</div>
		
		<!-- Tasks with sequential numbering 1-4 -->
		<div class="flex-1">
			<ul class="steps steps-vertical ml-2">
				{#each tasksWithNumbers as task (task.key)}
					<li 
						class={getStepClass(task)}
						data-content={task.isCompleted ? '✓' : task.stepNumber}
					>
						<a 
							href={task.route}
							class="no-underline {currentRoute === task.route ? 'text-primary font-bold' : 'text-base-content'}"
						>
							{task.title}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</div>
