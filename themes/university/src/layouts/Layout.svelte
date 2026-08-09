<script>
	let { site, theme, menus, tokensCss, title, body, seo } = $props();

	const scrollRevealScript = __SCROLL_REVEAL_SCRIPT__;

	const styles = `
* { box-sizing: border-box; }
html { color-scheme: light; scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--theme-background);
  color: var(--theme-foreground);
  font-family: var(--theme-typography-body);
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
img { max-width: 100%; height: auto; display: block; }
h1, h2, h3, h4 { font-family: var(--theme-typography-heading); letter-spacing: -0.01em; margin: 0; }
.wrap { max-width: var(--theme-layout-container); margin: 0 auto; padding: 0 24px; }

/* Reveal-on-scroll (see animations.ts) */
.reveal { opacity: 0; transform: translateY(24px); transition: opacity .7s ease, transform .7s ease; }
.reveal.is-visible { opacity: 1; transform: translateY(0); }

/* Header */
.site-header { position: sticky; top: 0; z-index: 40; background: color-mix(in srgb, var(--theme-background) 88%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--theme-line); }
.header-inner { display: flex; align-items: center; justify-content: space-between; height: 76px; gap: 20px; }
.brand { display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 18px; color: var(--theme-foreground); }
.brand img { height: 40px; width: 40px; object-fit: contain; border-radius: 8px; }
.main-nav { display: flex; gap: 4px; align-items: center; }
.main-nav .nav-item { position: relative; }
.main-nav a, .main-nav .nav-item-label { display: inline-block; padding: 10px 16px; border-radius: var(--theme-radius-button); font-weight: 600; font-size: 14px; color: var(--theme-muted); transition: background .15s ease, color .15s ease; }
.main-nav .nav-item-label { cursor: default; }
.main-nav a:hover { color: var(--primary); background: color-mix(in srgb, var(--primary) 10%, transparent); }
.main-nav .sub-menu { display: none; position: absolute; top: 100%; left: 0; flex-direction: column; gap: 2px; background: var(--theme-background); border: 1px solid var(--theme-line); border-radius: 14px; padding: 8px; min-width: 200px; box-shadow: 0 20px 40px -24px rgba(11,21,38,.35); z-index: 50; }
.main-nav .sub-menu .nav-item { width: 100%; }
.main-nav .sub-menu .sub-menu { top: -8px; left: 100%; }
.main-nav .nav-item:hover > .sub-menu, .main-nav .nav-item:focus-within > .sub-menu { display: flex; }
.main-nav .has-children > a::after, .main-nav .has-children > .nav-item-label::after { content: " \\25BE"; font-size: .65em; opacity: .7; }
.main-nav .sub-menu .has-children > a::after, .main-nav .sub-menu .has-children > .nav-item-label::after { content: " \\25B8"; }

/* Buttons */
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 13px 26px; border-radius: var(--theme-radius-button); font-weight: 700; font-size: 14px; transition: transform .15s ease, box-shadow .15s ease, background .15s ease; }
.btn-primary { background: var(--primary); color: #fff; box-shadow: 0 14px 30px -12px color-mix(in srgb, var(--primary) 65%, transparent); }
.btn-primary:hover { transform: translateY(-2px); }
.btn-outline { background: color-mix(in srgb, #fff 12%, transparent); color: #fff; border: 1.5px solid color-mix(in srgb, #fff 45%, transparent); }
.btn-outline:hover { background: color-mix(in srgb, #fff 22%, transparent); }

/* Hero */
.hero { position: relative; overflow: hidden; padding: 96px 0 140px; color: #fff; background: linear-gradient(150deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 55%, #05122a) 100%); }
.hero-bg { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: .18; }
.hero-inner { position: relative; max-width: 760px; }
.hero-badge { display: inline-flex; align-items: center; gap: 8px; background: color-mix(in srgb, #fff 16%, transparent); border: 1px solid color-mix(in srgb, #fff 30%, transparent); padding: 7px 16px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; margin-bottom: 22px; }
.hero-title { font-size: clamp(34px, 5.2vw, 58px); font-weight: 800; line-height: 1.08; margin-bottom: 20px; }
.hero-tagline { font-size: 18px; color: color-mix(in srgb, #fff 88%, transparent); max-width: 620px; margin-bottom: 34px; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 14px; }

/* Stats */
.stats-strip { position: relative; margin-top: -84px; z-index: 10; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); background: var(--theme-background); border-radius: var(--theme-radius-card); box-shadow: 0 30px 60px -30px rgba(11,21,38,.35); overflow: hidden; }
.stat-card { padding: 30px 20px; text-align: center; border-right: 1px solid var(--theme-line); }
.stat-card:last-child { border-right: none; }
.stat-value { font-family: var(--theme-typography-heading); font-size: 32px; font-weight: 800; color: var(--primary); }
.stat-label { font-size: 13px; color: var(--theme-muted); margin-top: 6px; }
@media (max-width: 720px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } .stat-card { border-bottom: 1px solid var(--theme-line); } }

/* Sections */
main { display: block; }
.section { padding: var(--theme-spacing-section) 0; }
.section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 32px; }
.eyebrow { display: block; color: var(--primary); font-weight: 700; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 8px; }
.section-head h2 { font-size: 30px; font-weight: 800; }
.section-head a { font-weight: 700; font-size: 14px; color: var(--primary); white-space: nowrap; }
.empty-state { padding: 48px; text-align: center; color: var(--theme-muted); border: 1px dashed var(--theme-line); border-radius: var(--theme-radius-card); }

/* Cards */
.card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
.info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
@media (max-width: 960px) { .card-grid { grid-template-columns: repeat(2, 1fr); } .info-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .card-grid, .info-grid { grid-template-columns: 1fr; } }
.news-card { display: flex; flex-direction: column; background: var(--theme-background); border: 1px solid var(--theme-line); border-radius: var(--theme-radius-card); padding: 24px; transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
.news-card:hover { transform: translateY(-4px); box-shadow: 0 24px 44px -28px rgba(11,21,38,.35); border-color: color-mix(in srgb, var(--primary) 35%, var(--theme-line)); }
.news-badge { display: inline-block; align-self: flex-start; background: color-mix(in srgb, var(--secondary) 18%, transparent); color: color-mix(in srgb, var(--secondary) 55%, #5b3d00); font-size: 11px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; padding: 5px 12px; border-radius: 999px; margin-bottom: 14px; }
.news-card h3 { font-size: 18px; font-weight: 700; line-height: 1.35; margin-bottom: 8px; }
.news-card p { margin: 0; color: var(--theme-muted); font-size: 14px; flex: 1; }
.read-more { margin-top: 16px; font-weight: 700; font-size: 13px; color: var(--primary); }
.info-card { display: flex; flex-direction: column; gap: 10px; background: var(--theme-surface); border: 1px solid var(--theme-line); border-radius: var(--theme-radius-card); padding: 22px; transition: border-color .18s ease, background .18s ease; }
.info-card:hover { border-color: color-mix(in srgb, var(--primary) 40%, var(--theme-line)); background: var(--theme-background); }
.info-card .info-icon { width: 42px; height: 42px; border-radius: 12px; background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); display: grid; place-items: center; font-weight: 800; }
.info-card h3 { font-size: 16px; font-weight: 700; }

/* CTA band */
.cta-band { background: color-mix(in srgb, var(--primary) 6%, var(--theme-surface)); border-top: 1px solid var(--theme-line); border-bottom: 1px solid var(--theme-line); padding: 64px 0; text-align: center; }
.cta-band h2 { font-size: 28px; margin-bottom: 12px; }
.cta-band p { color: var(--theme-muted); max-width: 540px; margin: 0 auto 26px; }

/* Article */
.article-header { max-width: var(--theme-layout-narrow); margin: 0 auto 32px; }
.article-header h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 800; line-height: 1.2; margin-bottom: 16px; }
.meta-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; color: var(--theme-muted); font-size: 13px; }
.pill { background: color-mix(in srgb, var(--primary) 10%, transparent); color: var(--primary); font-weight: 600; padding: 4px 12px; border-radius: 999px; }
.prose { max-width: var(--theme-layout-narrow); margin: 0 auto; font-size: 17px; }
.prose h1, .prose h2, .prose h3 { font-weight: 800; margin: 1.6em 0 .6em; }
.prose p { margin: 0 0 1.1em; }
.prose ul, .prose ol { margin: 0 0 1.1em; padding-left: 1.4em; }
.prose blockquote { margin: 1.6em 0; padding: 4px 20px; border-left: 3px solid var(--primary); color: var(--theme-muted); font-style: italic; }
.prose img { border-radius: var(--theme-radius-card); }
.prose table { width: 100%; border-collapse: collapse; margin: 1.6em 0; }
.prose th, .prose td { border: 1px solid var(--theme-line); padding: 10px 12px; text-align: left; }

/* Baseline styles for host-owned core blocks. Plugins may enhance these later. */
.cms-button { display: inline-block; padding: .7em 1.4em; border-radius: var(--theme-radius-button); background: var(--primary); color: #fff !important; font-weight: 700; text-decoration: none !important; }
.cms-columns { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin: 1.6em 0; }
.cms-column { background: var(--theme-surface); border: 1px solid var(--theme-line); border-radius: 10px; padding: 16px; }
.cms-embed { position: relative; padding-bottom: 56.25%; height: 0; margin: 1.6em 0; border-radius: var(--theme-radius-card); overflow: hidden; }
.cms-embed iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.cms-calendar td { text-align: center; }

/* Footer */
.site-footer { background: #071022; color: #cbd5e1; padding: 64px 0 28px; margin-top: 40px; }
.footer-top { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 40px; margin-bottom: 40px; }
@media (max-width: 720px) { .footer-top { grid-template-columns: 1fr; } }
.footer-brand strong { color: #fff; font-size: 18px; }
.footer-brand p { color: #93a3ba; font-size: 14px; max-width: 360px; margin: 12px 0 18px; }
.social-row { display: flex; gap: 10px; }
.social-row a { width: 36px; height: 36px; border-radius: 999px; background: color-mix(in srgb, #fff 10%, transparent); display: grid; place-items: center; font-size: 11px; font-weight: 700; }
.footer-col h4 { color: #fff; font-size: 13px; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 16px; }
.footer-col ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.footer-col .sub-links { margin: 8px 0 0; padding-left: 14px; }
.footer-bottom { border-top: 1px solid #1b2a42; padding-top: 20px; font-size: 13px; color: #64748b; }
`;
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
	{@html `<style>${tokensCss}:root{--primary:${theme.primaryColor};--secondary:${theme.secondaryColor};}${styles}</style>`}
</svelte:head>

<header class="site-header">
	<div class="wrap header-inner">
		<a class="brand" href="/">
			{#if site.logoUrl}<img src={site.logoUrl} alt={site.name} />{/if}
			<span>{site.name}</span>
		</a>
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
				<p>{theme.heroTagline}</p>
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
