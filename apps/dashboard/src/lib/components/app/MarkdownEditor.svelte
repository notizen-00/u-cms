<script lang="ts">
	import { browser } from '$app/environment';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	let {
		value = $bindable(''),
		name,
		id = name,
		rows = 16,
		placeholder
	}: { value?: string; name: string; id?: string; rows?: number; placeholder?: string } = $props();

	// Preview is sanitized client-side even though the backend also sanitizes the
	// published version — this pane never goes through the backend sanitizer (PRD §12).
	const previewHtml = $derived(
		browser && value ? DOMPurify.sanitize(marked.parse(value, { async: false }) as string) : ''
	);
</script>

<div class="grid gap-4 md:grid-cols-2">
	<div class="space-y-1.5">
		<Label for={id}>Konten (Markdown)</Label>
		<Textarea {id} {name} bind:value {rows} {placeholder} class="font-mono text-sm" />
	</div>
	<div class="space-y-1.5">
		<Label>Pratinjau</Label>
		<div class="markdown-preview overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-sm" style:min-height="{rows * 1.5}rem" style:max-height="{rows * 1.5}rem">
			{#if previewHtml}
				{@html previewHtml}
			{:else}
				<p class="text-muted-foreground">Pratinjau markdown akan muncul di sini.</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.markdown-preview :global(h1),
	.markdown-preview :global(h2),
	.markdown-preview :global(h3) {
		font-weight: 600;
		margin-top: 0.75em;
		margin-bottom: 0.35em;
	}
	.markdown-preview :global(p) {
		margin-bottom: 0.6em;
		line-height: 1.6;
	}
	.markdown-preview :global(ul),
	.markdown-preview :global(ol) {
		margin-bottom: 0.6em;
		padding-left: 1.4em;
	}
	.markdown-preview :global(ul) {
		list-style: disc;
	}
	.markdown-preview :global(ol) {
		list-style: decimal;
	}
	.markdown-preview :global(a) {
		color: var(--primary);
		text-decoration: underline;
	}
	.markdown-preview :global(code) {
		background: var(--muted);
		border-radius: 0.25rem;
		padding: 0.1em 0.35em;
		font-size: 0.85em;
	}
	.markdown-preview :global(blockquote) {
		border-left: 2px solid var(--border);
		padding-left: 0.75em;
		color: var(--muted-foreground);
	}
	.markdown-preview :global(img) {
		max-width: 100%;
	}
</style>
