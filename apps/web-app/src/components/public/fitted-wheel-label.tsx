"use client";

import { useLayoutEffect, useRef, useState, type SVGProps } from "react";
import { fittedWheelLabelFontSize } from "@/lib/wheel-labels";

type Props = SVGProps<SVGTextElement> & {
  lines: string[];
  baseFontSize: number;
  lineHeight: number;
  initialOffset: number;
  radius: number;
  buttonRadius: number;
  outerRadius: number;
  sectorAngle: number;
};

export function FittedWheelLabel({ lines, baseFontSize, lineHeight, initialOffset,
  radius, buttonRadius, outerRadius, sectorAngle, ...props }: Props) {
  const ref = useRef<SVGTextElement>(null);
  const key = JSON.stringify([lines, baseFontSize, lineHeight, initialOffset, props.fontFamily, props.fontWeight, radius, buttonRadius, outerRadius, sectorAngle]);
  const [fit, setFit] = useState({ key, size: baseFontSize });
  const size = fit.key === key ? fit.size : baseFontSize;
  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      const text = ref.current;
      if (cancelled || !text?.isConnected) return;
      const bounds = text.getBBox();
      const currentSize = Number(text.getAttribute("font-size")) || baseFontSize;
      const normalization = baseFontSize / currentSize;
      const next = fittedWheelLabelFontSize(baseFontSize, bounds.width * normalization,
        bounds.height * normalization, radius, buttonRadius, outerRadius, sectorAngle);
      setFit(current => current.key === key && current.size === next ? current : { key, size: next });
    };
    measure();
    void document.fonts.ready.then(measure);
    document.fonts.addEventListener("loadingdone", measure);
    return () => { cancelled = true; document.fonts.removeEventListener("loadingdone", measure); };
  }, [key, baseFontSize, radius, buttonRadius, outerRadius, sectorAngle]);
  const scale = size / baseFontSize;
  return <text {...props} ref={ref} fontSize={size} data-wheel-label="true"
    data-base-font-size={baseFontSize} data-label-radius={radius}
    data-button-radius={buttonRadius} data-sector-angle={sectorAngle}>
    {lines.map((line, index) => <tspan key={`${index}-${line}`} x={props.x}
      dy={`${(index === 0 ? initialOffset : lineHeight) * scale}px`}>{line}</tspan>)}
  </text>;
}
