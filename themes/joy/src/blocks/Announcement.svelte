<script>
	/** Renders `joy.announcement` — this theme's signature banner. */
	let { props } = $props();

	const TONES = ['primary', 'info', 'warning'];
	const tone = TONES.includes(props.tone) ? props.tone : 'primary';
</script>

<div class="wrap">
	<aside class="announcement announcement--{tone} reveal">
		<h2 class="announcement__title">{props.title}</h2>
		{#if props.body}
			<p class="announcement__body">{props.body}</p>
		{/if}
		{#if props.ctaLabel && props.ctaUrl}
			<a class="announcement__cta" href={props.ctaUrl}>
				{props.ctaLabel}
			</a>
		{/if}
	</aside>
</div>

<style>
	.announcement {
		border-radius: var(--theme-radius-card);
		padding: 28px 32px;
		margin: 32px 0;
	}
	.announcement--primary {
		background: var(--primary);
		color: #fff;
	}
	.announcement--info {
		background: #eff8ff;
		color: #0b1526;
		border: 1px solid #9bd4ff;
	}
	.announcement--warning {
		background: #fff8e6;
		color: #0b1526;
		border: 1px solid #f7ce72;
	}
	.announcement__title {
		font-size: 22px;
		font-weight: 800;
		margin-bottom: 8px;
	}
	.announcement__body {
		margin: 0;
		opacity: 0.9;
	}
	.announcement__cta {
		display: inline-block;
		margin-top: 16px;
		font-weight: 700;
		text-decoration: underline;
	}
</style>
