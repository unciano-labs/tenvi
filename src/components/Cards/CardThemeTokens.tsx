'use client';

import React from 'react';

export type CardAccentId =
  | 'red'
  | 'rose'
  | 'vermilion'
  | 'orange'
  | 'amber'
  | 'gold'
  | 'lime'
  | 'emerald'
  | 'mint'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'cobalt'
  | 'indigo'
  | 'purple'
  | 'violet'
  | 'pink'
  | 'silver'
  | 'carbon'
  | 'bronze'
  | 'champagne'
  | 'burgundy'
  | 'midnight'
  | 'forest'
  | 'plum'
  | 'copper'
  | 'charcoal';

export type CardNetwork = 'visa' | 'mastercard' | 'jcb' | 'unionpay' | 'amex';

export type CardPatternId =
  | 'none'
  | 'waves'
  | 'geometric'
  | 'dots'
  | 'circuit'
  | 'stripes'
  | 'cubes'
  | 'mesh'
  | 'chevrons'
  | 'rings'
  | 'topography'
  | 'diamonds'
  | 'stars'
  | 'diagonal_lines'
  | 'moroccan'
  | 'intersecting_circles'
  | 'crosshatch'
  | 'triangles'
  | 'carbon_weave'
  | 'sunburst';

export interface CardAccentConfig {
  id: CardAccentId;
  name: string;
  accentHex: string;
  bgHex: string;
  bgColor: string;
  borderColor: string;
  hoverBorderColor: string;
  glowShadow: string;
  textColor: string;
  barColor: string;
  badgeBg: string;
  chipAccent: string;
}

export const CARD_ACCENTS: Record<CardAccentId, CardAccentConfig> = {
  red: {
    id: 'red',
    name: 'Crimson Red',
    accentHex: '#ef4444',
    bgHex: '#b91c1c',
    bgColor: 'bg-[#b91c1c]',
    borderColor: 'border-red-400/50',
    hoverBorderColor: 'group-hover/card:border-red-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(239,68,68,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(239,68,68,0.55)]',
    textColor: 'text-red-100',
    barColor: 'bg-red-300',
    badgeBg: 'bg-red-950/70 text-red-100 border-red-400/50',
    chipAccent: 'border-red-300/60',
  },
  rose: {
    id: 'rose',
    name: 'Ruby Rose',
    accentHex: '#f43f5e',
    bgHex: '#be123c',
    bgColor: 'bg-[#be123c]',
    borderColor: 'border-rose-400/50',
    hoverBorderColor: 'group-hover/card:border-rose-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(244,63,94,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(244,63,94,0.55)]',
    textColor: 'text-rose-100',
    barColor: 'bg-rose-300',
    badgeBg: 'bg-rose-950/70 text-rose-100 border-rose-400/50',
    chipAccent: 'border-rose-300/60',
  },
  vermilion: {
    id: 'vermilion',
    name: 'Hot Coral',
    accentHex: '#ff6b6b',
    bgHex: '#c2410c',
    bgColor: 'bg-[#c2410c]',
    borderColor: 'border-orange-400/50',
    hoverBorderColor: 'group-hover/card:border-orange-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(255,107,107,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(255,107,107,0.55)]',
    textColor: 'text-orange-100',
    barColor: 'bg-orange-300',
    badgeBg: 'bg-orange-950/70 text-orange-100 border-orange-400/50',
    chipAccent: 'border-orange-300/60',
  },
  orange: {
    id: 'orange',
    name: 'Sunset Orange',
    accentHex: '#f97316',
    bgHex: '#ea580c',
    bgColor: 'bg-[#ea580c]',
    borderColor: 'border-orange-300/50',
    hoverBorderColor: 'group-hover/card:border-orange-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(249,115,22,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(249,115,22,0.55)]',
    textColor: 'text-orange-100',
    barColor: 'bg-orange-300',
    badgeBg: 'bg-orange-950/70 text-orange-100 border-orange-400/50',
    chipAccent: 'border-orange-300/60',
  },
  amber: {
    id: 'amber',
    name: 'Solar Amber',
    accentHex: '#f59e0b',
    bgHex: '#d97706',
    bgColor: 'bg-[#d97706]',
    borderColor: 'border-amber-300/50',
    hoverBorderColor: 'group-hover/card:border-amber-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(245,158,11,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(245,158,11,0.55)]',
    textColor: 'text-amber-100',
    barColor: 'bg-amber-300',
    badgeBg: 'bg-amber-950/70 text-amber-100 border-amber-400/50',
    chipAccent: 'border-amber-300/60',
  },
  gold: {
    id: 'gold',
    name: 'Honey Gold',
    accentHex: '#eab308',
    bgHex: '#854d0e',
    bgColor: 'bg-[#854d0e]',
    borderColor: 'border-yellow-400/50',
    hoverBorderColor: 'group-hover/card:border-yellow-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(234,179,8,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(234,179,8,0.55)]',
    textColor: 'text-yellow-100',
    barColor: 'bg-yellow-300',
    badgeBg: 'bg-yellow-950/70 text-yellow-100 border-yellow-400/50',
    chipAccent: 'border-yellow-300/60',
  },
  lime: {
    id: 'lime',
    name: 'Neon Lime',
    accentHex: '#84cc16',
    bgHex: '#4d7c0f',
    bgColor: 'bg-[#4d7c0f]',
    borderColor: 'border-lime-400/50',
    hoverBorderColor: 'group-hover/card:border-lime-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(132,204,22,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(132,204,22,0.55)]',
    textColor: 'text-lime-100',
    barColor: 'bg-lime-300',
    badgeBg: 'bg-lime-950/70 text-lime-100 border-lime-400/50',
    chipAccent: 'border-lime-300/60',
  },
  emerald: {
    id: 'emerald',
    name: 'Forest Emerald',
    accentHex: '#10b981',
    bgHex: '#065f46',
    bgColor: 'bg-[#065f46]',
    borderColor: 'border-emerald-300/50',
    hoverBorderColor: 'group-hover/card:border-emerald-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(16,185,129,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(16,185,129,0.55)]',
    textColor: 'text-emerald-100',
    barColor: 'bg-emerald-300',
    badgeBg: 'bg-emerald-950/70 text-emerald-100 border-emerald-400/50',
    chipAccent: 'border-emerald-300/60',
  },
  mint: {
    id: 'mint',
    name: 'Mint Jade',
    accentHex: '#34d399',
    bgHex: '#047857',
    bgColor: 'bg-[#047857]',
    borderColor: 'border-emerald-400/50',
    hoverBorderColor: 'group-hover/card:border-emerald-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(52,211,153,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(52,211,153,0.55)]',
    textColor: 'text-emerald-100',
    barColor: 'bg-emerald-300',
    badgeBg: 'bg-emerald-950/70 text-emerald-100 border-emerald-400/50',
    chipAccent: 'border-emerald-300/60',
  },
  teal: {
    id: 'teal',
    name: 'Oceanic Teal',
    accentHex: '#14b8a6',
    bgHex: '#115e59',
    bgColor: 'bg-[#115e59]',
    borderColor: 'border-teal-300/50',
    hoverBorderColor: 'group-hover/card:border-teal-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(20,184,166,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(20,184,166,0.55)]',
    textColor: 'text-teal-100',
    barColor: 'bg-teal-300',
    badgeBg: 'bg-teal-950/70 text-teal-100 border-teal-400/50',
    chipAccent: 'border-teal-300/60',
  },
  cyan: {
    id: 'cyan',
    name: 'Electric Cyan',
    accentHex: '#06b6d4',
    bgHex: '#0e7490',
    bgColor: 'bg-[#0e7490]',
    borderColor: 'border-cyan-300/50',
    hoverBorderColor: 'group-hover/card:border-cyan-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(6,182,212,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(6,182,212,0.55)]',
    textColor: 'text-cyan-100',
    barColor: 'bg-cyan-300',
    badgeBg: 'bg-cyan-950/70 text-cyan-100 border-cyan-400/50',
    chipAccent: 'border-cyan-300/60',
  },
  sky: {
    id: 'sky',
    name: 'Sky Cerulean',
    accentHex: '#0ea5e9',
    bgHex: '#0369a1',
    bgColor: 'bg-[#0369a1]',
    borderColor: 'border-sky-300/50',
    hoverBorderColor: 'group-hover/card:border-sky-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(14,165,233,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(14,165,233,0.55)]',
    textColor: 'text-sky-100',
    barColor: 'bg-sky-300',
    badgeBg: 'bg-sky-950/70 text-sky-100 border-sky-400/50',
    chipAccent: 'border-sky-300/60',
  },
  blue: {
    id: 'blue',
    name: 'Sapphire Blue',
    accentHex: '#3b82f6',
    bgHex: '#1d4ed8',
    bgColor: 'bg-[#1d4ed8]',
    borderColor: 'border-blue-300/50',
    hoverBorderColor: 'group-hover/card:border-blue-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(59,130,246,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(59,130,246,0.55)]',
    textColor: 'text-blue-100',
    barColor: 'bg-blue-300',
    badgeBg: 'bg-blue-950/70 text-blue-100 border-blue-400/50',
    chipAccent: 'border-blue-300/60',
  },
  cobalt: {
    id: 'cobalt',
    name: 'Deep Cobalt',
    accentHex: '#2563eb',
    bgHex: '#1e3a8a',
    bgColor: 'bg-[#1e3a8a]',
    borderColor: 'border-blue-400/50',
    hoverBorderColor: 'group-hover/card:border-blue-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(37,99,235,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(37,99,235,0.55)]',
    textColor: 'text-blue-100',
    barColor: 'bg-blue-300',
    badgeBg: 'bg-blue-950/70 text-blue-100 border-blue-400/50',
    chipAccent: 'border-blue-300/60',
  },
  indigo: {
    id: 'indigo',
    name: 'Royal Indigo',
    accentHex: '#6366f1',
    bgHex: '#3730a3',
    bgColor: 'bg-[#3730a3]',
    borderColor: 'border-indigo-300/50',
    hoverBorderColor: 'group-hover/card:border-indigo-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(99,102,241,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(99,102,241,0.55)]',
    textColor: 'text-indigo-100',
    barColor: 'bg-indigo-300',
    badgeBg: 'bg-indigo-950/70 text-indigo-100 border-indigo-400/50',
    chipAccent: 'border-indigo-300/60',
  },
  purple: {
    id: 'purple',
    name: 'Cyber Purple',
    accentHex: '#a855f7',
    bgHex: '#6b21a8',
    bgColor: 'bg-[#6b21a8]',
    borderColor: 'border-purple-300/50',
    hoverBorderColor: 'group-hover/card:border-purple-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(168,85,247,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(168,85,247,0.55)]',
    textColor: 'text-purple-100',
    barColor: 'bg-purple-300',
    badgeBg: 'bg-purple-950/70 text-purple-100 border-purple-400/50',
    chipAccent: 'border-purple-300/60',
  },
  violet: {
    id: 'violet',
    name: 'Electric Violet',
    accentHex: '#8b5cf6',
    bgHex: '#7c3aed',
    bgColor: 'bg-[#7c3aed]',
    borderColor: 'border-violet-300/50',
    hoverBorderColor: 'group-hover/card:border-violet-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(139,92,246,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(139,92,246,0.55)]',
    textColor: 'text-violet-100',
    barColor: 'bg-violet-300',
    badgeBg: 'bg-violet-950/70 text-violet-100 border-violet-400/50',
    chipAccent: 'border-violet-300/60',
  },
  pink: {
    id: 'pink',
    name: 'Magenta Pink',
    accentHex: '#ec4899',
    bgHex: '#9d174d',
    bgColor: 'bg-[#9d174d]',
    borderColor: 'border-pink-300/50',
    hoverBorderColor: 'group-hover/card:border-pink-200',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(236,72,153,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(236,72,153,0.55)]',
    textColor: 'text-pink-100',
    barColor: 'bg-pink-300',
    badgeBg: 'bg-pink-950/70 text-pink-100 border-pink-400/50',
    chipAccent: 'border-pink-300/60',
  },
  silver: {
    id: 'silver',
    name: 'Titanium Slate',
    accentHex: '#94a3b8',
    bgHex: '#334155',
    bgColor: 'bg-[#334155]',
    borderColor: 'border-slate-300/50',
    hoverBorderColor: 'group-hover/card:border-slate-100',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(148,163,184,0.3)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(148,163,184,0.45)]',
    textColor: 'text-slate-100',
    barColor: 'bg-slate-200',
    badgeBg: 'bg-slate-900/70 text-slate-100 border-slate-300/50',
    chipAccent: 'border-slate-300/60',
  },
  carbon: {
    id: 'carbon',
    name: 'Stealth Onyx',
    accentHex: '#71717a',
    bgHex: '#18181b',
    bgColor: 'bg-[#18181b]',
    borderColor: 'border-zinc-500/50',
    hoverBorderColor: 'group-hover/card:border-zinc-300',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(113,113,122,0.25)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(113,113,122,0.4)]',
    textColor: 'text-zinc-100',
    barColor: 'bg-zinc-200',
    badgeBg: 'bg-zinc-900/80 text-zinc-100 border-zinc-500/50',
    chipAccent: 'border-zinc-400/60',
  },
  bronze: {
    id: 'bronze',
    name: 'Antique Bronze',
    accentHex: '#92400e',
    bgHex: '#78350f',
    bgColor: 'bg-[#78350f]',
    borderColor: 'border-amber-700/50',
    hoverBorderColor: 'group-hover/card:border-amber-400',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(146,64,14,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(146,64,14,0.55)]',
    textColor: 'text-amber-100',
    barColor: 'bg-amber-400',
    badgeBg: 'bg-amber-950/70 text-amber-100 border-amber-700/50',
    chipAccent: 'border-amber-400/60',
  },
  champagne: {
    id: 'champagne',
    name: 'Champagne Gold',
    accentHex: '#d97706',
    bgHex: '#713f12',
    bgColor: 'bg-[#713f12]',
    borderColor: 'border-yellow-600/50',
    hoverBorderColor: 'group-hover/card:border-yellow-300',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(217,119,6,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(217,119,6,0.55)]',
    textColor: 'text-yellow-100',
    barColor: 'bg-yellow-300',
    badgeBg: 'bg-yellow-950/70 text-yellow-100 border-yellow-600/50',
    chipAccent: 'border-yellow-300/60',
  },
  burgundy: {
    id: 'burgundy',
    name: 'Royal Burgundy',
    accentHex: '#9f1239',
    bgHex: '#4c0519',
    bgColor: 'bg-[#4c0519]',
    borderColor: 'border-rose-900/50',
    hoverBorderColor: 'group-hover/card:border-rose-500',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(159,18,57,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(159,18,57,0.55)]',
    textColor: 'text-rose-100',
    barColor: 'bg-rose-400',
    badgeBg: 'bg-rose-950/80 text-rose-100 border-rose-800/50',
    chipAccent: 'border-rose-400/60',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Navy',
    accentHex: '#1e3a8a',
    bgHex: '#0f172a',
    bgColor: 'bg-[#0f172a]',
    borderColor: 'border-slate-700/50',
    hoverBorderColor: 'group-hover/card:border-slate-400',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(15,23,42,0.4)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(15,23,42,0.6)]',
    textColor: 'text-slate-100',
    barColor: 'bg-blue-400',
    badgeBg: 'bg-slate-900/80 text-slate-100 border-slate-700/50',
    chipAccent: 'border-slate-400/60',
  },
  forest: {
    id: 'forest',
    name: 'Deep Pine',
    accentHex: '#065f46',
    bgHex: '#022c22',
    bgColor: 'bg-[#022c22]',
    borderColor: 'border-emerald-900/50',
    hoverBorderColor: 'group-hover/card:border-emerald-500',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(6,95,70,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(6,95,70,0.55)]',
    textColor: 'text-emerald-100',
    barColor: 'bg-emerald-400',
    badgeBg: 'bg-emerald-950/80 text-emerald-100 border-emerald-800/50',
    chipAccent: 'border-emerald-400/60',
  },
  plum: {
    id: 'plum',
    name: 'Imperial Plum',
    accentHex: '#701a75',
    bgHex: '#3b0764',
    bgColor: 'bg-[#3b0764]',
    borderColor: 'border-purple-900/50',
    hoverBorderColor: 'group-hover/card:border-purple-400',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(112,26,117,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(112,26,117,0.55)]',
    textColor: 'text-fuchsia-100',
    barColor: 'bg-fuchsia-400',
    badgeBg: 'bg-purple-950/80 text-fuchsia-100 border-purple-800/50',
    chipAccent: 'border-fuchsia-400/60',
  },
  copper: {
    id: 'copper',
    name: 'Burnished Copper',
    accentHex: '#c2410c',
    bgHex: '#7c2d12',
    bgColor: 'bg-[#7c2d12]',
    borderColor: 'border-orange-800/50',
    hoverBorderColor: 'group-hover/card:border-orange-400',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(194,65,12,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(194,65,12,0.55)]',
    textColor: 'text-orange-100',
    barColor: 'bg-orange-400',
    badgeBg: 'bg-orange-950/80 text-orange-100 border-orange-800/50',
    chipAccent: 'border-orange-400/60',
  },
  charcoal: {
    id: 'charcoal',
    name: 'Charcoal Graphite',
    accentHex: '#52525b',
    bgHex: '#27272a',
    bgColor: 'bg-[#27272a]',
    borderColor: 'border-zinc-700/50',
    hoverBorderColor: 'group-hover/card:border-zinc-400',
    glowShadow: 'shadow-[0_8px_24px_-4px_rgba(39,39,42,0.35)] group-hover/card:shadow-[0_16px_40px_-6px_rgba(39,39,42,0.5)]',
    textColor: 'text-zinc-100',
    barColor: 'bg-zinc-300',
    badgeBg: 'bg-zinc-900/80 text-zinc-100 border-zinc-700/50',
    chipAccent: 'border-zinc-400/60',
  },
};

export interface CardPatternConfig {
  id: CardPatternId;
  name: string;
}

export const CARD_PATTERNS: CardPatternConfig[] = [
  { id: 'none', name: 'Solid' },
  { id: 'waves', name: 'Waves' },
  { id: 'geometric', name: 'Hex' },
  { id: 'dots', name: 'Matrix' },
  { id: 'circuit', name: 'Circuit' },
  { id: 'stripes', name: 'Stripes' },
  { id: 'cubes', name: 'Cubes' },
  { id: 'mesh', name: 'Mesh' },
  { id: 'chevrons', name: 'Chevron' },
  { id: 'rings', name: 'Ripples' },
  { id: 'topography', name: 'Contour' },
  { id: 'diamonds', name: 'Diamonds' },
  { id: 'stars', name: 'Constellation' },
  { id: 'diagonal_lines', name: 'Grooves' },
  { id: 'moroccan', name: 'Arabesque' },
  { id: 'intersecting_circles', name: 'Petals' },
  { id: 'crosshatch', name: 'Hatch' },
  { id: 'triangles', name: 'Delta' },
  { id: 'carbon_weave', name: 'Weave' },
  { id: 'sunburst', name: 'Sunburst' },
];

// Aliases for backwards compatibility with previous theme IDs
export type CardThemeId = CardAccentId;

// Complete static lookup map for card themes (satisfies CARD_THEMES[card.color] ?? CARD_THEMES.default)
export const CARD_THEMES: Record<string, CardAccentConfig> = {
  ...CARD_ACCENTS,
  default: CARD_ACCENTS.cyan,
  slate: CARD_ACCENTS.silver,
  zinc: CARD_ACCENTS.carbon,
  gray: CARD_ACCENTS.silver,
  grey: CARD_ACCENTS.silver,
  green: CARD_ACCENTS.emerald,
  yellow: CARD_ACCENTS.gold,
  ruby: CARD_ACCENTS.rose,
  black: CARD_ACCENTS.carbon,
  coral: CARD_ACCENTS.vermilion,
};

/**
 * Returns a static card theme config from any color string or fallback to default
 */
export function getCardTheme(color?: string | null): CardAccentConfig {
  if (!color) return CARD_THEMES.default;
  const key = color.trim().toLowerCase();
  return CARD_THEMES[key] ?? CARD_THEMES.default;
}

/**
 * Parses color_theme string (e.g. "cyan:visa:waves" or "emerald_teal" or "#0f172a")
 * and extracts accent config, network, and pattern.
 */
export function parseCardStyle(
  colorTheme?: string | null,
  cardName: string = ''
): {
  theme: CardAccentConfig;
  themeId: CardAccentId;
  network: CardNetwork;
  pattern: CardPatternId;
} {
  const normalized = (colorTheme || '').trim().toLowerCase();
  let rawAccent = 'cyan';
  let rawNetwork: CardNetwork | null = null;
  let rawPattern: CardPatternId = 'none';

  if (normalized.includes(':')) {
    const parts = normalized.split(':');
    rawAccent = parts[0] || 'cyan';
    const validNetworks: CardNetwork[] = ['visa', 'mastercard', 'jcb', 'unionpay', 'amex'];
    if (validNetworks.includes(parts[1] as CardNetwork)) {
      rawNetwork = parts[1] as CardNetwork;
    }
    const validPatterns: CardPatternId[] = [
      'none',
      'waves',
      'geometric',
      'dots',
      'circuit',
      'stripes',
      'cubes',
      'mesh',
      'chevrons',
      'rings',
      'topography',
      'diamonds',
      'stars',
      'diagonal_lines',
      'moroccan',
      'intersecting_circles',
      'crosshatch',
      'triangles',
      'carbon_weave',
      'sunburst',
    ];
    if (parts[2] && validPatterns.includes(parts[2] as CardPatternId)) {
      rawPattern = parts[2] as CardPatternId;
    }
  } else if (normalized) {
    rawAccent = normalized;
  }

  // Backwards compatibility & alias mapping (only if not a raw hex code)
  if (!rawAccent.startsWith('#')) {
    if (rawAccent === 'ocean_blue' || (rawAccent.includes('cyan') && rawAccent !== 'blue')) {
      rawAccent = 'cyan';
    } else if (rawAccent === 'emerald_teal' || rawAccent.includes('emerald') || rawAccent.includes('green')) {
      rawAccent = 'emerald';
    } else if (rawAccent === 'royal_purple' || rawAccent.includes('purple')) {
      rawAccent = 'purple';
    } else if (rawAccent === 'sunset_amber' || rawAccent.includes('amber')) {
      rawAccent = 'amber';
    } else if (rawAccent === 'crimson_ruby' || rawAccent.includes('ruby')) {
      rawAccent = 'rose';
    } else if (rawAccent === 'obsidian_black' || rawAccent.includes('black') || rawAccent.includes('dark')) {
      rawAccent = 'carbon';
    } else if (
      rawAccent.includes('slate') ||
      rawAccent.includes('gray') ||
      rawAccent.includes('grey')
    ) {
      rawAccent = 'silver';
    }
  }

  // Auto-detect network from cardName if not explicitly set
  if (!rawNetwork) {
    const nameLower = cardName.toLowerCase();
    if (nameLower.includes('mastercard') || nameLower.includes('mc')) {
      rawNetwork = 'mastercard';
    } else if (nameLower.includes('jcb')) {
      rawNetwork = 'jcb';
    } else if (nameLower.includes('unionpay') || nameLower.includes('union pay')) {
      rawNetwork = 'unionpay';
    } else if (nameLower.includes('amex') || nameLower.includes('american express')) {
      rawNetwork = 'amex';
    } else {
      rawNetwork = 'visa'; // Default to Visa
    }
  }

  let theme: CardAccentConfig;
  let themeId: CardAccentId;

  if (rawAccent in CARD_ACCENTS) {
    themeId = rawAccent as CardAccentId;
    theme = CARD_ACCENTS[themeId];
  } else if (rawAccent in CARD_THEMES) {
    theme = CARD_THEMES[rawAccent];
    themeId = (theme.id in CARD_ACCENTS ? theme.id : 'cyan') as CardAccentId;
  } else if (rawAccent.startsWith('#') || rawAccent.startsWith('rgb')) {
    themeId = rawAccent as CardAccentId;
    theme = {
      id: rawAccent as CardAccentId,
      name: 'Custom',
      accentHex: rawAccent,
      bgHex: rawAccent,
      bgColor: '',
      borderColor: 'border-white/25',
      hoverBorderColor: 'group-hover/card:border-white/40',
      glowShadow: 'shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)]',
      textColor: 'text-white',
      barColor: 'bg-white/40',
      badgeBg: 'bg-black/40 text-white border-white/20',
      chipAccent: 'border-white/40',
    };
  } else {
    theme = CARD_THEMES.default ?? CARD_ACCENTS.cyan;
    themeId = theme.id;
  }

  return {
    themeId,
    theme,
    network: rawNetwork,
    pattern: rawPattern,
  };
}

/**
 * Combines accentId (preset or custom hex), network, and pattern into a persistent string format "accent:network:pattern"
 */
export function formatCardStyle(
  accentId: CardAccentId | string,
  network: CardNetwork = 'visa',
  pattern: CardPatternId = 'none'
): string {
  return `${accentId}:${network}:${pattern}`;
}

/**
 * Subtle background accent pattern overlay - 10 security watermark patterns
 */
export function CardPatternOverlay({
  pattern = 'none',
  accentHex,
}: {
  pattern?: CardPatternId;
  accentHex?: string;
}) {
  if (!pattern || pattern === 'none') {
    return null;
  }

  const strokeColor = 'white';

  if (pattern === 'waves') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none overflow-hidden"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 250"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M-50,180 C80,120 180,240 320,150 C380,110 440,160 480,130"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
        />
        <path
          d="M-50,140 C90,80 190,200 330,110 C390,70 450,120 480,90"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
        />
        <path
          d="M-50,220 C70,160 170,280 310,190 C370,150 430,200 480,170"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <path
          d="M-50,100 C100,40 200,160 340,70 C400,30 460,80 480,50"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1"
        />
      </svg>
    );
  }

  if (pattern === 'dots') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="card-pattern-dots" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="8" cy="8" r="1.5" fill={strokeColor} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#card-pattern-dots)" />
      </svg>
    );
  }

  if (pattern === 'geometric') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="card-pattern-geometric" width="28" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M14,0 L28,8 L28,24 L14,32 L0,24 L0,8 Z M0,32 L14,40 L14,56 L0,48 Z M28,32 L28,48 L14,56 L14,40 Z"
              fill="none"
              stroke={strokeColor}
              strokeWidth="0.8"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#card-pattern-geometric)" />
      </svg>
    );
  }

  if (pattern === 'circuit') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none overflow-hidden"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 250"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,60 L80,60 L120,100 L240,100 L270,70 L380,70"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <circle cx="120" cy="100" r="2.5" fill={strokeColor} />
        <circle cx="270" cy="70" r="2.5" fill={strokeColor} />
        <circle cx="380" cy="70" r="2" fill={strokeColor} />
        <path
          d="M30,200 L110,200 L150,160 L280,160 L310,190 L400,190"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <circle cx="150" cy="160" r="2.5" fill={strokeColor} />
        <circle cx="310" cy="190" r="2.5" fill={strokeColor} />
        <path
          d="M200,0 L200,45 L225,70 L225,120"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      </svg>
    );
  }

  if (pattern === 'stripes') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="card-pattern-stripes"
            width="12"
            height="12"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="12" stroke={strokeColor} strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#card-pattern-stripes)" />
      </svg>
    );
  }

  if (pattern === 'cubes') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="card-pattern-cubes" width="30" height="52" patternUnits="userSpaceOnUse">
            <path d="M15,0 L30,8.66 L15,17.32 L0,8.66 Z" fill="white" opacity="0.35" />
            <path d="M0,8.66 L15,17.32 L15,34.64 L0,26 Z" fill="white" opacity="0.15" />
            <path d="M30,8.66 L30,26 L15,34.64 L15,17.32 Z" fill="white" opacity="0.55" />
            <path d="M15,34.64 L30,43.3 L15,52 L0,43.3 Z" fill="white" opacity="0.35" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#card-pattern-cubes)" />
      </svg>
    );
  }

  if (pattern === 'mesh') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="card-pattern-mesh" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={strokeColor} strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#card-pattern-mesh)" />
      </svg>
    );
  }

  if (pattern === 'chevrons') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="card-pattern-chevrons" width="24" height="12" patternUnits="userSpaceOnUse">
            <path d="M0,6 L12,0 L24,6 L12,12 Z" fill="none" stroke={strokeColor} strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#card-pattern-chevrons)" />
      </svg>
    );
  }

  if (pattern === 'rings') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none overflow-hidden"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 250"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <circle cx="340" cy="180" r="35" fill="none" stroke={strokeColor} strokeWidth="1.2" />
        <circle cx="340" cy="180" r="70" fill="none" stroke={strokeColor} strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="340" cy="180" r="105" fill="none" stroke={strokeColor} strokeWidth="1.2" />
        <circle cx="340" cy="180" r="140" fill="none" stroke={strokeColor} strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="340" cy="180" r="175" fill="none" stroke={strokeColor} strokeWidth="1.2" />
        <circle cx="340" cy="180" r="210" fill="none" stroke={strokeColor} strokeWidth="1" />
        <circle cx="340" cy="180" r="245" fill="none" stroke={strokeColor} strokeWidth="1.2" />
      </svg>
    );
  }

  if (pattern === 'topography') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none overflow-hidden"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 250"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M-50,60 Q80,20 200,90 T450,40" fill="none" stroke={strokeColor} strokeWidth="1.2" />
        <path d="M-50,90 Q100,50 210,120 T450,70" fill="none" stroke={strokeColor} strokeWidth="1" strokeDasharray="5 3" />
        <path d="M-50,130 Q120,90 220,150 T450,110" fill="none" stroke={strokeColor} strokeWidth="1.2" />
        <path d="M-50,170 Q140,130 240,190 T450,150" fill="none" stroke={strokeColor} strokeWidth="1" />
        <path d="M-50,210 Q160,170 270,220 T450,190" fill="none" stroke={strokeColor} strokeWidth="1.2" />
      </svg>
    );
  }

  if (pattern === 'diamonds') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="card-pattern-diamonds" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M12,0 L24,12 L12,24 L0,12 Z" fill="none" stroke={strokeColor} strokeWidth="0.8" />
            <circle cx="12" cy="12" r="1.5" fill={strokeColor} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#card-pattern-diamonds)" />
      </svg>
    );
  }

  if (pattern === 'stars') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="card-pattern-stars" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M16,8 L16,24 M8,16 L24,16" stroke={strokeColor} strokeWidth="0.8" />
            <circle cx="16" cy="16" r="1" fill={strokeColor} />
            <circle cx="0" cy="0" r="1.5" fill={strokeColor} />
            <circle cx="32" cy="0" r="1.5" fill={strokeColor} />
            <circle cx="0" cy="32" r="1.5" fill={strokeColor} />
            <circle cx="32" cy="32" r="1.5" fill={strokeColor} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#card-pattern-stars)" />
      </svg>
    );
  }

  if (pattern === 'diagonal_lines') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="card-pattern-diagonal-lines"
            width="6"
            height="6"
            patternTransform="rotate(60 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke={strokeColor} strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#card-pattern-diagonal-lines)" />
      </svg>
    );
  }

  if (pattern === 'moroccan') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="card-pattern-moroccan" width="28" height="28" patternUnits="userSpaceOnUse">
            <path
              d="M14,0 C17,7 21,7 28,14 C21,21 17,21 14,28 C11,21 7,21 0,14 C7,7 11,7 14,0 Z"
              fill="none"
              stroke={strokeColor}
              strokeWidth="0.8"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#card-pattern-moroccan)" />
      </svg>
    );
  }

  if (pattern === 'intersecting_circles') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="card-pattern-intersecting" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="15" fill="none" stroke={strokeColor} strokeWidth="0.8" />
            <circle cx="0" cy="0" r="15" fill="none" stroke={strokeColor} strokeWidth="0.8" />
            <circle cx="30" cy="0" r="15" fill="none" stroke={strokeColor} strokeWidth="0.8" />
            <circle cx="0" cy="30" r="15" fill="none" stroke={strokeColor} strokeWidth="0.8" />
            <circle cx="30" cy="30" r="15" fill="none" stroke={strokeColor} strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#card-pattern-intersecting)" />
      </svg>
    );
  }

  if (pattern === 'crosshatch') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="card-pattern-crosshatch"
            width="10"
            height="10"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="10" y2="0" stroke={strokeColor} strokeWidth="0.8" />
            <line x1="0" y1="0" x2="0" y2="10" stroke={strokeColor} strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#card-pattern-crosshatch)" />
      </svg>
    );
  }

  if (pattern === 'triangles') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="card-pattern-triangles" width="24" height="20.78" patternUnits="userSpaceOnUse">
            <path d="M0,0 L24,0 L12,20.78 Z" fill="none" stroke={strokeColor} strokeWidth="0.8" />
            <path d="M12,20.78 L0,0" fill="none" stroke={strokeColor} strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#card-pattern-triangles)" />
      </svg>
    );
  }

  if (pattern === 'carbon_weave') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-25 select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="card-pattern-carbon-weave" width="16" height="16" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="8" height="8" fill="white" opacity="0.15" />
            <rect x="8" y="8" width="8" height="8" fill="white" opacity="0.15" />
            <path d="M0,8 L8,0 M8,16 L16,8" stroke={strokeColor} strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#card-pattern-carbon-weave)" />
      </svg>
    );
  }

  if (pattern === 'sunburst') {
    return (
      <svg
        className="absolute inset-0 size-full pointer-events-none opacity-20 select-none overflow-hidden"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 250"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M400,0 L0,0 M400,0 L0,30 M400,0 L0,65 M400,0 L0,105 M400,0 L0,150 M400,0 L0,200 M400,0 L0,250 M400,0 L60,250 M400,0 L130,250 M400,0 L210,250 M400,0 L300,250 M400,0 L400,250" stroke={strokeColor} strokeWidth="0.8" fill="none" />
      </svg>
    );
  }

  return null;
}

/**
 * Metallic EMV Chip graphic component with realistic contacts
 */
export function EmvChip() {
  return (
    <div className="relative size-8 sm:size-9 rounded-md bg-gradient-to-br from-[#cbb06d] via-[#f3de98] to-[#9c7929] p-[1.5px] shadow-sm select-none shrink-0">
      <div className="size-full rounded-[4px] bg-[#d4af37] relative overflow-hidden border border-[#ffe599]/60">
        {/* Contact divider lines */}
        <div className="absolute inset-x-0 top-1/2 h-[1px] -translate-y-1/2 bg-[#5c4004]/50" />
        <div className="absolute inset-y-0 left-1/3 w-[1px] bg-[#5c4004]/50" />
        <div className="absolute inset-y-0 right-1/3 w-[1px] bg-[#5c4004]/50" />
        <div className="absolute top-1/4 left-1/4 size-2.5 rounded-full border border-[#5c4004]/40" />
      </div>
    </div>
  );
}

/**
 * Contactless NFC wave symbol `)))`
 */
export function ContactlessWave() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 text-white/70 select-none shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M8.5 8.5a5 5 0 0 1 7 7" />
      <path d="M5.5 5.5a9.5 9.5 0 0 1 13 13" />
      <path d="M2.5 2.5a14 14 0 0 1 19 19" />
    </svg>
  );
}

/**
 * Visa logo SVG
 */
export function VisaLogo({ className = 'h-4' }: { className?: string }) {
  return (
    <div className={`flex items-center select-none ${className}`} title="Visa">
      <span className="font-black italic text-lg sm:text-xl tracking-tighter text-white drop-shadow-xs font-sans">
        VISA
      </span>
    </div>
  );
}

/**
 * Mastercard logo with iconic overlapping red and yellow/orange circles
 */
export function MastercardLogo({ className = 'h-5' }: { className?: string }) {
  return (
    <div className={`flex items-center select-none ${className}`} title="Mastercard">
      <div className="relative flex items-center">
        <div className="size-4 sm:size-4.5 rounded-full bg-[#EB001B] shadow-xs" />
        <div className="size-4 sm:size-4.5 rounded-full bg-[#F79E1B] -ml-2 opacity-95 mix-blend-screen shadow-xs" />
      </div>
    </div>
  );
}

/**
 * JCB logo with iconic Blue, Red, Green vertical rounded badges
 */
export function JcbLogo({ className = 'h-5' }: { className?: string }) {
  return (
    <div className={`flex items-center select-none ${className}`} title="JCB">
      <svg viewBox="0 0 100 68" className="h-4.5 sm:h-5 aspect-[100/68] overflow-hidden rounded-[4px] shadow-2xs" aria-hidden="true">
        {/* JCB Blue rounded rect */}
        <rect x="0" y="0" width="31" height="68" rx="6" fill="#0060A9" />
        <text x="15.5" y="47" textAnchor="middle" fill="#FFFFFF" fontSize="30" fontWeight="900" fontFamily="sans-serif">J</text>
        {/* JCB Red rounded rect */}
        <rect x="34.5" y="0" width="31" height="68" rx="6" fill="#E60012" />
        <text x="50" y="47" textAnchor="middle" fill="#FFFFFF" fontSize="30" fontWeight="900" fontFamily="sans-serif">C</text>
        {/* JCB Green rounded rect */}
        <rect x="69" y="0" width="31" height="68" rx="6" fill="#00873C" />
        <text x="84.5" y="47" textAnchor="middle" fill="#FFFFFF" fontSize="30" fontWeight="900" fontFamily="sans-serif">B</text>
      </svg>
    </div>
  );
}

/**
 * UnionPay logo with 3 slanted interlocking banners
 */
export function UnionPayLogo({ className = 'h-5' }: { className?: string }) {
  return (
    <div className={`flex items-center select-none ${className}`} title="UnionPay">
      <svg viewBox="0 0 115 68" className="h-4 sm:h-4.5 aspect-[115/68] overflow-hidden rounded-[4px] shadow-2xs" aria-hidden="true">
        <rect width="115" height="68" fill="#D81E06" rx="4" />
        <path d="M32,68 L58,0 L88,0 L62,68 Z" fill="#004A80" />
        <path d="M60,68 L86,0 L115,0 L89,68 Z" fill="#007B7A" />
        <text x="57" y="44" textAnchor="middle" fill="#FFFFFF" fontSize="18" fontWeight="900" fontStyle="italic" fontFamily="sans-serif" letterSpacing="-0.5">UnionPay</text>
      </svg>
    </div>
  );
}

/**
 * American Express (AMEX) logo with iconic solid blue badge and bold typography
 */
export function AmexLogo({ className = 'h-5' }: { className?: string }) {
  return (
    <div className={`flex items-center select-none ${className}`} title="American Express">
      <div className="bg-[#006FCF] px-1.5 py-0.5 rounded-[4px] shadow-2xs flex items-center justify-center border border-white/20">
        <span className="text-[10px] sm:text-[11px] font-black tracking-tight text-white font-sans uppercase">
          AMEX
        </span>
      </div>
    </div>
  );
}

/**
 * Universal Card Network Logo Renderer
 */
export function CardNetworkLogo({
  network = 'visa',
  className,
}: {
  network?: CardNetwork;
  className?: string;
}) {
  switch (network) {
    case 'mastercard':
      return <MastercardLogo className={className || 'h-5'} />;
    case 'jcb':
      return <JcbLogo className={className || 'h-5'} />;
    case 'unionpay':
      return <UnionPayLogo className={className || 'h-5'} />;
    case 'amex':
      return <AmexLogo className={className || 'h-5'} />;
    case 'visa':
    default:
      return <VisaLogo className={className || 'h-4'} />;
  }
}
