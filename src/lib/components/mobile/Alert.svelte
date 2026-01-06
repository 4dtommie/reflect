<script lang="ts">
	import { Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-svelte';

	type Variant = 'info' | 'success' | 'warning' | 'error';

	interface Props {
		variant?: Variant;
		title: string;
		children?: import('svelte').Snippet;
	}

	let { variant = 'info', title, children }: Props = $props();

	const variantClasses = {
		info: 'alert-info',
		success: 'alert-success',
		warning: 'alert-warning',
		error: 'alert-error'
	};

	const icons = {
		info: Info,
		success: CheckCircle,
		warning: AlertTriangle,
		error: XCircle
	};

	const Icon = icons[variant];
</script>

<div role="alert" class="alert {variantClasses[variant]} flex items-start gap-3 rounded-lg p-4">
	<Icon class="mt-0.5 h-6 w-6 shrink-0" strokeWidth={1.5} />
	<div>
		<h3 class="font-bold">{title}</h3>
		<div class="text-sm">
			{@render children?.()}
		</div>
	</div>
</div>
