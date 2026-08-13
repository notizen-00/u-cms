import type { CmsPlugin } from '@unej-cms/sdk-plugin';
import type { AssetTarget } from '@unej-cms/sdk-ui';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type { SiteRenderPluginAsset } from './site-renderer.types';

const SAFE_PATH_SEGMENT = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;

export interface EmittedPluginAsset extends SiteRenderPluginAsset {
  /** URL as declared by the plugin, or release-relative path for packaged content. */
  readonly url: string;
  readonly bundled: boolean;
}

export interface PluginAssetTags {
  readonly head: string;
  readonly body: string;
}

/** Collects assets from active plugin objects for one runtime surface. */
export function collectPluginAssets(
  plugins: readonly CmsPlugin[],
  target: Exclude<AssetTarget, 'both'>,
): readonly SiteRenderPluginAsset[] {
  const collected: SiteRenderPluginAsset[] = [];
  const seen = new Set<string>();

  for (const plugin of plugins) {
    for (const asset of plugin.ui?.assets ?? []) {
      if (asset.target !== target && asset.target !== 'both') continue;

      const key = `${plugin.manifest.id}\u0000${asset.id}`;
      if (seen.has(key)) {
        throw new Error(
          `Plugin "${plugin.manifest.id}" declares duplicate asset "${asset.id}"`,
        );
      }
      seen.add(key);
      collected.push({ pluginId: plugin.manifest.id, asset });
    }
  }

  return collected;
}

/**
 * Writes packaged CSS/JS under the current immutable release. External assets
 * keep their declared URL and never touch the filesystem.
 */
export async function emitPluginAssets(
  outputDir: string,
  assets: readonly SiteRenderPluginAsset[],
): Promise<readonly EmittedPluginAsset[]> {
  const outputRoot = resolve(outputDir);
  const emitted: EmittedPluginAsset[] = [];
  const outputPaths = new Set<string>();

  for (const registration of assets) {
    const { pluginId, asset } = registration;
    if (typeof asset.content !== 'string') {
      emitted.push({ ...registration, url: asset.url, bundled: false });
      continue;
    }

    assertSafePathSegment(pluginId, 'plugin id');
    assertSafePathSegment(asset.id, 'asset id');

    const extension = asset.kind === 'css' ? 'css' : 'js';
    const contentHash = createHash('sha256').update(asset.content).digest('hex').slice(0, 12);
    const fileName = `${asset.id}.${contentHash}.${extension}`;
    const publicPath = `assets/plugins/${pluginId}/${fileName}`;
    const filePath = resolve(
      outputRoot,
      'assets',
      'plugins',
      pluginId,
      fileName,
    );
    assertInsideOutput(outputRoot, filePath);
    if (outputPaths.has(filePath)) {
      throw new Error(`Multiple plugin assets resolve to "${publicPath}"`);
    }
    outputPaths.add(filePath);

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, asset.content, 'utf-8');
    emitted.push({ ...registration, url: publicPath, bundled: true });
  }

  return emitted;
}

/** Builds theme-independent tags for a page at `relativePath` inside a release. */
export function renderPluginAssetTags(
  assets: readonly EmittedPluginAsset[],
  pageRelativePath: string,
): PluginAssetTags {
  const tags: Record<'head' | 'body', string[]> = { head: [], body: [] };

  for (const registration of assets) {
    const { pluginId, asset } = registration;
    const url = registration.bundled
      ? relativePublicUrl(registration.url, pageRelativePath)
      : registration.url;
    const commonAttributes = [
      `data-cms-plugin="${escapeHtmlAttribute(pluginId)}"`,
      `data-cms-asset="${escapeHtmlAttribute(asset.id)}"`,
    ];
    if (asset.integrity) {
      commonAttributes.push(
        `integrity="${escapeHtmlAttribute(asset.integrity)}"`,
        'crossorigin="anonymous"',
      );
    }

    let tag: string | undefined;
    if (asset.kind === 'css') {
      tag = `<link rel="stylesheet" href="${escapeHtmlAttribute(url)}" ${commonAttributes.join(' ')}>`;
    } else if (asset.kind === 'js') {
      const defer = asset.defer ? ' defer' : '';
      tag = `<script src="${escapeHtmlAttribute(url)}" ${commonAttributes.join(' ')}${defer}></script>`;
    }

    // Font/icon/image definitions are addressable metadata for renderers, but
    // cannot be loaded generically without knowing their intended HTML usage.
    if (tag) tags[asset.placement].push(tag);
  }

  return {
    head: tags.head.join('\n'),
    body: tags.body.join('\n'),
  };
}

/**
 * Injects runtime-owned tags into a complete HTML document produced by an
 * Eta theme. Head tags land right after the opening `<head>` — BEFORE the
 * theme's own `<style>` block — not before `</head>`, so a theme's
 * same-specificity `.cms-pb-*` rule (e.g. reskinning Page Builder's cards to
 * match its own look) wins the cascade instead of needing `!important` to
 * beat a plugin stylesheet that would otherwise load later and win.
 */
export function injectPluginAssetTags(html: string, tags: PluginAssetTags): string {
  let result = html;
  if (tags.head) result = injectAfterOpeningTag(result, 'head', tags.head);
  if (tags.body) result = injectBeforeClosingTag(result, 'body', tags.body);
  return result;
}

function relativePublicUrl(publicPath: string, pageRelativePath: string): string {
  const depth = pageRelativePath
    .split(/[\\/]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
  return `${depth === 0 ? './' : '../'.repeat(depth)}${publicPath}`;
}

function injectAfterOpeningTag(html: string, tagName: 'head' | 'body', content: string): string {
  const openingTag = new RegExp(`<${tagName}[^>]*>`, 'i');
  const match = openingTag.exec(html);
  if (!match || match.index === undefined) {
    throw new Error(`Rendered site document has no opening <${tagName}> tag`);
  }
  const insertAt = match.index + match[0].length;
  return `${html.slice(0, insertAt)}\n${content}${html.slice(insertAt)}`;
}

function injectBeforeClosingTag(html: string, tagName: 'head' | 'body', content: string): string {
  const closingTag = new RegExp(`</${tagName}\\s*>`, 'i');
  const match = closingTag.exec(html);
  if (!match || match.index === undefined) {
    throw new Error(`Rendered site document has no closing </${tagName}> tag`);
  }
  return `${html.slice(0, match.index)}${content}\n${html.slice(match.index)}`;
}

function assertSafePathSegment(value: string, label: string): void {
  if (!SAFE_PATH_SEGMENT.test(value)) {
    throw new Error(`Unsafe plugin asset ${label}: "${value}"`);
  }
}

function assertInsideOutput(outputRoot: string, filePath: string): void {
  const pathFromRoot = relative(outputRoot, filePath);
  if (!pathFromRoot || pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
    throw new Error(`Plugin asset path escapes build output: "${filePath}"`);
  }
}

export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
