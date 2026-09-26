type Modes = App.Locals['starlightViewModes']['modes'];
type Mode = Modes[number];

export function getZenTarget(
  modes: Modes,
  routeId: string,
): {
  target: Mode | undefined;
  isCurrent: boolean;
} {
  if (routeId === '404') return { target: undefined, isCurrent: false };
  const zenMode = modes.find((mode) => mode.name === 'zen-mode');
  const defaultMode = modes.find((mode) => mode.name === 'default');
  const isCurrent = Boolean(zenMode?.isCurrent);

  return { target: isCurrent ? defaultMode : zenMode, isCurrent };
}
