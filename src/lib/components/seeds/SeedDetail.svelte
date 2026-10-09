<!-- Detail panel CONTENT for one seed (export lines 174–209). The container (aside or
	sheet) belongs to the page; this root sets no overflow or height so the sticky
	header sticks inside whichever container scrolls. Renders nothing when the seed
	no longer exists. -->
<script lang="ts">
	import { garden } from '$lib/state/garden.svelte';
	import { byId, eventRow, seedRow } from '$lib/domain/derive';
	import CorrectionForm from './CorrectionForm.svelte';

	let { seedId, onclose }: { seedId: string; onclose: () => void } = $props();

	const seed = $derived(byId(garden.seeds, seedId));
	const row = $derived(seed ? seedRow(garden, seed) : null);
	const events = $derived(
		garden.events
			.filter((e) => e.seed === seedId)
			.map((e) => eventRow(garden, e))
			.sort((a, b) => a.date.localeCompare(b.date))
	);

	function toggleTag(tagId: string): void {
		if (!seed) return;
		const on = seed.tags.includes(tagId);
		garden.updateSeed(seedId, { tags: on ? seed.tags.filter((t) => t !== tagId) : [...seed.tags, tagId] });
	}
</script>

{#if seed && row}
	<div class="detail">
		<header class="head">
			<div class="titles">
				<div class="kicker">{row.type} · {row.stateLabel}</div>
				<div class="title">{row.title}</div>
				<div class="provenance">{row.provenance}</div>
			</div>
			<button type="button" class="close" aria-label="Close seed details" data-detail-close onclick={onclose}>×</button>
		</header>

		<div class="body">
			<section class="card" aria-label="Verdict">
				<div class="verdict-row">
					{#if row.verdict}
						<span class="verdict" style:color={row.dot}>
							<span class="dot" style:background={row.dot} aria-hidden="true"></span>
							{row.verdictLabel}
						</span>
					{:else}
						<span class="muted">Not in the catalog</span>
					{/if}
					{#if row.daysLabel}
						<span class="mono small muted">{row.daysLabel}</span>
					{/if}
				</div>
				{#if row.windowLabel}
					<div class="mono window">{row.windowLabel}</div>
				{/if}
				<div class="muted small zip">ZIP {garden.home.zip} · Zone {garden.home.zone}</div>
			</section>

			<section>
				<h3 class="section-title">Tags</h3>
				{#if garden.tags.length}
					<div class="tags">
						{#each garden.tags as tag (tag.id)}
							<button
								type="button"
								class="tag"
								aria-pressed={seed.tags.includes(tag.id)}
								onclick={() => toggleTag(tag.id)}>{tag.name}</button
							>
						{/each}
					</div>
				{:else}
					<p class="muted">No tags yet.</p>
				{/if}
			</section>

			<section>
				<h3 class="section-title">Growing details</h3>
				{#each row.info as item (item.label)}
					<div class="info-row">
						<span class="muted">{item.label}</span>
						<span class="mono info-value">{item.value}</span>
					</div>
				{/each}
				{#if row.hasInfo}
					{#if row.instr}
						<p class="instr">{row.instr}</p>
					{/if}
				{:else}
					<p class="muted">Not in the shared catalog yet.</p>
				{/if}
			</section>

			<section>
				<label class="notes">
					<span class="section-title">Notes</span>
					<textarea
						value={seed.notes}
						oninput={(e) => garden.updateSeed(seedId, { notes: e.currentTarget.value })}
					></textarea>
				</label>
			</section>

			<section>
				<h3 class="section-title">Plantings</h3>
				{#each events as ev (ev.id)}
					<div class="event-row">
						<span class="mono muted small">{ev.dateLabel}</span>
						<span class="event-what">{ev.kindLabel} · {ev.bed}</span>
						<span class="muted small">{ev.dueLabel}</span>
					</div>
				{:else}
					<p class="muted">Not planned in a bed.</p>
				{/each}
			</section>

			<section>
				{#key seedId}
					<CorrectionForm {seedId} />
				{/key}
			</section>
		</div>
	</div>
{/if}

<style>
	.detail {
		color: var(--ink);
	}

	.head {
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 10px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--line);
		background: var(--panel);
		border-radius: 10px 10px 0 0;
	}

	.titles {
		min-width: 0;
	}

	.kicker {
		font-size: 12px;
		color: var(--muted);
	}

	.title {
		font-size: 18px;
		font-weight: 700;
		line-height: 1.25;
	}

	.provenance {
		color: var(--muted);
	}

	.close {
		flex: none;
		background: none;
		border: none;
		padding: 0 4px;
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		color: var(--muted);
	}

	.body {
		padding: 14px 16px;
		display: grid;
		gap: 16px;
	}

	.card {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 12px;
	}

	.verdict-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	.verdict {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-weight: 700;
	}

	.dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		flex: none;
	}

	.window {
		font-size: 13px;
		margin-top: 4px;
	}

	.zip {
		margin-top: 4px;
	}

	.mono {
		font-family: var(--mono);
	}

	.small {
		font-size: 12px;
	}

	.muted {
		color: var(--muted);
	}

	.section-title {
		display: block;
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
		margin: 0 0 6px;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.tag {
		background: var(--panel);
		color: var(--ink);
		border: 1px solid var(--line2);
		border-radius: 12px;
		padding: 2px 9px;
		font-size: 12.5px;
		cursor: pointer;
	}

	.tag:hover {
		background: var(--sel);
	}

	.tag[aria-pressed='true'] {
		background: var(--accentSoft);
		border-color: var(--accent);
		color: var(--accent);
		font-weight: 600;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 5px 0;
		border-bottom: 1px solid var(--line);
	}

	.info-value {
		font-size: 12.5px;
		text-align: right;
	}

	.instr {
		margin: 8px 0 0;
	}

	.notes {
		display: grid;
		gap: 0;
	}

	.notes textarea {
		width: 100%;
		min-height: 72px;
		border: 1px solid var(--line2);
		border-radius: 6px;
		padding: 8px;
		background: var(--panel2);
		color: var(--ink);
		font: inherit;
		resize: vertical;
	}

	.event-row {
		display: grid;
		grid-template-columns: 52px minmax(0, 1fr) auto;
		gap: 8px;
		align-items: baseline;
		padding: 5px 0;
		border-bottom: 1px solid var(--line);
	}

	.event-what {
		min-width: 0;
	}

	p {
		margin: 0;
	}
</style>
