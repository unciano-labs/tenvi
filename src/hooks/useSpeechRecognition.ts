'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// SpeechRecognition interfaces for browsers
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => any) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export function useSpeechRecognition({
  lang = 'en-PH',
  continuous = true,
  interimResults = true,
  onResult,
  onError,
  onEnd,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isExplicitStopRef = useRef(false);

  // Check support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSupport = Boolean(
        window.SpeechRecognition || window.webkitSpeechRecognition
      );
      setIsSupported(hasSupport);
    }
  }, []);

  const stopListening = useCallback(() => {
    isExplicitStopRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // quiet catch
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      const notSupportedMsg =
        'Voice input is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.';
      setError(notSupportedMsg);
      onError?.(notSupportedMsg);
      return;
    }

    // Stop existing instance if running
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = lang;

      isExplicitStopRef.current = false;
      setError(null);

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTrans = '';
        let interimTrans = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTrans += item[0].transcript;
          } else {
            interimTrans += item[0].transcript;
          }
        }

        if (finalTrans) {
          setTranscript((prev) => {
            const separator = prev && !prev.endsWith(' ') ? ' ' : '';
            const updated = prev + separator + finalTrans.trim();
            onResult?.(updated, true);
            return updated;
          });
        }

        setInterimTranscript(interimTrans);
        if (interimTrans) {
          onResult?.(interimTrans, false);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // 'aborted' happens on explicit stop or modal closing
        if (event.error === 'aborted') {
          return;
        }

        let userMsg = 'Error occurred during voice recognition.';
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          userMsg =
            'Microphone access was denied. Please allow microphone permissions in your browser.';
        } else if (event.error === 'no-speech') {
          userMsg = 'No speech detected. Please try speaking again.';
        } else if (event.error === 'network') {
          userMsg = 'Speech recognition network error. Please check your connection.';
        }

        setError(userMsg);
        onError?.(userMsg);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
        onEnd?.();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      const failMsg = err?.message || 'Failed to start microphone voice recognition.';
      setError(failMsg);
      onError?.(failMsg);
      setIsListening(false);
    }
  }, [continuous, interimResults, lang, onError, onResult, onEnd]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}

