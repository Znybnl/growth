import Link from "next/link";
import type { ReactNode } from "react";

// Editorial strings support links only; HTML and other Markdown stay escaped.
export function BlogInlineText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(/\[([^\]\n]+)\]\(([^\s)]+)\)/g)) {
    nodes.push(text.slice(cursor, match.index));
    const [, label, href] = match;
    const internal = /^\/(?![\/\\])/.test(href) && !href.includes("\\");
    let external = false;
    try {
      const url = new URL(href);
      external = url.protocol === "https:" && !url.username && !url.password;
    } catch {
      // Relative paths are validated above.
    }
    const className = "text-[#6c00f6] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4";
    nodes.push(
      internal ? (
        <Link key={match.index} href={href} className={className}>{label}</Link>
      ) : external ? (
        <a key={match.index} href={href} className={className}>{label}</a>
      ) : label,
    );
    cursor = match.index + match[0].length;
  }
  nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}
