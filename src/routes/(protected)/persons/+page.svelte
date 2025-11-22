<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="mb-6 flex justify-between items-center">
	<h1 class="text-4xl font-bold">People Database</h1>
	<a href="/persons/add" class="btn btn-primary"> Add Person </a>
</div>

<p class="text-lg mb-8">
	Showing {data.people.length} {data.people.length === 1 ? 'person' : 'people'} from the database
</p>

{#if data.people.length === 0}
	<div class="text-center py-12">
		<p class="mb-4">No people found in the database.</p>
		<a href="/persons/add" class="link link-primary"> Add your first person </a>
	</div>
{:else}
	<div class="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
		<table class="table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Age</th>
					<th>City</th>
				</tr>
			</thead>
			<tbody>
				{#each data.people as person (person.id)}
					<tr>
						<td>{person.name}</td>
						<td>{person.age}</td>
						<td>{person.city}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

