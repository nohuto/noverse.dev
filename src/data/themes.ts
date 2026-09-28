export const THEME_KEY = 'nv-theme';
export const THEME_SYSTEM = 'system';
export const DEFAULT_DARK_THEME = 'gruvbox-dark';
export const DEFAULT_LIGHT_THEME = 'catppuccin-latte';

export const themes = [
  ['system', 'System'],
  ['dark', 'Dark'],
  ['light', 'Light'],
  ['ayu-dark', 'Ayu Dark'],
  ['ayu-light', 'Ayu Light'],
  ['catppuccin-frappe', 'Catppuccin Frappe'],
  ['catppuccin-latte', 'Catppuccin Latte'],
  ['catppuccin-macchiato', 'Catppuccin Macchiato'],
  ['catppuccin-mocha', 'Catppuccin Mocha'],
  ['everforest-dark', 'Everforest Dark'],
  ['everforest-light', 'Everforest Light'],
  ['gray-black', 'Gray Black'],
  ['gruvbox-dark', 'Gruvbox Dark'],
  ['gruvbox-light', 'Gruvbox Light'],
  ['horizon', 'Horizon'],
  ['kanagawa-dragon', 'Kanagawa Dragon'],
  ['kanagawa-lotus', 'Kanagawa Lotus'],
  ['kanagawa-wave', 'Kanagawa Wave'],
  ['monokai', 'Monokai'],
  ['night-owl', 'Night Owl'],
  ['nord', 'Nord'],
  ['one-dark', 'One Dark'],
  ['one-light', 'One Light'],
  ['purple-black', 'Purple Black'],
  ['rose-pine', 'Rose Pine'],
  ['rose-pine-moon', 'Rose Pine Moon'],
  ['solarized-dark', 'Solarized Dark'],
  ['solarized-light', 'Solarized Light'],
] as const;

export const lightThemes: ReadonlySet<string> = new Set([
  'light',
  'ayu-light',
  'catppuccin-latte',
  'everforest-light',
  'gruvbox-light',
  'kanagawa-lotus',
  'one-light',
  'solarized-light',
]);

export const BG_KEY = 'nv-bg';
export const DEFAULT_BG = 'crosshatch';
export const backgrounds = [
  'clear',
  'crosshatch',
  'diamonds',
  'noise',
  'dots',
  'grid',
  'starfield',
] as const;
