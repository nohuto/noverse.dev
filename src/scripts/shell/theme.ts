import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  THEME_KEY,
  THEME_SYSTEM,
  lightThemes,
  themes,
} from '../../data/themes';
import { storageGet, storageSet } from './storage';

const root = document.documentElement;
const system = matchMedia('(prefers-color-scheme: light)');

function applyTheme(setting: string) {
  const selected = themes.some(([value]) => value === setting)
    ? setting
    : THEME_SYSTEM;
  const palette =
    selected === THEME_SYSTEM
      ? system.matches
        ? DEFAULT_LIGHT_THEME
        : DEFAULT_DARK_THEME
      : selected;
  const isLight = lightThemes.has(palette);
  root.dataset.themeSetting = selected;
  root.dataset.theme = isLight ? 'light' : 'dark';
  document
    .querySelectorAll<HTMLElement>('[data-theme-toggle]')
    .forEach((button) => {
      button.setAttribute(
        'aria-label',
        `Switch to ${isLight ? 'dark' : 'light'} theme`,
      );
      button.setAttribute('aria-pressed', String(isLight));
    });
  document.dispatchEvent(new Event('nv:theme-change'));
  return selected;
}

export function setTheme(setting: string) {
  storageSet(THEME_KEY, applyTheme(setting));
}

applyTheme(storageGet(THEME_KEY, root.dataset.themeSetting || THEME_SYSTEM));
document
  .querySelectorAll('[data-theme-toggle]')
  .forEach((button) =>
    button.addEventListener('click', () =>
      setTheme(
        root.dataset.theme === 'light'
          ? DEFAULT_DARK_THEME
          : DEFAULT_LIGHT_THEME,
      ),
    ),
  );
system.addEventListener('change', () => {
  if (root.dataset.themeSetting === THEME_SYSTEM) applyTheme(THEME_SYSTEM);
});
