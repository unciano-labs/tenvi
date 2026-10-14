import { describe, it, expect } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

describe('SEO, Robots, and Sitemap Configurations', () => {
  it('generates valid robots configuration allowing public pages and disallowing private routes', () => {
    const robotsConfig = robots();

    expect(robotsConfig).toBeDefined();
    expect(robotsConfig.rules).toBeDefined();

    const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules : [robotsConfig.rules];
    const wildcardRule = rules.find((r) => r.userAgent === '*');

    expect(wildcardRule).toBeDefined();
    expect(wildcardRule?.allow).toBe('/');

    const disallows = Array.isArray(wildcardRule?.disallow)
      ? wildcardRule?.disallow
      : [wildcardRule?.disallow];

    expect(disallows).toContain('/api/');
    expect(disallows).toContain('/dashboard/');
    expect(disallows).toContain('/auth/');

    expect(robotsConfig.sitemap).toContain('sitemap.xml');
  });

  it('generates valid sitemap configuration with canonical URLs and priorities', () => {
    const sitemapEntries = sitemap();

    expect(Array.isArray(sitemapEntries)).toBe(true);
    expect(sitemapEntries.length).toBeGreaterThanOrEqual(3);

    const rootEntry = sitemapEntries.find((entry) => entry.url.endsWith('tenvi.app') || entry.url === 'https://tenvi.app');
    expect(rootEntry).toBeDefined();
    expect(rootEntry?.priority).toBe(1.0);
    expect(rootEntry?.changeFrequency).toBe('weekly');

    const loginEntry = sitemapEntries.find((entry) => entry.url.includes('/login'));
    expect(loginEntry).toBeDefined();

    const registerEntry = sitemapEntries.find((entry) => entry.url.includes('/register'));
    expect(registerEntry).toBeDefined();
  });
});
