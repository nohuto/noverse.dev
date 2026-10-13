const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(min, value), max);

export const trackPointer = (
  target: HTMLElement,
  startEvent: PointerEvent,
  move: (event: PointerEvent) => void,
  finish?: () => void,
) => {
  let frame = 0;
  let currentEvent = startEvent;
  const paint = () => {
    frame = 0;
    move(currentEvent);
  };
  const onMove = (event: PointerEvent) => {
    currentEvent = event;
    if (!frame) frame = requestAnimationFrame(paint);
  };
  const stop = () => {
    if (frame) {
      cancelAnimationFrame(frame);
      paint();
    }
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerup', stop);
    target.removeEventListener('pointercancel', stop);
    finish?.();
  };
  target.setPointerCapture(startEvent.pointerId);
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', stop);
  target.addEventListener('pointercancel', stop);
};

export function createDraggableDialog({
  layer,
  dialog,
  handle,
  resizeHandle = null,
  margin = 0,
  topBiased = false,
}: {
  layer: HTMLDialogElement;
  dialog: HTMLElement;
  handle: HTMLElement;
  resizeHandle?: HTMLElement | null;
  margin?: number;
  topBiased?: boolean;
}) {
  let resizing = false;

  const viewport = () => {
    const view = window.visualViewport!;
    return {
      left: view.offsetLeft,
      top: view.offsetTop,
      width: view.width,
      height: view.height,
    };
  };
  const bounds = () => {
    const view = viewport();
    return {
      minLeft: view.left + margin,
      minTop: view.top + margin,
      maxLeft: Math.max(
        view.left + margin,
        view.left + view.width - dialog.offsetWidth - margin,
      ),
      maxTop: Math.max(
        view.top + margin,
        view.top + view.height - dialog.offsetHeight - margin,
      ),
    };
  };
  const position = (left: number, top: number) => {
    const { minLeft, minTop, maxLeft, maxTop } = bounds();
    dialog.style.left = `${clamp(left, minLeft, maxLeft)}px`;
    dialog.style.top = `${clamp(top, minTop, maxTop)}px`;
  };
  const center = () => {
    const view = viewport();
    const centerY = (view.height - dialog.offsetHeight) / 2;
    const biasToTop =
      topBiased &&
      (view.width <= 580 || dialog.offsetHeight > view.height * 0.6);
    position(
      view.left + (view.width - dialog.offsetWidth) / 2,
      view.top + (biasToTop ? Math.min(centerY, margin * 2) : centerY),
    );
    dialog.dataset.positioned = 'true';
  };
  const reposition = () => {
    if (!layer.open || resizing) return;
    if (dialog.dataset.positioned !== 'true') center();
    else position(dialog.offsetLeft, dialog.offsetTop);
  };

  handle.addEventListener('pointerdown', (event) => {
    if (
      event.button !== 0 ||
      (event.target instanceof Element && event.target.closest('button'))
    )
      return;
    event.preventDefault();
    const startX = event.clientX - dialog.offsetLeft;
    const startY = event.clientY - dialog.offsetTop;
    trackPointer(handle, event, (current) =>
      position(current.clientX - startX, current.clientY - startY),
    );
  });

  resizeHandle?.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX - dialog.offsetWidth;
    const startY = event.clientY - dialog.offsetHeight;
    const styles = getComputedStyle(dialog);
    const minWidth = Number.parseFloat(styles.minWidth) || 0;
    const minHeight = Number.parseFloat(styles.minHeight) || 0;
    const view = viewport();
    const maxWidth = view.left + view.width - margin - dialog.offsetLeft;
    const maxHeight = view.top + view.height - margin - dialog.offsetTop;
    resizing = true;
    trackPointer(
      resizeHandle,
      event,
      (current) => {
        dialog.style.width = `${clamp(current.clientX - startX, minWidth, maxWidth)}px`;
        dialog.style.height = `${clamp(current.clientY - startY, minHeight, maxHeight)}px`;
      },
      () => {
        resizing = false;
        reposition();
      },
    );
  });

  window.visualViewport!.addEventListener('resize', reposition);
  window.visualViewport!.addEventListener('scroll', reposition);
  new ResizeObserver(reposition).observe(dialog);

  return ({
    initialFocus,
    recenter = false,
  }: { initialFocus?: HTMLElement; recenter?: boolean } = {}) => {
    layer.showModal();
    if (recenter) delete dialog.dataset.positioned;
    reposition();
    initialFocus?.focus();
  };
}
