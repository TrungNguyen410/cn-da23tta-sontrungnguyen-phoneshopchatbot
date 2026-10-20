import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const stylesDir = dirname(fileURLToPath(import.meta.url));
const sourceDir = resolve(stylesDir, '../..');
const implementationFiles = ['main.css', 'admin.css', 'responsive.css', 'redesign.css'];

const readStyle = (file) => readFileSync(resolve(stylesDir, file), 'utf8');

describe('locked frontend design system', () => {
  it('keeps raw color values inside tokens.css only', () => {
    for (const file of implementationFiles) {
      expect(readStyle(file), file).not.toMatch(
        /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i,
      );
    }
  });

  it('keeps canvas chart colors connected to CSS tokens', () => {
    const dashboard = readFileSync(resolve(sourceDir, 'pages/admin/Dashboard.jsx'), 'utf8');
    expect(dashboard).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i);
    expect(dashboard).toMatch(/token\(['"]--color-accent['"]\)/);
    expect(dashboard).not.toMatch(/change=["']\+/);
  });

  it('uses font tokens outside tokens.css', () => {
    for (const file of implementationFiles) {
      const declarations = readStyle(file).match(/font-family\s*:[^;]+;/gi) || [];
      expect(declarations, file).toEqual(
        declarations.filter((declaration) => declaration.includes('var(--font-')),
      );
    }
  });

  it('clips horizontal overflow without creating a hidden root scroll container', () => {
    const css = implementationFiles.map(readStyle).join('\n');
    expect(css).toMatch(/html\s*(?:,[^{]+)?\{[^}]*overflow-x:\s*clip/s);
    expect(css).toMatch(/body\s*(?:,[^{]+)?\{[^}]*overflow-x:\s*clip/s);
    expect(css).not.toMatch(/overflow-x:\s*hidden/);
  });

  it('uses mobile-safe dynamic viewport units', () => {
    const css = implementationFiles.map(readStyle).join('\n');
    expect(css).not.toMatch(/100vw|\b\d+(?:\.\d+)?vh\b/);
  });

  it('does not animate layout dimensions', () => {
    const css = implementationFiles.map(readStyle).join('\n');
    expect(css).not.toMatch(/transition(?:-property)?\s*:[^;]*(?:width|height|margin|padding|top|left)/);
  });

  it('gives fractional grid tracks a zero minimum', () => {
    for (const file of implementationFiles) {
      const unsafeTracks = readStyle(file)
        .split(/\r?\n/)
        .filter((line) => /grid-template-(?:columns|rows)\s*:.*\b\d*\.?\d+fr\b/.test(line))
        .filter((line) => {
          const withoutSafeTracks = line.replace(/minmax\([^)]*\)/g, '');
          return /\b\d*\.?\d+fr\b/.test(withoutSafeTracks);
        });
      expect(unsafeTracks, file).toEqual([]);
    }
  });
});
