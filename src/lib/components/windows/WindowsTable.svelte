<!-- Planting windows table (export lines 265–275). Only groups with rows render. -->
<script lang="ts">
	import { garden } from '$lib/state/garden.svelte';
	import { commands } from '$lib/state/commands';
	import { plannedFor, whatToPlant } from '$lib/domain/derive';

	const DOT: Record<string, string> = {
		now: 'var(--v-plant_now)',
		soon: 'var(--v-plant_soon)',
		late: 'var(--v-late)',
		later: 'var(--v-too_late)'
	};

	const groups = $derived(
		whatToPlant(garden)
			.filter((group) => group.count > 0)
			.map((group) => ({
				key: group.key,
				label: group.label,
				count: group.count,
				dot: DOT[group.key],
				plannable: group.key !== 'later',
				rows: group.rows.map((row) => ({ row, planned: plannedFor(garden, row.id) }))
			}))
	);
</script>

<div class="panel">
	<div class="scroll">
		<table>
			<colgroup>
				<col />
				<col style="width: 100px" />
				<col style="width: 150px" />
				<col style="width: 150px" />
				<col style="width: 150px" />
				<col style="width: 90px" />
			</colgroup>
			<thead>
				<tr>
					<th scope="col">Seed</th>
					<th scope="col">Status</th>
					<th scope="col">Window</th>
					<th scope="col">Timing</th>
					<th scope="col">Planned</th>
					<th scope="col"><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			{#each groups as group (group.key)}
				<tbody>
					<tr class="group">
						<th colspan="6" scope="rowgroup">
							<span class="group-dot" style:background={group.dot} aria-hidden="true"></span>
							{group.label}
							<span class="count mono">{group.count}</span>
						</th>
					</tr>
					{#each group.rows as item (item.row.id)}
						<tr>
							<td>
								<button
									type="button"
									class="seed"
									onclick={() => void commands.openSeed(item.row.id)}>{item.row.title}</button
								>
							</td>
							<td class="muted">{item.row.stateLabel}</td>
							<td class="mono small">{item.row.windowLabel}</td>
							<td class="mono small" style:color={item.row.dot}>{item.row.daysLabel}</td>
							<td class="muted small ellipsis">{item.planned}</td>
							<td class="actions">
								{#if group.plannable && item.row.state === 'active'}
									<button
										type="button"
										class="plan"
										onclick={() => void commands.planSeed(item.row.id)}>Plan</button
									>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			{/each}
		</table>
	</div>
</div>

<style>
	.panel {
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 10px;
		overflow: hidden;
		max-width: 100%;
	}

	.scroll {
		position: relative;
		overflow: auto;
		max-width: 100%;
	}

	table {
		width: 100%;
		min-width: 760px;
		table-layout: fixed;
		border-collapse: collapse;
	}

	thead th {
		padding: 9px 14px;
		text-align: left;
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
		background: var(--panel2);
		border-bottom: 1px solid var(--line2);
	}

	.group th {
		padding: 9px 14px;
		text-align: left;
		font-weight: 700;
		background: var(--panel2);
		border-bottom: 1px solid var(--line);
	}

	.group-dot {
		display: inline-block;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		margin-right: 8px;
	}

	.count {
		margin-left: 8px;
		font-size: 11px;
		font-weight: 400;
		color: var(--faint);
	}

	tbody tr:not(.group) td {
		padding: 8px 14px;
		border-bottom: 1px solid var(--line);
		vertical-align: middle;
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.seed {
		display: block;
		max-width: 100%;
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		cursor: pointer;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.actions {
		text-align: right;
	}

	.plan {
		background: var(--panel);
		border: 1px solid var(--line2);
		border-radius: 5px;
		padding: 3px 9px;
		font-size: 12.5px;
		cursor: pointer;
	}

	.mono {
		font-family: var(--mono);
	}

	.small {
		font-size: 12.5px;
	}

	.muted {
		color: var(--muted);
	}

	.ellipsis {
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
