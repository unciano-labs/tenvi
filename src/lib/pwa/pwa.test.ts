import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('PWA Configuration & Assets', () => {
  const publicDir = path.resolve(process.cwd(), 'public');
  const manifestPath = path.join(publicDir, 'manifest.json');
  const swPath = path.join(publicDir, 'sw.js');

  it('provides a valid manifest.json with required PWA fields', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content);

    expect(manifest.name).toBe('Tenvi — Personal Wealth Infrastructure Platform');
    expect(manifest.short_name).toBe('Tenvi');
    expect(manifest.description).toBeDefined();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('portrait');
    expect(manifest.background_color).toBe('#F8F9FA');
    expect(manifest.theme_color).toBe('#1E293B');

    // Verify icons array
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);

    const icon192 = manifest.icons.find((i: { sizes: string; purpose?: string }) => i.sizes === '192x192' && i.purpose === 'any');
    const maskable192 = manifest.icons.find((i: { sizes: string; purpose?: string }) => i.sizes === '192x192' && i.purpose === 'maskable');
    const icon512 = manifest.icons.find((i: { sizes: string; purpose?: string }) => i.sizes === '512x512' && i.purpose === 'any');
    const maskable512 = manifest.icons.find((i: { sizes: string; purpose?: string }) => i.sizes === '512x512' && i.purpose === 'maskable');

    expect(icon192).toBeDefined();
    expect(maskable192).toBeDefined();
    expect(icon512).toBeDefined();
    expect(maskable512).toBeDefined();
  });

  it('has all generated icon asset files in the public directory', () => {
    const requiredFiles = [
      'icon-192.png',
      'icon-maskable-192.png',
      'icon-512.png',
      'icon-maskable-512.png',
      'apple-touch-icon.png',
      'favicon.ico',
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(publicDir, file);
      expect(fs.existsSync(filePath), `Missing ${file} in public directory`).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(0);
    }
  });

  it('provides a valid service worker that handles caching, navigation, and API bypasses', () => {
    expect(fs.existsSync(swPath)).toBe(true);
    const swContent = fs.readFileSync(swPath, 'utf8');

    // Verify key service worker routines
    expect(swContent).toContain("self.addEventListener('install'");
    expect(swContent).toContain("self.addEventListener('activate'");
    expect(swContent).toContain("self.addEventListener('fetch'");
    expect(swContent).toContain('skipWaiting');
    expect(swContent).toContain('clients.claim');

    // Verify critical API and server-action bypasses
    expect(swContent).toContain('/api/');
    expect(swContent).toContain('supabase.co');
    expect(swContent).toContain('next-action');
  });
});
