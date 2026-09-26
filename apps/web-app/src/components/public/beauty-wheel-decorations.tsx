import { beautyWheelTheme, isBeautyWheelTemplate } from "@/lib/beauty-wheel-themes";
import type { GamePageTemplateId } from "@/lib/types";

/** Decorative-only artwork shared by the real game and its merchant preview. */
export function BeautyWheelDecorations({
  templateId,
  primaryColor,
}: {
  templateId: GamePageTemplateId;
  primaryColor: string;
}) {
  if (!isBeautyWheelTemplate(templateId) || templateId === "beauty-rose") return null;

  const primary = /^#[\da-f]{6}$/i.test(primaryColor)
    ? primaryColor
    : beautyWheelTheme(templateId)?.primary ?? "#8da480";

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
      focusable="false"
    >
      {templateId === "beauty-nude" ? (
        <g fill="none" stroke={primary} strokeLinecap="round">
          <ellipse cx="-20" cy="710" rx="150" ry="95" fill={primary} fillOpacity=".075" style={{ filter: "blur(28px)" }} stroke="none" />
          <path d="M250 -35 C358 26 399 110 390 206" opacity=".24" strokeWidth="1.5" />
          <path d="M276 -48 C374 12 421 96 410 184" opacity=".13" strokeWidth="1" />
          <path d="M298 -58 C390 0 435 76 427 158" opacity=".08" strokeWidth="1" />
          <path d="M15 685 C55 720 75 752 89 805" opacity=".14" strokeWidth="1" />
        </g>
      ) : null}

      {templateId === "beauty-botanical" ? (
        <g fill={primary} fillOpacity=".13" stroke={primary} strokeLinecap="round" strokeLinejoin="round">
          <path d="M-24 448 C20 385 66 381 96 402 C79 449 35 474 -24 448Z" strokeOpacity=".17" />
          <path d="M-13 495 C35 451 81 456 105 485 C78 525 34 536 -13 495Z" fillOpacity=".09" strokeOpacity=".15" />
          <path d="M-20 536 C28 512 70 526 88 558 C52 585 13 580 -20 536Z" fillOpacity=".11" strokeOpacity=".14" />
          <path d="M-24 456 C20 449 54 431 82 407" fill="none" strokeOpacity=".22" strokeWidth="1.4" />
          <path d="M-20 536 C21 517 59 502 92 484" fill="none" strokeOpacity=".18" strokeWidth="1.2" />
          <path d="M366 572 C337 630 340 694 394 759" fill="none" strokeOpacity=".2" strokeWidth="1.4" />
          <path d="M361 623 C330 595 304 600 290 618 C311 642 339 644 361 623Z" strokeOpacity=".15" />
          <path d="M351 672 C381 641 407 646 420 666 C398 689 374 691 351 672Z" fillOpacity=".09" strokeOpacity=".15" />
          <path d="M368 720 C338 698 315 707 306 728 C328 746 352 744 368 720Z" fillOpacity=".1" strokeOpacity=".15" />
        </g>
      ) : null}

      {templateId === "beauty-pop" ? (
        <g>
          <ellipse cx="410" cy="84" rx="116" ry="103" fill={primary} fillOpacity=".11" style={{ filter: "blur(26px)" }} />
          <ellipse cx="-20" cy="762" rx="130" ry="116" fill="#ffad73" fillOpacity=".12" style={{ filter: "blur(30px)" }} />
          <g fill={primary} fillOpacity=".24">
            <circle cx="26" cy="232" r="3" />
            <circle cx="356" cy="293" r="2.5" />
            <circle cx="375" cy="356" r="1.8" />
            <circle cx="27" cy="609" r="2" />
            <circle cx="348" cy="714" r="2.7" />
          </g>
          <path d="M352 210 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4Z" fill={primary} fillOpacity=".18" />
          <path d="M37 306 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z" fill="#f3a66c" fillOpacity=".24" />
        </g>
      ) : null}

      {templateId === "beauty-editorial" ? (
        <g fill="none" strokeLinecap="square">
          <path d="M352 155 H430 V576 H367" fill={primary} fillOpacity=".055" stroke="none" />
          <path d="M356 174 H405 M356 184 H390" stroke="#b99a68" strokeOpacity=".43" strokeWidth="1" />
          <path d="M12 534 H78" stroke="#b99a68" strokeOpacity=".35" strokeWidth="1.2" />
          <path d="M364 612 V730" stroke={primary} strokeOpacity=".12" strokeWidth="1" />
        </g>
      ) : null}

      {templateId === "beauty-tech" ? (
        <g>
          <ellipse cx="372" cy="170" rx="114" ry="148" fill={primary} fillOpacity=".11" style={{ filter: "blur(36px)" }} />
          <ellipse cx="16" cy="676" rx="111" ry="106" fill={primary} fillOpacity=".09" style={{ filter: "blur(32px)" }} />
          <circle cx="385" cy="330" r="94" fill="none" stroke="#d9ccff" strokeOpacity=".1" strokeWidth="1" />
          <circle cx="385" cy="330" r="112" fill="none" stroke={primary} strokeOpacity=".12" strokeWidth="1" />
          <g fill="#e8ddff" fillOpacity=".4">
            <circle cx="42" cy="193" r="1.5" />
            <circle cx="344" cy="527" r="1.7" />
            <circle cx="80" cy="742" r="1.4" />
          </g>
        </g>
      ) : null}
    </svg>
  );
}
