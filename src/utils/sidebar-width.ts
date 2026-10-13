export const SIDEBAR_DEFAULT_WIDTH = 296;
export const SIDEBAR_MIN_WIDTH = 240;
export const SIDEBAR_MAX_WIDTH = 480;
export function sidebarMaxWidth(viewportWidth: number) {
  return Math.max(
    SIDEBAR_MIN_WIDTH,
    Math.min(SIDEBAR_MAX_WIDTH, Math.floor(viewportWidth * 0.4)),
  );
}
export function sidebarWidth(value: number, viewportWidth: number) {
  return Math.round(
    Math.min(
      sidebarMaxWidth(viewportWidth),
      Math.max(
        SIDEBAR_MIN_WIDTH,
        Number.isFinite(value) && value > 0 ? value : SIDEBAR_DEFAULT_WIDTH,
      ),
    ),
  );
}
