import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as HookModule from './useSpeechRecognition';

describe('useSpeechRecognition Module', () => {
  it('exports useSpeechRecognition hook function', () => {
    expect(HookModule.useSpeechRecognition).toBeDefined();
    expect(typeof HookModule.useSpeechRecognition).toBe('function');
  });
});

