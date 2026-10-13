<script lang="ts">
	import { garden } from '$lib/state/garden.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { commands } from '$lib/state/commands';
	import { byId, eventRow } from '$lib/domain/derive';
	import { tick } from 'svelte';
	import { cellIndex } from '$lib/domain/garden';
	import { isYMD } from '$lib/domain/dates';
	import { KIND } from '$lib/domain/constants';
	const selected = $derived(byId(garden.events, ui.garden.selEv));
	const event = $derived(
		selected?.bed === (byId(garden.beds, ui.garden.bedId) ?? garden.beds[0])?.id
			? selected
			: undefined
	);
	const row = $derived(event ? eventRow(garden, event) : undefined);
	const seed = $derived(event ? byId(garden.seeds, event.seed) : undefined);
	const bed = $derived(byId(garden.beds, ui.garden.bedId) ?? garden.beds[0]);
	const kinds = Object.entries(KIND).filter(([kind]) => kind !== 'note');
	async function update(patch: Parameters<typeof garden.updateEvent>[1]): Promise<void> {
		if (!event) return;
		try {
			await garden.updateEvent(event.id, patch);
		} catch (error) {
			ui.showToast(error instanceof Error ? error.message : 'Could not save planting.');
		}
	}
	async function clearSquare(): Promise<void> {
		if (!event || !bed) return;
		const { row, col } = cellIndex(bed, event);
		try {
			await commands.removeEvent(event.id);
		} catch (error) {
			ui.showToast(error instanceof Error ? error.message : 'Could not remove planting.');
			return;
		}
		await tick();
		document.querySelector<HTMLElement>(`[data-cell="${row}-${col}"]`)?.focus();
	}
	const position = $derived(
		event && bed
			? `${Math.max(0, Math.min(bed.w - 1, Math.floor(event.x))) + 1}, square ${Math.max(0, Math.min(bed.l - 1, Math.floor(event.y))) + 1}`
			: ''
	);
</script>

<section aria-label="Square details">
	<h2>Square details</h2>
	{#if event && row}
		<div class="fields">
			<div>
				<strong>{row.seedTitle}</strong>
				<div class="meta">Row {position} · spacing {row.spacing ? `${row.spacing} in` : '—'}</div>
			</div>
			<label
				>Task<select
					aria-label="Task"
					value={event.kind}
					onchange={(e) => update({ kind: e.currentTarget.value as typeof event.kind })}
					>{#each kinds as [kind, label]}<option value={kind}>{label}</option>{/each}</select
				></label
			>
			<label
				>Date<input
					aria-label="Date"
					type="date"
					value={event.date}
					onchange={(e) => {
						if (isYMD(e.currentTarget.value)) void update({ date: e.currentTarget.value });
					}}
				/></label
			>
			<label class="done"
				><input
					type="checkbox"
					checked={event.done}
					onchange={() => void update({ done: !event!.done })}
				/> Done</label
			>
			{#if row.hasFrost}<p class="frost">{row.frost}</p>{/if}
			<button class="clear" type="button" onclick={clearSquare}>Clear square</button>
		</div>
	{:else}
		<p class="empty">
			Pick a seed on the left, then click empty squares to plan it. Click a planted square to edit
			it.
		</p>
	{/if}
</section>

<style>
	section {
		flex: 1 1 240px;
		max-width: 100%;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 12px;
	}
	h2 {
		font-size: 14px;
		margin: 0 0 8px;
	}
	.fields {
		display: grid;
		gap: 10px;
	}
	.meta {
		color: var(--muted);
		font-size: 12.5px;
	}
	label {
		display: grid;
		gap: 3px;
		color: var(--muted);
		font-size: 12px;
	}
	select,
	input[type='date'] {
		width: 100%;
		border: 1px solid var(--line2);
		border-radius: 6px;
		padding: 5px 7px;
		background: var(--panel);
		color: var(--ink);
		font-size: 14px;
	}
	input[type='date'] {
		font-family: var(--mono);
	}
	.done {
		display: flex;
		gap: 8px;
		align-items: center;
		color: var(--ink);
		font-size: 14px;
	}
	.done input {
		accent-color: var(--accent);
	}
	@media (max-width: 899px), (pointer: coarse) {
		.done {
			min-height: 44px;
		}
	}
	.frost {
		margin: 0;
		background: var(--warnSoft);
		color: var(--warn);
		border-radius: 6px;
		padding: 8px;
		font-size: 12.5px;
	}
	.clear {
		justify-self: start;
		background: none;
		border: 1px solid var(--line2);
		border-radius: 6px;
		padding: 4px 10px;
		cursor: pointer;
		color: var(--warn);
	}
	.empty {
		margin: 0;
		color: var(--muted);
	}
</style>
