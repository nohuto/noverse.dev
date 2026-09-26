const EMAIL_KEY = 23;
const EMAIL_BYTES = [116, 120, 121, 99, 118, 116, 99, 87, 121, 120, 97, 114, 101, 100, 114, 57, 115, 114, 97];

function emailAddress(): string {
  return EMAIL_BYTES.map(byte => String.fromCharCode(byte ^ EMAIL_KEY)).join('');
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function showToast(message: string): void {
  const toast = document.querySelector<HTMLElement>('.toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

export async function copyText(value: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {}
  textarea.remove();
  return copied;
}

export function initClipboard(): void {
  const text = document.querySelector<HTMLElement>('[data-email-text]');
  if (text) text.textContent = emailAddress();

  document.addEventListener('click', async event => {
    if (!(event.target instanceof Element)) return;
    const source = event.target.closest<HTMLElement>('[data-email], [data-copy]');
    if (!source) return;
    const value = source.hasAttribute('data-email') ? emailAddress() : source.dataset.copy;
    if (!value) return;
    event.preventDefault();
    let copied = false;
    try {
      copied = await copyText(value);
    } catch {}
    showToast(copied ? source.dataset.toast || 'Copied' : 'Copy failed');
  });
}
