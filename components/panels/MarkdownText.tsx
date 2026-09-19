import type { ReactNode } from 'react';
import { parseInlineSegments, parseMarkdownBlocks } from '@/lib/markdown/parse';

function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInlineSegments(text).map((seg, i) =>
        seg.bold ? (
          <strong key={i} className="font-semibold text-fg">
            {seg.text}
          </strong>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

/**
 * Renders our own constrained markdown subset (see lib/markdown/parse.ts).
 * Body color is inherited from the caller so it reads correctly both in the
 * notes panel and inside a chat bubble; headings and bold are always primary.
 */
export function MarkdownText({ markdown }: { markdown: string }) {
  const blocks = parseMarkdownBlocks(markdown);
  const elements: ReactNode[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = (key: string) => {
    if (bulletBuffer.length === 0) return;
    elements.push(
      <ul key={key} className="mt-1.5 ml-4 list-disc space-y-1 marker:text-fg-muted">
        {bulletBuffer.map((text, i) => (
          <li key={i} className="text-base leading-6">
            <InlineText text={text} />
          </li>
        ))}
      </ul>,
    );
    bulletBuffer = [];
  };

  blocks.forEach((block, i) => {
    if (block.type === 'bullet') {
      bulletBuffer.push(block.text);
      return;
    }
    flushBullets(`ul-${i}`);

    if (block.type === 'heading') {
      elements.push(
        block.level === 2 ? (
          <h3 key={i} className="mt-5 text-sm font-semibold text-fg first:mt-0">
            <InlineText text={block.text} />
          </h3>
        ) : (
          <h4 key={i} className="mt-4 text-sm font-medium text-fg first:mt-0">
            <InlineText text={block.text} />
          </h4>
        ),
      );
    } else {
      elements.push(
        <p key={i} className="mt-1.5 text-base leading-6 first:mt-0">
          <InlineText text={block.text} />
        </p>,
      );
    }
  });
  flushBullets('ul-end');

  return <div>{elements}</div>;
}
