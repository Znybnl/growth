"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { Gift } from "lucide-react";
import styles from "./landing-demo.module.css";

const size = 216;

export function DemoScratchCard({ onReveal }: { onReveal: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const revealButton = useRef<HTMLButtonElement>(null);
  const activePointer = useRef<number | null>(null);
  const revealed = useRef(false);

  useEffect(() => {
    revealButton.current?.focus({ preventScroll: true });
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const gradient = context.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#f1ddb0");
    gradient.addColorStop(.5, "#c8a76a");
    gradient.addColorStop(1, "#eed7a3");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    context.strokeStyle = "#ffffff38";
    context.lineWidth = 1;
    for (let x = -size; x < size * 2; x += 12) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x + size, size); context.stroke();
    }
    context.fillStyle = "#493922";
    context.font = "600 16px sans-serif";
    context.textAlign = "center";
    context.fillText("Grattez ici", size / 2, size / 2 + 5);
  }, []);

  function reveal() {
    if (revealed.current) return;
    revealed.current = true;
    onReveal();
  }

  function erase(event: PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    context.globalCompositeOperation = "destination-out";
    context.beginPath();
    context.arc((event.clientX - bounds.left) * size / bounds.width, (event.clientY - bounds.top) * size / bounds.height, 27, 0, Math.PI * 2);
    context.fill();
    const pixels = context.getImageData(0, 0, size, size).data;
    let cleared = 0;
    for (let i = 3; i < pixels.length; i += 16) if (pixels[i] < 128) cleared++;
    if (cleared / (pixels.length / 16) > .35) reveal();
  }

  return <div className={styles.scratchGame}>
    <div className={styles.scratchCard}>
      <Gift size={54} strokeWidth={1.2} aria-hidden="true" />
      <canvas ref={canvas} width={size} height={size} aria-hidden="true" data-testid="demo-scratch"
        onPointerDown={event => {
          if (event.button !== 0 || activePointer.current !== null) return;
          activePointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          erase(event);
        }} onPointerMove={erase} onPointerUp={event => { if (activePointer.current === event.pointerId) activePointer.current = null; }}
        onPointerCancel={event => { if (activePointer.current === event.pointerId) activePointer.current = null; }}
        onLostPointerCapture={event => { if (activePointer.current === event.pointerId) activePointer.current = null; }} />
    </div>
    <button ref={revealButton} type="button" className={styles.secondary} onClick={reveal}>Révéler le ticket</button>
  </div>;
}
