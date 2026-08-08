<script>
	let { site, theme, news, pages } = $props();

	const latestNews = news.slice(0, 6);
	const infoPages = pages.slice(0, 8);
</script>

<section class="hero">
	{#if theme.heroImage}
		<div class="hero-bg" style={`background-image:url('${theme.heroImage}')`}></div>
	{/if}
	<div class="wrap hero-inner">
		<span class="hero-badge">🎓 {theme.accreditationText}</span>
		<h1 class="hero-title">{site.name}</h1>
		<p class="hero-tagline">{theme.heroTagline}</p>
		<div class="hero-actions">
			<a class="btn btn-primary" href="#program">Jelajahi Informasi</a>
			<a class="btn btn-outline" href="/news/">Berita Terbaru</a>
		</div>
	</div>
</section>

<div class="wrap stats-strip">
	<div class="stats-grid reveal">
		<div class="stat-card">
			<div class="stat-value">{theme.statStudents}</div>
			<div class="stat-label">Mahasiswa Aktif</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{theme.statPrograms}</div>
			<div class="stat-label">Program Studi</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{theme.statFaculty}</div>
			<div class="stat-label">Dosen & Tenaga Pendidik</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{theme.statAlumni}</div>
			<div class="stat-label">Alumni</div>
		</div>
	</div>
</div>

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
		<section id="program" class="section reveal">
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
		<p>Temukan informasi pendaftaran, program studi, dan kehidupan kampus di {site.name}.</p>
		<a class="btn btn-primary" href="/news/">Mulai Jelajahi</a>
	</div>
</div>
