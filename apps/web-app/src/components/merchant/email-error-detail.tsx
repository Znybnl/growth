"use client";
import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function EmailErrorDetail({ message }: { message: string }) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressFocus = useRef(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [pinned, setPinned] = useState(false);
  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(320, window.innerWidth - 24);
    setPosition({ left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: Math.max(12, Math.min(rect.bottom + 6, window.innerHeight - 160)) });
  }
  function hide() {
    if (!pinned) closeTimer.current = setTimeout(() => setPosition(null), 150);
  }
  function close() { setPinned(false); setPosition(null); }
  return <>
    <button ref={button} type="button" aria-describedby={position ? id : undefined} aria-expanded={Boolean(position)}
      onMouseEnter={show} onMouseLeave={hide} onFocus={() => { if (suppressFocus.current) suppressFocus.current = false; else show(); }} onBlur={hide}
      onKeyDown={event => { if (event.key === "Escape") close(); }}
      onClick={() => { if (pinned) close(); else { show(); setPinned(true); } }}
      className="mt-1 block max-w-[140px] truncate text-left text-xs font-semibold text-[#a3320a] underline decoration-dotted focus-visible:outline-2 focus-visible:outline-offset-2">
      {message}
    </button>
    {position ? createPortal(<div id={id} role="tooltip" tabIndex={0} onFocus={() => { if (closeTimer.current) clearTimeout(closeTimer.current); }} onBlur={hide}
      onKeyDown={event => { if (event.key === "Escape") { close(); suppressFocus.current = true; button.current?.focus(); } }}
      onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current); }} onMouseLeave={hide}
      style={{ left: position.left, top: position.top, width: "min(320px, calc(100vw - 24px))" }}
      className="fixed z-[100] max-h-36 overflow-auto whitespace-pre-wrap break-words rounded border border-[#d7e0ed] bg-white p-3 text-xs leading-5 text-[#182033] shadow-lg">
      {message}
    </div>, document.body) : null}
  </>;
}
