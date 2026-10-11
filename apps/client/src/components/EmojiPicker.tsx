"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

const EMOJIS = [
  "😀", "😄", "😁", "😊", "🙂", "😉", "😍", "🥰",
  "😎", "🤔", "😅", "😂", "🙃", "😇", "🥳", "😴",
  "👍", "👎", "🙏", "👏", "🙌", "💪", "🤝", "👋",
  "🔥", "✨", "🎉", "💯", "✅", "❌", "⚠️", "💬",
  "❤️", "💙", "💚", "💛", "🧡", "💜", "😢", "😡",
];

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors"
        aria-label="Insert emoji"
      >
        <Smile size={16} />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-60 max-h-44 overflow-y-auto bg-white border border-zinc-200 rounded-xl shadow-lg p-2 grid grid-cols-8 gap-0.5 z-30">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onSelect(e);
                setOpen(false);
              }}
              className="text-lg leading-none p-1 rounded hover:bg-zinc-100 transition-colors"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
