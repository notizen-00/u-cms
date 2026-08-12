import { defineAsset } from "@unej-cms/sdk-ui";

/**
 * Theme-independent public styles. Theme tokens are optional integration
 * points; every token has a stable fallback so a new theme needs no Page
 * Builder-specific CSS.
 */
export const PAGE_BUILDER_STYLES = `
:where(.cms-pb-hero, .cms-pb-callout, .cms-pb-card-grid, .cms-pb-gallery, .cms-pb-stats, .cms-pb-faq) {
  --cms-pb-primary: var(--primary, var(--theme-primary, #075985));
  --cms-pb-secondary: var(--secondary, var(--theme-secondary, #f59e0b));
  --cms-pb-background: var(--theme-background, #ffffff);
  --cms-pb-surface: var(--surface, var(--theme-surface, #ffffff));
  --cms-pb-foreground: var(--theme-foreground, #111827);
  --cms-pb-muted: var(--theme-muted-foreground, #5f6b7a);
  --cms-pb-line: var(--line, var(--theme-line, #dfe5ed));
  --cms-pb-radius: var(--theme-radius-card, 1rem);
  box-sizing: border-box;
}
:where(.cms-pb-hero, .cms-pb-callout, .cms-pb-card-grid, .cms-pb-gallery, .cms-pb-stats, .cms-pb-faq) *,
:where(.cms-pb-hero, .cms-pb-callout, .cms-pb-card-grid, .cms-pb-gallery, .cms-pb-stats, .cms-pb-faq) *::before,
:where(.cms-pb-hero, .cms-pb-callout, .cms-pb-card-grid, .cms-pb-gallery, .cms-pb-stats, .cms-pb-faq) *::after {
  box-sizing: border-box;
}

.cms-button {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  padding: .7rem 1.25rem;
  color: #fff !important;
  background: var(--cms-pb-primary, var(--primary, var(--theme-primary, #075985)));
  border: 1px solid transparent;
  border-radius: var(--theme-radius-button, .625rem);
  font-weight: 700;
  line-height: 1.2;
  text-decoration: none !important;
  transition: transform .18s ease, filter .18s ease, box-shadow .18s ease;
}
.cms-button:hover { filter: brightness(1.08); transform: translateY(-1px); }
.cms-button:focus-visible { outline: 3px solid color-mix(in srgb, var(--cms-pb-primary, #075985) 35%, transparent); outline-offset: 3px; }

.cms-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: clamp(1rem, 2.5vw, 1.5rem);
  margin: clamp(1.5rem, 4vw, 2.5rem) 0;
}
.cms-column {
  min-width: 0;
  padding: clamp(1rem, 2.5vw, 1.5rem);
  background: var(--surface, var(--theme-surface, #fff));
  border: 1px solid var(--line, var(--theme-line, #dfe5ed));
  border-radius: var(--theme-radius-card, .75rem);
}
.cms-embed {
  position: relative;
  width: 100%;
  height: 0;
  margin: clamp(1.5rem, 4vw, 2.5rem) 0;
  padding-bottom: 56.25%;
  overflow: hidden;
  background: #0f172a;
  border-radius: var(--theme-radius-card, .75rem);
}
.cms-embed iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.cms-calendar { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
.cms-calendar caption { padding: .75rem; font-size: 1.05rem; font-weight: 800; text-align: left; }
.cms-calendar th, .cms-calendar td { padding: .65rem; border: 1px solid var(--line, var(--theme-line, #dfe5ed)); text-align: center; }
.cms-calendar th { background: var(--theme-muted, #f3f6f9); }

.cms-pb-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(15rem, .9fr);
  align-items: stretch;
  min-height: clamp(24rem, 56vw, 38rem);
  margin: clamp(1.5rem, 5vw, 3.5rem) 0;
  overflow: hidden;
  color: var(--cms-pb-foreground);
  background: var(--cms-pb-surface);
  border: 1px solid var(--cms-pb-line);
  border-radius: var(--cms-pb-radius);
  box-shadow: 0 20px 55px rgb(15 23 42 / .10);
}
.cms-pb-hero__media { min-height: 18rem; order: 2; background: #e8eef4; }
.cms-pb-hero.cms-pb-hero--no-media { grid-template-columns: 1fr; min-height: clamp(18rem, 40vw, 28rem); }
.cms-pb-hero__media img { width: 100%; height: 100%; min-height: 100%; object-fit: cover; }
.cms-pb-hero__content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: clamp(2rem, 7vw, 5rem);
}
.cms-pb-hero__eyebrow {
  margin: 0 0 .9rem;
  color: var(--cms-pb-primary);
  font-size: .78rem;
  font-weight: 800;
  letter-spacing: .14em;
  text-transform: uppercase;
}
.cms-pb-hero__title { max-width: 16ch; margin: 0; font-size: clamp(2rem, 5vw, 4.25rem); font-weight: 850; letter-spacing: -.035em; line-height: 1.03; }
.cms-pb-hero__text { max-width: 62ch; margin: 1.25rem 0 1.75rem; color: var(--cms-pb-muted); font-size: clamp(1rem, 1.8vw, 1.2rem); line-height: 1.7; }
.cms-pb-hero.cms-pb-align-center { grid-template-columns: 1fr; text-align: center; }
.cms-pb-hero.cms-pb-align-center .cms-pb-hero__content { align-items: center; }
.cms-pb-hero.cms-pb-align-center .cms-pb-hero__media { max-height: 25rem; order: -1; }

.cms-pb-callout {
  margin: clamp(1.5rem, 4vw, 3rem) 0;
  padding: clamp(1.5rem, 5vw, 3rem);
  color: var(--cms-pb-foreground);
  background: var(--cms-pb-surface);
  border: 1px solid var(--cms-pb-line);
  border-left: .35rem solid var(--cms-pb-primary);
  border-radius: var(--cms-pb-radius);
}
.cms-pb-callout h2 { margin: 0 0 .65rem; font-size: clamp(1.35rem, 3vw, 2rem); line-height: 1.2; }
.cms-pb-callout p { max-width: 65ch; margin: 0 0 1.25rem; line-height: 1.7; }
.cms-pb-callout.cms-pb-align-center { border-left-width: 1px; text-align: center; }
.cms-pb-callout.cms-pb-align-center p { margin-inline: auto; }
.cms-pb-callout.cms-pb-tone-primary, .cms-pb-callout.cms-pb-tone-dark { color: #fff; }

.cms-pb-card-grid {
  display: grid;
  grid-template-columns: repeat(var(--cms-pb-columns, 3), minmax(0, 1fr));
  gap: clamp(1rem, 2.5vw, 1.5rem);
  margin: clamp(1.5rem, 4vw, 3rem) 0;
}
.cms-pb-cols-2 { --cms-pb-columns: 2; }
.cms-pb-cols-3 { --cms-pb-columns: 3; }
.cms-pb-cols-4 { --cms-pb-columns: 4; }
.cms-pb-card-grid__title,
.cms-pb-card-grid__text,
.cms-pb-gallery__title {
  grid-column: 1 / -1;
}
.cms-pb-card-grid__title,
.cms-pb-gallery__title,
.cms-pb-stats__title,
.cms-pb-faq__title {
  margin: 0;
  color: var(--theme-foreground, #111827);
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  line-height: 1.2;
}
.cms-pb-card-grid__text {
  max-width: 65ch;
  margin: -.4rem 0 .5rem;
  color: var(--theme-muted-foreground, #5f6b7a);
  line-height: 1.7;
}
.cms-pb-card {
  display: flex;
  min-width: 0;
  overflow: hidden;
  flex-direction: column;
  background: var(--cms-pb-surface);
  border: 1px solid var(--cms-pb-line);
  border-radius: var(--cms-pb-radius);
  box-shadow: 0 10px 30px rgb(15 23 42 / .07);
  transition: transform .2s ease, box-shadow .2s ease;
}
.cms-pb-card:hover { transform: translateY(-3px); box-shadow: 0 18px 42px rgb(15 23 42 / .12); }
.cms-pb-card__media { aspect-ratio: 16 / 9; overflow: hidden; background: #e8eef4; }
.cms-pb-card__media img { width: 100%; height: 100%; object-fit: cover; transition: transform .35s ease; }
.cms-pb-card:hover .cms-pb-card__media img { transform: scale(1.035); }
.cms-pb-card__body { display: flex; flex: 1; flex-direction: column; align-items: flex-start; padding: clamp(1.1rem, 2.5vw, 1.5rem); }
.cms-pb-card__title { margin: 0; font-size: 1.15rem; font-weight: 800; line-height: 1.3; }
.cms-pb-card__text { margin: .65rem 0 0; color: var(--cms-pb-muted); line-height: 1.65; }
.cms-pb-card__link { margin-top: auto; padding-top: 1rem; color: var(--cms-pb-primary); font-weight: 750; text-decoration: none; }

.cms-pb-gallery {
  display: grid;
  grid-template-columns: repeat(var(--cms-pb-columns, 3), minmax(0, 1fr));
  gap: clamp(.65rem, 2vw, 1rem);
  margin: clamp(1.5rem, 4vw, 3rem) 0;
}
.cms-pb-gallery__item { min-width: 0; margin: 0; overflow: hidden; background: var(--cms-pb-surface); border-radius: var(--cms-pb-radius); }
.cms-pb-gallery__image { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; transition: transform .3s ease; }
.cms-pb-gallery__item:hover .cms-pb-gallery__image { transform: scale(1.025); }
.cms-pb-gallery__caption { padding: .65rem .8rem; color: var(--cms-pb-muted); font-size: .88rem; line-height: 1.45; }

.cms-pb-stats {
  margin: clamp(1.5rem, 4vw, 3rem) 0;
}
.cms-pb-stats__title { margin-bottom: 1rem; }
.cms-pb-stats__list {
  display: grid;
  grid-template-columns: repeat(var(--cms-pb-columns, 3), minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: var(--cms-pb-line);
  border: 1px solid var(--cms-pb-line);
  border-radius: var(--cms-pb-radius);
}
.cms-pb-stat { display: flex; min-height: 9rem; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem; text-align: center; background: var(--cms-pb-surface); }
.cms-pb-stat__value { margin: 0; color: var(--cms-pb-primary); font-size: clamp(1.75rem, 4vw, 3rem); font-weight: 850; letter-spacing: -.03em; line-height: 1; }
.cms-pb-stat__label { margin: .6rem 0 0; color: var(--cms-pb-muted); font-size: .88rem; font-weight: 650; }

.cms-pb-faq { margin: clamp(1.5rem, 4vw, 3rem) 0; border-top: 1px solid var(--cms-pb-line); }
.cms-pb-faq__title { margin: 0; padding: 0 0 1rem; }
.cms-pb-faq__item { border-bottom: 1px solid var(--cms-pb-line); }
.cms-pb-faq__question { position: relative; padding: 1.15rem 2.75rem 1.15rem .25rem; cursor: pointer; font-weight: 750; list-style: none; }
.cms-pb-faq__question::-webkit-details-marker { display: none; }
.cms-pb-faq__question::after { position: absolute; top: 50%; right: .4rem; width: 1.6rem; height: 1.6rem; content: "+"; transform: translateY(-50%); color: var(--cms-pb-primary); font-size: 1.35rem; line-height: 1.35rem; text-align: center; }
.cms-pb-faq__item[open] .cms-pb-faq__question::after { content: "−"; }
.cms-pb-faq__answer { padding: 0 2.75rem 1.2rem .25rem; color: var(--cms-pb-muted); line-height: 1.7; }
.cms-pb-faq__answer p { margin: 0; }

/* Appearance modifiers are deliberately declared after every block base so
   a component background cannot accidentally override the selected tone. */
.cms-pb-tone-primary { color: #fff; background: var(--cms-pb-primary); background: linear-gradient(135deg, var(--cms-pb-primary), color-mix(in srgb, var(--cms-pb-primary) 72%, #111827)); border-color: transparent; }
.cms-pb-tone-dark { color: #fff; background: linear-gradient(135deg, #0f172a, #263449); border-color: transparent; }
.cms-pb-tone-soft { background: #f2f7fa; background: color-mix(in srgb, var(--cms-pb-primary) 8%, var(--cms-pb-background)); }
.cms-pb-tone-info { background: #eff8ff; border-color: #9bd4ff; }
.cms-pb-tone-success { background: #effcf4; border-color: #86d9a5; }
.cms-pb-tone-warning { background: #fff8e6; border-color: #f7ce72; }

:where(.cms-pb-card-grid, .cms-pb-gallery, .cms-pb-stats, .cms-pb-faq):where(
  .cms-pb-tone-primary, .cms-pb-tone-dark, .cms-pb-tone-soft,
  .cms-pb-tone-info, .cms-pb-tone-success, .cms-pb-tone-warning
) {
  padding: clamp(1.25rem, 4vw, 2.5rem);
  border: 1px solid var(--cms-pb-line);
  border-radius: var(--cms-pb-radius);
}
.cms-pb-tone-primary :where(
  .cms-pb-hero__eyebrow, .cms-pb-hero__text, .cms-pb-callout__text,
  .cms-pb-card-grid__title, .cms-pb-card-grid__text, .cms-pb-gallery__title,
  .cms-pb-stats__title, .cms-pb-faq__title, .cms-pb-faq__answer
),
.cms-pb-tone-dark :where(
  .cms-pb-hero__eyebrow, .cms-pb-hero__text, .cms-pb-callout__text,
  .cms-pb-card-grid__title, .cms-pb-card-grid__text, .cms-pb-gallery__title,
  .cms-pb-stats__title, .cms-pb-faq__title, .cms-pb-faq__answer
) { color: rgb(255 255 255 / .84); }
.cms-pb-tone-primary .cms-button, .cms-pb-tone-dark .cms-button { color: #111827 !important; background: #fff; }

.cms-pb-align-center { text-align: center; }
.cms-pb-align-center :where(.cms-pb-card-grid__text, .cms-pb-callout__text) { margin-inline: auto; }
.cms-pb-card-grid.cms-pb-align-center .cms-pb-card__body { align-items: center; }
.cms-pb-gallery.cms-pb-align-center .cms-pb-gallery__caption { text-align: center; }

.cms-pb-spacer { width: 100%; }
.cms-pb-space-sm { height: 1.5rem; }
.cms-pb-space-md { height: 3rem; }
.cms-pb-space-lg { height: 5rem; }

@media (max-width: 60rem) {
  .cms-pb-hero { grid-template-columns: 1fr; }
  .cms-pb-hero__media { max-height: 24rem; order: -1; }
  .cms-pb-cols-4 { --cms-pb-columns: 2; }
}
@media (max-width: 42rem) {
  .cms-pb-hero { min-height: 0; }
  .cms-pb-hero__content { padding: 1.5rem; }
  .cms-pb-card-grid, .cms-pb-gallery { --cms-pb-columns: 1; }
  .cms-pb-stats { --cms-pb-columns: 2; }
  .cms-pb-spacer.cms-pb-space-lg { height: 3rem; }
}
@media (max-width: 28rem) {
  .cms-pb-stats { --cms-pb-columns: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .cms-button, .cms-pb-card, .cms-pb-card__media img, .cms-pb-gallery__image { transition: none; }
}
@media print {
  .cms-pb-hero, .cms-pb-card, .cms-pb-gallery__item { break-inside: avoid; box-shadow: none; }
  .cms-pb-spacer { display: none; }
}

/* Every theme wraps article/page body content in a narrow ".prose" column
   for reading comfort (~760px). That's the right width for running text,
   but a rich block is a full section, not a paragraph — a 3-column card
   grid or a side-by-side hero crushed into 760px reads as broken, not "on
   brand". These block types break out to the full viewport width instead,
   wherever they land inside ".prose", regardless of theme. */
.prose > :where(.cms-pb-hero, .cms-pb-callout, .cms-pb-card-grid, .cms-pb-gallery, .cms-pb-stats, .cms-pb-faq) {
  box-sizing: border-box;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  padding-left: clamp(1.25rem, 4vw, 3rem);
  padding-right: clamp(1.25rem, 4vw, 3rem);
}
`;

export const pageBuilderStyleAsset = defineAsset({
  id: "styles",
  kind: "css",
  content: PAGE_BUILDER_STYLES,
  target: "site",
  placement: "head",
});
