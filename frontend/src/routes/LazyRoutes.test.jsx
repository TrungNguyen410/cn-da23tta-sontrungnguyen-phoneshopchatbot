import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const routesSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'AppRoutes.jsx'),
  'utf8',
);

describe('route bundle boundaries', () => {
  it('lazy-loads every storefront and admin page', () => {
    const eagerPageImports = routesSource.match(
      /import\s+\w+\s+from\s+['"]\.\.\/pages(?:\/admin)?\/[^'"]+['"];/g,
    ) || [];
    expect(eagerPageImports).toEqual([
      "import AdminLayout from '../pages/admin/AdminLayout';",
    ]);
    expect(routesSource.match(/lazy\(\(\)\s*=>\s*import\(/g)?.length).toBeGreaterThanOrEqual(28);
  });

  it('keeps shared chrome eager and exposes an accessible suspense fallback', () => {
    expect(routesSource).toMatch(/import Header from ['"]\.\.\/components\/common\/Header['"]/);
    expect(routesSource).toMatch(/import Footer from ['"]\.\.\/components\/common\/Footer['"]/);
    expect(routesSource).toMatch(/<Suspense\s+fallback=\{<Loading/);
  });
});
