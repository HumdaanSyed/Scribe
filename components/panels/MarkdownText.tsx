import type { ReactNode } from 'react';
import { parseInlineSegments, parseMarkdownBlocks } from '@/lib/markdown/parse';

function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInlineSegments(text).map((seg, i) =>
        seg.bold ? <strong key={i}>{seg.text}</strong> : <span key={i}>{seg.text}</span>,
      )}
    </>
  );
}

/** Renders our own constrained markdown subset (see lib/markdown/parse.ts). */
export function MarkdownText({ markdown }: { markdown: string }) {
  const blocks = parseMarkdownBlocks(markdown);
  const elements: ReactNode[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = (key: string) => {
    if (bulletBuffer.length === 0) return;
    elements.push(
      <ul key={key} className="ml-4 list-disc space-y-1">
        {bulletBuffer.map((text, i) => (
          <li key={i} className="text-sm leading-relaxed text-gray-700">
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
      const className =
        block.level === 2
          ? 'mt-4 text-sm font-semibold text-gray-900 first:mt-0'
          : 'mt-3 text-sm font-medium text-gray-800';
      elements.push(
        block.level === 2 ? (
          <h3 key={i} className={className}>
            <InlineText text={block.text} />
          </h3>
        ) : (
          <h4 key={i} className={className}>
            <InlineText text={block.text} />
          </h4>
        ),
      );
    } else {
      elements.push(
        <p key={i} className="mt-1 text-sm leading-relaxed text-gray-700">
          <InlineText text={block.text} />
        </p>,
      );
    }
  });
  flushBullets('ul-end');

  return <div>{elements}</div>;
}
