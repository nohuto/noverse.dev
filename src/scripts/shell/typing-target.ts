const typingElements = /^(?:input|select|textarea)$/i;
const interactiveElements =
  'a[href], button, input, select, textarea, summary, [contenteditable], [tabindex]:not([tabindex="-1"])';

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return typingElements.test(target.nodeName) || target.isContentEditable;
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element && target.closest(interactiveElements) !== null
  );
}
