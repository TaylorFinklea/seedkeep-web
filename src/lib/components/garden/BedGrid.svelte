<script lang="ts">
	import { garden } from '$lib/state/garden.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { byId, seedTitle } from '$lib/domain/derive';
	import { buildCells, planDate } from '$lib/domain/garden';
	import Legend from './Legend.svelte';
	const bed = $derived(byId(garden.beds, ui.garden.bedId) ?? garden.beds[0]);
	const cells = $derived(bed ? buildCells(garden, bed, ui.garden.selEv) : []);
	const brush = $derived.by(() => {
		const seed = byId(garden.seeds, ui.garden.brush);
		return seed?.state === 'active' ? seed : undefined;
	});
	async function activate(cell: (typeof cells)[number]): Promise<void> {
		if (!bed) return;
		if (brush) {
			if (cell.eventId) {
				ui.garden.selEv = cell.eventId;
				ui.garden.brush = null;
				return;
			}
			try {
				const event = await garden.addEvent({
					bed: bed.id,
					seed: brush.id,
					kind: 'sowing',
					date: planDate(brush),
					x: cell.row + 0.5,
					y: cell.col + 0.5
				});
				ui.garden.selEv = event.id;
			} catch (error) {
				ui.showToast(error instanceof Error ? error.message : 'Could not add planting.');
			}
		} else ui.garden.selEv = cell.eventId;
	}
</script>

<section aria-label="Garden bed grid">
	{#if bed}
		<div class="heading">
			<span><strong>{bed.name}</strong> <span class="desc">· {bed.desc}</span></span><span
				class:painting={brush}
				class="hint"
				>{brush
					? `Painting ${seedTitle(brush)} · Esc to stop`
					: 'Select a seed to start painting'}</span
			>
		</div>
		<div class="grid-scroll">
			<div
				class="grid"
				style={`--bed-length:${bed.l};grid-template-columns:repeat(${bed.l},minmax(var(--cell-min),1fr))`}
			>
				{#each cells as cell (`${cell.row}-${cell.col}`)}
					<button
						type="button"
						aria-label={cell.label}
						aria-pressed={cell.selected}
						data-cell={`${cell.row}-${cell.col}`}
						title={cell.label}
						onclick={() => activate(cell)}
						style={`background:var(${cell.eventId ? (cell.done ? '--k-note' : `--k-${cell.kind}`) : '--panel2'});box-shadow:inset 0 0 0 2px ${cell.selected ? 'var(--accent)' : cell.frost ? 'var(--warn)' : 'transparent'}`}
					>
						<span>{cell.abbr}</span><small>{cell.sub}</small>
					</button>
				{/each}
			</div>
		</div>
		<Legend />
	{/if}
</section>

<style>
	section {
		flex: 3 1 420px;
		min-width: 0;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 12px;
	}
	.heading {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 10px;
	}
	.desc {
		color: var(--muted);
		font-weight: 400;
	}
	.hint {
		font-size: 12.5px;
		color: var(--muted);
	}
	.hint.painting {
		color: var(--accent);
	}
	.grid {
		--cell-min: 28px;
		--cell-max: 72px;
		display: grid;
		gap: 3px;
		width: min(
			100%,
			calc(var(--bed-length) * var(--cell-max) + (var(--bed-length) - 1) * 3px + 6px)
		);
		min-width: calc(var(--bed-length) * var(--cell-min) + (var(--bed-length) - 1) * 3px + 6px);
		background: var(--line);
		border: 3px solid var(--line);
		border-radius: 6px;
	}
	.grid-scroll {
		min-width: 0;
		max-width: 100%;
		overflow-x: auto;
	}
	button {
		aspect-ratio: 1;
		min-width: 0;
		border: 0;
		border-radius: 3px;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1px;
		padding: 2px;
	}
	button:hover {
		filter: brightness(0.96);
	}
	button:focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: -3px;
	}
	button span {
		font: 500 12px var(--mono);
	}
	button small {
		color: var(--muted);
		font-size: 10px;
	}
	@media (max-width: 899px), (pointer: coarse) {
		.grid {
			--cell-min: 44px;
		}
	}
</style>
