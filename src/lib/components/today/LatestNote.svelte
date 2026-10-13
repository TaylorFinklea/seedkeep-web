<!-- "Latest note" panel (export lines 109–111). A single padded box with no divider under the header. -->
<script lang="ts">
	import { garden } from '$lib/state/garden.svelte';
	import { fmt } from '$lib/domain/dates';
</script>

<section class="panel" aria-labelledby="latest-note-title">
	<div class="panel-head">
		<h2 id="latest-note-title">Latest note</h2>
		<span class="mono muted date">{garden.note ? fmt(garden.note.date) : ''}</span>
	</div>
	<p class="body">{garden.note?.body?.trim() || 'No journal notes yet.'}</p>
</section>

<style>
	.panel {
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 14px;
		min-width: 0;
	}

	.panel-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 10px;
	}

	h2 {
		margin: 0;
		font-size: 14px;
		font-weight: 700;
	}

	.body {
		margin: 10px 0 0;
		font-size: 15px;
		text-wrap: pretty;
	}

	.mono {
		font-family: var(--mono);
	}

	.date {
		font-size: 12px;
	}

	.muted {
		color: var(--muted);
	}
</style>
