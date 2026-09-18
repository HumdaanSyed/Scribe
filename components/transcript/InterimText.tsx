interface InterimTextProps {
  text?: string;
  /** Render as a trailing span within an existing paragraph instead of its own block. */
  inline?: boolean;
}

/** Muted, ephemeral in-progress text — replaced wholesale as new interim results arrive. */
export function InterimText({ text, inline }: InterimTextProps) {
  if (!text) return null;

  if (inline) {
    return <span className="text-fg-muted"> {text}</span>;
  }

  return <p className="text-base leading-7 text-fg-muted">{text}</p>;
}
