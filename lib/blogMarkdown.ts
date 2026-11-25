import { Marked } from "marked";
function escape(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }
/** Server-rendered Markdown with raw HTML and images disabled. */
export function blogMarkdown(source: string): string {
  const markdown = new Marked({ renderer: {
    html({ text }) { return escape(text); },
    image({ text }) { return escape(text); },
    link({ href, tokens }) {
      const content = this.parser.parseInline(tokens);
      const safe = /^(https?:\/\/|mailto:)/i.test(href) || href.startsWith("/") && !href.startsWith("//") && !href.includes("\\") || href.startsWith("#");
      return safe ? `<a href="${escape(href)}" rel="noopener noreferrer">${content}</a>` : content;
    },
  } });
  return markdown.parse(source, { async: false });
}
