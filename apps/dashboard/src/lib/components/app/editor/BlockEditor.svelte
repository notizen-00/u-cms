<script lang="ts">
	/**
	 * Full-page block editor shell.
	 *
	 * The whole document lives inside this component — title, canvas and the
	 * per-document settings the route supplies as snippets — so editing is one
	 * uninterrupted surface instead of a form with an editor widget dropped into
	 * it. Blocks are edited directly on the canvas (see BlockCanvas), with the
	 * right-hand inspector reserved for the settings that have no natural
	 * on-canvas representation.
	 *
	 * Whatever the mode, the hidden textarea below is what actually submits, so
	 * the surrounding <form> never needs to know any of this exists.
	 */
	import type { Snippet } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import MediaPicker from '$lib/components/app/media/MediaPicker.svelte';
	import BlockCanvas from './BlockCanvas.svelte';
	import BlockFields from './BlockFields.svelte';
	import {
		BLOCK_CATEGORIES,
		BLOCK_TYPE_LABELS,
		INSPECTOR_FIRST_TYPES,
		PAGE_BUILDER_PATTERNS,
		PAGE_BUILDER_RICH_TYPES,
		blocksToMarkdown,
		createBlock,
		createPatternBlocks,
		duplicateBlock,
		markdownToBlocks,
		type Block,
		type BlockType,
		type PageBuilderPatternId
	} from '$lib/editor/blocks';
	import {
		applyInlineFormat,
		applyInlineLink,
		firstEditableIn,
		focusEditable,
		selectionEditable
	} from '$lib/editor/inline';
	import { renderMarkdown } from '$lib/editor/render';
	import type { CmsForm, Media } from '$lib/types';
	import { cn } from '$lib/utils';

	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Copy from '@lucide/svelte/icons/copy';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import Search from '@lucide/svelte/icons/search';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import X from '@lucide/svelte/icons/x';
	import Link2 from '@lucide/svelte/icons/link-2';
	import Bold from '@lucide/svelte/icons/bold';
	import Italic from '@lucide/svelte/icons/italic';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import Minimize2 from '@lucide/svelte/icons/minimize-2';

	import Heading2 from '@lucide/svelte/icons/heading-2';
	import Pilcrow from '@lucide/svelte/icons/pilcrow';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Quote from '@lucide/svelte/icons/quote';
	import ListIcon from '@lucide/svelte/icons/list';
	import Code from '@lucide/svelte/icons/code';
	import Minus from '@lucide/svelte/icons/minus';
	import TableIcon from '@lucide/svelte/icons/table';
	import Columns2 from '@lucide/svelte/icons/columns-2';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import MousePointerClick from '@lucide/svelte/icons/mouse-pointer-click';
	import Video from '@lucide/svelte/icons/video';
	import FileCode from '@lucide/svelte/icons/file-code';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import Images from '@lucide/svelte/icons/images';
	import Chart from '@lucide/svelte/icons/chart-no-axes-column-increasing';
	import CircleQuestion from '@lucide/svelte/icons/circle-question-mark';
	import MoveVertical from '@lucide/svelte/icons/move-vertical';
	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import PanelRight from '@lucide/svelte/icons/panel-right';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Tablet from '@lucide/svelte/icons/tablet';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import LayoutTemplate from '@lucide/svelte/icons/layout-template';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import Redo2 from '@lucide/svelte/icons/redo-2';

	let {
		value = $bindable(''),
		name,
		siteId,
		forms = [],
		enabled = false,
		formBuilderEnabled = false,
		backHref,
		backLabel = 'Kembali',
		documentLabel = 'Dokumen',
		documentHeader,
		documentPanel,
		actions,
		onTitleGenerated
	}: {
		value?: string;
		name: string;
		siteId: string;
		forms?: CmsForm[];
		enabled?: boolean;
		formBuilderEnabled?: boolean;
		backHref?: string;
		backLabel?: string;
		documentLabel?: string;
		/** Title/slug row, rendered at the top of the canvas like a real page. */
		documentHeader?: Snippet;
		/** Per-document settings for the inspector's first tab. */
		documentPanel?: Snippet;
		/** Save/publish/delete controls for the top bar. */
		actions?: Snippet;
		/** Called when "Buat dengan AI" also produced a title — the route owns that field, not this component. */
		onTitleGenerated?: (title: string) => void;
	} = $props();

	type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
	const PREVIEW_DEVICES: { id: PreviewDevice; label: string; icon: typeof Monitor; width: string }[] = [
		{ id: 'desktop', label: 'Desktop', icon: Monitor, width: '72rem' },
		{ id: 'tablet', label: 'Tablet', icon: Tablet, width: '48rem' },
		{ id: 'mobile', label: 'Mobile', icon: Smartphone, width: '25rem' }
	];

	const BLOCK_ICONS: Record<BlockType, typeof Heading2> = {
		heading: Heading2,
		paragraph: Pilcrow,
		image: ImageIcon,
		quote: Quote,
		list: ListIcon,
		code: Code,
		divider: Minus,
		table: TableIcon,
		columns: Columns2,
		button: MousePointerClick,
		embed: Video,
		calendar: CalendarIcon,
		html: FileCode,
		form: ClipboardList,
		hero: Sparkles,
		callout: Megaphone,
		cards: LayoutGrid,
		gallery: Images,
		stats: Chart,
		faq: CircleQuestion,
		spacer: MoveVertical
	};

	let mode = $state<'visual' | 'preview' | 'code'>('visual');
	let fullscreen = $state(false);
	let structureOpen = $state(false);
	let inspectorOpen = $state(true);
	let inspectorTab = $state<'document' | 'block'>('document');
	let previewDevice = $state<PreviewDevice>('desktop');
	let canvasEl = $state<HTMLElement | null>(null);

	const initialBlocks = value ? markdownToBlocks(value) : [createBlock('paragraph')];
	let blocks = $state<Block[]>(initialBlocks);
	let selectedId = $state<string | null>(initialBlocks[0]?.id ?? null);
	let pendingFocusId = $state<string | null>(null);

	const pageBuilderTypes = new Set<BlockType>(PAGE_BUILDER_RICH_TYPES);
	/** Block types whose primary content is prose the AI dialog can write straight into. */
	const AI_TEXT_TYPES = new Set<BlockType>(['heading', 'paragraph', 'quote', 'callout', 'code', 'list']);
	let history = $state<string[]>([JSON.stringify(initialBlocks)]);
	let historyIndex = $state(0);
	let historyTimer: ReturnType<typeof setTimeout> | undefined;

	/** Routes without a document panel only ever have the Block tab to show. */
	const activeTab = $derived(inspectorTab === 'document' && documentPanel ? 'document' : 'block');
	const markdown = $derived(mode === 'visual' ? blocksToMarkdown(blocks) : value);
	const selectedBlock = $derived(blocks.find((block) => block.id === selectedId) ?? null);
	const canvasWidth = $derived(PREVIEW_DEVICES.find((d) => d.id === previewDevice)?.width ?? '72rem');
	const wordCount = $derived.by(() => {
		const plain = markdown
			.replace(/<!--[\s\S]*?-->/g, ' ')
			.replace(/<[^>]+>/g, ' ')
			.replace(/[#>*_`|[\]()-]/g, ' ')
			.trim();
		return plain ? plain.split(/\s+/).length : 0;
	});

	// Keep the submitted value in sync while editing on the canvas.
	$effect(() => {
		if (mode === 'visual') value = blocksToMarkdown(blocks);
	});

	// Debounced snapshots keep typing fluid while still making structural and
	// inspector edits undoable. Restores reuse the saved block JSON, including ids.
	$effect(() => {
		if (mode !== 'visual') return;
		const snapshot = JSON.stringify(blocks);
		if (historyIndex >= 0 && history[historyIndex] === snapshot) return;
		clearTimeout(historyTimer);
		historyTimer = setTimeout(() => {
			const next = [...history.slice(0, historyIndex + 1), snapshot].slice(-50);
			history = next;
			historyIndex = next.length - 1;
		}, historyIndex < 0 ? 0 : 300);
		return () => clearTimeout(historyTimer);
	});

	// Newly created/merged blocks take the caret, so typing never stops.
	$effect(() => {
		if (!pendingFocusId) return;
		const wrapper = canvasEl?.querySelector(`[data-block-id="${pendingFocusId}"]`);
		focusEditable(firstEditableIn(wrapper));
		pendingFocusId = null;
	});

	$effect(() => {
		if (!fullscreen) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	function restoreHistory(index: number) {
		if (index < 0 || index >= history.length) return;
		blocks = JSON.parse(history[index]) as Block[];
		historyIndex = index;
		selectedId = blocks.some((block) => block.id === selectedId) ? selectedId : blocks[0]?.id ?? null;
	}

	function onWindowKeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		const typing = target?.matches('input, textarea, select, [contenteditable]') ?? false;

		if (event.key === 'Escape' && fullscreen && !typing) {
			fullscreen = false;
			return;
		}
		if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
			event.preventDefault();
			fullscreen = !fullscreen;
			return;
		}
		// Inside a contenteditable the browser's own undo stack is the better
		// one — it restores the caret too. Block-level history takes over
		// everywhere else on the canvas.
		if (mode !== 'visual' || typing || (!event.ctrlKey && !event.metaKey) || event.key.toLowerCase() !== 'z') return;
		event.preventDefault();
		restoreHistory(historyIndex + (event.shiftKey ? 1 : -1));
	}

	function preventPreviewNavigation(event: MouseEvent) {
		const target = event.target;
		if (target instanceof Element && target.closest('a')) event.preventDefault();
	}

	function switchToVisual() {
		blocks = value ? markdownToBlocks(value) : [createBlock('paragraph')];
		selectedId = blocks[0]?.id ?? null;
		mode = 'visual';
	}

	function selectBlock(id: string) {
		selectedId = id;
		if (inspectorOpen) inspectorTab = 'block';
	}

	/* ---------------- block operations ---------------- */

	function indexOf(id: string | null): number {
		return blocks.findIndex((block) => block.id === id);
	}

	function insertBlock(type: BlockType, index: number | null = null, replaceId: string | null = null) {
		const block = createBlock(type);
		let at = index ?? blocks.length;
		if (replaceId) {
			const replaceAt = indexOf(replaceId);
			if (replaceAt >= 0) {
				blocks = [...blocks.slice(0, replaceAt), block, ...blocks.slice(replaceAt + 1)];
				selectedId = block.id;
				afterInsert(block);
				return;
			}
			at = blocks.length;
		}
		blocks = [...blocks.slice(0, at), block, ...blocks.slice(at)];
		selectedId = block.id;
		afterInsert(block);
	}

	/** Blocks with nothing to type into send the author straight to the inspector. */
	function afterInsert(block: Block) {
		if (INSPECTOR_FIRST_TYPES.includes(block.type)) {
			inspectorOpen = true;
			inspectorTab = 'block';
		}
		pendingFocusId = block.id;
	}

	function removeBlock(id: string, focusPrevious = false) {
		const at = indexOf(id);
		if (at < 0) return;
		const previous = blocks[at - 1] ?? blocks[at + 1] ?? null;
		blocks = blocks.length > 1 ? blocks.filter((block) => block.id !== id) : [createBlock('paragraph')];
		const next = previous && blocks.some((block) => block.id === previous.id) ? previous.id : blocks[0]?.id ?? null;
		selectedId = next;
		if (focusPrevious) pendingFocusId = next;
	}

	function duplicate(index: number) {
		const copy = duplicateBlock(blocks[index]);
		blocks = [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)];
		selectedId = copy.id;
	}

	function moveBlock(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= blocks.length) return;
		const copy = [...blocks];
		[copy[index], copy[target]] = [copy[target], copy[index]];
		blocks = copy;
	}

	/** Enter at the end of a block continues writing in a fresh paragraph. */
	function appendParagraph(afterId: string) {
		const at = indexOf(afterId);
		insertBlock('paragraph', at < 0 ? null : at + 1);
	}

	function onBlockEmptyBackspace(id: string) {
		if (blocks.length <= 1) return;
		removeBlock(id, true);
	}

	/* ---------------- drag to reorder ---------------- */

	let dragIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let handleArmedId = $state<string | null>(null);

	const dropsAfter = $derived(dragIndex !== null && dragOverIndex !== null && dragOverIndex > dragIndex);

	function onDrop(index: number) {
		if (dragIndex === null || dragIndex === index) return;
		const copy = [...blocks];
		const [moved] = copy.splice(dragIndex, 1);
		copy.splice(index, 0, moved);
		blocks = copy;
		dragIndex = null;
		dragOverIndex = null;
	}

	/* ---------------- media picker ---------------- */

	let pickerOpen = $state(false);
	let pickerBlockId = $state<string | null>(null);
	let pickerTarget = $state('block');

	function onPickImage(blockId: string, target = 'block') {
		pickerBlockId = blockId;
		pickerTarget = target;
		pickerOpen = true;
	}

	function onImageSelected(media: Media) {
		blocks = blocks.map((block) => {
			if (block.id !== pickerBlockId) return block;
			if (pickerTarget === 'hero') {
				return { ...block, imageUrl: media.url, imageAlt: media.altText ?? block.imageAlt };
			}
			if (pickerTarget.startsWith('card:')) {
				const itemId = pickerTarget.slice('card:'.length);
				return {
					...block,
					cards: block.cards.map((item) =>
						item.id === itemId
							? { ...item, imageUrl: media.url, imageAlt: media.altText ?? item.imageAlt }
							: item
					)
				};
			}
			if (pickerTarget.startsWith('gallery:')) {
				const itemId = pickerTarget.slice('gallery:'.length);
				return {
					...block,
					gallery: block.gallery.map((item) =>
						item.id === itemId ? { ...item, url: media.url, alt: media.altText ?? item.alt } : item
					)
				};
			}
			return { ...block, url: media.url, alt: media.altText ?? block.alt };
		});
	}

	/* ---------------- AI prompt ---------------- */

	let aiOpen = $state(false);
	let aiPrompt = $state('');
	let aiLoading = $state(false);
	let aiError = $state<string | null>(null);

	function openAiDialog() {
		aiPrompt = '';
		aiError = null;
		aiOpen = true;
	}

	/**
	 * Parses the AI's Markdown reply into as many blocks as its structure calls
	 * for (one per paragraph, a single list block for a bullet/numbered run,
	 * one per heading...) via the same parser Code mode uses, so "3 paragraf"
	 * becomes 3 paragraph blocks and a list becomes one list block, not prose
	 * mashed into a single block.
	 */
	function insertAiText(markdown: string) {
		const newBlocks = markdownToBlocks(markdown);
		const target = selectedBlock;
		if (target && AI_TEXT_TYPES.has(target.type)) {
			const at = indexOf(target.id);
			blocks = [...blocks.slice(0, at), ...newBlocks, ...blocks.slice(at + 1)];
		} else {
			const at = target ? indexOf(target.id) + 1 : blocks.length;
			blocks = [...blocks.slice(0, at), ...newBlocks, ...blocks.slice(at)];
		}
		selectedId = newBlocks[0]?.id ?? selectedId;
	}

	async function generateWithAi() {
		const prompt = aiPrompt.trim();
		if (!prompt || aiLoading) return;
		aiLoading = true;
		aiError = null;
		try {
			const response = await fetch(`/sites/${siteId}/ai/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt })
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) {
				aiError = payload?.message ?? 'Gagal membuat konten. Coba lagi.';
				return;
			}
			insertAiText(payload.text as string);
			if (payload.title) onTitleGenerated?.(payload.title as string);
			aiOpen = false;
		} catch {
			aiError = 'Tidak bisa terhubung ke server.';
		} finally {
			aiLoading = false;
		}
	}

	/* ---------------- inserter ---------------- */

	let inserterOpen = $state(false);
	let inserterIndex = $state<number | null>(null);
	let inserterReplaceId = $state<string | null>(null);
	let inserterQuery = $state('');

	function openInserter(index: number | null, replaceId: string | null = null) {
		inserterIndex = index;
		inserterReplaceId = replaceId;
		inserterQuery = '';
		inserterOpen = true;
	}

	/** "/" in an empty paragraph swaps that paragraph for whatever gets picked. */
	function onSlash(blockId: string) {
		openInserter(indexOf(blockId), blockId);
	}

	function chooseBlock(type: BlockType) {
		if ((!enabled && pageBuilderTypes.has(type)) || (!formBuilderEnabled && type === 'form')) return;
		inserterOpen = false;
		insertBlock(type, inserterIndex, inserterReplaceId);
	}

	function choosePattern(patternId: PageBuilderPatternId) {
		if (!enabled) return;
		const patternBlocks = createPatternBlocks(patternId);
		const replaceAt = inserterReplaceId ? indexOf(inserterReplaceId) : -1;
		if (replaceAt >= 0) {
			blocks = [...blocks.slice(0, replaceAt), ...patternBlocks, ...blocks.slice(replaceAt + 1)];
		} else {
			const at = inserterIndex ?? blocks.length;
			blocks = [...blocks.slice(0, at), ...patternBlocks, ...blocks.slice(at)];
		}
		selectedId = patternBlocks[0]?.id ?? null;
		inserterOpen = false;
	}

	const filteredCategories = $derived(
		BLOCK_CATEGORIES.map((category) => ({
			label: category.label,
			types: category.types.filter((type) => {
				if (!enabled && pageBuilderTypes.has(type)) return false;
				if (!formBuilderEnabled && type === 'form') return false;
				return BLOCK_TYPE_LABELS[type].toLowerCase().includes(inserterQuery.trim().toLowerCase());
			})
		})).filter((category) => category.types.length > 0)
	);
	const filteredPatterns = $derived(
		enabled
			? PAGE_BUILDER_PATTERNS.filter((pattern) => {
					const query = inserterQuery.trim().toLowerCase();
					return !query || `${pattern.name} ${pattern.description}`.toLowerCase().includes(query);
				})
			: []
	);

	/* ---------------- inline format toolbar ---------------- */

	// Content is stored as Markdown, so "bold" wraps the selection in ** rather
	// than producing markup the storage layer would have to strip again.
	let formatBar = $state<{ top: number; left: number } | null>(null);
	let linkOpen = $state(false);
	let linkUrl = $state('');
	let savedRange: Range | null = null;
	let savedEditable: HTMLElement | null = null;

	function onSelectionChange() {
		if (mode !== 'visual' || linkOpen) return;
		const host = selectionEditable();
		if (!host || !canvasEl?.contains(host)) {
			formatBar = null;
			return;
		}
		const selection = window.getSelection();
		const rect = selection?.getRangeAt(0).getBoundingClientRect();
		if (!rect || (rect.width === 0 && rect.height === 0)) {
			formatBar = null;
			return;
		}
		savedRange = selection!.getRangeAt(0).cloneRange();
		savedEditable = host;
		formatBar = { top: rect.top - 8, left: rect.left + rect.width / 2 };
	}

	/** Focusing the link input drops the selection; put it back before writing. */
	function restoreSelection() {
		if (!savedRange || !savedEditable) return false;
		savedEditable.focus();
		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(savedRange);
		return true;
	}

	function format(kind: 'bold' | 'italic' | 'code') {
		if (!restoreSelection()) return;
		applyInlineFormat(kind);
		formatBar = null;
	}

	function submitLink() {
		if (restoreSelection()) applyInlineLink(linkUrl.trim());
		linkOpen = false;
		linkUrl = '';
		formatBar = null;
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />
<svelte:document onselectionchange={onSelectionChange} />

<!-- What actually submits with the form, whichever mode is active. -->
<textarea {name} value={markdown} class="hidden" readonly tabindex="-1"></textarea>

<div
	class={cn(
		'flex flex-col overflow-hidden border border-border bg-muted/40',
		fullscreen
			? 'fixed inset-0 z-50 h-dvh rounded-none'
			: 'h-[calc(100dvh-7rem)] min-h-144 rounded-xl shadow-sm'
	)}
>
	<!-- ------------------------------------------------------------ top bar -->
	<header class="flex flex-wrap items-center gap-2 border-b border-border bg-background px-2 py-2">
		{#if backHref}
			<Button type="button" variant="ghost" size="sm" href={backHref}>
				<ArrowLeft class="size-4" />
				<span class="hidden sm:inline">{backLabel}</span>
			</Button>
			<span class="mx-0.5 hidden h-5 w-px bg-border sm:block"></span>
		{/if}

		<Button type="button" size="sm" onclick={() => openInserter(null)} disabled={mode !== 'visual'}>
			<Plus class="size-4" /> <span class="hidden sm:inline">Blok</span>
		</Button>

		<Button type="button" size="sm" variant="outline" onclick={openAiDialog} disabled={mode !== 'visual'}>
			<Sparkles class="size-4" /> <span class="hidden sm:inline">Buat dengan AI</span>
		</Button>

		<div class="flex rounded-md border border-border p-0.5">
			<button
				type="button"
				class="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
				disabled={mode !== 'visual' || historyIndex <= 0}
				onclick={() => restoreHistory(historyIndex - 1)}
				title="Urungkan (Ctrl/Cmd+Z)"
				aria-label="Urungkan"
			>
				<Undo2 class="size-4" />
			</button>
			<button
				type="button"
				class="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
				disabled={mode !== 'visual' || historyIndex >= history.length - 1}
				onclick={() => restoreHistory(historyIndex + 1)}
				title="Ulangi (Ctrl/Cmd+Shift+Z)"
				aria-label="Ulangi"
			>
				<Redo2 class="size-4" />
			</button>
		</div>

		<button
			type="button"
			class={cn(
				'rounded-md border p-1.5 transition-colors',
				structureOpen ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
			)}
			onclick={() => (structureOpen = !structureOpen)}
			title="Struktur dokumen"
			aria-label="Struktur dokumen"
		>
			<PanelLeft class="size-4" />
		</button>

		<div class="mx-auto flex items-center gap-2">
			<div class="flex rounded-md bg-muted p-0.5 text-sm">
				{#each [{ id: 'visual', label: 'Visual' }, { id: 'preview', label: 'Pratinjau' }, { id: 'code', label: 'Kode' }] as tab (tab.id)}
					<button
						type="button"
						class={cn(
							'rounded px-3 py-1 font-medium transition-colors',
							mode === tab.id ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
						)}
						onclick={() => (tab.id === 'visual' ? switchToVisual() : (mode = tab.id as typeof mode))}
					>
						{tab.label}
					</button>
				{/each}
			</div>

			{#if mode !== 'code'}
				<div class="hidden rounded-md border border-border p-0.5 sm:flex" aria-label="Lebar pratinjau">
					{#each PREVIEW_DEVICES as device (device.id)}
						{@const DeviceIcon = device.icon}
						<button
							type="button"
							class={cn(
								'rounded p-1.5 text-muted-foreground hover:bg-muted',
								previewDevice === device.id && 'bg-muted text-primary'
							)}
							onclick={() => (previewDevice = device.id)}
							title={device.label}
							aria-label={device.label}
						>
							<DeviceIcon class="size-4" />
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<span class="hidden text-xs text-muted-foreground lg:inline">{blocks.length} blok · {wordCount} kata</span>

		<button
			type="button"
			class="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted"
			onclick={() => (fullscreen = !fullscreen)}
			title={fullscreen ? 'Keluar layar penuh (Esc)' : 'Layar penuh (Ctrl/Cmd+Shift+F)'}
			aria-label={fullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
		>
			{#if fullscreen}<Minimize2 class="size-4" />{:else}<Maximize2 class="size-4" />{/if}
		</button>

		<button
			type="button"
			class={cn(
				'rounded-md border p-1.5 transition-colors',
				inspectorOpen ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
			)}
			onclick={() => (inspectorOpen = !inspectorOpen)}
			title="Pengaturan"
			aria-label="Pengaturan"
		>
			<PanelRight class="size-4" />
		</button>

		{#if actions}
			<span class="mx-0.5 hidden h-5 w-px bg-border sm:block"></span>
			{@render actions()}
		{/if}
	</header>

	<div class="relative flex min-h-0 flex-1">
		<!-- --------------------------------------------------------- structure -->
		{#if structureOpen}
			<aside
				class="w-56 shrink-0 overflow-y-auto border-r border-border bg-background p-2 max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:shadow-xl"
			>
				<div class="mb-2 flex items-center justify-between px-2 py-1">
					<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Struktur</p>
					<span class="text-[11px] text-muted-foreground">{blocks.length}</span>
				</div>
				<div class="space-y-0.5">
					{#each blocks as outlineBlock, outlineIndex (outlineBlock.id)}
						{@const OutlineIcon = BLOCK_ICONS[outlineBlock.type]}
						<button
							type="button"
							class={cn(
								'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-muted',
								selectedId === outlineBlock.id && 'bg-primary/10 text-primary'
							)}
							onclick={() => {
								selectBlock(outlineBlock.id);
								canvasEl
									?.querySelector(`[data-block-id="${outlineBlock.id}"]`)
									?.scrollIntoView({ block: 'center', behavior: 'smooth' });
							}}
						>
							<OutlineIcon class="size-3.5 shrink-0" />
							<span class="min-w-0 flex-1 truncate">
								{outlineBlock.text || outlineBlock.formTitle || BLOCK_TYPE_LABELS[outlineBlock.type]}
							</span>
							<span class="text-[10px] text-muted-foreground">{outlineIndex + 1}</span>
						</button>
					{/each}
				</div>
			</aside>
		{/if}

		<!-- ------------------------------------------------------------ canvas -->
		<div class="min-w-0 flex-1 overflow-y-auto px-3 py-6 sm:px-6" bind:this={canvasEl}>
			<div
				class="mx-auto w-full rounded-xl border border-border bg-background px-5 py-8 shadow-sm transition-[max-width] duration-200 sm:px-10 sm:py-12"
				style="max-width: {canvasWidth}"
			>
				{#if documentHeader}
					<div class="mb-8 border-b border-dashed border-border pb-6">
						{@render documentHeader()}
					</div>
				{/if}

				{#if !enabled && mode === 'visual'}
					<div class="mb-6 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-sm">
						<p class="font-semibold text-foreground">Page Builder belum aktif</p>
						<p class="mt-1 text-muted-foreground">
							Editor blok inti tetap tersedia. Aktifkan plugin Page Builder untuk membuka Hero, Cards,
							Gallery, Statistik, FAQ, Spacer, dan pola halaman siap pakai.
						</p>
						<a href="/sites/{siteId}/plugins" class="mt-2 inline-flex font-medium text-primary hover:underline">
							Kelola plugin
						</a>
					</div>
				{/if}

				{#if mode === 'code'}
					<Textarea bind:value rows={24} class="font-mono text-sm" placeholder="Tulis konten dalam Markdown..." />
				{:else if mode === 'preview'}
					<!-- Links are inert in the editor so a stray click cannot navigate
					     away with unsaved changes. -->
					<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
					<div class="cms-content" onclick={preventPreviewNavigation}>
						{@html renderMarkdown(markdown) || '<p>Belum ada konten.</p>'}
					</div>
				{:else}
					<div class="cms-content">
						{#each blocks as block, index (block.id)}
							{@const Icon = BLOCK_ICONS[block.type]}
							<!-- Click-to-select is a pointer shortcut; every action it implies is
							     also on the block toolbar and the structure panel, so the wrapper
							     itself stays out of the accessibility tree. -->
							<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -->
							<div
								role="group"
								data-block-id={block.id}
								draggable={handleArmedId === block.id}
								ondragstart={() => (dragIndex = index)}
								ondragover={(event: DragEvent) => {
									event.preventDefault();
									dragOverIndex = index;
								}}
								ondragleave={() => (dragOverIndex = null)}
								ondrop={(event: DragEvent) => {
									event.preventDefault();
									onDrop(index);
								}}
								ondragend={() => {
									dragIndex = null;
									dragOverIndex = null;
									handleArmedId = null;
								}}
								onpointerdown={() => selectBlock(block.id)}
								onfocusin={() => selectBlock(block.id)}
								class={cn(
									'cms-block my-6',
									selectedId === block.id && 'is-selected',
									dragIndex === index && 'is-dragging',
									dragOverIndex === index && dragIndex !== index && (dropsAfter ? 'is-drop-after' : 'is-drop-before')
								)}
							>
								{#if selectedId === block.id}
									<div class="absolute -top-3.5 left-0 z-10 flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5 shadow-sm">
										<button
											type="button"
											class="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted"
											onpointerdown={() => (handleArmedId = block.id)}
											onpointerup={() => (handleArmedId = null)}
											title="Seret untuk memindahkan"
											aria-label="Seret untuk memindahkan"
										>
											<GripVertical class="size-3.5" />
										</button>
										<span class="flex items-center gap-1 pr-1 text-[11px] font-medium text-muted-foreground">
											<Icon class="size-3.5" />
											{BLOCK_TYPE_LABELS[block.type]}
										</span>
										<button
											type="button"
											class="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
											disabled={index === 0}
											onclick={() => moveBlock(index, -1)}
											title="Pindah ke atas"
											aria-label="Pindah ke atas"
										>
											<ArrowUp class="size-3.5" />
										</button>
										<button
											type="button"
											class="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
											disabled={index === blocks.length - 1}
											onclick={() => moveBlock(index, 1)}
											title="Pindah ke bawah"
											aria-label="Pindah ke bawah"
										>
											<ArrowDown class="size-3.5" />
										</button>
										<button
											type="button"
											class="rounded p-1 text-muted-foreground hover:bg-muted"
											onclick={() => duplicate(index)}
											title="Duplikat blok"
											aria-label="Duplikat blok"
										>
											<Copy class="size-3.5" />
										</button>
										<button
											type="button"
											class="rounded p-1 text-muted-foreground hover:bg-muted"
											onclick={() => {
												inspectorOpen = true;
												inspectorTab = 'block';
											}}
											title="Pengaturan blok"
											aria-label="Pengaturan blok"
										>
											<Settings2 class="size-3.5" />
										</button>
										<button
											type="button"
											class="rounded p-1 text-destructive hover:bg-destructive/10"
											onclick={() => removeBlock(block.id)}
											title="Hapus blok"
											aria-label="Hapus blok"
										>
											<Trash2 class="size-3.5" />
										</button>
									</div>
								{/if}

								<BlockCanvas
									{block}
									{forms}
									{onPickImage}
									onOpenSettings={() => {
										inspectorOpen = true;
										inspectorTab = 'block';
									}}
									onEnter={appendParagraph}
									onEmptyBackspace={onBlockEmptyBackspace}
									{onSlash}
								/>
							</div>

							<!-- Insert-between affordance, revealed on hover like Gutenberg's. -->
							<div class="group/gap relative h-3">
								<button
									type="button"
									class="absolute left-1/2 top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow transition-opacity group-hover/gap:opacity-100 focus-visible:opacity-100"
									onclick={() => openInserter(index + 1)}
									title="Sisipkan blok di sini"
									aria-label="Sisipkan blok di sini"
								>
									<Plus class="size-3.5" />
								</button>
							</div>
						{/each}

						<button
							type="button"
							class="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
							onclick={() => openInserter(null)}
						>
							<Plus class="size-4" /> Tambah blok
						</button>
					</div>
				{/if}
			</div>
		</div>

		<!--
			Inspector — always mounted, only ever hidden.

			The document panel holds the route's real form fields (status,
			taxonomies, excerpt…). Unmounting it on a tab switch or a panel close
			would drop those fields from the form, and the next save would submit
			the document as if the author had cleared every one of them.
		-->
		<aside
			class={cn(
				'w-80 shrink-0 flex-col overflow-hidden border-l border-border bg-background',
				'max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:shadow-xl',
				inspectorOpen ? 'flex' : 'hidden'
			)}
		>
			<div class="flex items-center gap-1 border-b border-border px-2 py-1.5">
				{#if documentPanel}
					<button
						type="button"
						class={cn(
							'flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors',
							activeTab === 'document' ? 'bg-muted text-primary' : 'text-muted-foreground hover:bg-muted/60'
						)}
						onclick={() => (inspectorTab = 'document')}
					>
						{documentLabel}
					</button>
				{/if}
				<button
					type="button"
					class={cn(
						'flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors',
						activeTab === 'block' ? 'bg-muted text-primary' : 'text-muted-foreground hover:bg-muted/60'
					)}
					onclick={() => (inspectorTab = 'block')}
				>
					Blok
				</button>
				<button
					type="button"
					class="rounded p-1.5 text-muted-foreground hover:bg-muted"
					onclick={() => (inspectorOpen = false)}
					title="Tutup panel"
					aria-label="Tutup panel"
				>
					<X class="size-4" />
				</button>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto p-4">
				{#if documentPanel}
					<div class={activeTab === 'document' ? undefined : 'hidden'}>
						{@render documentPanel()}
					</div>
				{/if}
				{#if activeTab === 'block'}
					{#if selectedBlock}
						<p class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							{BLOCK_TYPE_LABELS[selectedBlock.type]}
						</p>
						<BlockFields block={selectedBlock} {onPickImage} {forms} />
					{:else}
						<p class="text-sm text-muted-foreground">Pilih sebuah blok untuk melihat pengaturannya.</p>
					{/if}
				{/if}
			</div>
		</aside>
	</div>
</div>

<!-- ------------------------------------------------- inline format toolbar -->
{#if formatBar && mode === 'visual'}
	<!-- Mousedown is swallowed so the text selection this toolbar acts on survives the click. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed z-60 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-md border border-border bg-background p-0.5 shadow-md"
		style="top: {formatBar.top}px; left: {formatBar.left}px"
		onmousedown={(event) => event.preventDefault()}
	>
		{#if linkOpen}
			<Input
				bind:value={linkUrl}
				placeholder="https://…"
				class="h-7 w-52 text-xs"
				autofocus
				onkeydown={(event: KeyboardEvent) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						submitLink();
					}
					if (event.key === 'Escape') linkOpen = false;
				}}
			/>
			<button type="button" class="rounded px-2 py-1 text-xs font-medium text-primary" onclick={submitLink}>
				Terapkan
			</button>
		{:else}
			<button type="button" class="rounded p-1.5 hover:bg-muted" onclick={() => format('bold')} title="Tebal" aria-label="Tebal">
				<Bold class="size-3.5" />
			</button>
			<button type="button" class="rounded p-1.5 hover:bg-muted" onclick={() => format('italic')} title="Miring" aria-label="Miring">
				<Italic class="size-3.5" />
			</button>
			<button type="button" class="rounded p-1.5 hover:bg-muted" onclick={() => format('code')} title="Kode" aria-label="Kode">
				<Code class="size-3.5" />
			</button>
			<button
				type="button"
				class="rounded p-1.5 hover:bg-muted"
				onclick={() => {
					linkUrl = '';
					linkOpen = true;
				}}
				title="Tautan"
				aria-label="Tautan"
			>
				<Link2 class="size-3.5" />
			</button>
		{/if}
	</div>
{/if}

<!-- ------------------------------------------------------------- inserter -->
<Dialog.Root bind:open={inserterOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Tambah Blok</Dialog.Title>
		</Dialog.Header>

		<div class="relative">
			<Search class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input bind:value={inserterQuery} placeholder="Cari blok atau pola..." class="pl-8" />
		</div>

		<div class="space-y-4">
			{#if filteredPatterns.length > 0}
				<div class="space-y-2">
					<p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						<LayoutTemplate class="size-3.5" /> Pola siap pakai
					</p>
					<div class="grid gap-2 sm:grid-cols-3">
						{#each filteredPatterns as pattern (pattern.id)}
							<button
								type="button"
								class="rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
								onclick={() => choosePattern(pattern.id)}
							>
								<span class="text-sm font-semibold">{pattern.name}</span>
								<span class="mt-1 block text-xs leading-relaxed text-muted-foreground">{pattern.description}</span>
								<span class="mt-2 block text-[11px] font-medium text-primary">{pattern.blockCount} blok</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
			{#if filteredCategories.length > 0}
				{#each filteredCategories as category (category.label)}
					<div class="space-y-2">
						<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category.label}</p>
						<div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
							{#each category.types as type (type)}
								{@const OptionIcon = BLOCK_ICONS[type]}
								<button
									type="button"
									class="flex flex-col items-center gap-1.5 rounded-md border border-border p-3 text-center transition-colors hover:border-primary hover:bg-primary/5"
									onclick={() => chooseBlock(type)}
								>
									<OptionIcon class="size-5 text-muted-foreground" />
									<span class="text-xs font-medium">{BLOCK_TYPE_LABELS[type]}</span>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			{:else if filteredPatterns.length === 0}
				<p class="py-6 text-center text-sm text-muted-foreground">Tidak ada blok yang cocok.</p>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>

<!-- --------------------------------------------------------- AI prompt -->
<Dialog.Root bind:open={aiOpen}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Buat konten dengan AI</Dialog.Title>
		</Dialog.Header>

		<div class="space-y-3">
			<p class="text-sm text-muted-foreground">
				Tulis instruksi untuk AI. Judul akan terisi otomatis, dan isinya dipecah jadi beberapa
				blok sesuai strukturnya (mis. 3 paragraf jadi 3 blok, daftar jadi blok daftar), lalu
				{selectedBlock && AI_TEXT_TYPES.has(selectedBlock.type)
					? 'menggantikan blok yang sedang dipilih'
					: 'ditambahkan setelah blok yang sedang dipilih'}.
			</p>
			<Textarea
				bind:value={aiPrompt}
				rows={5}
				placeholder="Contoh: Tulis paragraf pembuka berita tentang wisuda periode Agustus 2026..."
				disabled={aiLoading}
				autofocus
				onkeydown={(event: KeyboardEvent) => {
					if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
						event.preventDefault();
						generateWithAi();
					}
				}}
			/>
			{#if aiError}
				<p class="text-sm text-destructive">{aiError}</p>
			{/if}
		</div>

		<div class="flex justify-end gap-2 pt-2">
			<Button type="button" variant="ghost" onclick={() => (aiOpen = false)} disabled={aiLoading}>
				Batal
			</Button>
			<Button type="button" onclick={generateWithAi} disabled={aiLoading || !aiPrompt.trim()}>
				{aiLoading ? 'Membuat...' : 'Buat'}
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<MediaPicker {siteId} bind:open={pickerOpen} onSelect={onImageSelected} />
