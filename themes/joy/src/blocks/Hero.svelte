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

<section class="hero" class:hero--center={align === 'center'}>
	{#if image}
		<!-- The image URL is per-instance data, not styling — a CSS custom
		     property is the one thing that legitimately still needs to be set
		     inline; everything else here is a class the <style> block below owns. -->
		<div class="hero-bg" style="--hero-bg-image:url('{image}')"></div>
	{/if}
	<div class="wrap hero-inner">
		{#if props.eyebrow}
			<span class="hero-badge">{props.eyebrow}</span>
		{/if}
		<h1 class="hero-title">{title}</h1>
		{#if props.subtitle}
			<p class="hero-tagline">{props.subtitle}</p>
		{/if}
		{#if props.ctaLabel && props.ctaUrl}
			<div class="hero-actions">
				<a class="btn btn-primary" href={props.ctaUrl}>{props.ctaLabel}</a>
			</div>
		{/if}
	</div>
</section>

<style>
	.hero-bg {
		background-image: var(--hero-bg-image, none);
	}
	.hero--center {
		text-align: center;
	}
	.hero--center .hero-inner,
	.hero--center .hero-tagline {
		margin-inline: auto;
	}
	.hero--center .hero-actions {
		justify-content: center;
	}
</style>
