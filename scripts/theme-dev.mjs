#!/usr/bin/env node
/**
 * Standalone live-preview dev server for editing a single theme.
 *
 * Renders a theme's real layouts (via the exact same Svelte SSR / Eta code
 * path as apps/backend's SvelteSiteRenderer / EtaSiteRenderer — see
 * apps/backend/src/modules/builder/render/) against small hand-written
 * sample content, with no database, queue, or auth in the loop. Saving a
 * file under themes/<slug>/src or themes/<slug>/assets triggers a theme
 * rebuild and pushes a live-reload event to the browser over SSE. Also
 * serves /theme-assets/:themeId/* locally (mirroring apps/backend's
 * ThemeAssetsController) so a theme's own asset URLs resolve during preview.
 *
 * Usage: pnpm theme:dev [slug] [--port=4310]
 *   slug defaults to "faculty". slug is the themes/<slug> directory name,
 *   not the theme's manifest id.
 */
import { createReadStream, existsSync, statSync, watch } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { ROOT } from './runtime/paths.mjs';
import { run } from './runtime/shell.mjs';
import { bold, cyan, dim, fail, heading, info, ok, printError, warn } from './runtime/ui.mjs';

// Mirrors apps/backend/src/modules/themes/theme-registry.ts's INSTALLED_THEMES
// bookkeeping: which SiteRenderer a theme's `layouts[].render` needs. Detected
// from disk instead of hardcoded so a new theme "just works" here too.
function detectRenderKind(themeDir) {
	return existsSync(join(themeDir, 'scripts', 'generate-svelte-sources.mjs')) ? 'svelte' : 'eta';
}

// Must live inside apps/backend (not the repo root) so the compiled
// component's own `import 'svelte/internal/server'` resolves against
// apps/backend/node_modules — same reasoning as SvelteSiteRenderer's
// CACHE_DIR in apps/backend/src/modules/builder/render/svelte-site-renderer.ts.
const SVELTE_CACHE_DIR = join(ROOT, 'apps', 'backend', '.svelte-cache', 'theme-preview');
const LIVE_RELOAD_SNIPPET = `
<script>
(function () {
	try {
		var source = new EventSource('/__livereload');
		source.onmessage = function (event) {
			if (event.data === 'reload') location.reload();
		};
	} catch (error) {
		console.warn('[theme-dev] live-reload unavailable', error);
	}
})();
</script>`;

// Same content-type set as scripts/static-preview.mjs, for assets/images/*
// served under /theme-assets/:themeId/* — mirrors apps/backend's
// ThemeAssetsController (modules/themes/theme-assets.controller.ts) so a
// theme's `url('/theme-assets/<manifest-id>/images/...')` CSS references
// resolve here too, not just in the real backend.
const CONTENT_TYPES = {
	'.avif': 'image/avif',
	'.css': 'text/css; charset=utf-8',
	'.gif': 'image/gif',
	'.ico': 'image/x-icon',
	'.jpeg': 'image/jpeg',
	'.jpg': 'image/jpeg',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
};

function parseArgs(argv) {
	let slug = 'faculty';
	let port = Number(process.env.THEME_DEV_PORT) || 4310;
	for (const arg of argv) {
		if (arg.startsWith('--port=')) port = Number(arg.slice('--port='.length));
		else if (!arg.startsWith('--')) slug = arg;
	}
	return { slug, port };
}

// --- Sample content: just enough to exercise every layout a theme ships
// (home, news-list, news-single, page) without a database. ---
const SITE = {
	id: 'preview-site',
	name: 'Fakultas Contoh',
	slug: 'preview',
	logoUrl: null,
	faviconUrl: null,
	domain: null,
};

const SAMPLE_NEWS = [
	{
		title: 'Seminar Nasional Riset Terapan 2026',
		slug: 'seminar-nasional-riset-terapan-2026',
		excerpt: 'Fakultas menggelar seminar nasional membahas riset terapan lintas disiplin ilmu.',
		bodyMarkdown:
			'## Seminar Nasional Riset Terapan\n\nFakultas menyelenggarakan seminar nasional yang menghadirkan pembicara dari berbagai perguruan tinggi. Kegiatan ini membahas perkembangan riset terapan lintas disiplin serta peluang kolaborasi penelitian.\n\n- Pembicara dari 5 universitas\n- Sesi diskusi panel\n- Publikasi prosiding',
		publishedAt: new Date(),
		categories: [{ name: 'Akademik', slug: 'akademik' }],
		tags: [{ name: 'Riset', slug: 'riset' }, { name: 'Seminar', slug: 'seminar' }],
	},
	{
		title: 'Mahasiswa Raih Juara 1 Kompetisi Internasional',
		slug: 'mahasiswa-raih-juara-1-kompetisi-internasional',
		excerpt: 'Tim mahasiswa berhasil meraih juara pertama dalam ajang kompetisi tingkat internasional.',
		bodyMarkdown:
			'Tim mahasiswa fakultas berhasil membawa pulang gelar juara pertama pada kompetisi internasional yang diikuti oleh lebih dari 40 negara.\n\nPrestasi ini menjadi bukti nyata kualitas pendidikan dan bimbingan yang diberikan.',
		publishedAt: new Date(Date.now() - 86_400_000 * 3),
		categories: [{ name: 'Prestasi', slug: 'prestasi' }],
		tags: [{ name: 'Mahasiswa', slug: 'mahasiswa' }],
	},
];

const SAMPLE_PAGES = [
	{
		title: 'Tentang Kami',
		slug: 'tentang-kami',
		bodyMarkdown:
			'# Tentang Kami\n\nFakultas Contoh adalah institusi pendidikan tinggi yang berkomitmen mencetak lulusan profesional, berintegritas, dan berdaya saing global.\n\n## Visi\n\nMenjadi fakultas unggul di tingkat nasional dan internasional.\n\n## Misi\n\n1. Menyelenggarakan pendidikan berkualitas\n2. Mengembangkan riset inovatif\n3. Melaksanakan pengabdian kepada masyarakat',
		isHomepage: false,
	},
];

function sampleMenus(theme) {
	const menus = {};
	for (const location of theme.menuLocations ?? []) {
		menus[location.id] = [
			{ label: 'Beranda', url: '/', newTab: false, clickable: true, children: [] },
			{
				label: 'Tentang Kami',
				url: '/tentang-kami/',
				newTab: false,
				clickable: true,
				children: [
					{ label: 'Visi & Misi', url: '/tentang-kami/#visi', newTab: false, clickable: true, children: [] },
				],
			},
			{ label: 'Berita', url: '/news/', newTab: false, clickable: true, children: [] },
		];
	}
	return menus;
}

/** Mirrors apps/backend's render/theme-vars.ts resolveThemeVars — schema defaults, no per-site overrides in preview. */
function resolveThemeVars(theme) {
	const vars = {};
	for (const [key, field] of Object.entries(theme.settings ?? {})) {
		if ('default' in field && field.default !== undefined) vars[key] = field.default;
	}
	return vars;
}

function pageSeo(site, description) {
	return {
		description: description || `Situs resmi ${site.name}.`,
		keywords: 'preview',
		canonicalUrl: null,
		ogImage: site.logoUrl,
	};
}

function injectLiveReload(html) {
	return /<\/body>/i.test(html)
		? html.replace(/<\/body>/i, `${LIVE_RELOAD_SNIPPET}\n</body>`)
		: `${html}${LIVE_RELOAD_SNIPPET}`;
}

async function main() {
	const { slug, port } = parseArgs(process.argv.slice(2));
	const themeDir = join(ROOT, 'themes', slug);
	if (!existsSync(themeDir)) {
		throw new Error(`No theme at themes/${slug}. Pass a themes/ directory name, e.g. "faculty".`);
	}

	const pkg = JSON.parse(await readFile(join(themeDir, 'package.json'), 'utf-8'));
	const pkgName = pkg.name;
	const distIndex = join(themeDir, 'dist', 'index.js');
	const renderKind = detectRenderKind(themeDir);

	// Resolved through apps/backend's own node_modules via a real ESM bare
	// import (see apps/backend/scripts/theme-preview-loader.mjs) — it already
	// depends on svelte/eta/markdown-it for real site builds, so this preview
	// server reuses that install and gets the exact same modules the
	// production SSR renderer does, instead of adding its own copies at the
	// root (resolving these via createRequire.resolve() would silently pick a
	// different, CJS-conditioned build of Svelte 5 with no usable exports).
	const bridge = await import(
		pathToFileURL(join(ROOT, 'apps', 'backend', 'scripts', 'theme-preview-loader.mjs')).href
	);
	const { compile: svelteCompile, render: svelteRender, Eta, MarkdownIt } = bridge;
	const md = new MarkdownIt({ html: true, linkify: true, breaks: true });

	heading(`Theme dev preview — ${bold(pkgName)} (${renderKind})`);
	info(`Building ${pkgName} and its workspace dependencies…`);
	await run('pnpm', ['--filter', `${pkgName}...`, 'run', 'build'], { cwd: ROOT });
	ok('Initial build complete');

	const sdkTheme = await import(pathToFileURL(join(ROOT, 'packages', 'sdk', 'theme', 'dist', 'index.js')).href);
	const { renderTokensCss } = sdkTheme;

	let buildVersion = 0;
	let cachedModule = null;
	let cachedVersion = -1;
	async function loadTheme() {
		if (cachedVersion === buildVersion && cachedModule) return cachedModule;
		const mod = await import(`${pathToFileURL(distIndex).href}?v=${buildVersion}`);
		cachedModule = mod.default;
		cachedVersion = buildVersion;
		return cachedModule;
	}

	// --- Svelte renderer path (mirrors SvelteSiteRenderer.compileAndImport) ---
	const svelteComponentCache = new Map();
	async function compileAndImportSvelte(source, filename) {
		const hash = createHash('sha256').update(source).digest('hex');
		const cached = svelteComponentCache.get(hash);
		if (cached) return cached;
		const { js } = svelteCompile(source, { generate: 'server', filename });
		await mkdir(SVELTE_CACHE_DIR, { recursive: true });
		const cacheFile = join(SVELTE_CACHE_DIR, `${hash}.mjs`);
		await writeFile(cacheFile, js.code, 'utf-8');
		const mod = await import(pathToFileURL(cacheFile).href);
		svelteComponentCache.set(hash, mod.default);
		return mod.default;
	}

	// --- Eta renderer path (mirrors EtaSiteRenderer) ---
	const eta = new Eta({ autoEscape: true });

	async function renderPage({ title, body, seo, isHome }) {
		const theme = await loadTheme();
		const layouts = new Map(theme.layouts.map((layout) => [layout.id, layout.render]));
		const themeVars = resolveThemeVars(theme);
		const tokensCss = renderTokensCss(theme.tokens);
		const menus = sampleMenus(theme);

		if (renderKind === 'svelte') {
			const renderLayout = async (id, layoutData) => {
				const source = layouts.get(id);
				if (!source) throw new Error(`Theme "${theme.manifest.id}" has no layout "${id}"`);
				const component = await compileAndImportSvelte(source, `${id}.svelte`);
				return svelteRender(component, {
					props: { site: SITE, theme: themeVars, menus, tokensCss, ...layoutData },
				});
			};
			if (body.layoutId) {
				const { body: html } = await renderLayout(body.layoutId, body.data);
				body = html;
			}
			const { head, body: shellBody } = await renderLayout('layout', { title, body, seo, isHome });
			return `<!DOCTYPE html>\n<html lang="id">\n<head>\n${head}\n</head>\n<body>\n${shellBody}\n</body>\n</html>\n`;
		}

		const renderLayout = (id, layoutData) => {
			const template = layouts.get(id);
			if (!template) throw new Error(`Theme "${theme.manifest.id}" has no layout "${id}"`);
			return eta.renderString(template, { site: SITE, theme: themeVars, menus, tokensCss, ...layoutData });
		};
		if (body.layoutId) body = renderLayout(body.layoutId, body.data);
		return renderLayout('layout', { title, body, seo });
	}

	function renderMarkdown(markdown) {
		return md.render(markdown ?? '');
	}

	// Same path-traversal guard as apps/backend's ThemeAssetsController — see
	// its comment for why both a manual containment check *and* relying on
	// the framework's own URL handling matter (encoded `..%2f` segments reach
	// application code before any framework-level normalization applies).
	const assetsDir = join(themeDir, 'assets');
	function resolveThemeAsset(assetPath) {
		if (!existsSync(assetsDir) || !assetPath) return null;
		const candidate = join(assetsDir, assetPath);
		const rel = relative(assetsDir, candidate);
		if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return null;
		try {
			if (!statSync(candidate).isFile()) return null;
		} catch {
			return null;
		}
		return candidate;
	}

	async function handleRequest(pathname) {
		if (pathname === '/' || pathname === '') {
			return renderPage({
				title: 'Beranda',
				body: { layoutId: 'home', data: { news: SAMPLE_NEWS, pages: SAMPLE_PAGES } },
				seo: pageSeo(SITE, 'Beranda situs fakultas contoh.'),
				isHome: true,
			});
		}
		if (pathname === '/news/') {
			return renderPage({
				title: 'Berita',
				body: { layoutId: 'news-list', data: { news: SAMPLE_NEWS } },
				seo: pageSeo(SITE, 'Daftar berita.'),
			});
		}
		const newsMatch = /^\/news\/([a-z0-9-]+)\/$/.exec(pathname);
		if (newsMatch) {
			const item = SAMPLE_NEWS.find((n) => n.slug === newsMatch[1]);
			if (!item) return null;
			return renderPage({
				title: item.title,
				body: { layoutId: 'news-single', data: { item: { ...item, bodyHtml: renderMarkdown(item.bodyMarkdown) } } },
				seo: pageSeo(SITE, item.excerpt),
			});
		}
		const pageMatch = /^\/([a-z0-9-]+)\/$/.exec(pathname);
		if (pageMatch) {
			const item = SAMPLE_PAGES.find((p) => p.slug === pageMatch[1]);
			if (!item) return null;
			return renderPage({
				title: item.title,
				body: { layoutId: 'page', data: { item: { ...item, bodyHtml: renderMarkdown(item.bodyMarkdown) } } },
				seo: pageSeo(SITE),
			});
		}
		return null;
	}

	const sseClients = new Set();
	function broadcastReload() {
		for (const res of sseClients) res.write('data: reload\n\n');
	}

	const server = createServer(async (req, res) => {
		const url = new URL(req.url ?? '/', 'http://localhost');
		if (url.pathname === '/__livereload') {
			res.writeHead(200, {
				'content-type': 'text/event-stream',
				'cache-control': 'no-cache',
				connection: 'keep-alive',
			});
			res.write('\n');
			sseClients.add(res);
			req.on('close', () => sseClients.delete(res));
			return;
		}

		const assetMatch = /^\/theme-assets\/([^/]+)\/(.+)$/.exec(url.pathname);
		if (assetMatch) {
			const [, themeId, assetPath] = assetMatch;
			const theme = await loadTheme();
			const file = theme.manifest.id === themeId ? resolveThemeAsset(assetPath) : null;
			if (!file) {
				res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
				res.end('Asset not found\n');
				return;
			}
			res.writeHead(200, {
				'content-type': CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
				'cache-control': 'no-store',
			});
			createReadStream(file).pipe(res);
			return;
		}

		try {
			const html = await handleRequest(url.pathname);
			if (html === null) {
				res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
				res.end(`Not found: ${url.pathname}\n\nAvailable routes:\n${routeList()}`);
				return;
			}
			res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
			res.end(injectLiveReload(html));
		} catch (error) {
			res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
			res.end(`Render error:\n\n${error.stack ?? error.message}`);
			fail(`Render error on ${url.pathname}: ${error.message}`);
		}
	});

	function routeList() {
		return [
			'/',
			'/news/',
			...SAMPLE_NEWS.map((n) => `/news/${n.slug}/`),
			...SAMPLE_PAGES.map((p) => `/${p.slug}/`),
		]
			.map((route) => `  http://localhost:${port}${route}`)
			.join('\n');
	}

	// --- Watch + rebuild loop ---
	let rebuildTimer = null;
	let building = false;
	let pendingRebuild = false;
	function scheduleRebuild() {
		clearTimeout(rebuildTimer);
		rebuildTimer = setTimeout(triggerRebuild, 150);
	}
	async function triggerRebuild() {
		if (building) {
			pendingRebuild = true;
			return;
		}
		building = true;
		try {
			console.log(`\n${dim('· rebuilding ' + pkgName + '…')}`);
			await run('pnpm', ['--filter', pkgName, 'run', 'build'], { cwd: ROOT });
			buildVersion += 1;
			ok('Rebuilt — reloading preview');
			broadcastReload();
		} catch (error) {
			fail('Theme build failed:');
			console.error(error.message);
			warn('Fix the error above and save again.');
		} finally {
			building = false;
			if (pendingRebuild) {
				pendingRebuild = false;
				scheduleRebuild();
			}
		}
	}

	const watchedDirs = [join(themeDir, 'src')];
	if (existsSync(assetsDir)) watchedDirs.push(assetsDir);
	// Themes with a `generate` build step (faculty, university) write their
	// own `*.generated.ts` output back into `src/` (see
	// scripts/generate-svelte-sources.mjs) — without this filter, that write
	// re-triggers this very watcher, which reruns the build, which writes the
	// file again, forever. Real edits never use this suffix, so it's safe to
	// ignore unconditionally.
	const watchers = watchedDirs.map((dir) =>
		watch(dir, { recursive: true }, (_event, filename) => {
			if (filename && /\.generated\.\w+$/.test(filename)) return;
			scheduleRebuild();
		}),
	);

	server.listen(port, () => {
		heading('Preview ready');
		console.log(`${cyan(bold(`http://localhost:${port}/`))}`);
		console.log(dim('\nRoutes:'));
		console.log(dim(routeList()));
		const watchedLabel = watchedDirs.map((dir) => relative(ROOT, dir)).join(', ');
		console.log(dim(`\nWatching ${watchedLabel} for changes. Ctrl+C to stop.`));
	});

	for (const signal of ['SIGINT', 'SIGTERM']) {
		process.on(signal, () => {
			for (const watcher of watchers) watcher.close();
			server.close(() => process.exit(0));
		});
	}
}

main().catch((error) => {
	printError(error, { debug: process.argv.includes('--debug') });
	process.exit(1);
});
