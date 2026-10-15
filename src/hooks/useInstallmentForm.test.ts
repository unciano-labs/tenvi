import { describe, it, expect } from 'vitest';
import * as HookModule from './useInstallmentForm';

describe('useInstallmentForm Module', () => {
  it('exports useInstallmentForm hook function', () => {
    expect(HookModule.useInstallmentForm).toBeDefined();
    expect(typeof HookModule.useInstallmentForm).toBe('function');
  });
});
