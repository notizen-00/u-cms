<script>
	/** Renders `joy.announcement` — this theme's signature banner. */
	let { props } = $props();

	const tones = {
		primary: 'background:var(--primary);color:#fff',
		info: 'background:#eff8ff;color:#0b1526;border:1px solid #9bd4ff',
		warning: 'background:#fff8e6;color:#0b1526;border:1px solid #f7ce72'
	};
	const style = tones[props.tone] ?? tones.primary;
</script>

<div class="wrap">
	<aside
		class="reveal"
		style={`${style};border-radius:var(--theme-radius-card);padding:28px 32px;margin:32px 0`}
	>
		<h2 style="font-size:22px;font-weight:800;margin-bottom:8px">{props.title}</h2>
		{#if props.body}
			<p style="margin:0;opacity:.9">{props.body}</p>
		{/if}
		{#if props.ctaLabel && props.ctaUrl}
			<a
				href={props.ctaUrl}
				style="display:inline-block;margin-top:16px;font-weight:700;text-decoration:underline"
			>
				{props.ctaLabel}
			</a>
		{/if}
	</aside>
</div>
