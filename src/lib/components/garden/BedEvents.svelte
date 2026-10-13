<script lang="ts">
	import { garden } from '$lib/state/garden.svelte';
	import { eventRow } from '$lib/domain/derive';
	import { cellIndex } from '$lib/domain/garden';
	import { ui } from '$lib/state/ui.svelte';
	async function toggle(id: string): Promise<void> {
		try {
			await garden.toggleDone(id);
		} catch (error) {
			ui.showToast(error instanceof Error ? error.message : 'Could not update planting.');
		}
	}
	const rows = $derived.by(() => {
		const bed = garden.beds.find((item) => item.id === ui.garden.bedId) ?? garden.beds[0];
		return bed
			? garden.events
					.filter((event) => event.bed === bed.id)
					.map((event) => ({ event, row: eventRow(garden, event), cell: cellIndex(bed, event) }))
					.sort((a, b) => a.event.date.localeCompare(b.event.date))
			: [];
	});
</script>

<section aria-label="Bed events">
	<div class="table">
		<div class="line header">
			<span></span><span>Date</span><span>Task</span><span>Seed</span><span>Square</span><span
				>Status</span
			>
		</div>
		{#each rows as item (item.event.id)}
			<div class="line" style:background={item.row.hasFrost ? 'var(--warnSoft)' : 'transparent'}>
				<label class="check"
					><input
						type="checkbox"
						aria-label={`Mark ${item.row.seedTitle} done`}
						checked={item.event.done}
						onchange={() => void toggle(item.event.id)}
					/></label
				>
				<span class="date">{item.row.dateLabel}</span><span>{item.row.kindLabel}</span>
				<span class:done={item.event.done} class="seed" title={item.row.seedTitle}
					>{item.row.seedTitle}</span
				>
				<span class="square">R{item.cell.row + 1} · S{item.cell.col + 1}</span>
				<span
					class="status"
					style:color={item.row.overdue
						? 'var(--warn)'
						: item.row.today
							? 'var(--v-plant_now)'
							: 'var(--muted)'}>{item.event.done ? 'done' : item.row.dueLabel.toLowerCase()}</span
				>
			</div>
		{/each}
	</div>
</section>

<style>
	section {
		margin-top: 14px;
		min-width: 0;
		max-width: 100%;
		overflow-x: auto;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 10px;
	}
	.table {
		min-width: 620px;
	}
	.line {
		display: grid;
		grid-template-columns: 36px 70px 96px minmax(0, 1fr) 90px 120px;
		align-items: center;
		padding: 7px 0;
		border-bottom: 1px solid var(--line);
	}
	.header {
		padding: 8px 0;
		border-bottom-color: var(--line2);
		background: var(--panel2);
		color: var(--muted);
		font-size: 12px;
		font-weight: 600;
	}
	.check {
		padding-left: 10px;
		display: flex;
		align-items: center;
		cursor: pointer;
	}
	@media (max-width: 899px), (pointer: coarse) {
		.line {
			grid-template-columns: 44px 70px 96px minmax(0, 1fr) 90px 120px;
		}
		.check {
			width: 44px;
			min-height: 44px;
		}
	}
	.check input {
		accent-color: var(--accent);
	}
	.date {
		font: 12.5px var(--mono);
	}
	.seed {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.seed.done {
		text-decoration: line-through;
	}
	.square,
	.status {
		font: 12px var(--mono);
	}
	.square {
		color: var(--muted);
	}
</style>
