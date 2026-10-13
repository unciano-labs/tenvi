import { describe, it, expect } from 'vitest';
import * as ThemeToggles from './theme-toggle';

describe('Theme Toggle Primitives', () => {
  it('exports ThemeToggle component', () => {
    expect(ThemeToggles.ThemeToggle).toBeDefined();
    expect(typeof ThemeToggles.ThemeToggle).toBe('function');
  });

  it('exports ThemeQuickToggle component', () => {
    expect(ThemeToggles.ThemeQuickToggle).toBeDefined();
    expect(typeof ThemeToggles.ThemeQuickToggle).toBe('function');
  });

  it('exports ThemeSegmentedToggle component', () => {
    expect(ThemeToggles.ThemeSegmentedToggle).toBeDefined();
    expect(typeof ThemeToggles.ThemeSegmentedToggle).toBe('function');
  });
});
