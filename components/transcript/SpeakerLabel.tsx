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
        className="rounded border border-indigo-300 bg-white px-1 py-0.5 text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
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
      className="rounded px-1 py-0.5 text-sm font-medium text-gray-900 hover:bg-gray-200"
      title="Click to rename"
    >
      {label}
    </button>
  );
}
