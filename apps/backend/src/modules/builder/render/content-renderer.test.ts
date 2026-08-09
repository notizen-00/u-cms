import { describe, expect, it } from 'vitest';

import { ContentRenderer } from './content-renderer';

describe('ContentRenderer', () => {
  const renderer = new ContentRenderer();
  const render = (markdown: string) =>
    renderer.renderMarkdown(markdown, 'site-1', 'https://api.example.test', new Map());

  it('preserves the explicit Page Builder semantic markup and class contract', () => {
    const output = render(
      [
        '<!-- cms:hero {"title":"Welcome"} -->',
        '<section class="cms-pb-hero cms-pb-hero--no-media cms-pb-tone-primary cms-pb-align-center">',
        '<figure class="cms-pb-hero__media"><img class="cms-pb-gallery__image" src="https://example.test/hero.jpg" alt="Hero"><figcaption class="cms-pb-gallery__caption">Hero</figcaption></figure>',
        '<div class="cms-pb-hero__content"><p class="cms-pb-hero__eyebrow">Eyebrow</p><h2 class="cms-pb-hero__title">Title</h2><p class="cms-pb-hero__text">Text</p><a class="cms-button" href="/start/">Start</a></div>',
        '</section>',
        '<aside class="cms-pb-callout cms-pb-tone-info cms-pb-align-left"><h2 class="cms-pb-callout__title">Callout</h2><p class="cms-pb-callout__text">Text</p></aside>',
        '<section class="cms-pb-card-grid cms-pb-cols-3">',
        '<h2 class="cms-pb-card-grid__title">Cards</h2><p class="cms-pb-card-grid__text">Introduction</p>',
        '<article class="cms-pb-card"><figure class="cms-pb-card__media"></figure><div class="cms-pb-card__body"><h3 class="cms-pb-card__title">Card</h3><p class="cms-pb-card__text">Body</p><a class="cms-pb-card__link" href="/card/">Read</a></div></article>',
        '</section>',
        '<section class="cms-pb-gallery cms-pb-cols-4"><h2 class="cms-pb-gallery__title">Gallery</h2><figure class="cms-pb-gallery__item"></figure></section>',
        '<section class="cms-pb-stats cms-pb-cols-3"><h2 class="cms-pb-stats__title">Stats</h2><dl class="cms-pb-stats__list"><div class="cms-pb-stat"><dt class="cms-pb-stat__value">100</dt><dd class="cms-pb-stat__label">Items</dd></div></dl></section>',
        '<section class="cms-pb-faq"><h2 class="cms-pb-faq__title">FAQ</h2><details class="cms-pb-faq__item"><summary class="cms-pb-faq__question">Question</summary><div class="cms-pb-faq__answer">Answer</div></details></section>',
        '<div class="cms-pb-spacer cms-pb-tone-default cms-pb-tone-dark cms-pb-tone-soft cms-pb-tone-success cms-pb-tone-warning cms-pb-cols-2 cms-pb-space-sm cms-pb-space-md cms-pb-space-lg"></div>',
      ].join('\n'),
    );

    for (const tag of [
      'section',
      'article',
      'aside',
      'figure',
      'figcaption',
      'details',
      'summary',
      'dl',
      'dt',
      'dd',
    ]) {
      expect(output).toContain(`<${tag}`);
    }

    for (const className of [
      'cms-pb-hero',
      'cms-pb-hero--no-media',
      'cms-pb-hero__media',
      'cms-pb-hero__content',
      'cms-pb-hero__eyebrow',
      'cms-pb-hero__title',
      'cms-pb-hero__text',
      'cms-pb-callout',
      'cms-pb-callout__title',
      'cms-pb-callout__text',
      'cms-pb-card-grid',
      'cms-pb-card-grid__title',
      'cms-pb-card-grid__text',
      'cms-pb-card',
      'cms-pb-card__media',
      'cms-pb-card__body',
      'cms-pb-card__title',
      'cms-pb-card__text',
      'cms-pb-card__link',
      'cms-pb-gallery',
      'cms-pb-gallery__title',
      'cms-pb-gallery__item',
      'cms-pb-gallery__image',
      'cms-pb-gallery__caption',
      'cms-pb-stats',
      'cms-pb-stats__title',
      'cms-pb-stats__list',
      'cms-pb-stat',
      'cms-pb-stat__value',
      'cms-pb-stat__label',
      'cms-pb-faq',
      'cms-pb-faq__title',
      'cms-pb-faq__item',
      'cms-pb-faq__question',
      'cms-pb-faq__answer',
      'cms-pb-spacer',
      'cms-pb-tone-default',
      'cms-pb-tone-primary',
      'cms-pb-tone-dark',
      'cms-pb-tone-soft',
      'cms-pb-tone-info',
      'cms-pb-tone-success',
      'cms-pb-tone-warning',
      'cms-pb-align-left',
      'cms-pb-align-center',
      'cms-pb-cols-2',
      'cms-pb-cols-3',
      'cms-pb-cols-4',
      'cms-pb-space-sm',
      'cms-pb-space-md',
      'cms-pb-space-lg',
      'cms-button',
    ]) {
      expect(output).toContain(className);
    }

    expect(output).not.toContain('<!-- cms:');
  });

  it('drops unreviewed Page Builder modifiers and unsafe stored markup', () => {
    const output = render(
      [
        '<section class="cms-pb-hero cms-pb-tone-danger cms-pb-align-right cms-pb-cols-5 cms-pb-space-xl foreign" style="position:fixed" onclick="alert(1)" data-secret="x">',
        '<script>alert(1)</script>',
        '<img class="cms-pb-gallery__image cms-pb-future" src="https://example.test/image.jpg" onerror="alert(1)">',
        '<a class="cms-button cms-pb-future" href="javascript:alert(1)">Unsafe</a>',
        '<details class="cms-pb-faq__item" open ontoggle="alert(1)"><summary class="cms-pb-faq__question" onclick="alert(1)">FAQ</summary><div class="cms-pb-faq__answer">Answer</div></details>',
        '<iframe src="https://evil.example/embed"></iframe>',
        '</section>',
      ].join('\n'),
    );

    expect(output).toContain('cms-pb-hero');
    expect(output).toContain('cms-pb-gallery__image');
    expect(output).toContain('cms-button');
    expect(output).not.toContain('cms-pb-tone-danger');
    expect(output).not.toContain('cms-pb-align-right');
    expect(output).not.toContain('cms-pb-cols-5');
    expect(output).not.toContain('cms-pb-space-xl');
    expect(output).not.toContain('cms-pb-future');
    expect(output).not.toContain('foreign');
    expect(output).not.toContain('<script');
    expect(output).not.toContain('alert(1)');
    expect(output).not.toContain('style=');
    expect(output).not.toContain('onclick=');
    expect(output).not.toContain('onerror=');
    expect(output).not.toContain('ontoggle=');
    expect(output).not.toContain(' open');
    expect(output).not.toContain('data-secret');
    expect(output).not.toContain('javascript:');
    expect(output).not.toContain('evil.example');
  });
});
