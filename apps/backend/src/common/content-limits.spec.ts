import { createNewsSchema } from '../modules/news/dto/create-news.dto';
import { createPageSchema } from '../modules/pages/dto/create-page.dto';
import { MAX_BODY_MARKDOWN_LENGTH } from './content-limits';

describe('content payload limits', () => {
  const largePageBuilderBody = '<!-- cms:v2:callout payload -->\n' + 'x'.repeat(150_000);

  it('accepts Page Builder payloads larger than the old 100 KB transport default', () => {
    expect(
      createPageSchema.safeParse({
        title: 'Large page',
        slug: 'large-page',
        bodyMarkdown: largePageBuilderBody,
      }).success,
    ).toBe(true);
    expect(
      createNewsSchema.safeParse({
        title: 'Large news',
        slug: 'large-news',
        bodyMarkdown: largePageBuilderBody,
      }).success,
    ).toBe(true);
  });

  it('rejects unbounded persisted content', () => {
    const result = createPageSchema.safeParse({
      title: 'Too large',
      slug: 'too-large',
      bodyMarkdown: 'x'.repeat(MAX_BODY_MARKDOWN_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });
});
