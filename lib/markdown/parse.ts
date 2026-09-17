// Minimal markdown parser for the small subset our own system prompts
// produce (## / ### headings, "- " bullets, **bold**, plain paragraphs).
// Not a general-purpose parser — PLAN.md's stack (section 2) doesn't list a
// markdown library, and this subset is fully within our control since we
// write the prompts. Line-based, so it tolerates partial/streaming input.

export type MarkdownBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'paragraph'; text: string };

export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const h3 = /^###\s+(.*)$/.exec(line);
    if (h3) {
      blocks.push({ type: 'heading', level: 3, text: h3[1] });
      continue;
    }
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      blocks.push({ type: 'heading', level: 2, text: h2[1] });
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      blocks.push({ type: 'bullet', text: bullet[1] });
      continue;
    }
    blocks.push({ type: 'paragraph', text: line });
  }

  return blocks;
}

export interface InlineSegment {
  text: string;
  bold: boolean;
}

/** Splits "**bold**" spans out of inline text. A dangling unmatched "**" mid-stream is left as plain text until its closing pair arrives. */
export function parseInlineSegments(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false });
  }

  return segments;
}
