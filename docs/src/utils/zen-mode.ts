import type { StarlightViewModesRouteData } from 'starlight-view-modes/data';

type Mode = StarlightViewModesRouteData['modes'][number];

export function getZenTarget(modes: StarlightViewModesRouteData['modes']): {
  target: Mode | undefined;
  isCurrent: boolean;
} {
  const zenMode = modes.find((mode) => mode.name === 'zen-mode');
  const defaultMode = modes.find((mode) => mode.name === 'default');
  const isCurrent = Boolean(zenMode?.isCurrent);

  return { target: isCurrent ? defaultMode : zenMode, isCurrent };
}
