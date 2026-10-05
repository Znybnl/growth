"use client";

import { useEffect, useRef, useState } from "react";

/** Isolate the actual email HTML from the application CSS; never execute scripts. */
export function RewardEmailPreviewFrame({ html }: { html: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1040);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    let observer: ResizeObserver | undefined;
    function measure() {
      const body = element?.contentDocument?.body;
      if (!body) return;
      observer?.disconnect();
      observer = new ResizeObserver(() => setHeight(Math.ceil(body.getBoundingClientRect().height)));
      observer.observe(body);
      setHeight(Math.ceil(body.getBoundingClientRect().height));
    }
    element.addEventListener("load", measure);
    measure();
    return () => {
      element.removeEventListener("load", measure);
      observer?.disconnect();
    };
  }, [html]);

  return (
    <iframe
      ref={frame}
      title="Aperçu de l’e-mail de gain"
      sandbox="allow-same-origin"
      srcDoc={`<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1" /><style>body{margin:0}a{pointer-events:none}</style></head><body>${html}</body></html>`}
      className="block w-full border-0"
      style={{ height }}
    />
  );
}
