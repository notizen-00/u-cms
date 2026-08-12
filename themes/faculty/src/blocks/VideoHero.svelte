<script>
	/**
	 * Renders `faculty.video-hero` and `core.hero` — this theme's signature
	 * full-screen hero, using its own `.hero*` classes (assets/css/hero.css) so
	 * a page-authored hero is indistinguishable from the one the theme's home
	 * layout draws.
	 *
	 * A plain `core.hero` has no video prop, so it simply renders with the
	 * image (or nothing) behind it — the same component still applies, which
	 * is what keeps the `faculty.video-hero -> core.hero` fallback seamless.
	 */
	let { props, site } = $props();

	const video = props.video || '';
	const poster = props.poster || props.image || '';
	const overlay = props.overlay !== false;
</script>

<section class="hero">
	<div class="hero-media">
		{#if video}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video class="hero-video is-ready" autoplay muted loop playsinline poster={poster || undefined}>
				<source src={video} type="video/mp4" />
			</video>
		{:else if poster}
			<img src={poster} alt="" />
		{/if}
		{#if overlay}
			<div class="hero-overlay"></div>
		{/if}
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
			<a class="btn btn-primary" href={props.ctaUrl}>{props.ctaLabel}</a>
		{/if}
	</div>
</section>
