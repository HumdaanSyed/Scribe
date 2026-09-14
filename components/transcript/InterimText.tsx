interface InterimTextProps {
  text?: string;
  /** Render as a trailing span within an existing paragraph instead of its own block. */
  inline?: boolean;
}

/** Muted, ephemeral in-progress text — replaced wholesale as new interim results arrive. */
export function InterimText({ text, inline }: InterimTextProps) {
  if (!text) return null;

  if (inline) {
    return <span className="italic text-gray-400"> {text}</span>;
  }

  return <p className="py-1 text-sm italic leading-relaxed text-gray-400">{text}</p>;
}
