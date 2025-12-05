<script lang="ts">
	import { onMount } from 'svelte';
	import DashboardWidget from './DashboardWidget.svelte';
	import { ArrowRight, Send, ChevronDown, Loader2 } from 'lucide-svelte';

	interface Message {
		id: number;
		role: 'user' | 'assistant';
		content: string;
		actionButtons?: Array<{ label: string; href: string }> | null;
		createdAt: Date;
	}

	interface Insight {
		id: string;
		category: 'urgent' | 'action' | 'insight' | 'celebration' | 'tip';
		priority: number;
		message: string;
		icon?: string;
		actionLabel?: string;
		actionHref?: string;
	}

	let { insight }: { insight: Insight | null } = $props();

	// State
	let messages = $state<Message[]>([]);
	let conversationId = $state<number | null>(null);
	let inputValue = $state('');
	let isLoading = $state(false);
	let showAllMessages = $state(false);
	let hasMore = $state(false);
	let initialized = $state(false);
	let messagesContainer: HTMLDivElement;
	let userScrolledUp = $state(false);
	let canScrollUp = $state(false);

	// Time-aware greeting
	const getTimeGreeting = () => {
		const hour = new Date().getHours();
		if (hour < 12) return 'Good morning!';
		if (hour < 17) return 'Good afternoon!';
		return 'Good evening!';
	};

	const timeGreeting = getTimeGreeting();

	// Category-based styling
	const categoryStyles = {
		urgent: 'border-l-error',
		action: 'border-l-warning',
		insight: 'border-l-info',
		celebration: 'border-l-success',
		tip: 'border-l-primary'
	};

	// Load conversation on mount
	onMount(() => {
		loadConversation();
	});

	// Load conversation history
	async function loadConversation() {
		try {
			const res = await fetch('/api/chat');
			if (res.ok) {
				const data = await res.json();
				if (data.messages.length > 0) {
					messages = data.messages.map((m: Message) => ({
						...m,
						createdAt: new Date(m.createdAt)
					}));
					conversationId = data.conversationId;
					hasMore = data.hasMore;
				} else if (insight) {
					// No messages but we have an insight -> Show greeting + insight
					messages = [
						{
							id: -1, // temporary ID
							role: 'assistant',
							content: `${timeGreeting} I'm Penny 🍌, your financial buddy!`,
							createdAt: new Date()
						},
						{
							id: 0,
							role: 'assistant',
							content: insight.message,
							actionButtons:
								insight.actionLabel && insight.actionHref
									? [{ label: insight.actionLabel, href: insight.actionHref }]
									: null,
							createdAt: new Date()
						}
					];
				} else {
					// No messages and no insight -> Just greeting
					messages = [
						{
							id: 0,
							role: 'assistant',
							content: `${timeGreeting} I'm Penny 🍌, your financial buddy! How can I help you today?`,
							createdAt: new Date()
						}
					];
				}
			}
		} catch (e) {
			console.error('Failed to load conversation:', e);
		}
	}

	// Load more messages
	async function loadMore() {
		if (!conversationId || !hasMore) return;

		try {
			const res = await fetch(
				`/api/chat?conversationId=${conversationId}&offset=${messages.length}`
			);
			if (res.ok) {
				const data = await res.json();
				const olderMessages = data.messages.map((m: Message) => ({
					...m,
					createdAt: new Date(m.createdAt)
				}));
				messages = [...olderMessages, ...messages];
				hasMore = data.hasMore;
			}
		} catch (e) {
			console.error('Failed to load more:', e);
		}
	}

	// Send message
	async function sendMessage() {
		const text = inputValue.trim();
		if (!text || isLoading) return;

		// Reset scroll position - user is sending a new message, scroll to bottom
		userScrolledUp = false;

		// Add user message optimistically
		const userMessage: Message = {
			id: Date.now(),
			role: 'user',
			content: text,
			createdAt: new Date()
		};
		messages = [...messages, userMessage];
		inputValue = '';
		isLoading = true;

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: text,
					conversationId
				})
			});

			if (res.ok) {
				const data = await res.json();
				conversationId = data.conversationId;

				const assistantMessage: Message = {
					id: data.message.id,
					role: 'assistant',
					content: data.message.content,
					actionButtons: data.message.actionButtons,
					createdAt: new Date(data.message.createdAt)
				};
				messages = [...messages, assistantMessage];
			} else {
				// Error response
				messages = [
					...messages,
					{
						id: Date.now(),
						role: 'assistant',
						content: "Sorry, I couldn't process that. Try again? 🙈",
						createdAt: new Date()
					}
				];
			}
		} catch (e) {
			console.error('Send error:', e);
			messages = [
				...messages,
				{
					id: Date.now(),
					role: 'assistant',
					content: 'Oops, something went wrong! 😅',
					createdAt: new Date()
				}
			];
		} finally {
			isLoading = false;
		}
	}

	// Handle Enter key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	// Get visible messages
	const visibleMessages = $derived(() => {
		if (showAllMessages) return messages;
		return messages.slice(-3); // Show last 3 by default
	});

	// Group messages to show labels only on role change
	const groupedMessages = $derived(() => {
		const msgs = visibleMessages();
		return msgs.map((msg, i) => ({
			...msg,
			showLabel: i === 0 || msgs[i - 1].role !== msg.role
		}));
	});

	// Auto-scroll to bottom when messages change
	$effect(() => {
		if (messages.length > 0 && messagesContainer && !userScrolledUp) {
			// Use setTimeout to ensure DOM is updated
			setTimeout(() => {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}, 0);
		}
	});

	// Handle scroll to detect scroll position
	function handleScroll() {
		if (!messagesContainer) return;
		const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
		// Consider "at bottom" if within 50px of bottom
		userScrolledUp = scrollHeight - scrollTop - clientHeight > 50;
		// Show gradient if there's content above (scrollTop > 10px)
		canScrollUp = scrollTop > 10;
	}
</script>

<DashboardWidget size="auto" enableHover={false}>
	<div class="flex flex-col gap-2 p-1">
		<!-- Messages area wrapper -->
		<div class="relative">
			<!-- Top gradient (shows when can scroll up) -->
			{#if canScrollUp}
				<div
					class="pointer-events-none absolute top-0 right-0 left-0 z-10 h-8 bg-gradient-to-b from-base-100 to-transparent"
				></div>
			{/if}

			<div
				bind:this={messagesContainer}
				onscroll={handleScroll}
				class="chat-messages flex max-h-64 flex-col gap-2 overflow-y-auto"
			>
				<!-- Show more button -->
				{#if messages.length > 3 && !showAllMessages}
					<button
						class="btn text-xs opacity-60 btn-ghost btn-xs"
						onclick={() => (showAllMessages = true)}
					>
						<ChevronDown class="h-3 w-3" />
						Show {messages.length - 3} more
					</button>
				{/if}

				{#each groupedMessages() as msg (msg.id)}
					{#if msg.role === 'user'}
						<!-- User message -->
						<div class="flex flex-col items-end gap-1">
							{#if msg.showLabel}
								<p class="mt-2 mr-2 text-xs font-medium opacity-50">You</p>
							{/if}
							<div class="max-w-[85%] rounded-xl rounded-tr-none bg-primary/10 px-3 py-2">
								<p class="text-sm">{msg.content}</p>
							</div>
						</div>
					{:else}
						<!-- Assistant message -->
						<div class="flex flex-col items-start gap-1">
							{#if msg.showLabel}
								<p class="mt-2 ml-2 text-xs font-bold text-primary">Penny 🍌</p>
							{/if}
							<div
								class="rounded-xl rounded-tl-none border-l-4 border-l-primary bg-base-200 px-3 py-2"
							>
								<p class="text-sm">{msg.content}</p>

								{#if msg.actionButtons && msg.actionButtons.length > 0}
									<div class="mt-2 flex flex-wrap gap-1">
										{#each msg.actionButtons as button}
											<a
												href={button.href}
												class="btn gap-1 text-primary btn-ghost btn-xs hover:bg-primary/10"
											>
												{button.label}
												<ArrowRight class="h-3 w-3" />
											</a>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/if}
				{/each}

				<!-- Loading indicator -->
				{#if isLoading}
					<div class="flex items-center gap-2 text-sm opacity-60">
						<Loader2 class="h-4 w-4 animate-spin" />
						Thinking...
					</div>
				{/if}
			</div>
		</div>

		<!-- Input area -->
		<div class="mt-1 flex gap-2">
			<input
				type="text"
				class="input-bordered input input-sm flex-1 text-sm"
				placeholder="Ask about your finances..."
				bind:value={inputValue}
				onkeydown={handleKeydown}
				disabled={isLoading}
			/>
			<button
				class="btn btn-sm btn-primary"
				onclick={sendMessage}
				disabled={isLoading || !inputValue.trim()}
			>
				<Send class="h-4 w-4" />
			</button>
		</div>
	</div>
</DashboardWidget>

<style>
	/* Auto-hide scrollbar - shows on hover */
	:global(.chat-messages) {
		scrollbar-width: thin;
		scrollbar-color: transparent transparent;
	}

	:global(.chat-messages:hover) {
		scrollbar-color: oklch(var(--bc) / 0.3) transparent;
	}

	/* Webkit browsers */
	:global(.chat-messages::-webkit-scrollbar) {
		width: 6px;
	}

	:global(.chat-messages::-webkit-scrollbar-track) {
		background: transparent;
	}

	:global(.chat-messages::-webkit-scrollbar-thumb) {
		background-color: transparent;
		border-radius: 3px;
	}

	:global(.chat-messages:hover::-webkit-scrollbar-thumb) {
		background-color: oklch(var(--bc) / 0.3);
	}
</style>
