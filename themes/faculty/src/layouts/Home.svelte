<script>
	let { site, theme, news, pages } = $props();

	const latestNews = news.slice(0, 6);
	const infoPages = pages.slice(0, 8);
</script>

<section class="hero">
	<div class="hero-media">
		{#if theme.heroVideoUrl}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				class="hero-video"
				autoplay
				muted
				loop
				playsinline
				poster={theme.heroVideoPoster || undefined}
			>
				<source src={theme.heroVideoUrl} type="video/mp4" />
			</video>
		{:else if theme.heroVideoPoster}
			<img src={theme.heroVideoPoster} alt="" />
		{/if}
		<div class="hero-overlay"></div>
	</div>
	<div class="wrap hero-inner">
		<span class="hero-eyebrow">{theme.heroEyebrow}</span>
		<h1 class="hero-title">{theme.heroHeadline}</h1>
		<p class="hero-desc">{theme.heroDescription}</p>
		<a class="btn btn-primary" href="#info">{theme.heroCtaLabel}</a>
	</div>
</section>

<div class="wrap">
	
	<section class="section reveal">
		<div class="section-head">
			<div>
				<span class="eyebrow">Terbaru</span>
				<h2>Berita &amp; Pengumuman</h2>
			</div>
			<a href="/news/">Lihat semua →</a>
		</div>
		{#if latestNews.length === 0}
			<div class="empty-state">Belum ada berita.</div>
		{:else}
			<div class="card-grid">
				{#each latestNews as item (item.slug)}
					<article class="news-card">
						{#if item.categories.length > 0}
							<span class="news-badge">{item.categories.map((category) => category.name).join(', ')}</span>
						{/if}
						<h3><a href={`/news/${item.slug}/`}>{item.title}</a></h3>
						{#if item.excerpt}<p>{item.excerpt}</p>{/if}
						<span class="read-more">Baca selengkapnya →</span>
					</article>
				{/each}
			</div>
		{/if}
	</section>

	{#if infoPages.length > 0}
		<section id="info" class="section reveal">
			<div class="section-head">
				<div>
					<span class="eyebrow">Informasi</span>
					<h2>Halaman &amp; Program</h2>
				</div>
			</div>
			<div class="info-grid">
				{#each infoPages as item (item.slug)}
					<a class="info-card" href={`/${item.slug}/`}>
						<span class="info-icon">{item.title.charAt(0).toUpperCase()}</span>
						<h3>{item.title}</h3>
					</a>
				{/each}
			</div>
		</section>
	{/if}
</div>

<div class="cta-band reveal">
	<div class="wrap">
		<h2>Siap Bergabung Bersama Kami?</h2>
		<p>Temukan informasi pendaftaran, program, dan kehidupan kampus di {site.name}.</p>
		<a class="btn btn-primary" href="/news/">Mulai Jelajahi</a>
	</div>
</div>
