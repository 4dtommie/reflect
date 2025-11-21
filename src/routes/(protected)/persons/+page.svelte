<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="mb-6">
	<a href="/" class="text-blue-600 hover:text-blue-800 underline">← Back to Home</a>
</div>

<div class="mb-6 flex justify-between items-center">
	<h1 class="text-4xl font-bold text-gray-900">People Database</h1>
	<a
		href="/persons/add"
		class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
	>
		Add Person
	</a>
</div>

<p class="text-lg text-gray-700 mb-8">
	Showing {data.people.length} {data.people.length === 1 ? 'person' : 'people'} from the database
</p>

{#if data.people.length === 0}
	<div class="text-center py-12">
		<p class="text-gray-500 mb-4">No people found in the database.</p>
		<a
			href="/persons/add"
			class="text-blue-600 hover:text-blue-800 underline"
		>
			Add your first person
		</a>
	</div>
{:else}
	<table class="styled-table">
		<thead>
			<tr class="bg-gray-100">
				<th>Name</th>
				<th>Age</th>
				<th>City</th>
			</tr>
		</thead>
		<tbody>
			{#each data.people as person (person.id)}
				<tr class="hover:bg-gray-50">
					<td>{person.name}</td>
					<td>{person.age}</td>
					<td>{person.city}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

