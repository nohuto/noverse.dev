import { copyText, showToast } from '../shell/clipboard';
import type { StorageEntry } from './types';

export const createNode = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string | null = null,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (typeof text === 'string') node.textContent = text;
  return node;
};

const copyPolicyText = async (text: string, successMessage = 'Copied') => {
  if (!text) return;
  showToast((await copyText(text)) ? successMessage : 'Copy failed');
};

export const createCopyBox = (
  className: string,
  text: string,
  label = 'Copy',
  successMessage = 'Copied',
  prefixText = '',
) => {
  const box = createNode('div', className);
  const labelNode = createNode('span', 'policy-copy-text', text || '');
  box.appendChild(labelNode);
  if (prefixText) {
    box.classList.add('has-prefix');
    box.appendChild(createNode('span', 'policy-copy-prefix', prefixText));
  }
  const button = createNode('button', 'policy-copy-button');
  button.type = 'button';
  button.title = label;
  button.setAttribute('aria-label', label);
  const iconNode = createNode('span', 'policy-copy-icon');
  iconNode.setAttribute('aria-hidden', 'true');
  button.appendChild(iconNode);
  button.addEventListener('click', () =>
    copyPolicyText(text || '', successMessage),
  );
  box.appendChild(button);
  return box;
};

export const createPolicyValueTitle = (
  entry: StorageEntry,
  typeText: string,
) => {
  if (entry.copyValue !== null) {
    return createCopyBox(
      'policy-copy-box policy-value-name',
      entry.valueName,
      'Copy value name',
      'Copied value',
      typeText,
    );
  }

  const title = createNode('div', 'policy-value-title');
  title.appendChild(createNode('span', 'policy-copy-text', entry.valueName));
  if (typeText) {
    title.appendChild(createNode('span', 'policy-copy-prefix', typeText));
  }
  return title;
};

export const closeOnFocusLeave = (
  container: HTMLElement | null,
  close: () => void,
) =>
  container?.addEventListener('focusout', (event) => {
    const next = event.relatedTarget;
    if (next instanceof Node && !container.contains(next)) close();
  });
