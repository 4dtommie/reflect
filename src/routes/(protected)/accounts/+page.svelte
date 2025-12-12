<script lang="ts">
	import { onMount } from 'svelte';
	import { Save, LoaderCircle, CreditCard, Wallet, Landmark } from 'lucide-svelte';
	import PageTitleWidget from '$lib/components/PageTitleWidget.svelte';
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';
	import { invalidateAll } from '$app/navigation';

	interface BankAccount {
		id: number | null;
		iban: string;
		name: string | null;
		type: string | null;
		is_own_account: boolean;
	}

	let accounts: BankAccount[] = $state([]);
	let loading = $state(true);
	let saving: string | null = $state(null); // iban being saved

	onMount(async () => {
		await loadAccounts();
	});

	async function loadAccounts() {
		loading = true;
		try {
			const res = await fetch('/api/bank-accounts');
			if (res.ok) {
				const data = await res.json();
				accounts = data.bankAccounts;
			}
		} catch (err) {
			console.error('Failed to load accounts:', err);
		} finally {
			loading = false;
		}
	}

	async function saveAccount(account: BankAccount) {
		if (!account.name) return;

		saving = account.iban;
		try {
			const res = await fetch('/api/bank-accounts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(account)
			});

			if (res.ok) {
				const saved = await res.json();
				// Update with returned data (e.g. ID)
				const index = accounts.findIndex((a) => a.iban === saved.iban);
				if (index !== -1) {
					accounts[index] = { ...saved };
				}
				await invalidateAll(); // Refresh other pages data
			}
		} catch (err) {
			console.error('Failed to save account:', err);
		} finally {
			saving = null;
		}
	}

	function getIcon(type: string | null) {
		if (type === 'credit_card') return CreditCard;
		if (type === 'savings') return Wallet;
		return Landmark;
	}
</script>

<div class="mx-auto flex max-w-4xl flex-col gap-8 p-4">
	<PageTitleWidget title="Accounts" compact={true} />

	<DashboardWidget size="wide" title="Your Bank Accounts">
		<div class="p-4">
			{#if loading}
				<div class="flex justify-center p-8">
					<LoaderCircle class="h-8 w-8 animate-spin text-primary" />
				</div>
			{:else if accounts.length === 0}
				<div class="p-8 text-center opacity-70">
					<p>No accounts found. Import some transactions first!</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each accounts as account}
						{@const Icon = getIcon(account.type)}
						<div class="flex flex-col items-center gap-4 rounded-lg bg-base-200/50 p-4 md:flex-row">
							<div class="rounded-full bg-base-100 p-3 text-primary">
								<Icon size={24} />
							</div>

							<div class="w-full flex-1">
								<div class="form-control w-full">
									<label class="label pt-0 pb-1">
										<span class="label-text-alt font-mono opacity-70">{account.iban}</span>
									</label>
									<div class="flex gap-2">
										<input
											type="text"
											placeholder="Name (e.g. Joint, Personal)"
											class="input-bordered input w-full"
											bind:value={account.name}
										/>
										<select class="select-bordered select w-32" bind:value={account.type}>
											<option value={null}>Checking</option>
											<option value="savings">Savings</option>
											<option value="credit_card">Credit Card</option>
										</select>
									</div>
								</div>
							</div>

							<div class="flex-none">
								<button
									class="btn btn-primary"
									disabled={!account.name || saving === account.iban}
									onclick={() => saveAccount(account)}
								>
									{#if saving === account.iban}
										<LoaderCircle class="h-4 w-4 animate-spin" />
									{:else}
										<Save size={18} />
										Save
									{/if}
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</DashboardWidget>
</div>
