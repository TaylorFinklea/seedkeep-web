<script lang="ts">
	import type { RouteKey } from '$lib/nav';
	import { commands } from '$lib/state/commands';

	let {
		title,
		sub,
		route
	}: {
		title: string;
		sub: string;
		route: RouteKey;
	} = $props();
</script>

<div class="page-header">
	<h1>{title}</h1>
	<span class="sub">{sub}</span>
	<div class="actions">
		{#if route === 'seeds'}
			<button type="button" class="secondary" onclick={() => commands.importCSV()}>Import CSV</button>
			<button type="button" class="secondary" onclick={() => commands.exportCSV()}>Export</button>
		{/if}
		<button type="button" class="add" onclick={() => commands.openAdd()}>
			<span>Add seed</span>
			<span class="mono hint">N</span>
		</button>
	</div>
</div>

<style>
	.page-header {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px 14px;
		padding: 14px 22px;
		border-bottom: 1px solid var(--line);
		background: var(--panel);
	}

	h1 {
		margin: 0;
		font-size: 18px;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	.sub {
		color: var(--muted);
	}

	.actions {
		margin-left: auto;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.secondary {
		background: var(--panel);
		border: 1px solid var(--line2);
		border-radius: 6px;
		padding: 6px 11px;
		cursor: pointer;
	}

	.secondary:hover {
		background: var(--sel);
	}

	.add {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--accent);
		color: var(--accentInk);
		border: none;
		border-radius: 6px;
		padding: 7px 12px;
		cursor: pointer;
		font-weight: 600;
	}

	.add:hover {
		opacity: 0.92;
	}

	.mono {
		font-family: var(--mono);
	}

	.hint {
		font-size: 11px;
		opacity: 0.75;
	}
</style>
