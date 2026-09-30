'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Wallet,
  TrendingUp,
  PlusCircle,
  Bot,
  Lightbulb,
} from 'lucide-react';

export interface TourStep {
  id: string;
  targetSelector: string;
  emoji: string;
  title: string;
  tagline: string;
  description: string;
  proTip: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'savings',
    targetSelector: '[data-tour="savings-card"]',
    emoji: '👛',
    title: 'Your Money Pockets',
    tagline: 'Where all your spending cash lives',
    description:
      'This shows all the cash you have available right now across GCash, Maya, and your bank. Think of it as your total spending stash in one place!',
    proTip: 'Whenever you receive salary, allowance, or stash money away, this number goes up!',
    icon: Wallet,
    iconBg: 'bg-slate-900 text-white',
  },
  {
    id: 'cashflow',
    targetSelector: '[data-tour="cashflow-card"]',
    emoji: '📈',
    title: 'Your Monthly Scoreboard',
    tagline: 'Track if you are saving or overspending',
    description:
      'Green means you kept money this month. Red means you spent more than came in. Your main mission is simple: keep this number in the green!',
    proTip: 'Even saving just ₱100 a week is a huge win for your financial freedom.',
    icon: TrendingUp,
    iconBg: 'bg-slate-900 text-white',
  },
  {
    id: 'record',
    targetSelector: '[data-tour="record-button"]',
    emoji: '✍️',
    title: 'The Fast Record Button',
    tagline: 'Log spending in 5 seconds flat',
    description:
      'Bought coffee, rode a jeep/grab, or got lunch? Tap here to record it right away. Your money pockets will update automatically!',
    proTip: 'Recording receipts as soon as they happen is the #1 secret of money masters.',
    icon: PlusCircle,
    iconBg: 'bg-slate-900 text-white',
  },
  {
    id: 'ai',
    targetSelector: '[data-tour="ai-button"]',
    emoji: '🤖',
    title: 'Your AI Money Buddy',
    tagline: 'Ask questions without any judgment',
    description:
      'Never feel lost about personal finances again! Ask Tenvi AI: "How can I budget for a vacation?" or "Which card should I pay with today?"',
    proTip: 'Tenvi AI is ready 24/7 on your phone or computer. Tap the button anytime!',
    icon: Bot,
    iconBg: 'bg-slate-900 text-white',
  },
];

interface DashboardTourSpotlightProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish?: () => void;
}

export function DashboardTourSpotlight({
  isOpen,
  onClose,
  onFinish,
}: DashboardTourSpotlightProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Measure and position around target element
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !step) return;
    const el = document.querySelector(step.targetSelector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      }, 250);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (isOpen) {
      updateTargetPosition();
      const handleResize = () => updateTargetPosition();
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', updateTargetPosition);
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', updateTargetPosition);
      };
    }
  }, [isOpen, currentStepIndex, updateTargetPosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && !isLastStep) {
        setCurrentStepIndex((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        setCurrentStepIndex((prev) => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLastStep, isFirstStep, onClose]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (isLastStep) {
      if (onFinish) onFinish();
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto select-none">
      {/* Darkened Backdrop Overlay - Solid dark slate */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity duration-500 ease-out"
      />

      {/* Target Focus Ring if element is found */}
      {targetRect && (
        <div
          style={{
            top: Math.max(0, targetRect.top - 8),
            left: Math.max(0, targetRect.left - 8),
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
          className="fixed pointer-events-none rounded-3xl border-4 border-slate-900 bg-white/5 shadow-[0_0_0_9999px_rgba(15,23,42,0.75)] z-50 transition-all duration-600 ease-out"
        />
      )}

      {/* Interactive Tour Tooltip Card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={cardRef}
          className="pointer-events-auto w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-500 ease-out"
        >
          {/* Top Progress & Close Bar - Solid Slate 900 */}
          <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                Step {currentStepIndex + 1} of {TOUR_STEPS.length}
              </span>
              <span className="text-xs text-slate-300 font-medium">Quick Tour</span>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              aria-label="Skip tour"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-7 space-y-4">
            {/* Step Icon & Title */}
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${step.iconBg}`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{step.emoji}</span>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {step.title}
                  </h3>
                </div>
                <p className="text-xs font-bold text-slate-600 mt-0.5">
                  {step.tagline}
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-600 leading-relaxed font-normal">
              {step.description}
            </p>

            {/* Pro Tip Box - Solid Slate 100 */}
            <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-700 leading-snug">
                <span className="font-bold text-slate-900">Pro Tip: </span>
                {step.proTip}
              </p>
            </div>

            {/* Step Indicator Dots */}
            <div className="flex items-center justify-center gap-2 pt-2">
              {TOUR_STEPS.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-500 ease-out ${
                    idx === currentStepIndex
                      ? 'w-7 bg-slate-900'
                      : 'w-2 bg-slate-200 hover:bg-slate-300'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            {/* Navigation Buttons - Solid bili-btn styles */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-3">
              {isFirstStep ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="bili-btn-secondary py-2.5 px-4 text-xs font-bold"
                >
                  Skip Tour
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="bili-btn-secondary py-2.5 px-4 text-xs font-bold flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="bili-btn-primary py-2.5 px-5 text-xs sm:text-sm font-bold flex items-center gap-2"
              >
                {isLastStep ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    Got It, Let's Go! 🚀
                  </>
                ) : (
                  <>
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
