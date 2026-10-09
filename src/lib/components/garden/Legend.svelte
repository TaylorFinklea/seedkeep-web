<!-- Grid legend (export line 240). Rendered by BedGrid below the grid. -->
<div class="legend">
	<span class="item"><span class="swatch sow"></span>Sow</span>
	<span class="item"><span class="swatch transplant"></span>Transplant</span>
	<span class="item"><span class="swatch harvest"></span>Harvest</span>
	<span class="scale">1 square = 1 sq ft</span>
</div>

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
		margin-top: 10px;
		font-size: 12px;
		color: var(--muted);
	}

	.item {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.swatch {
		width: 10px;
		height: 10px;
		border-radius: 2px;
	}

	.sow {
		background: var(--k-sowing);
	}

	.transplant {
		background: var(--k-transplant);
	}

	.harvest {
		background: var(--k-harvest);
	}

	.scale {
		margin-left: auto;
		font-family: var(--mono);
	}
</style>
