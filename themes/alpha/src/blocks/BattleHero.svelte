<script>
	/**
	 * Renders `alpha.battle-hero` and `core.hero` — this theme's signature
	 * full-screen cinematic hero, using its own `.hero*` classes (assets/css/
	 * hero.css) so a page-authored hero is indistinguishable from the one the
	 * theme's home layout draws.
	 *
	 * A plain `core.hero` has no video prop, so it simply renders with the
	 * image (or nothing) behind it — the same component still applies, which
	 * is what keeps the `alpha.battle-hero -> core.hero` fallback seamless.
	 */
	let { props, site } = $props();

	const video = props.video || '';
	const image = props.image || '';
</script>

<section class="hero">
	<div class="hero-media">
		{#if video}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video class="hero-video is-ready" autoplay muted loop playsinline poster={image || undefined}>
				<source src={video} type="video/mp4" />
			</video>
		{:else if image}
			<img src={image} alt="" />
		{/if}
		<div class="hero-overlay"></div>
	</div>
	<div class="wrap hero-inner">
		{#if props.eyebrow}
			<span class="hero-eyebrow">{props.eyebrow}</span>
		{/if}
		<h1 class="hero-title">{props.title || site.name}</h1>
		{#if props.subtitle}
			<p class="hero-desc">{props.subtitle}</p>
		{/if}
		{#if props.ctaLabel && props.ctaUrl}
			<a class="btn btn-primary btn-cut" href={props.ctaUrl}>{props.ctaLabel}</a>
		{/if}
	</div>
</section>
