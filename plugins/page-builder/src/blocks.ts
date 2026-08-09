import {
  defineBlock,
  definePropertySchema,
  type BlockDefinition,
  type PropertySchema,
} from "@unej-cms/sdk-ui";
import { PLUGIN_ID } from "./manifest.js";

const toneOptions = [
  { label: "Default", value: "default" },
  { label: "Primary", value: "primary" },
  { label: "Dark", value: "dark" },
  { label: "Soft", value: "soft" },
  { label: "Info", value: "info" },
  { label: "Success", value: "success" },
  { label: "Warning", value: "warning" },
] as const;

const alignOptions = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
] as const;

const cardItemSchema = definePropertySchema({
  title: { type: "string", label: "Title", required: true },
  text: { type: "richtext", label: "Description" },
  imageUrl: { type: "media", label: "Image", accept: ["image/*"] },
  imageAlt: { type: "string", label: "Image Alt Text" },
  label: { type: "string", label: "Link Label" },
  url: { type: "string", label: "Link URL" },
});

const galleryItemSchema = definePropertySchema({
  url: { type: "media", label: "Image", accept: ["image/*"], required: true },
  alt: { type: "string", label: "Alt Text", required: true },
  caption: { type: "string", label: "Caption" },
});

const statItemSchema = definePropertySchema({
  value: { type: "string", label: "Value", required: true, placeholder: "15.000+" },
  label: { type: "string", label: "Label", required: true, placeholder: "Students" },
});

const faqItemSchema = definePropertySchema({
  question: { type: "string", label: "Question", required: true },
  answer: { type: "richtext", label: "Answer", required: true },
});

function pageBuilderBlock(
  id: string,
  name: string,
  description: string,
  category: string,
  icon: string,
  propertySchema: PropertySchema,
): BlockDefinition<PropertySchema, string> {
  return defineBlock({
    id: `${PLUGIN_ID}.${id}`,
    name,
    description,
    category,
    icon,
    propertySchema,
    render: `PageBuilder:${id}`,
  });
}

const headingBlock = pageBuilderBlock(
  "heading",
  "Heading",
  "Section heading with a semantic level.",
  "text",
  "heading-2",
  definePropertySchema({
    text: { type: "string", label: "Text", required: true },
    level: { type: "number", label: "Level", default: 2, min: 2, max: 4 },
  }),
);

const paragraphBlock = pageBuilderBlock(
  "paragraph",
  "Paragraph",
  "Rich paragraph content.",
  "text",
  "pilcrow",
  definePropertySchema({ text: { type: "richtext", label: "Content" } }),
);

const imageBlock = pageBuilderBlock(
  "image",
  "Image",
  "Responsive image from the media library.",
  "media",
  "image",
  definePropertySchema({
    url: { type: "media", label: "Image", accept: ["image/*"], required: true },
    alt: { type: "string", label: "Alt Text", required: true },
  }),
);

const quoteBlock = pageBuilderBlock(
  "quote",
  "Quote",
  "Highlighted quotation.",
  "text",
  "quote",
  definePropertySchema({ text: { type: "richtext", label: "Quote", required: true } }),
);

const listBlock = pageBuilderBlock(
  "list",
  "List",
  "Ordered or unordered list.",
  "text",
  "list",
  definePropertySchema({
    ordered: { type: "boolean", label: "Ordered", default: false },
    items: {
      type: "array",
      label: "Items",
      items: definePropertySchema({ text: { type: "string", label: "Text", required: true } }),
    },
  }),
);

const codeBlock = pageBuilderBlock(
  "code",
  "Code",
  "Preformatted code block.",
  "text",
  "code",
  definePropertySchema({ text: { type: "string", label: "Code", required: true } }),
);

const dividerBlock = pageBuilderBlock(
  "divider",
  "Divider",
  "Visual separator between sections.",
  "design",
  "minus",
  definePropertySchema({}),
);

const tableBlock = pageBuilderBlock(
  "table",
  "Table",
  "Accessible data table.",
  "widgets",
  "table",
  definePropertySchema({
    rows: {
      type: "array",
      label: "Rows",
      items: definePropertySchema({ cells: { type: "string", label: "Cells" } }),
    },
  }),
);

const columnsBlock = pageBuilderBlock(
  "columns",
  "Columns",
  "Responsive text columns.",
  "design",
  "columns-2",
  definePropertySchema({
    columns: {
      type: "array",
      label: "Columns",
      items: definePropertySchema({ content: { type: "richtext", label: "Content" } }),
    },
  }),
);

const buttonBlock = pageBuilderBlock(
  "button",
  "Button",
  "Call-to-action link styled as a button.",
  "design",
  "mouse-pointer-click",
  definePropertySchema({
    label: { type: "string", label: "Label", required: true, default: "Learn More" },
    url: { type: "string", label: "URL", required: true },
  }),
);

const embedBlock = pageBuilderBlock(
  "embed",
  "Video Embed",
  "Responsive YouTube or Vimeo embed.",
  "media",
  "video",
  definePropertySchema({ url: { type: "string", label: "Video URL", required: true } }),
);

const calendarBlock = pageBuilderBlock(
  "calendar",
  "Calendar",
  "Static monthly calendar.",
  "widgets",
  "calendar",
  definePropertySchema({ month: { type: "string", label: "Month", required: true } }),
);

const htmlBlock = pageBuilderBlock(
  "html",
  "Custom HTML",
  "Sanitized custom markup for advanced content.",
  "widgets",
  "file-code",
  definePropertySchema({ text: { type: "string", label: "HTML" } }),
);

export const heroBlock = pageBuilderBlock(
  "hero",
  "Hero",
  "High-impact introduction with image and call to action.",
  "design",
  "gallery-horizontal-end",
  definePropertySchema({
    eyebrow: { type: "string", label: "Eyebrow" },
    text: { type: "string", label: "Title", required: true },
    body: { type: "richtext", label: "Description" },
    imageUrl: { type: "media", label: "Image", accept: ["image/*"] },
    imageAlt: { type: "string", label: "Image Alt Text" },
    label: { type: "string", label: "Button Label" },
    url: { type: "string", label: "Button URL" },
    tone: { type: "select", label: "Tone", default: "primary", options: toneOptions },
    align: { type: "select", label: "Alignment", default: "left", options: alignOptions },
  }),
);

export const calloutBlock = pageBuilderBlock(
  "callout",
  "Callout",
  "Highlighted message with an optional action.",
  "design",
  "megaphone",
  definePropertySchema({
    text: { type: "string", label: "Title", required: true },
    body: { type: "richtext", label: "Description" },
    label: { type: "string", label: "Button Label" },
    url: { type: "string", label: "Button URL" },
    tone: { type: "select", label: "Tone", default: "soft", options: toneOptions },
    align: { type: "select", label: "Alignment", default: "left", options: alignOptions },
  }),
);

export const cardsBlock = pageBuilderBlock(
  "cards",
  "Cards",
  "Responsive feature or navigation card grid.",
  "design",
  "layout-grid",
  definePropertySchema({
    text: { type: "string", label: "Section Title" },
    body: { type: "richtext", label: "Section Description" },
    columnCount: {
      type: "number",
      label: "Columns",
      default: 3,
      min: 2,
      max: 4,
      step: 1,
    },
    cards: { type: "array", label: "Cards", items: cardItemSchema },
  }),
);

export const galleryBlock = pageBuilderBlock(
  "gallery",
  "Gallery",
  "Responsive image gallery with accessible captions.",
  "media",
  "images",
  definePropertySchema({
    text: { type: "string", label: "Section Title" },
    columnCount: {
      type: "number",
      label: "Columns",
      default: 3,
      min: 2,
      max: 4,
      step: 1,
    },
    gallery: { type: "array", label: "Images", items: galleryItemSchema },
  }),
);

export const statsBlock = pageBuilderBlock(
  "stats",
  "Statistics",
  "Prominent metrics and achievements.",
  "widgets",
  "chart-no-axes-column-increasing",
  definePropertySchema({
    text: { type: "string", label: "Section Title" },
    stats: { type: "array", label: "Statistics", items: statItemSchema },
  }),
);

export const faqBlock = pageBuilderBlock(
  "faq",
  "FAQ",
  "Accessible expandable question and answer list.",
  "widgets",
  "circle-help",
  definePropertySchema({
    text: { type: "string", label: "Section Title" },
    faqs: { type: "array", label: "Questions", items: faqItemSchema },
  }),
);

export const spacerBlock = pageBuilderBlock(
  "spacer",
  "Spacer",
  "Consistent vertical spacing between sections.",
  "design",
  "move-vertical",
  definePropertySchema({
    space: {
      type: "select",
      label: "Size",
      default: "md",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
      ],
    },
  }),
);

export const PAGE_BUILDER_BLOCKS = [
  headingBlock,
  paragraphBlock,
  imageBlock,
  quoteBlock,
  listBlock,
  codeBlock,
  dividerBlock,
  tableBlock,
  columnsBlock,
  buttonBlock,
  embedBlock,
  calendarBlock,
  htmlBlock,
  heroBlock,
  calloutBlock,
  cardsBlock,
  galleryBlock,
  statsBlock,
  faqBlock,
  spacerBlock,
] as const;

export const PAGE_BUILDER_RICH_BLOCK_IDS = [
  "hero",
  "callout",
  "cards",
  "gallery",
  "stats",
  "faq",
  "spacer",
] as const;
