import { BG_KEY, DEFAULT_BG, backgrounds } from '../../data/themes';
import { storageSet } from './storage';

const backgroundSet: ReadonlySet<string> = new Set(backgrounds);

export function applyBackground(key: string, persist = false): string {
  const applied = backgroundSet.has(key) ? key : DEFAULT_BG;
  document.documentElement.setAttribute('data-bg', applied);
  if (persist) storageSet(BG_KEY, applied);
  return applied;
}
