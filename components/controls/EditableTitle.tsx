'use client';

import { useEffect, useRef, useState } from 'react';

interface EditableTitleProps {
  value: string;
  onCommit: (title: string) => void;
}

/** Click to rename inline — Enter/blur commits, Escape cancels (same pattern as speaker names). */
export function EditableTitle({ value, onCommit }: EditableTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    onCommit(draft);
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
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        aria-label="Meeting title"
        className="h-9 min-w-0 flex-1 rounded-control border border-accent bg-surface px-2 text-xl font-semibold text-fg focus-visible:outline-offset-0"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title="Click to rename"
      className="-mx-2 min-w-0 max-w-full truncate rounded-control px-2 py-1 text-left text-xl font-semibold text-fg transition-colors duration-150 ease-out hover:bg-sunken"
    >
      {value}
    </button>
  );
}
