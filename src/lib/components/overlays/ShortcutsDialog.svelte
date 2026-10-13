<!-- Keyboard shortcuts dialog (export lines 367–374, list at 482). -->
<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte';
	import { FEATURES } from '$lib/config';
	import { ui } from '$lib/state/ui.svelte';

	const open = $derived(ui.isOpen('shortcuts'));

	/** Rows for flagged-off features (Ask Sprout) are left out. */
	const ALL_ROWS: { label: string; keys: string; enabled: boolean }[] = [
		{ label: 'Command menu', keys: '⌘K', enabled: true },
		{ label: 'Add a seed', keys: 'N', enabled: true },
		{ label: 'Filter seeds', keys: '/', enabled: true },
		{ label: 'Ask Sprout', keys: 'A', enabled: FEATURES.sprout },
		{ label: 'Go to Today', keys: 'G T', enabled: true },
		{ label: 'Go to Seeds', keys: 'G S', enabled: true },
		{ label: 'Go to Garden', keys: 'G B', enabled: true },
		{ label: 'Go to Planting windows', keys: 'G W', enabled: true },
		{ label: 'Go to Settings', keys: 'G P', enabled: true },
		{ label: 'Close / cancel', keys: 'Esc', enabled: true },
		{ label: 'This list', keys: '?', enabled: true }
	];
	const ROWS = ALL_ROWS.filter((row) => row.enabled);
</script>

<Dialog
	variant="modal"
	width="420px"
	label="Keyboard shortcuts"
	{open}
	onclose={() => ui.close('shortcuts')}
>
	<div class="sheet">
		<h2>Keyboard shortcuts</h2>
		<ul>
			{#each ROWS as row (row.label)}
				<li>
					<span>{row.label}</span>
					<kbd>{row.keys}</kbd>
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
