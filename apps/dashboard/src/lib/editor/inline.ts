/**
 * Inline (in-canvas) text editing primitives.
 *
 * Block content is stored as plain text inside Markdown, so the canvas edits
 * plain text too — `contenteditable` here is a text field that happens to be
 * styled like the published page, never a rich-text document. That keeps a
 * pasted Word document from smuggling markup into `bodyMarkdown`.
 *
 * The one genuinely delicate part is the state -> DOM sync. Writing
 * `textContent` on every keystroke would collapse the caret to the start of the
 * node, so `sync()` writes only while the node is NOT focused; whatever the
 * author types is already in the DOM, and the block state follows it, not the
 * other way around.
 */

export interface EditableOptions {
	/** Current value from block state. Written to the DOM only while unfocused. */
	value: string;
	/** Allows literal newlines. Without it, Enter and pasted breaks are dropped. */
	multiline?: boolean;
	placeholder?: string;
	disabled?: boolean;
	onInput: (value: string) => void;
	/**
	 * Enter leaves the field (new block, next list item…). Providing this is
	 * what makes Enter structural and demotes a soft line break to Shift+Enter,
	 * exactly as WordPress does; fields without it keep Enter as a plain break.
	 */
	onEnter?: () => void;
	/** Backspace with the caret at the start of an already-empty field. */
	onEmptyBackspace?: () => void;
	/** Typing "/" into an empty field — opens the block inserter, like Gutenberg. */
	onSlash?: () => void;
}

/** `innerText` folds `<br>` back to "\n"; `textContent` would silently join lines. */
function readValue(node: HTMLElement, multiline: boolean): string {
	if (!multiline) return (node.textContent ?? '').replace(/[\r\n]+/g, ' ');
	// Trailing newline is a rendering artefact of the final <br> browsers keep
	// in an editable region, not something the author typed.
	return (node.innerText ?? '').replace(/\n$/, '');
}

/** Drives the CSS placeholder — `:empty` misses the stray `<br>` browsers leave behind. */
function markEmpty(node: HTMLElement, value: string): void {
	node.classList.toggle('is-empty', value.trim().length === 0);
}

function writeValue(node: HTMLElement, value: string): void {
	if (readValue(node, true) !== value) node.textContent = value;
	markEmpty(node, value);
}

/**
 * Turns an element into a plain-text editable bound to `options.value`.
 *
 * `plaintext-only` is preferred because the browser then refuses to create
 * markup at all — no `execCommand('formatBlock')` surprises, no styled paste.
 * Browsers that reject the value fall back to `true` plus a paste interceptor.
 */
export function editable(node: HTMLElement, options: EditableOptions) {
	let current = options;

	function applyMode() {
		if (current.disabled) {
			node.removeAttribute('contenteditable');
			node.removeAttribute('tabindex');
			return;
		}
		try {
			node.contentEditable = 'plaintext-only';
		} catch {
			node.contentEditable = 'true';
		}
	}

	function applyPlaceholder() {
		if (current.placeholder) node.dataset.placeholder = current.placeholder;
		else delete node.dataset.placeholder;
	}

	function onInput() {
		const value = readValue(node, current.multiline ?? false);
		markEmpty(node, value);
		current.onInput(value);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			if (current.onEnter && !event.shiftKey) {
				event.preventDefault();
				current.onEnter();
			} else if (!current.multiline) {
				// A single-line field must never grow a second line, whichever
				// modifier produced the break.
				event.preventDefault();
			}
			return;
		}

		if (event.key === 'Backspace' && current.onEmptyBackspace) {
			if (readValue(node, current.multiline ?? false).length > 0) return;
			event.preventDefault();
			current.onEmptyBackspace();
			return;
		}

		if (event.key === '/' && current.onSlash && readValue(node, current.multiline ?? false).length === 0) {
			event.preventDefault();
			current.onSlash();
		}
	}

	function onPaste(event: ClipboardEvent) {
		// Only needed on the `true` fallback — `plaintext-only` already strips markup.
		if (node.contentEditable === 'plaintext-only') return;
		event.preventDefault();
		const text = event.clipboardData?.getData('text/plain') ?? '';
		document.execCommand('insertText', false, current.multiline ? text : text.replace(/[\r\n]+/g, ' '));
	}

	function onBlur() {
		// Re-assert the canonical value: the block may have normalised it.
		writeValue(node, current.value);
	}

	node.spellcheck = false;
	applyMode();
	applyPlaceholder();
	writeValue(node, options.value);

	node.addEventListener('input', onInput);
	node.addEventListener('keydown', onKeydown);
	node.addEventListener('paste', onPaste);
	node.addEventListener('blur', onBlur);

	return {
		update(next: EditableOptions) {
			const modeChanged = next.disabled !== current.disabled;
			const placeholderChanged = next.placeholder !== current.placeholder;
			current = next;
			if (modeChanged) applyMode();
			if (placeholderChanged) applyPlaceholder();
			if (document.activeElement !== node) writeValue(node, next.value);
		},
		destroy() {
			node.removeEventListener('input', onInput);
			node.removeEventListener('keydown', onKeydown);
			node.removeEventListener('paste', onPaste);
			node.removeEventListener('blur', onBlur);
		}
	};
}

/** Places the caret at the end of an editable and scrolls it into view. */
export function focusEditable(node: HTMLElement | null | undefined): void {
	if (!node) return;
	node.focus({ preventScroll: true });
	const selection = window.getSelection();
	if (!selection) return;
	const range = document.createRange();
	range.selectNodeContents(node);
	range.collapse(false);
	selection.removeAllRanges();
	selection.addRange(range);
	node.scrollIntoView({ block: 'nearest' });
}

/** First editable field inside a block wrapper, in document order. */
export function firstEditableIn(container: Element | null | undefined): HTMLElement | null {
	return container?.querySelector<HTMLElement>('[contenteditable]') ?? null;
}

export type InlineFormat = 'bold' | 'italic' | 'code';

const FORMAT_WRAPPERS: Record<InlineFormat, string> = {
	bold: '**',
	italic: '*',
	code: '`'
};

/**
 * Wraps the current selection in Markdown syntax.
 *
 * `execCommand('insertText')` is deprecated but remains the only API that edits
 * a contenteditable *through the browser's own undo stack* — a manual DOM write
 * would make Ctrl+Z inside a block silently do nothing. It also fires `input`,
 * so the block state updates through the normal path.
 */
export function applyInlineFormat(format: InlineFormat): boolean {
	const selection = window.getSelection();
	const selected = selection?.toString() ?? '';
	if (!selected) return false;
	const wrapper = FORMAT_WRAPPERS[format];
	return document.execCommand('insertText', false, `${wrapper}${selected}${wrapper}`);
}

export function applyInlineLink(url: string): boolean {
	const selection = window.getSelection();
	const selected = selection?.toString() ?? '';
	if (!selected || !url) return false;
	return document.execCommand('insertText', false, `[${selected}](${url})`);
}

/** The editable element the current selection lives in, if any. */
export function selectionEditable(): HTMLElement | null {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
	const anchor = selection.anchorNode;
	const element = anchor instanceof Element ? anchor : anchor?.parentElement;
	return element?.closest<HTMLElement>('[contenteditable]') ?? null;
}
