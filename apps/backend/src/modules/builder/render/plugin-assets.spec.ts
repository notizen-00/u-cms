import type { CmsPlugin } from '@unej-cms/sdk-plugin';
import { defineAsset, type AssetDefinition } from '@unej-cms/sdk-ui';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  collectPluginAssets,
  emitPluginAssets,
  injectPluginAssetTags,
  renderPluginAssetTags,
} from './plugin-assets';

function plugin(id: string, assets: readonly AssetDefinition[]): CmsPlugin {
  return {
    manifest: {
      id,
      name: id,
      version: '1.0.0',
      author: { name: 'Test' },
      description: 'Test plugin',
      license: 'UNLICENSED',
      compatibility: { cms: { min: '1.0.0' }, sdk: { min: '1.0.0' } },
    },
    ui: { assets },
  };
}

describe('plugin assets', () => {
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await mkdtemp(join(tmpdir(), 'u-cms-plugin-assets-'));
  });

  afterEach(async () => {
    await rm(outputDir, { recursive: true, force: true });
  });

  it('collects only assets targeting the requested active runtime', () => {
    const siteAsset = defineAsset({ id: 'site', kind: 'css', content: 'body{}' });
    const editorAsset = defineAsset({
      id: 'editor',
      kind: 'css',
      content: '.editor{}',
      target: 'editor',
    });
    const sharedAsset = defineAsset({
      id: 'shared',
      kind: 'js',
      content: 'void 0;',
      target: 'both',
    });

    const collected = collectPluginAssets(
      [plugin('unej.test-plugin', [siteAsset, editorAsset, sharedAsset])],
      'site',
    );
    expect(collected.map(({ asset }) => asset.id)).toEqual(['site', 'shared']);
    expect(collectPluginAssets([], 'site')).toEqual([]);
  });

  it('rejects duplicate ids within one plugin', () => {
    const asset = defineAsset({ id: 'styles', kind: 'css', content: 'body{}' });
    expect(() =>
      collectPluginAssets([plugin('unej.test-plugin', [asset, asset])], 'site'),
    ).toThrow('declares duplicate asset "styles"');
  });

  it('emits packaged files and renders relative tags for nested pages', async () => {
    const stylesheet = defineAsset({ id: 'styles', kind: 'css', content: '.form{}' });
    const runtime = defineAsset({
      id: 'runtime',
      kind: 'js',
      content: 'window.formReady=true;',
      defer: true,
    });
    const collected = collectPluginAssets(
      [plugin('unej.form-builder', [stylesheet, runtime])],
      'site',
    );

    const emitted = await emitPluginAssets(outputDir, collected);
    const stylesheetUrl = emitted.find(({ asset }) => asset.id === 'styles')?.url;
    const runtimeUrl = emitted.find(({ asset }) => asset.id === 'runtime')?.url;
    expect(stylesheetUrl).toMatch(
      /^assets\/plugins\/unej\.form-builder\/styles\.[a-f0-9]{12}\.css$/,
    );
    expect(runtimeUrl).toMatch(
      /^assets\/plugins\/unej\.form-builder\/runtime\.[a-f0-9]{12}\.js$/,
    );
    await expect(
      readFile(join(outputDir, ...(stylesheetUrl ?? '').split('/')), 'utf-8'),
    ).resolves.toBe('.form{}');
    await expect(
      readFile(join(outputDir, ...(runtimeUrl ?? '').split('/')), 'utf-8'),
    ).resolves.toBe('window.formReady=true;');

    const tags = renderPluginAssetTags(emitted, 'news/example');
    expect(tags.head).toContain(`href="../../${stylesheetUrl}"`);
    expect(tags.body).toContain(`src="../../${runtimeUrl}"`);
    expect(tags.body).toContain(' defer');
    expect(tags.head).toContain('data-cms-plugin="unej.form-builder"');
  });

  it('escapes external URLs and metadata before inserting HTML attributes', async () => {
    const stylesheet = defineAsset({
      id: 'styles',
      kind: 'css',
      url: 'https://example.test/style.css?theme="dark"&x=<tag>',
      integrity: 'sha384-"unsafe"',
    });
    const emitted = await emitPluginAssets(
      outputDir,
      collectPluginAssets([plugin('unej.test-plugin', [stylesheet])], 'site'),
    );

    const tags = renderPluginAssetTags(emitted, '');
    expect(tags.head).toContain('theme=&quot;dark&quot;&amp;x=&lt;tag&gt;');
    expect(tags.head).toContain('integrity="sha384-&quot;unsafe&quot;"');
  });

  it('rejects plugin ids that could escape the release output', async () => {
    const stylesheet = defineAsset({ id: 'styles', kind: 'css', content: 'body{}' });
    const assets = collectPluginAssets([plugin('../outside', [stylesheet])], 'site');
    await expect(emitPluginAssets(outputDir, assets)).rejects.toThrow(
      'Unsafe plugin asset plugin id',
    );
  });

  it('injects tags without requiring a theme-owned slot', () => {
    const html = '<!doctype html><html><head><title>Site</title></head><body>Body</body></html>';
    const injected = injectPluginAssetTags(html, {
      head: '<link rel="stylesheet" href="./styles.css">',
      body: '<script src="./runtime.js"></script>',
    });

    // Head tags land right after <head> — before the theme's own <title>/
    // <style> — so a theme's same-specificity CSS still wins the cascade.
    expect(injected).toContain('<head>\n<link rel="stylesheet" href="./styles.css"><title>Site</title>');
    expect(injected).toContain('<script src="./runtime.js"></script>\n</body>');
  });
});
