import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateSiteMetadata, staticRoutes } from './generate-site-metadata.mjs';

const execFileAsync = promisify(execFile);
const frontendDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = resolve(frontendDir, 'node_modules/vite/bin/vite.js');
const viteConfig = resolve(frontendDir, 'vite.config.js');
const transientCleanupErrors = new Set(['EBUSY', 'EPERM']);

const removeFixture = async (path, {
  remove = rm,
  wait = delay,
  maxRetries = 5,
  retryDelay = 100,
} = {}) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await remove(path, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!transientCleanupErrors.has(error.code) || attempt >= maxRetries) throw error;
      await wait(retryDelay);
    }
  }
};

describe('generateSiteMetadata', () => {
  let outputDir;
  let projectDir;

  afterEach(async () => {
    if (outputDir) await removeFixture(outputDir);
    if (projectDir) await removeFixture(projectDir);
    outputDir = undefined;
    projectDir = undefined;
  });

  it('writes every metadata URL with the configured production origin', async () => {
    outputDir = await mkdtemp(join(tmpdir(), 'techphone-site-metadata-'));
    const origin = 'https://shop.techphone.example/';

    await generateSiteMetadata({ outputDir, siteUrl: origin });

    const [robots, sitemap] = await Promise.all([
      readFile(join(outputDir, 'robots.txt'), 'utf8'),
      readFile(join(outputDir, 'sitemap.xml'), 'utf8'),
    ]);
    const normalizedOrigin = 'https://shop.techphone.example';

    expect(robots).toContain(`Sitemap: ${normalizedOrigin}/sitemap.xml`);
    for (const route of staticRoutes) {
      expect(sitemap).toContain(`${normalizedOrigin}${route}`);
    }
    expect(sitemap).not.toContain('http://localhost:5173');
  });

  it('rejects missing or non-HTTP production origins', async () => {
    outputDir = await mkdtemp(join(tmpdir(), 'techphone-site-metadata-'));

    await expect(generateSiteMetadata({ outputDir, siteUrl: '' }))
      .rejects.toThrow('VITE_SITE_URL');
    await expect(generateSiteMetadata({ outputDir, siteUrl: '/relative' }))
      .rejects.toThrow('VITE_SITE_URL');
  });

  it('rejects loopback metadata for Render production', async () => {
    outputDir = await mkdtemp(join(tmpdir(), 'techphone-site-metadata-'));

    await expect(generateSiteMetadata({
      outputDir,
      siteUrl: 'http://localhost:3000',
      deploymentTarget: 'render',
    })).rejects.toThrow(/VITE_SITE_URL.*loopback/i);
  });

  it('loads .env.production in the Vite build lifecycle and leaves source public unchanged', async () => {
    projectDir = await createBuildFixture({
      '.env.production': [
        'VITE_DEPLOYMENT_TARGET=render',
        'VITE_USE_MOCK=false',
        'VITE_API_URL=https://api.production.example/api',
        'VITE_SITE_URL=https://production.example',
      ].join('\n'),
    });

    await runViteBuild(projectDir);

    await expectBuildMetadata(projectDir, 'https://production.example');
    expect(await readdir(join(projectDir, 'public'))).toEqual(['keep.txt']);
    expect(await readFile(join(projectDir, 'public/keep.txt'), 'utf8')).toBe('unchanged');
  });

  it('uses Vite local and mode env precedence for generated metadata', async () => {
    projectDir = await createBuildFixture({
      '.env': 'VITE_SITE_URL=https://base.example',
      '.env.local': 'VITE_SITE_URL=https://base-local.example',
      '.env.production': [
        'VITE_DEPLOYMENT_TARGET=render',
        'VITE_USE_MOCK=false',
        'VITE_API_URL=https://api.production.example/api',
        'VITE_SITE_URL=https://production.example',
      ].join('\n'),
      '.env.production.local': 'VITE_SITE_URL=https://production-local.example',
    });

    await runViteBuild(projectDir);

    await expectBuildMetadata(projectDir, 'https://production-local.example');
  });

  it('enforces production invariants and emits metadata for an actual staging-mode build', async () => {
    projectDir = await createBuildFixture({
      '.env.staging': [
        'VITE_DEPLOYMENT_TARGET=render',
        'VITE_USE_MOCK=false',
        'VITE_API_URL=https://api.staging.example/api',
        'VITE_SITE_URL=https://staging.example',
      ].join('\n'),
    });

    await runViteBuild(projectDir, 'staging');

    await expectBuildMetadata(projectDir, 'https://staging.example');
  });

  it('rejects loopback Render URLs in a staging-mode build', async () => {
    projectDir = await createBuildFixture({
      '.env.staging': [
        'VITE_DEPLOYMENT_TARGET=render',
        'VITE_USE_MOCK=false',
        'VITE_API_URL=http://localhost:5000/api',
        'VITE_SITE_URL=https://staging.example',
      ].join('\n'),
    });

    await expectBuildFailure(projectDir, 'staging', /VITE_API_URL.*loopback/i);
  });

  it('rejects an unknown target in a staging-mode build', async () => {
    projectDir = await createBuildFixture({
      '.env.staging': [
        'VITE_DEPLOYMENT_TARGET=rendr',
        'VITE_USE_MOCK=false',
        'VITE_API_URL=https://api.staging.example/api',
        'VITE_SITE_URL=https://staging.example',
      ].join('\n'),
    });

    await expectBuildFailure(projectDir, 'staging', /VITE_DEPLOYMENT_TARGET.*rendr.*not supported/i);
  });

  it('builds after copying the committed frontend environment example', async () => {
    const example = await readFile(resolve(frontendDir, '.env.example'), 'utf8');
    projectDir = await createBuildFixture({ '.env': example });

    await runViteBuild(projectDir);

    await expectBuildMetadata(projectDir, 'http://localhost:5173');
  });

  it('keeps the bare Docker quickstart port aligned with its canonical site URL', async () => {
    const [dockerfile, readme] = await Promise.all([
      readFile(resolve(frontendDir, 'Dockerfile'), 'utf8'),
      readFile(resolve(frontendDir, '../README.md'), 'utf8'),
    ]);
    const sitePort = dockerfile.match(/^ARG VITE_SITE_URL=http:\/\/localhost:(\d+)$/m)?.[1];
    const publishedPort = readme.match(/docker run -p (\d+):80 duanwebdidong-frontend/)?.[1];

    expect(sitePort).toBeDefined();
    expect(sitePort).toBe(publishedPort);
  });

  it('keeps the committed example site URL aligned with the Vite preview port', async () => {
    const [example, config] = await Promise.all([
      readFile(resolve(frontendDir, '.env.example'), 'utf8'),
      readFile(resolve(frontendDir, 'vite.config.js'), 'utf8'),
    ]);
    const sitePort = example.match(/^VITE_SITE_URL=http:\/\/localhost:(\d+)$/m)?.[1];
    const previewPort = config.match(/preview:\s*\{[^}]*port:\s*(\d+)/s)?.[1];

    expect(sitePort).toBeDefined();
    expect(previewPort).toBe(sitePort);
  });
});

describe('fixture cleanup', () => {
  it('retries transient Windows locks up to the configured bound', async () => {
    const remove = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('busy'), { code: 'EBUSY' }))
      .mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'EPERM' }))
      .mockResolvedValueOnce(undefined);
    const wait = vi.fn().mockResolvedValue(undefined);

    await removeFixture('fixture-path', {
      remove,
      wait,
      maxRetries: 2,
      retryDelay: 25,
    });

    expect(remove).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls).toEqual([[25], [25]]);
  });

  it('does not retry non-transient cleanup failures', async () => {
    const error = Object.assign(new Error('invalid path'), { code: 'EINVAL' });
    const remove = vi.fn().mockRejectedValue(error);
    const wait = vi.fn();

    await expect(removeFixture('fixture-path', { remove, wait, maxRetries: 3 }))
      .rejects.toBe(error);

    expect(remove).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });
});

const createBuildFixture = async (envFiles) => {
  const root = await mkdtemp(join(tmpdir(), 'techphone-vite-metadata-'));
  await mkdir(join(root, 'src'));
  await mkdir(join(root, 'public'));
  await Promise.all([
    writeFile(join(root, 'index.html'), [
      '<!doctype html>',
      '<link rel="canonical" href="%VITE_SITE_URL%">',
      '<div id="app"></div>',
      '<script type="module" src="/src/main.js"></script>',
    ].join('\n')),
    writeFile(join(root, 'src/main.js'), 'document.querySelector("#app").textContent = "ok";'),
    writeFile(join(root, 'public/keep.txt'), 'unchanged'),
    ...Object.entries(envFiles).map(([name, contents]) => writeFile(join(root, name), contents)),
  ]);
  return root;
};

const runViteBuild = async (root, mode = 'production') => {
  const childEnv = { ...process.env };
  for (const name of Object.keys(childEnv)) {
    if (name.startsWith('VITE_')) delete childEnv[name];
  }
  await execFileAsync(
    process.execPath,
    [viteBin, 'build', '--config', viteConfig, '--mode', mode],
    { cwd: root, env: childEnv },
  );
};

const expectBuildFailure = async (root, mode, expectedError) => {
  try {
    await runViteBuild(root, mode);
    throw new Error('Expected Vite build to fail');
  } catch (error) {
    expect(String(error.stderr || error.message)).toMatch(expectedError);
  }
};

const expectBuildMetadata = async (root, origin) => {
  const [robots, sitemap, html] = await Promise.all([
    readFile(join(root, 'dist/robots.txt'), 'utf8'),
    readFile(join(root, 'dist/sitemap.xml'), 'utf8'),
    readFile(join(root, 'dist/index.html'), 'utf8'),
  ]);

  expect(robots).toContain(`${origin}/sitemap.xml`);
  expect(sitemap).toContain(`${origin}/products`);
  expect(html).toContain(`href="${origin}"`);
};
