<script>
	let { site, theme, menus, tokensCss, title, body, isHome, seo, news = [] } = $props();

	const scrollRevealScript = __SCROLL_REVEAL_SCRIPT__;
	const heroVideoScript = __HERO_VIDEO_SCRIPT__;
	const searchModalScript = __SEARCH_MODAL_SCRIPT__;
	const themeStyles = __THEME_STYLES__;

	function formatDate(value) {
		if (!value) return '';
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
	}

	/**
	 * The whole news list, newest first, trimmed to the fields the search
	 * modal actually renders — embedded below as `window.__NEWS_SEARCH_INDEX__`
	 * for animations.ts's SEARCH_MODAL_SCRIPT to filter client-side (no
	 * backend to query at runtime, see that script's doc comment).
	 */
	const searchIndex = [...news]
		.sort((a, b) => {
			const at = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
			const bt = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
			return bt - at;
		})
		.map((item) => ({
			t: item.title,
			s: item.slug,
			e: item.excerpt || '',
			c: item.categories.map((category) => category.name).join(', '),
			d: formatDate(item.publishedAt),
			i: item.featuredImageUrl || '',
		}));

	// Every "<" is escaped so a title/excerpt that happens to contain a
	// closing script tag, or an HTML comment, can't break out of the inline
	// script it's embedded in below.
	function safeJsonScript(value) {
		return JSON.stringify(value).split('<').join('\\u003c');
	}
</script>

{#snippet navItem(item)}
	<span class="nav-item" class:has-children={item.children.length > 0}>
		{#if item.clickable}
			<a href={item.url} target={item.newTab ? '_blank' : undefined} rel={item.newTab ? 'noopener noreferrer' : undefined}>{item.label}</a>
		{:else}
			<span class="nav-item-label">{item.label}</span>
		{/if}
		{#if item.children.length > 0}
			<div class="mega-panel">
				<div class="mega-panel__inner wrap">
					{#each item.children as column (column.label + column.url)}
						{@render megaColumn(column)}
					{/each}
				</div>
			</div>
		{/if}
	</span>
{/snippet}

{#snippet megaColumn(column)}
	<div class="mega-col">
		{#if column.clickable}
			<a class="mega-col__title" href={column.url} target={column.newTab ? '_blank' : undefined} rel={column.newTab ? 'noopener noreferrer' : undefined}>{column.label}</a>
		{:else}
			<span class="mega-col__title">{column.label}</span>
		{/if}
		{#if column.children.length > 0}
			<ul class="mega-col__list">
				{#each column.children as leaf (leaf.label + leaf.url)}
					<li><a href={leaf.url} target={leaf.newTab ? '_blank' : undefined} rel={leaf.newTab ? 'noopener noreferrer' : undefined}>{leaf.label}</a></li>
				{/each}
			</ul>
		{/if}
	</div>
{/snippet}

<svelte:head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>{title} | {site.name}</title>
	<meta name="description" content={seo.description} />
	<meta name="keywords" content={seo.keywords} />
	{#if seo.canonicalUrl}<link rel="canonical" href={seo.canonicalUrl} />{/if}
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={site.name} />
	<meta property="og:title" content={`${title} | ${site.name}`} />
	<meta property="og:description" content={seo.description} />
	{#if seo.canonicalUrl}<meta property="og:url" content={seo.canonicalUrl} />{/if}
	{#if seo.ogImage}<meta property="og:image" content={seo.ogImage} />{/if}
	<meta name="twitter:card" content="summary_large_image" />
	{#if site.faviconUrl}<link rel="icon" href={site.faviconUrl} />{/if}
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Barlow:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
	{@html `<style>${tokensCss}:root{--primary:${theme.primaryColor};--secondary:${theme.secondaryColor};}${themeStyles}</style>`}
</svelte:head>

<header class="site-header" class:is-home={isHome} class:not-home={!isHome}>
	<div class="topbar">
		<div class="wrap topbar-row">
			<a href="/" class="site-logo">
				<span class="site-logo__mark">A</span>
				<span class="site-logo__name">{site.name}</span>
			</a>
			<div class="topbar-actions">
				{#if theme.showSearch}
					<button
						type="button"
						class="search-btn"
						data-search-open
						aria-label="Cari berita"
						aria-haspopup="dialog"
						aria-expanded="false"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="11" cy="11" r="7" />
							<line x1="21" y1="21" x2="16.65" y2="16.65" />
						</svg>
					</button>
				{/if}
				<a class="btn btn-primary btn-cut nav-cta" href="/news/">Berita</a>
			</div>
		</div>
	</div>
	<nav class="navbar">
		<div class="wrap navbar-row">
			<div class="main-nav">
				{#if menus.primary && menus.primary.length > 0}
					{#each menus.primary as item (item.label + item.url)}
						{@render navItem(item)}
					{/each}
				{:else}
					<a href="/">Beranda</a>
					<a href="/news/">Berita</a>
				{/if}
			</div>
		</div>
	</nav>
</header>

{#if theme.showSearch}
	<div class="search-modal" data-search-modal aria-hidden="true">
		<div class="search-modal__overlay" data-search-close></div>
		<div class="search-modal__panel" role="dialog" aria-modal="true" aria-label="Pencarian berita">
			<div class="search-modal__head">
				<svg class="search-modal__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="11" cy="11" r="7" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				<input
					type="text"
					class="search-modal__input"
					data-search-input
					placeholder="Cari berita..."
					autocomplete="off"
					aria-label="Kata kunci pencarian"
				/>
				<button type="button" class="search-modal__close" data-search-close aria-label="Tutup pencarian">✕</button>
			</div>
			<div class="search-modal__body" data-search-results></div>
		</div>
	</div>
	{@html `<script>window.__NEWS_SEARCH_INDEX__ = ${safeJsonScript(searchIndex)};</script>`}
{/if}

<main>
	{@html body}
</main>

<footer class="site-footer">
	<div class="wrap">
		<div class="footer-top reveal">
			<div class="footer-brand">
				<span class="site-logo">
					<span class="site-logo__mark">A</span>
					<span class="site-logo__name">{site.name}</span>
				</span>
				<p>{theme.heroDescription}</p>
				<div class="social-row">
					<a href="#" aria-label="Discord">DC</a>
					<a href="#" aria-label="YouTube">YT</a>
					<a href="#" aria-label="X">X</a>
					<a href="#" aria-label="Instagram">IG</a>
				</div>
			</div>
			<div class="footer-col">
				<h3>Tautan Cepat</h3>
				<ul>
					{#if menus.footer && menus.footer.length > 0}
						{#each menus.footer as item (item.label + item.url)}
							<li>
								{#if item.clickable}<a href={item.url}>{item.label}</a>{:else}<span>{item.label}</span>{/if}
								{#if item.children.length > 0}
									<ul class="sub-links">
										{#each item.children as child (child.label + child.url)}
											<li><a href={child.url}>{child.label}</a></li>
										{/each}
									</ul>
								{/if}
							</li>
						{/each}
					{:else}
						<li><a href="/">Beranda</a></li>
						<li><a href="/news/">Berita</a></li>
					{/if}
				</ul>
			</div>
			<div class="footer-col">
				<h3>Dukungan</h3>
				<ul>
					<li>Pusat Bantuan</li>
					<li>Aturan Komunitas</li>
					<li>Laporkan Pemain</li>
				</ul>
			</div>
		</div>
		<div class="footer-bottom">&copy; {new Date().getFullYear()} {site.name}. Seluruh hak cipta dilindungi.</div>
	</div>
</footer>

{@html `<script>${scrollRevealScript}</script>`}
{@html `<script>${heroVideoScript}</script>`}
{#if theme.showSearch}
	{@html `<script>${searchModalScript}</script>`}
{/if}
