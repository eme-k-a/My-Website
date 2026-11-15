// troika-three-text ships no type declarations. These cover the one export the kit calls
// (Placard.tsx); drei's <Text> brings its own prop types.
declare module 'troika-three-text' {
  export interface TextBuilderConfig {
    defaultFontURL?: string | null;
    unicodeFontsURL?: string | null;
    sdfGlyphSize?: number;
    sdfExponent?: number;
    sdfMargin?: number;
    textureWidth?: number;
    useWorker?: boolean;
  }
  /** Must run before the first font is processed; applies to every text. */
  export function configureTextBuilder(config: TextBuilderConfig): void;
}
