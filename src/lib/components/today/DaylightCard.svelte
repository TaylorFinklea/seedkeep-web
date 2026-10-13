<!-- "Daylight" panel (export lines 91–101). A single padded box; the "now" marker reads a clock that ticks each minute. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { garden } from '$lib/state/garden.svelte';
	import { daylight, frost } from '$lib/domain/derive';
	import { dateParts } from '$lib/domain/dates';

	let now = $state(new Date());

	onMount(() => {
		const timer = setInterval(() => {
			now = new Date();
		}, 60_000);
		return () => clearInterval(timer);
	});

	const hasLocation = $derived(garden.home.hasLocation);
	const frostKnown = $derived(hasLocation && !!garden.home.firstFrost);
	/** Solar state from the store: 'normal' draws the bar; the rest are plain-text states. */
	const solar = $derived(hasLocation ? garden.home.daylight : 'unknown');

	const day = $derived(solar === 'normal' ? daylight(garden, now) : null);
	const fr = $derived(frostKnown ? frost(garden) : null);
	const dp = $derived(dateParts());
</script>

<section class="panel" aria-labelledby="daylight-title">
	<div class="panel-head">
		<h2 id="daylight-title">Daylight</h2>
		<span class="mono muted date">{dp.long}</span>
	</div>

	{#if !hasLocation}
		<p class="prompt">
			Set your home ZIP in <a href="/settings">Settings</a> to see sunrise, sunset and first frost.
		</p>
	{:else if solar === 'polar-day'}
		<p class="polar">Sun up all day</p>
	{:else if solar === 'polar-night'}
		<p class="polar">Sun down all day</p>
	{:else if solar === 'unknown'}
		<p class="polar muted">Sunrise and sunset aren’t available for this ZIP.</p>
	{:else if day}
		<div class="bar" role="img" aria-label={`Daylight ${day.sunrise} to ${day.sunset}`}>
			<div class="span" style:left={day.left} style:width={day.width}></div>
			<div class="now" style:left={day.now}></div>
		</div>
		<div class="hours mono">
			<span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span>
		</div>
		<div class="stats">
			<div>
				<div class="label">Sunrise</div>
				<div class="value mono">{day.sunrise}</div>
			</div>
			<div>
				<div class="label">Sunset</div>
				<div class="value mono">{day.sunset}</div>
			</div>
			<div>
				<div class="label">Length</div>
				<div class="value mono">{day.length}</div>
			</div>
		</div>
	{/if}

	{#if hasLocation}
		<div class="foot">
			<span>First frost, Zone {garden.home.zone}</span>
			{#if fr}
				<span class="mono warn">{fr.date} · {fr.daysText}</span>
			{:else}
				<span class="muted">No frost date for this ZIP</span>
			{/if}
		</div>
	{/if}
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

	.prompt,
	.polar {
		margin: 12px 0 0;
		font-size: 15px;
	}

	.prompt a {
		color: var(--accent);
		font-weight: 600;
	}

	.prompt a:focus-visible,
	a:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.bar {
		position: relative;
		height: 28px;
		background: var(--panel2);
		border: 1px solid var(--line);
		border-radius: 6px;
		margin: 14px 0 6px;
		overflow: hidden;
	}

	.span {
		position: absolute;
		top: 0;
		bottom: 0;
		background: var(--k-harvest);
	}

	.now {
		position: absolute;
		top: -2px;
		bottom: -2px;
		width: 2px;
		background: var(--warn);
	}

	.hours {
		display: flex;
		justify-content: space-between;
		font-size: 11px;
		color: var(--faint);
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
		margin-top: 14px;
	}

	.label {
		font-size: 12px;
		color: var(--muted);
	}

	.value {
		font-size: 15px;
	}

	.foot {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		margin-top: 14px;
		padding-top: 12px;
		border-top: 1px solid var(--line);
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

	.warn {
		color: var(--warn);
	}

	@media (max-width: 899px), (pointer: coarse) {
		.prompt a {
			display: inline-block;
			min-height: 44px;
			line-height: 44px;
		}
	}
</style>
