import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Compiled-component cache directory, resolved relative to this file (not
 * `process.cwd()`, which varies with how the process was launched) so it
 * always lands inside `apps/backend` — where Node's module resolution will
 * find `apps/backend/node_modules/svelte` when the compiled output does
 * `import ... from 'svelte/internal/server'`.
 */
const CACHE_DIR = join(__dirname, '..', '..', '..', '..', '.svelte-cache');

/**
 * Compiles raw `.svelte` source to an SSR component and renders it.
 *
 * Shared by the static site build and the live preview so both go through
 * *exactly* the same compile and render path — which is what makes preview
 * output trustworthy as a stand-in for production (docs/theme_aware_prd.md
 * §14). Two separate implementations would drift, and a preview that drifts
 * is worse than no preview.
 *
 * `apps/backend` is a CommonJS package but Svelte 5 is ESM-only, so every
 * Svelte-touching import here is a dynamic `import()` — the one thing that
 * reliably bridges CJS -> ESM-only packages in Node.
 */
@Injectable()
export class SvelteCompilerService {
  /** Keyed by source hash: identical source compiles once per process, however many pages use it. */
  private readonly componentCache = new Map<string, unknown>();

  async compileAndImport(source: string, filename: string): Promise<unknown> {
    const hash = createHash('sha256').update(source).digest('hex');
    const cached = this.componentCache.get(hash);
    if (cached) return cached;

    const { compile } = await import('svelte/compiler');
    const { js } = compile(source, { generate: 'server', filename });

    await mkdir(CACHE_DIR, { recursive: true });
    const cacheFile = join(CACHE_DIR, `${hash}.mjs`);
    await writeFile(cacheFile, js.code, 'utf-8');

    const mod = (await import(pathToFileURL(cacheFile).href)) as { default: unknown };
    this.componentCache.set(hash, mod.default);
    return mod.default;
  }

  /**
   * Dynamically compiled from theme source text, so there's no static type to
   * check components/props against — same trust boundary as Eta's
   * `renderString(template, data)` accepting a plain object. Loosely typed
   * here rather than fighting `render()`'s generic inference over a component
   * with no compile-time type.
   */
  async renderSource(
    source: string,
    filename: string,
    props: Record<string, unknown>,
  ): Promise<{ head: string; body: string }> {
    const component = await this.compileAndImport(source, filename);
    const { render } = (await import('svelte/server')) as {
      render: (
        component: unknown,
        options: { props: Record<string, unknown> },
      ) => { head: string; body: string };
    };
    return render(component, { props });
  }
}
