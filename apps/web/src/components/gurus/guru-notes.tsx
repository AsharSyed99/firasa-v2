'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';

const MAX_CHARS = 500;

export function GuruNotes({
  guruId,
  initialNotes,
}: {
  guruId: string;
  initialNotes?: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const save = useCallback(
    async (value: string) => {
      setSaving(true);
      setSaved(false);
      try {
        await api.updateGuruConfig(guruId, { notes: value });
        setSaved(true);
        timerRef.current = setTimeout(() => setSaved(false), 2000);
      } catch {
        // silent fail — user can retry on next blur
      } finally {
        setSaving(false);
      }
    },
    [guruId],
  );

  const handleBlur = useCallback(() => {
    const trimmed = notes.slice(0, MAX_CHARS);
    if (trimmed !== (initialNotes ?? '')) {
      save(trimmed);
    }
  }, [notes, initialNotes, save]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_CHARS) {
      setNotes(e.target.value);
    }
  };

  return (
    <div className="mt-2">
      <textarea
        value={notes}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Add personal notes..."
        rows={2}
        className="w-full resize-none rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:border-emerald-600 focus:outline-none"
      />
      <div className="flex items-center justify-between text-xs text-gray-500 mt-0.5">
        <span>
          {saving && 'Saving…'}
          {saved && '✓ Saved'}
        </span>
        <span className={notes.length >= MAX_CHARS ? 'text-red-400' : ''}>
          {notes.length}/{MAX_CHARS}
        </span>
      </div>
    </div>
  );
}
