'use client';

import { useEffect, useRef, useState } from 'react';

interface SpeakerLabelProps {
  label: string;
  onRename: (newLabel: string) => void;
}

/**
 * Clicking the name turns it into an inline text input (PLAN.md section 8).
 * Enter/blur commits, Escape cancels — no modal.
 */
export function SpeakerLabel({ label, onRename }: SpeakerLabelProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== label) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(label);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        aria-label="Speaker name"
        className="h-7 w-44 rounded-chip border border-accent bg-surface px-2 text-sm font-medium text-fg focus-visible:outline-offset-0"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(label);
        setEditing(true);
      }}
      className="-mx-2 rounded-chip px-2 py-0.5 text-sm font-medium text-fg transition-colors duration-150 ease-out hover:bg-sunken"
      title="Click to rename"
    >
      {label}
    </button>
  );
}
