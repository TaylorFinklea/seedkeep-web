<script lang="ts">
	import { STATE_LABEL, STATES } from '$lib/domain/constants';
	import { seedTitle, windowLabel } from '$lib/domain/derive';
	import { garden } from '$lib/state/garden.svelte';

	const seeds = $derived(
		[...garden.seeds].sort((a, b) => {
			const stateOrder =
				STATES.findIndex((state) => state.key === a.state) -
				STATES.findIndex((state) => state.key === b.state);
			return (
				stateOrder || seedTitle(a).localeCompare(seedTitle(b), undefined, { sensitivity: 'base' })
			);
		})
	);
</script>

<section class="print-inventory" aria-label="Seed inventory for printing">
	<h1>Seed inventory</h1>
	<table>
		<thead
			><tr
				><th>Name</th><th>Variety</th><th>Type</th><th>Company</th><th>Year</th><th>Pkts</th><th
					>Status</th
				><th>Stored in</th><th>Window</th></tr
			></thead
		>
		<tbody>
			{#each seeds as seed (seed.id)}
				<tr>
					<td>{seed.name}</td><td>{seed.variety || '—'}</td><td>{seed.type || 'Untyped'}</td><td
						>{seed.company || '—'}</td
					>
					<td>{seed.year ?? '—'}</td><td>{seed.packets}</td><td>{STATE_LABEL[seed.state]}</td>
					<td>{garden.locations.find((location) => location.id === seed.loc)?.name ?? '—'}</td><td
						>{windowLabel(seed) || '—'}</td
					>
				</tr>
			{/each}
		</tbody>
	</table>
</section>

<style>
	.print-inventory {
		display: none;
	}
	@media print {
		:global(#app-root),
		:global(.skip-link),
		:global(.layer),
		:global(.region) {
			display: none !important;
		}
		.print-inventory {
			display: block;
			padding: 0;
			color: #000;
			background: #fff;
			font: 10pt/1.35 var(--sans);
		}
		.print-inventory h1 {
			margin: 0 0 12pt;
			font-size: 16pt;
		}
		table {
			width: 100%;
			border-collapse: collapse;
		}
		th,
		td {
			border: 1px solid #777;
			padding: 4pt 5pt;
			text-align: left;
			vertical-align: top;
		}
		th {
			font-weight: 700;
		}
		thead {
			display: table-header-group;
		}
		tr {
			break-inside: avoid;
		}
	}
</style>
