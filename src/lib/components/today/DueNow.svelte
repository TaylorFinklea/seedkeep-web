<!-- "Due now" panel (export lines 79–86). Completing an item removes it from the list;
	focus then moves to the next remaining checkbox, else the previous one, else the heading. -->
<script lang="ts">
	import { tick } from 'svelte';
	import { garden } from '$lib/state/garden.svelte';
	import { commands } from '$lib/state/commands';
	import { dueEvents } from '$lib/domain/derive';
	import type { EventRow } from '$lib/domain/types';

	const due = $derived(dueEvents(garden));

	let section: HTMLElement | undefined = $state();
	let heading: HTMLElement | undefined = $state();

	function dueColor(row: EventRow): string {
		if (row.overdue) return 'var(--warn)';
		if (row.today) return 'var(--v-plant_now)';
		return 'var(--muted)';
	}

	async function complete(id: string): Promise<void> {
		const ids = due.map((row) => row.id);
		const index = ids.indexOf(id);
		commands.completeEvent(id);
		await tick();
		const stillDue = new Set(dueEvents(garden).map((row) => row.id));
		const next =
			ids.slice(index + 1).find((x) => stillDue.has(x)) ??
			ids
				.slice(0, index)
				.reverse()
				.find((x) => stillDue.has(x));
		const target = next
			? section?.querySelector<HTMLInputElement>(`input[data-due-id="${next}"]`)
			: null;
		if (target) target.focus();
		else heading?.focus();
	}
</script>

<section class="panel" bind:this={section} aria-labelledby="due-now-title">
	<div class="panel-head">
		<h2 id="due-now-title" tabindex="-1" bind:this={heading}>Due now</h2>
		<span class="mono muted count">{due.length}</span>
	</div>
	{#each due as row (row.id)}
		<div class="row">
			<label class="check">
				<input
					type="checkbox"
					data-due-id={row.id}
					aria-label={`Mark ${row.kindLabel} ${row.seedTitle} done`}
					onchange={() => complete(row.id)}
				/>
			</label>
			<div class="what">
				<div class="title">{row.kindLabel} {row.seedTitle}</div>
				<div class="bed">{row.bed}</div>
			</div>
			<span class="mono due" style:color={dueColor(row)}>{row.dueLabel}</span>
		</div>
	{:else}
		<p class="empty">Nothing due.</p>
	{/each}
</section>

<style>
	.panel {
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 10px;
		min-width: 0;
	}

	.panel-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 14px;
		border-bottom: 1px solid var(--line);
	}

	h2 {
		margin: 0;
		font-size: 14px;
		font-weight: 700;
	}

	h2:focus {
		outline: none;
	}

	h2:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.row {
		display: grid;
		grid-template-columns: 22px minmax(0, 1fr) auto;
		gap: 10px;
		align-items: center;
		padding: 9px 14px;
		border-bottom: 1px solid var(--line);
	}

	.check {
		display: inline-grid;
		place-items: center;
		cursor: pointer;
	}

	.check input {
		width: 16px;
		height: 16px;
		accent-color: var(--accent);
		margin: 0;
	}

	.what {
		min-width: 0;
	}

	.title {
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bed {
		color: var(--muted);
		font-size: 12.5px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.due,
	.count {
		font-size: 12px;
	}

	.mono {
		font-family: var(--mono);
	}

	.muted {
		color: var(--muted);
	}

	.empty {
		margin: 0;
		padding: 14px;
		color: var(--muted);
	}

	/* Touch and narrow: the checkbox sits in a 44px target and the first column widens to match. */
	@media (max-width: 899px), (pointer: coarse) {
		.row {
			grid-template-columns: 44px minmax(0, 1fr) auto;
		}

		.check {
			width: 44px;
			height: 44px;
		}

		.check input {
			width: 20px;
			height: 20px;
		}
	}
</style>
