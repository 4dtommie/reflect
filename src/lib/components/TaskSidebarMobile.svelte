<script lang="ts">
	import { page } from '$app/stores';
	import { Menu } from 'lucide-svelte';
	
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

<div class="bg-base-200 rounded shadow-sm min-h-full w-16 p-2 flex flex-col items-center">
	<!-- Hamburger menu button -->
	<div class="mb-4">
		<label for="task-drawer" class="btn btn-ghost btn-circle btn-xs drawer-button">
			<Menu class="h-3 w-3" />
		</label>
	</div>
	
	<!-- Tasks with sequential numbering 1-4 - vertical compact -->
	<div class="flex-1 flex flex-col items-center justify-center">
		<ul class="steps steps-vertical">
			{#each tasksWithNumbers as task (task.key)}
				<li 
					class={getStepClass(task)}
					data-content={task.stepNumber}
				>
					<span class="sr-only">{task.title}</span>
				</li>
			{/each}
		</ul>
	</div>
	
	<!-- Progress badge at bottom -->
	<div class="badge badge-primary badge-xs mt-4">
		{completedCount}/{totalCount}
	</div>
</div>

