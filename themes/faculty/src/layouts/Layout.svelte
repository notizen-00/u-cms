<script>
	let { site, theme, menus, tokensCss, title, body, isHome, seo } = $props();

	const scrollRevealScript = __SCROLL_REVEAL_SCRIPT__;
	const heroVideoScript = __HERO_VIDEO_SCRIPT__;
	const themeStyles = __THEME_STYLES__;

	const logos = Array.isArray(theme.accreditationLogos) ? theme.accreditationLogos : [];
</script>

{#snippet navItem(item)}
	<span class="nav-item" class:has-children={item.children.length > 0}>
		{#if item.clickable}
			<a href={item.url} target={item.newTab ? '_blank' : undefined} rel={item.newTab ? 'noopener noreferrer' : undefined}>{item.label}</a>
		{:else}
			<span class="nav-item-label">{item.label}</span>
		{/if}
		{#if item.children.length > 0}
			<span class="sub-menu">
				{#each item.children as child (child.label + child.url)}
					{@render navItem(child)}
				{/each}
			</span>
		{/if}
	</span>
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
		href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Inter:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
	{@html `<style>${tokensCss}:root{--primary:${theme.primaryColor};--secondary:${theme.secondaryColor};}${themeStyles}</style>`}
</svelte:head>

<header class="site-header" class:is-home={isHome}>
	<div class="wrap top-bar">
		<div class="badge-strip">
	{#if logos.length > 0}
		{#each logos as logo, index (index)}
			{#if logo.url}
				<img
					src={logo.url}
					alt={logo.label ?? site.name}
				/>
			{/if}
		{/each}
	{:else}
		<a href="/" class="site-logo">
			{site.name}
		</a>
	{/if}
</div>
		<div class="top-bar-actions">
			{#if theme.showLanguageSwitcher}
				<span class="lang-pill" aria-label="Bahasa Indonesia">🇮🇩 ID</span>
			{/if}
			{#if theme.showSearch}
				<a class="search-btn" href="/news/" aria-label="Cari">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="11" cy="11" r="7" />
						<line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
				</a>
			{/if}
		</div>
	</div>
	<div class="wrap nav-row">
		<nav class="main-nav">
			{#if menus.primary && menus.primary.length > 0}
				{#each menus.primary as item (item.label + item.url)}
					{@render navItem(item)}
				{/each}
			{:else}
				<a href="/">Beranda</a>
				<a href="/news/">Berita</a>
			{/if}
		</nav>
	</div>
</header>

<main>
	{@html body}
</main>

<footer class="site-footer">
	<div class="wrap">
		<div class="footer-top reveal">
			<div class="footer-brand">
				<strong>{site.name}</strong>
				<p>{theme.heroDescription}</p>
				<div class="social-row">
					<a href="#" aria-label="Facebook">FB</a>
					<a href="#" aria-label="Instagram">IG</a>
					<a href="#" aria-label="YouTube">YT</a>
					<a href="#" aria-label="X">X</a>
				</div>
			</div>
			<div class="footer-col">
				<h4>Tautan Cepat</h4>
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
				<h4>Kontak</h4>
				<ul>
					<li>Kampus {site.name}</li>
					<li>Indonesia</li>
				</ul>
			</div>
		</div>
		<div class="footer-bottom">&copy; {new Date().getFullYear()} {site.name}. Seluruh hak cipta dilindungi.</div>
	</div>
</footer>

{@html `<script>${scrollRevealScript}</script>`}
{@html `<script>${heroVideoScript}</script>`}
