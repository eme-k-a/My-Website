import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import ts from 'typescript';
import { defineConfig, type Plugin } from 'vite';

// Same rule as src/content/temporal.ts (WP-02): BUILD_DATE wins, else today in UTC.
const buildDate = process.env.BUILD_DATE ?? new Date().toISOString().slice(0, 10);

const BOOT_MARKER = '<!--boot-->';
const bootPath = fileURLToPath(new URL('./src/app/boot.ts', import.meta.url));

/**
 * Turns the transpiled boot module into a classic script: drops `export {}` and
 * `export` modifiers, and refuses imports (the boot script runs before any bundle).
 */
const toClassicScript: ts.TransformerFactory<ts.SourceFile> = (context) => (file) => {
  const statements: ts.Statement[] = [];
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) {
      throw new Error(
        `${bootPath}: the boot script is inlined as a classic script and cannot import`,
      );
    }
    if (ts.isExportDeclaration(statement) || ts.isExportAssignment(statement)) continue;
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    if (!modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      statements.push(statement);
      continue;
    }
    const kept = modifiers.filter(
      (m) => m.kind !== ts.SyntaxKind.ExportKeyword && m.kind !== ts.SyntaxKind.DefaultKeyword,
    );
    const declaration = statement as ts.Statement & ts.HasModifiers;
    statements.push(context.factory.replaceModifiers(declaration, kept));
  }
  return context.factory.updateSourceFile(file, statements);
};

export function transpileBootScript(source: string): string {
  const { outputText } = ts.transpileModule(source, {
    fileName: bootPath,
    compilerOptions: {
      target: ts.ScriptTarget.ES2017,
      // ESNext plus toClassicScript instead of module "none": TypeScript 6 deprecates "none",
      // and its CommonJS-style output references `exports`, which throws in a classic script.
      module: ts.ModuleKind.ESNext,
      removeComments: true,
    },
    transformers: { after: [toClassicScript] },
  });
  return outputText.trim();
}

/** ARCHITECTURE §5.1: inline src/app/boot.ts at the <!--boot--> marker. */
function inlineBootScript(): Plugin {
  return {
    name: 'inline-boot-script',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!html.includes(BOOT_MARKER)) return html;
        const script = transpileBootScript(readFileSync(bootPath, 'utf8'));
        return html.replace(BOOT_MARKER, () => `<script>${script}</script>`);
      },
    },
  };
}

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), inlineBootScript()],
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  build: {
    manifest: true,
    rolldownOptions: {
      input: {
        main: 'index.html',
        classic: 'src/classic/classic.css',
      },
    },
  },
});
