const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function createModalFocusManager(container: HTMLElement) {
  if (!(container instanceof HTMLElement)) return null;
  let returnFocus: HTMLElement | null = null;
  let active = false;

  const focusableElements = () => Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
    .filter(element => (
      element instanceof HTMLElement
      && !element.closest('[hidden]')
      && element.getClientRects().length > 0
      && getComputedStyle(element).visibility !== 'hidden'
    ));

  const trapFocus = (event: KeyboardEvent) => {
    if (!active || event.key !== 'Tab') return;
    const elements = focusableElements();
    if (!elements.length) {
      event.preventDefault();
      return;
    }
    const first = elements[0];
    const last = elements[elements.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && (current === first || !container.contains(current))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (current === last || !container.contains(current))) {
      event.preventDefault();
      first.focus();
    }
  };

  return {
    open(initialFocus?: HTMLElement) {
      if (!active) {
        returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        container.addEventListener('keydown', trapFocus);
        active = true;
      }
      requestAnimationFrame(() => {
        const target = initialFocus instanceof HTMLElement ? initialFocus : focusableElements()[0];
        target?.focus({ preventScroll: true });
      });
    },
    close() {
      if (!active) return;
      container.removeEventListener('keydown', trapFocus);
      active = false;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    }
  };
}

export function createDraggableDialogManager({ layer, dialog, handle, resizeHandle = null, margin = 0, topBiased = false }: {
  layer: HTMLElement; dialog: HTMLElement; handle: HTMLElement; resizeHandle?: HTMLElement | null;
  margin?: number; topBiased?: boolean;
}) {
  if (!(layer instanceof HTMLElement) || !(dialog instanceof HTMLElement) || !(handle instanceof HTMLElement)) return null;
  const focusManager = createModalFocusManager(layer);
  const resizer = resizeHandle instanceof HTMLElement ? resizeHandle : null;
  const inset = Math.max(0, Number(margin) || 0);
  const clampValue = (value, min, max) => Math.min(Math.max(min, value), max);
  let resizing = false;

  const trackPointer = (target: HTMLElement, startEvent: PointerEvent, move: (event: PointerEvent) => void, finish: () => void) => {
    let frame = 0;
    let currentEvent = startEvent;
    const paint = () => {
      frame = 0;
      move(currentEvent);
    };
    const onMove = event => {
      currentEvent = event;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const stop = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        paint();
      }
      if (target.hasPointerCapture(startEvent.pointerId)) target.releasePointerCapture(startEvent.pointerId);
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', stop);
      target.removeEventListener('pointercancel', stop);
      finish();
    };
    target.setPointerCapture(startEvent.pointerId);
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', stop);
    target.addEventListener('pointercancel', stop);
  };

  const viewport = () => {
    const visualViewport = window.visualViewport;
    const viewportLeft = visualViewport?.offsetLeft || 0;
    const viewportTop = visualViewport?.offsetTop || 0;
    const viewportWidth = visualViewport?.width || document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = visualViewport?.height || document.documentElement.clientHeight || window.innerHeight;
    const layerRect = layer.getBoundingClientRect();
    const left = Math.max(viewportLeft, layerRect.left);
    const top = Math.max(viewportTop, layerRect.top);
    const right = Math.min(viewportLeft + viewportWidth, layerRect.right);
    const bottom = Math.min(viewportTop + viewportHeight, layerRect.bottom);
    return {
      left,
      top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top)
    };
  };
  const minimumTop = view => {
    const siteHeader = document.querySelector('.prompt-bar');
    const headerBottom = siteHeader instanceof HTMLElement
      ? Math.ceil(siteHeader.getBoundingClientRect().bottom)
      : view.top;
    return Math.max(view.top + inset, headerBottom);
  };
  const bounds = () => {
    const view = viewport();
    const minTop = minimumTop(view);
    return {
      minLeft: view.left + inset,
      minTop,
      maxLeft: Math.max(view.left + inset, view.left + view.width - dialog.offsetWidth - inset),
      maxTop: Math.max(minTop, view.top + view.height - dialog.offsetHeight - inset)
    };
  };
  const position = (left, top) => {
    const offsetParent = dialog.offsetParent;
    const origin = offsetParent instanceof HTMLElement
      ? offsetParent.getBoundingClientRect()
      : { left: 0, top: 0 };
    dialog.style.left = `${left - origin.left}px`;
    dialog.style.top = `${top - origin.top}px`;
  };
  const clamp = () => {
    if (layer.hidden) return;
    if (dialog.dataset.positioned !== 'true') {
      center();
      return;
    }
    const { minLeft, minTop, maxLeft, maxTop } = bounds();
    const rect = dialog.getBoundingClientRect();
    position(
      clampValue(rect.left, minLeft, maxLeft),
      clampValue(rect.top, minTop, maxTop)
    );
  };
  const center = () => {
    const view = viewport();
    const freeY = view.height - dialog.offsetHeight;
    const centerY = freeY / 2;
    const biasToTop = topBiased && (view.width <= 580 || dialog.offsetHeight > view.height * 0.6);
    const { minLeft, minTop, maxLeft, maxTop } = bounds();
    const centeredLeft = view.left + (view.width - dialog.offsetWidth) / 2;
    const centeredTop = view.top + (biasToTop ? Math.min(centerY, inset * 2) : centerY);
    dialog.style.transform = 'none';
    position(
      clampValue(centeredLeft, minLeft, maxLeft),
      clampValue(centeredTop, minTop, maxTop)
    );
    dialog.dataset.positioned = 'true';
  };
  const onDragStart = event => {
    if (event.button !== 0 || layer.hidden || event.target instanceof Element && event.target.closest('button')) return;
    event.preventDefault();
    if (dialog.dataset.positioned !== 'true') center();
    const startX = event.clientX;
    const startY = event.clientY;
    const startRect = dialog.getBoundingClientRect();
    const startLeft = startRect.left;
    const startTop = startRect.top;
    const { minLeft, minTop, maxLeft, maxTop } = bounds();
    let lastLeft = startLeft;
    let lastTop = startTop;
    dialog.style.willChange = 'transform';

    trackPointer(handle, event, current => {
      lastLeft = clampValue(startLeft + current.clientX - startX, minLeft, maxLeft);
      lastTop = clampValue(startTop + current.clientY - startY, minTop, maxTop);
      dialog.style.transform = `translate3d(${lastLeft - startLeft}px, ${lastTop - startTop}px, 0)`;
    }, () => {
      dialog.style.transform = 'none';
      position(lastLeft, lastTop);
      dialog.style.willChange = '';
      dialog.dataset.positioned = 'true';
    });
  };

  const onResizeStart = event => {
    if (!resizer || event.button !== 0 || layer.hidden) return;
    event.preventDefault();
    event.stopPropagation();
    if (dialog.dataset.positioned !== 'true') center();
    const startX = event.clientX;
    const startY = event.clientY;
    const startRect = dialog.getBoundingClientRect();
    const styles = getComputedStyle(dialog);
    const minWidth = Number.parseFloat(styles.minWidth) || 0;
    const minHeight = Number.parseFloat(styles.minHeight) || 0;
    const view = viewport();
    const maxWidth = view.left + view.width - inset - startRect.left;
    const maxHeight = view.top + view.height - inset - startRect.top;
    resizing = true;
    dialog.style.willChange = 'width, height';

    trackPointer(resizer, event, current => {
      const width = clampValue(startRect.width + current.clientX - startX, minWidth, maxWidth);
      const height = clampValue(startRect.height + current.clientY - startY, minHeight, maxHeight);
      dialog.style.width = `${width}px`;
      dialog.style.height = `${height}px`;
    }, () => {
      dialog.style.willChange = '';
      resizing = false;
      clamp();
    });
  };

  handle.addEventListener('pointerdown', onDragStart);
  resizer?.addEventListener('pointerdown', onResizeStart);
  window.addEventListener('resize', clamp);
  window.visualViewport?.addEventListener('resize', clamp);
  window.visualViewport?.addEventListener('scroll', clamp);
  const resizeObserver = window.ResizeObserver
    ? new ResizeObserver(() => {
      if (!resizing) clamp();
    })
    : null;
  resizeObserver?.observe(dialog);

  return {
    open({ initialFocus, recenter = false }: { initialFocus?: HTMLElement; recenter?: boolean } = {}) {
      layer.hidden = false;
      requestAnimationFrame(() => {
        if (recenter || dialog.dataset.positioned !== 'true') center();
        else clamp();
        focusManager?.open(initialFocus);
      });
    },
    close() {
      layer.hidden = true;
      focusManager?.close();
    },
    destroy() {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', clamp);
      window.visualViewport?.removeEventListener('resize', clamp);
      window.visualViewport?.removeEventListener('scroll', clamp);
      handle.removeEventListener('pointerdown', onDragStart);
      resizer?.removeEventListener('pointerdown', onResizeStart);
      focusManager?.close();
    }
  };
}

window.NV_CREATE_DRAGGABLE_DIALOG_MANAGER = createDraggableDialogManager;

