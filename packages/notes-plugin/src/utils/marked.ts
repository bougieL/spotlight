import { marked } from 'marked';

marked.use({
  extensions: [
    {
      name: 'heading',
      level: 'block',
      start(src: string) {
        return src.match(/^#{1,6}/)?.index;
      },
      tokenizer(src: string) {
        const rule = /^(#{1,6})([^#\n]*)$/;
        const match = rule.exec(src);
        if (match) {
          return {
            type: 'heading',
            raw: match[0],
            depth: match[1].length,
            text: match[2].trim() || '\u00A0',
          };
        }
        return undefined;
      },
      renderer(token: unknown): string {
        const t = token as { depth: number; text: string };
        const text = t.text === '\u00A0' ? '' : t.text;
        return `<h${t.depth}>${text}</h${t.depth}>\n`;
      },
    },
  ],
});

export { marked };
