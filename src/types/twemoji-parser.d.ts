declare module 'twemoji-parser' {
  interface ParsedEmoji {
    url: string;
    indices: [number, number];
    text: string;
    type: string;
  }

  interface ParseOptions {
    assetType?: 'png' | 'svg';
    buildUrl?: (codepoint: string, assetType: string) => string;
  }

  export function parse(text: string, options?: ParseOptions): ParsedEmoji[];
}