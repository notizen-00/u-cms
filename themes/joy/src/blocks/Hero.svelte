<script>
	/**
	 * Renders both `core.hero` and `joy.image-hero` — the theme's own take on a
	 * hero, using this theme's `.hero*` classes (see Layout.svelte's styles) so
	 * it looks native rather than like a generic builder block.
	 *
	 * `props` is the block's stored props; `site`/`theme` are the same ambient
	 * data every layout receives.
	 */
	let { props, site } = $props();

	const title = props.title || site.name;
	const image = props.image || '';
	const align = props.align === 'center' ? 'center' : 'left';
</script>

<section class="hero" style={align === 'center' ? 'text-align:center' : undefined}>
	{#if image}
		<div class="hero-bg" style={`background-image:url('${image}')`}></div>
	{/if}
	<div class="wrap hero-inner" style={align === 'center' ? 'margin-inline:auto' : undefined}>
		{#if props.eyebrow}
			<span class="hero-badge">{props.eyebrow}</span>
		{/if}
		<h1 class="hero-title">{title}</h1>
		{#if props.subtitle}
			<p class="hero-tagline" style={align === 'center' ? 'margin-inline:auto' : undefined}>
				{props.subtitle}
			</p>
		{/if}
		{#if props.ctaLabel && props.ctaUrl}
			<div class="hero-actions" style={align === 'center' ? 'justify-content:center' : undefined}>
				<a class="btn btn-primary" href={props.ctaUrl}>{props.ctaLabel}</a>
			</div>
		{/if}
	</div>
</section>
