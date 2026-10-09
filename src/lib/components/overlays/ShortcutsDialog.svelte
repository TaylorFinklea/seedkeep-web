<!-- Keyboard shortcuts dialog (export lines 367–374, list at 482). -->
<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte';
	import { ui } from '$lib/state/ui.svelte';

	const open = $derived(ui.isOpen('shortcuts'));

	const ROWS: [string, string][] = [
		['Command menu', '⌘K'],
		['Add a seed', 'N'],
		['Filter seeds', '/'],
		['Ask Sprout', 'A'],
		['Go to Today', 'G T'],
		['Go to Seeds', 'G S'],
		['Go to Garden', 'G B'],
		['Go to Planting windows', 'G W'],
		['Go to Settings', 'G P'],
		['Close / cancel', 'Esc'],
		['This list', '?']
	];
</script>

<Dialog variant="modal" width="420px" label="Keyboard shortcuts" {open} onclose={() => ui.close('shortcuts')}>
	<div class="sheet">
		<h2>Keyboard shortcuts</h2>
		<ul>
			{#each ROWS as [label, keys] (label)}
				<li>
					<span>{label}</span>
					<kbd>{keys}</kbd>
				</li>
			{/each}
		</ul>
	</div>
</Dialog>

<style>
	.sheet {
		padding: 16px;
	}

	h2 {
		margin: 0 0 10px;
		font-size: 16px;
		font-weight: 700;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 6px 0;
		border-bottom: 1px solid var(--line);
	}

	kbd {
		font-family: var(--mono);
		font-size: 12px;
		border: 1px solid var(--line2);
		border-radius: 4px;
		padding: 0 6px;
		white-space: nowrap;
	}
</style>
