/* Copyright (c) 2026 nohuto */
const THEME_KEY = 'nv-theme';
const THEME_SYSTEM = 'system';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';
const DEFAULT_THEME = 'gruvbox-dark';
const DEFAULT_LIGHT_THEME = 'catppuccin-latte';
const LIGHT_THEMES = new Set([
  THEME_LIGHT,
  'gruvbox-light',
  'kanagawa-lotus',
  'catppuccin-latte',
  'solarized-light',
  'one-light',
  'ayu-light',
  'everforest-light'
]);
const BG_KEY = 'nv-bg';
const DEFAULT_BG = 'crosshatch';
const BG_KEYS = ['clear', 'crosshatch', 'diamonds', 'noise', 'dots', 'grid', 'starfield'];
const BG_SET = new Set(BG_KEYS);
window.NV_BACKGROUND_KEYS = BG_KEYS;
const MAIN_PAGE_ROUTES = Object.freeze([
  { slug: 'home', clean: '/' },
  { slug: 'terminal', clean: '/terminal' },
  { slug: 'product', clean: '/product' },
  { slug: 'projects', clean: '/projects' },
  { slug: 'diff', clean: '/diff' },
  { slug: 'policies', clean: '/policies' }
]);
const ACTIVE_PAGE_KEY = 'nv-active-page-path';
const NOT_FOUND_KEY = 'nv-not-found-path';
const MAIN_PAGE_PATHS = new Set(MAIN_PAGE_ROUTES.map(route => route.clean));
window.NV_MAIN_ROUTES = MAIN_PAGE_ROUTES;
const SELECT_SEARCH_RENDER_LIMIT_DEFAULT = 300;
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: light)';

let toastTimer;
let selectUiListener;
let selectUiKeyListener;
let openSelectUI;
let siteErrorDialogManager;
let searchShortcutInput;
let searchShortcutListener;

const EMAIL_KEY = 23;
const EMAIL_BYTES = [116, 120, 121, 99, 118, 116, 99, 87, 121, 120, 97, 114, 101, 100, 114, 57, 115, 114, 97];

const getEmailAddress = () =>
  EMAIL_BYTES.map(byte => String.fromCharCode(byte ^ EMAIL_KEY)).join('');

function initEmailText() {
  const target = document.querySelector('[data-email-text]');
  if (target) target.textContent = getEmailAddress();
}

const storageGet = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

const storageSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch { }
};

const normalizeMainPagePath = pathname => {
  let path = `/${String(pathname || '').replace(/^\/+|\/+$/g, '')}`.toLowerCase();
  if (path === '/index.html') path = '/';
  else if (path.endsWith('.html')) path = path.slice(0, -5);
  return MAIN_PAGE_PATHS.has(path) ? path : null;
};

const rememberActivePage = pathname => {
  const path = normalizeMainPagePath(pathname);
  if (!path) return;
  try {
    sessionStorage.setItem(ACTIVE_PAGE_KEY, path);
  } catch { }
};

const consumeNotFoundPath = () => {
  try {
    const path = sessionStorage.getItem(NOT_FOUND_KEY) || '';
    sessionStorage.removeItem(NOT_FOUND_KEY);
    return path;
  } catch {
    return '';
  }
};

const hasSelectOption = (select, value) => Array.from(select.options).some(option => option.value === value);
const closeSelectUIs = (restoreFocus = false) => {
  if (!openSelectUI) return;
  const trigger = openSelectUI.querySelector('.select-trigger');
  openSelectUI.classList.remove('open', 'open-up');
  openSelectUI.querySelector('.select-list')?.style.removeProperty('max-height');
  trigger?.setAttribute('aria-expanded', 'false');
  openSelectUI = null;
  if (restoreFocus && trigger instanceof HTMLElement) trigger.focus({ preventScroll: true });
};

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function createModalFocusManager(container) {
  if (!(container instanceof HTMLElement)) return null;
  let returnFocus = null;
  let active = false;

  const focusableElements = () => Array.from(container.querySelectorAll(focusableSelector))
    .filter(element => (
      element instanceof HTMLElement
      && !element.closest('[hidden]')
      && element.getClientRects().length > 0
      && getComputedStyle(element).visibility !== 'hidden'
    ));

  const trapFocus = event => {
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
    open(initialFocus) {
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

function createDraggableDialogManager({ layer, dialog, handle, margin = 0, topBiased = false }) {
  if (!(layer instanceof HTMLElement) || !(dialog instanceof HTMLElement) || !(handle instanceof HTMLElement)) return null;
  const focusManager = createModalFocusManager(layer);
  const inset = Math.max(0, Number(margin) || 0);

  const viewport = () => {
    const visualViewport = window.visualViewport;
    return {
      left: visualViewport?.offsetLeft || 0,
      top: visualViewport?.offsetTop || 0,
      width: visualViewport?.width || document.documentElement.clientWidth || window.innerWidth,
      height: visualViewport?.height || document.documentElement.clientHeight || window.innerHeight
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
  const clamp = () => {
    if (layer.hidden) return;
    if (dialog.dataset.positioned !== 'true') {
      center();
      return;
    }
    const { minLeft, minTop, maxLeft, maxTop } = bounds();
    const rect = dialog.getBoundingClientRect();
    dialog.style.left = `${Math.min(Math.max(minLeft, rect.left), maxLeft)}px`;
    dialog.style.top = `${Math.min(Math.max(minTop, rect.top), maxTop)}px`;
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
    dialog.style.left = `${Math.min(Math.max(minLeft, centeredLeft), maxLeft)}px`;
    dialog.style.top = `${Math.min(Math.max(minTop, centeredTop), maxTop)}px`;
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
    let frame = 0;
    let pendingX = startX;
    let pendingY = startY;
    let lastLeft = startLeft;
    let lastTop = startTop;
    handle.setPointerCapture(event.pointerId);
    dialog.style.willChange = 'transform';

    const paint = () => {
      frame = 0;
      lastLeft = Math.min(Math.max(minLeft, startLeft + pendingX - startX), maxLeft);
      lastTop = Math.min(Math.max(minTop, startTop + pendingY - startY), maxTop);
      dialog.style.transform = `translate3d(${lastLeft - startLeft}px, ${lastTop - startTop}px, 0)`;
    };
    const move = moveEvent => {
      pendingX = moveEvent.clientX;
      pendingY = moveEvent.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const stop = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        paint();
      }
      dialog.style.transform = 'none';
      dialog.style.left = `${lastLeft}px`;
      dialog.style.top = `${lastTop}px`;
      dialog.style.willChange = '';
      dialog.dataset.positioned = 'true';
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', stop);
      handle.removeEventListener('pointercancel', stop);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
  };

  handle.addEventListener('pointerdown', onDragStart);
  window.addEventListener('resize', clamp);
  window.visualViewport?.addEventListener('resize', clamp);
  window.visualViewport?.addEventListener('scroll', clamp);
  const resizeObserver = window.ResizeObserver ? new ResizeObserver(clamp) : null;
  resizeObserver?.observe(dialog);

  return {
    open({ initialFocus, recenter = false } = {}) {
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
      focusManager?.close();
    }
  };
}

window.NV_CREATE_DRAGGABLE_DIALOG_MANAGER = createDraggableDialogManager;

function updateIconTheme(theme) {
  const applied = resolveTheme(theme || document.documentElement.getAttribute('data-theme') || DEFAULT_THEME);
  const useLight = LIGHT_THEMES.has(applied);
  document.querySelectorAll('img[data-dark-src][data-light-src]').forEach(img => {
    const next = useLight ? img.getAttribute('data-light-src') : img.getAttribute('data-dark-src');
    if (!next || img.getAttribute('src') === next) return;
    img.setAttribute('src', next);
  });
}

function getSystemDefaultTheme() {
  try {
    return window.matchMedia(SYSTEM_THEME_QUERY).matches ? THEME_LIGHT : THEME_DARK;
  } catch {
    return THEME_DARK;
  }
}

function normalizeTheme(theme) {
  return String(theme || '').trim();
}

function resolveTheme(theme) {
  const normalized = normalizeTheme(theme);
  return normalized === THEME_SYSTEM ? getSystemDefaultTheme() : (normalized || THEME_DARK);
}

function applyTheme(theme) {
  const selected = normalizeTheme(theme || DEFAULT_THEME);
  const applied = resolveTheme(selected);
  document.documentElement.setAttribute('data-theme-setting', selected);
  document.documentElement.setAttribute('data-theme', applied);
  updateIconTheme(applied);
  document.dispatchEvent(new CustomEvent('nv:theme-change', {
    detail: {
      theme: selected,
      appliedTheme: applied,
      isLight: LIGHT_THEMES.has(applied)
    }
  }));
  return selected;
}

function syncThemeControls(theme = document.documentElement.getAttribute('data-theme-setting') || DEFAULT_THEME) {
  const selected = normalizeTheme(theme || DEFAULT_THEME);
  const applied = resolveTheme(selected);
  const isLight = LIGHT_THEMES.has(applied);
  const select = document.getElementById('theme-select');
  if (select && hasSelectOption(select, selected)) {
    select.value = selected;
    const selectedOption = select.options[select.selectedIndex];
    const selectUI = select.closest('.select-ui');
    const label = selectUI?.querySelector('.select-trigger-label');
    if (label && selectedOption) label.textContent = selectedOption.textContent;
    selectUI?.querySelectorAll('.select-option').forEach(option => {
      const active = option.dataset.value === selected;
      option.classList.toggle('is-active', active);
      option.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    button.dataset.themeMode = isLight ? 'light' : 'dark';
    button.setAttribute('aria-label', `Switch to ${isLight ? 'dark' : 'light'} theme`);
    button.setAttribute('aria-pressed', isLight ? 'true' : 'false');
  });
}

function initSelectUI() {
  const selects = document.querySelectorAll('.footer-tools select, select.select-enhanced');
  if (!selects.length) return;

  selects.forEach(select => {
    if (select.dataset.ui === 'true') return;
    select.dataset.ui = 'true';

    const wrapper = document.createElement('div');
    wrapper.className = 'select-ui';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const triggerLabel = document.createElement('span');
    triggerLabel.className = 'select-trigger-label';
    trigger.appendChild(triggerLabel);

    const label = document.querySelector(`label[for="${select.id}"]`);
    if (label && label.textContent) {
      label.id ||= `${select.id}-label`;
      label.removeAttribute('for');
      trigger.setAttribute('aria-labelledby', label.id);
    }

    const menu = document.createElement('div');
    menu.className = 'select-menu';
    const isSearchable = select.dataset.searchable === 'true';
    if (isSearchable) {
      wrapper.classList.add('is-searchable');
    }
    let searchValue = '';

    let searchInput = null;
    let menuMeta = null;
    let menuMetaText = null;
    let limitInput = null;
    let unlimitedInput = null;
    if (isSearchable) {
      searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'select-search';
      searchInput.placeholder = 'Filter...';
      searchInput.setAttribute('aria-label', 'Filter options');
      menu.appendChild(searchInput);

      menuMeta = document.createElement('div');
      menuMeta.className = 'select-menu-meta';
      menuMetaText = document.createElement('span');
      menuMetaText.className = 'select-menu-meta-text';
      menuMeta.appendChild(menuMetaText);

      const limitControls = document.createElement('div');
      limitControls.className = 'select-limit-controls';
      const limitLabel = document.createElement('label');
      limitLabel.className = 'select-limit-label';
      limitLabel.textContent = 'Limit';
      limitInput = document.createElement('input');
      limitInput.type = 'number';
      limitInput.className = 'select-limit-input';
      limitInput.min = '1';
      limitInput.step = '1';
      limitLabel.appendChild(limitInput);
      const unlimitedLabel = document.createElement('label');
      unlimitedLabel.className = 'select-limit-toggle';
      unlimitedInput = document.createElement('input');
      unlimitedInput.type = 'checkbox';
      unlimitedLabel.appendChild(unlimitedInput);
      unlimitedLabel.appendChild(document.createTextNode('Unlimited'));
      limitControls.append(limitLabel, unlimitedLabel);
      menuMeta.appendChild(limitControls);
    }

    const list = document.createElement('div');
    list.className = 'select-list';
    list.id = `${select.id || `select-${Math.random().toString(36).slice(2)}`}-listbox`;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', label?.textContent?.trim() || select.getAttribute('aria-label') || 'Options');
    trigger.setAttribute('aria-controls', list.id);
    menu.appendChild(list);
    if (menuMeta) menu.appendChild(menuMeta);

    let optionsDirty = true;
    const getSearchRenderLimit = () => {
      const raw = (select.dataset.searchLimit || '').trim().toLowerCase();
      if (!raw) return SELECT_SEARCH_RENDER_LIMIT_DEFAULT;
      if (raw === 'all' || raw === 'unlimited' || raw === '0' || raw === 'inf' || raw === 'infinity') {
        return Number.POSITIVE_INFINITY;
      }
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed) || parsed < 1) return SELECT_SEARCH_RENDER_LIMIT_DEFAULT;
      return parsed;
    };

    const syncLimitControls = () => {
      if (!limitInput || !unlimitedInput) return;
      const limit = getSearchRenderLimit();
      const unlimited = !Number.isFinite(limit);
      unlimitedInput.checked = unlimited;
      limitInput.disabled = unlimited;
      if (!unlimited) {
        limitInput.value = String(limit);
      } else if (!limitInput.value) {
        limitInput.value = String(SELECT_SEARCH_RENDER_LIMIT_DEFAULT);
      }
    };

    const escapeSearchRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wildcardToRegexPattern = term => {
      let pattern = '';
      for (const char of term) {
        if (char === '*') {
          pattern += '.*';
        } else if (char === '?') {
          pattern += '.';
        } else {
          pattern += escapeSearchRegex(char);
        }
      }
      return pattern;
    };

    const buildSearchMatcher = filterText => {
      const raw = (filterText || '').trim();
      if (!raw) return null;

      const terms = raw.split(/\s+/).filter(Boolean);
      const checks = terms.map(term => /[*?]/.test(term)
        ? new RegExp(wildcardToRegexPattern(term), 'i')
        : term.toLowerCase());

      return text => {
        const value = text || '';
        const lowerValue = value.toLowerCase();
        return checks.every(check => typeof check === 'string'
          ? lowerValue.includes(check)
          : check.test(value));
      };
    };

    const buildOptions = (filterText = '') => {
      list.replaceChildren();
      const normalizedFilter = (filterText || '').trim();
      const matcher = buildSearchMatcher(normalizedFilter);
      const allOptions = Array.from(select.options);
      const filteredOptions = matcher
        ? allOptions.filter(option => matcher(option.textContent || ''))
        : allOptions;
      const searchRenderLimit = getSearchRenderLimit();
      const optionsToRender = isSearchable && Number.isFinite(searchRenderLimit)
        ? filteredOptions.slice(0, searchRenderLimit)
        : filteredOptions;
      const fragment = document.createDocumentFragment();

      optionsToRender.forEach(option => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'select-option';
        const labelSpan = document.createElement('span');
        labelSpan.className = 'select-option-label';
        labelSpan.textContent = option.textContent;
        btn.appendChild(labelSpan);
        btn.dataset.value = option.value;
        btn.setAttribute('role', 'option');
        btn.setAttribute('aria-selected', option.selected ? 'true' : 'false');
        if (option.disabled) {
          btn.disabled = true;
          btn.classList.add('is-disabled');
        }
        fragment.appendChild(btn);
      });
      list.appendChild(fragment);

      if (menuMetaText) {
        syncLimitControls();
        if (!filteredOptions.length) {
          menuMetaText.textContent = 'No matches';
        } else if (isSearchable && filteredOptions.length > optionsToRender.length) {
          menuMetaText.textContent = `Showing ${optionsToRender.length} / ${filteredOptions.length}`;
        } else {
          menuMetaText.textContent = `${filteredOptions.length} option${filteredOptions.length === 1 ? '' : 's'}`;
        }
      }
      optionsDirty = false;
    };

    const setSearchRenderLimit = value => {
      const parsed = Number.parseInt(String(value || ''), 10);
      select.dataset.searchLimit = Number.isFinite(parsed) && parsed > 0 ? String(parsed) : String(SELECT_SEARCH_RENDER_LIMIT_DEFAULT);
      buildOptions(searchValue);
      updateActive();
    };

    const updateActive = () => {
      const active = select.value;
      const selected = select.options[select.selectedIndex];
      triggerLabel.textContent = selected ? selected.textContent : active;
      list.querySelectorAll('.select-option').forEach(btn => {
        const isActive = btn.dataset.value === active;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    };

    const syncMenuOptions = (forceRebuild = false) => {
      if (forceRebuild) optionsDirty = true;
      if (!wrapper.classList.contains('open')) {
        updateActive();
        return;
      }
      if (optionsDirty) {
        buildOptions(searchValue);
      }
      updateActive();
    };

    const positionMenu = () => {
      wrapper.classList.remove('open-up');
      list.style.removeProperty('max-height');
      const triggerRect = trigger.getBoundingClientRect();
      const headerBottom = document.querySelector('.prompt-bar')?.getBoundingClientRect().bottom || 0;
      const gap = 4;
      const below = Math.max(0, innerHeight - triggerRect.bottom - gap - 8);
      const above = Math.max(0, triggerRect.top - gap - Math.max(8, headerBottom));
      const menuHeight = menu.offsetHeight;
      const openUp = below < menuHeight && above > below;
      const room = openUp ? above : below;
      const chromeHeight = menuHeight - list.offsetHeight;
      list.style.maxHeight = `${Math.min(240, Math.max(0, room - chromeHeight))}px`;
      wrapper.classList.toggle('open-up', openUp);

      const menuRect = menu.getBoundingClientRect();
      const overflow = openUp
        ? Math.max(8, headerBottom) - menuRect.top
        : menuRect.bottom - (innerHeight - 8);
      if (overflow > 0) {
        list.style.maxHeight = `${Math.max(0, list.offsetHeight - Math.ceil(overflow))}px`;
      }
    };

    const focusListOption = target => {
      const options = Array.from(list.querySelectorAll('.select-option:not(:disabled)'));
      if (!options.length) return;
      const activeIndex = options.findIndex(option => option.classList.contains('is-active'));
      const index = target === 'last'
        ? options.length - 1
        : target === 'active' && activeIndex >= 0 ? activeIndex : 0;
      options[index]?.focus({ preventScroll: true });
    };

    const toggleOpen = (focusTarget = 'active') => {
      const next = !wrapper.classList.contains('open');
      closeSelectUIs();
      if (!next) return;
      openSelectUI = wrapper;
      wrapper.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      syncMenuOptions();
      positionMenu();
      if (searchInput) {
        requestAnimationFrame(() => searchInput?.focus({ preventScroll: true }));
      } else {
        requestAnimationFrame(() => focusListOption(focusTarget));
      }
    };

    updateActive();
    select.addEventListener('change', () => syncMenuOptions());
    select.addEventListener('nv:options-updated', event => {
      if (searchInput && event instanceof CustomEvent && event.detail?.resetSearch) {
        searchValue = '';
        searchInput.value = '';
      }
      syncMenuOptions(true);
    });
    list.addEventListener('click', event => {
      const optionButton = event.target.closest('.select-option');
      if (!optionButton || !list.contains(optionButton) || optionButton.disabled) return;
      select.value = optionButton.dataset.value || '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      closeSelectUIs();
      trigger.focus({ preventScroll: true });
    });
    trigger.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
      toggleOpen();
    });
    trigger.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!wrapper.classList.contains('open')) {
          toggleOpen(event.key === 'ArrowUp' ? 'last' : 'active');
        }
      }
    });
    list.addEventListener('keydown', event => {
      const options = Array.from(list.querySelectorAll('.select-option:not(:disabled)'));
      const current = event.target instanceof Element ? event.target.closest('.select-option') : null;
      const index = options.indexOf(current);
      let nextIndex = -1;
      if (event.key === 'ArrowDown') nextIndex = index < 0 ? 0 : (index + 1) % options.length;
      else if (event.key === 'ArrowUp') nextIndex = index < 0 ? options.length - 1 : (index - 1 + options.length) % options.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = options.length - 1;
      else if (event.key === 'Escape') {
        event.preventDefault();
        closeSelectUIs(true);
        return;
      } else if (event.key === 'Tab') {
        closeSelectUIs();
        return;
      }
      if (nextIndex < 0 || !options.length) return;
      event.preventDefault();
      options[nextIndex]?.focus({ preventScroll: true });
    });
    menu.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSelectUIs(true);
        return;
      }
      if (event.key !== 'Tab') return;
      requestAnimationFrame(() => {
        if (!wrapper.contains(document.activeElement)) closeSelectUIs();
      });
    });
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchValue = searchInput.value;
        buildOptions(searchValue);
        updateActive();
      });
    }
    if (limitInput && unlimitedInput) {
      limitInput.addEventListener('input', () => {
        if (unlimitedInput.checked || !limitInput.value) return;
        setSearchRenderLimit(limitInput.value);
      });
      limitInput.addEventListener('change', () => {
        if (!unlimitedInput.checked) setSearchRenderLimit(limitInput.value);
      });
      unlimitedInput.addEventListener('change', () => {
        if (unlimitedInput.checked) {
          select.dataset.searchLimit = 'all';
          buildOptions(searchValue);
          updateActive();
          return;
        }
        setSearchRenderLimit(limitInput.value);
      });
    }

    const parent = select.parentNode;
    parent.insertBefore(wrapper, select);
    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
    wrapper.appendChild(select);
    select.classList.add('select-native');
    select.setAttribute('tabindex', '-1');
    select.setAttribute('aria-hidden', 'true');
  });
  updateIconTheme();

  if (!selectUiListener) {
    selectUiListener = e => {
      if (!e.target.closest('.select-ui')) closeSelectUIs();
    };
    selectUiKeyListener = e => {
      if (e.key === 'Escape') closeSelectUIs(true);
    };
    document.addEventListener('click', selectUiListener);
    document.addEventListener('keydown', selectUiKeyListener);
    window.addEventListener('resize', closeSelectUIs);
    window.addEventListener('scroll', closeSelectUIs, { passive: true });
  }
}

function initTheme() {
  const select = document.getElementById('theme-select');

  const stored = normalizeTheme(storageGet(THEME_KEY, document.documentElement.getAttribute('data-theme-setting') || DEFAULT_THEME));
  const initial = select ? (hasSelectOption(select, stored) ? stored : DEFAULT_THEME) : stored || DEFAULT_THEME;
  applyTheme(initial);
  syncThemeControls(initial);

  if (select && select.dataset.themeReady !== 'true') {
    select.dataset.themeReady = 'true';
    select.addEventListener('change', () => {
      const next = select.value || DEFAULT_THEME;
      applyTheme(next);
      storageSet(THEME_KEY, next);
      syncThemeControls(next);
    });
  }

  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    if (button.dataset.themeReady === 'true') return;
    button.dataset.themeReady = 'true';
    button.addEventListener('click', () => {
      const current = resolveTheme(document.documentElement.getAttribute('data-theme-setting') || DEFAULT_THEME);
      const next = LIGHT_THEMES.has(current) ? DEFAULT_THEME : DEFAULT_LIGHT_THEME;
      applyTheme(next);
      storageSet(THEME_KEY, next);
      syncThemeControls(next);
    });
  });

  try {
    const media = window.matchMedia(SYSTEM_THEME_QUERY);
    const syncSystemTheme = () => {
      if ((document.documentElement.getAttribute('data-theme-setting') || '') !== THEME_SYSTEM) return;
      applyTheme(THEME_SYSTEM);
      syncThemeControls(THEME_SYSTEM);
    };
    media.addEventListener('change', syncSystemTheme);
  } catch { }
}

function applyBackground(key) {
  const applied = BG_SET.has(key) ? key : DEFAULT_BG;
  document.documentElement.setAttribute('data-bg', applied);
  return applied;
}

window.NV_APPLY_BACKGROUND = key => {
  const applied = applyBackground(key);
  storageSet(BG_KEY, applied);
  return applied;
};

function initBackground() {
  const stored = storageGet(BG_KEY, document.documentElement.getAttribute('data-bg') || DEFAULT_BG);
  const initial = BG_SET.has(stored) ? stored : DEFAULT_BG;
  const applied = applyBackground(initial);
  storageSet(BG_KEY, applied);
}

function showToast(message) {
  const toast = document.querySelector('.toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  textarea.remove();
  return ok;
}

function initClipboard() {
  document.addEventListener('click', async e => {
    const target = e.target.closest('[data-copy]');
    const emailTarget = e.target.closest('[data-email]');
    const source = emailTarget || target;
    if (!source) return;
    const text = emailTarget ? getEmailAddress() : source.getAttribute('data-copy');
    if (!text) return;
    e.preventDefault();
    let ok = false;
    try {
      ok = await copyText(text);
    } catch {
      ok = false;
    }
    const message = source.getAttribute('data-toast') || (ok ? 'Key copied' : 'Copy failed');
    showToast(message);
  });
}

function initFiltering() {
  const searchInput = document.getElementById('project-search');
  const cards = Array.from(document.querySelectorAll('.project-card'));
  const emptyState = document.getElementById('project-empty');

  if (!searchInput || cards.length === 0) return;

  const cardData = cards.map(card => {
    const title = (card.querySelector('.project-title')?.textContent || '').toLowerCase();
    const repo = (card.getAttribute('data-repo') || '').toLowerCase();
    const descEl = card.querySelector('.project-desc');
    return { card, title, repo, descEl };
  });

  const applyFilter = () => {
    const search = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    cardData.forEach(({ card, title, repo, descEl }) => {
      const desc = (descEl?.textContent || '').toLowerCase();
      card.hidden = !!search
        && !title.includes(search)
        && !repo.includes(search)
        && !desc.includes(search);
      if (!card.hidden) visibleCount += 1;
    });
    if (emptyState) emptyState.hidden = visibleCount > 0;
  };

  searchInput.addEventListener('input', applyFilter);
  applyFilter();
}

function initSearchShortcut() {
  const searchInput = document.querySelector('#project-search, #policy-search');
  searchShortcutInput = searchInput instanceof HTMLElement ? searchInput : null;

  const isApplePlatform = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
  document.querySelectorAll('.nv-search-box').forEach(searchBox => {
    const input = searchBox.querySelector('input');
    const shortcut = searchBox.querySelector('.nv-search-shortcut');
    if (!(input instanceof HTMLElement) || !(shortcut instanceof HTMLElement)) return;
    const platformKey = shortcut.querySelector('kbd');
    if (platformKey) platformKey.textContent = isApplePlatform ? '\u2318' : 'Ctrl';
    input.setAttribute('aria-keyshortcuts', isApplePlatform ? 'Meta+K' : 'Control+K');
    shortcut.hidden = false;
  });

  if (!searchShortcutInput || searchShortcutListener) return;

  searchShortcutListener = event => {
    const activeInput = searchShortcutInput;
    if (!activeInput || !activeInput.isConnected) return;
    if (event.key.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    activeInput.focus({ preventScroll: true });
    activeInput.select?.();
  };
  document.addEventListener('keydown', searchShortcutListener);
}

function hideSiteError() {
  const modal = document.getElementById('site-error-modal');
  if (!modal) return;
  siteErrorDialogManager?.close();
}

function createSiteErrorModal() {
  const modal = document.createElement('div');
  modal.className = 'settings-modal site-error-modal';
  modal.id = 'site-error-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <section class="settings-dialog site-error-dialog" role="alertdialog" aria-modal="true" aria-labelledby="site-error-title" aria-describedby="site-error-message">
      <header class="settings-header site-error-header">
        <h2 id="site-error-title">404</h2>
        <button class="settings-close" type="button" data-site-error-close aria-label="Close error message" title="Close error message">
          <span class="settings-close-icon" aria-hidden="true"></span>
        </button>
      </header>
      <div class="settings-body site-error-body">
        <p id="site-error-message">The requested page could not be found.</p>
        <code class="site-error-path"></code>
      </div>
    </section>`;

  const dialog = modal.querySelector('.site-error-dialog');
  const header = modal.querySelector('.site-error-header');
  if (!(dialog instanceof HTMLElement) || !(header instanceof HTMLElement)) return modal;

  siteErrorDialogManager = createDraggableDialogManager({ layer: modal, dialog, handle: header });
  modal.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (target === modal || target?.closest('[data-site-error-close]')) hideSiteError();
  });
  modal.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    hideSiteError();
  });
  document.body.appendChild(modal);
  return modal;
}

function showNotFoundError(url) {
  const modal = document.getElementById('site-error-modal') || createSiteErrorModal();
  const requestedUrl = new URL(url, location.href);
  const pathElement = modal.querySelector('.site-error-path');
  if (pathElement) pathElement.textContent = `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`;
  siteErrorDialogManager?.open({
    initialFocus: modal.querySelector('[data-site-error-close]'),
    recenter: true
  });
}

function initPageNavShortcut() {
  const paths = Array.from(document.querySelectorAll('.nav-tabs a'))
    .map(link => link.getAttribute('href') || '')
    .filter(Boolean)
    .map(href => normalizeMainPagePath(href) || href);
  const index = paths.indexOf(normalizeMainPagePath(location.pathname));
  if (paths.length < 2 || index < 0) return;

  const isApple = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
  const guarded = 'input, select, textarea, [contenteditable=""], [contenteditable="true"], [role="tree"], [role="grid"]';

  document.addEventListener('keydown', event => {
    if (event.repeat || event.altKey || event.shiftKey) return;
    const primaryKey = isApple ? event.metaKey : event.ctrlKey;
    const otherPrimaryKey = isApple ? event.ctrlKey : event.metaKey;
    if (!primaryKey || otherPrimaryKey) return;

    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!step) return;

    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(guarded)) return;
    if (document.querySelector('dialog[open], .settings-modal:not([hidden])')) return;

    const next = paths[index + step];
    if (!next) return;
    event.preventDefault();
    location.assign(next);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const notFoundPath = consumeNotFoundPath();
  rememberActivePage(location.pathname);
  initTheme();
  initEmailText();
  initBackground();
  initSelectUI();
  initFiltering();
  initSearchShortcut();
  initPageNavShortcut();
  initClipboard();
  if (notFoundPath) showNotFoundError(notFoundPath);
}, { once: true });
