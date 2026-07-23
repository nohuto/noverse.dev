/* Copyright (c) 2026 Nohuto */
const THEME_KEY = 'nv-theme';
const THEME_SYSTEM = 'system';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';
const DEFAULT_THEME = 'gruvbox-dark';
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
const DEFAULT_BG = 'dots';
const BG_KEYS = ['clear', 'diamonds', 'noise', 'dots', 'grid', 'starfield'];
const BG_SET = new Set(BG_KEYS);
window.NV_BACKGROUND_KEYS = BG_KEYS;
const STARFIELD_STYLESHEET = 'main/data/starfield-stars.css';
const ACTIVE_PAGE_PATH_KEY = 'nv-active-page-path';
const NOT_FOUND_PATH_KEY = 'nv-not-found-path';
const MAIN_PAGE_ROUTES = Object.freeze([
  { slug: 'home', clean: '/' },
  { slug: 'terminal', clean: '/terminal' },
  { slug: 'product', clean: '/product' },
  { slug: 'projects', clean: '/projects' },
  { slug: 'diff', clean: '/diff' },
  { slug: 'policies', clean: '/policies' }
]);
const MAIN_PAGE_ROUTE_ALIASES = new Map();
MAIN_PAGE_ROUTES.forEach(route => {
  MAIN_PAGE_ROUTE_ALIASES.set(route.clean, route);
  MAIN_PAGE_ROUTE_ALIASES.set(route.clean === '/' ? '/index.html' : `${route.clean}.html`, route);
});
window.NV_MAIN_ROUTES = MAIN_PAGE_ROUTES;
const FONT_KEY = 'nv-font';
const DEFAULT_FONT = 'cascadia';
const FONT_KEYS = ['cascadia'];
const FONT_SET = new Set(FONT_KEYS);
const REPO_DESC_URL = 'main/data/repos.json';
const SELECT_SEARCH_RENDER_LIMIT_DEFAULT = 300;
const PAGE_FEATURES = Object.freeze([
  { rootId: 'home-commits', src: 'main/min/home.min.js', initName: 'initHome' },
  { rootId: 'console', src: 'main/min/terminal.min.js', initName: 'initConsole', deferInit: true },
  { rootId: 'policy-explorer', src: 'main/min/policies.min.js', styleHref: 'main/min/tools.min.css', initName: 'initPolicyExplorer', deferInit: true },
  { rootId: 'diff-app', src: 'main/min/diff.min.js', styleHref: 'main/min/tools.min.css', initName: 'initDiff', deferInit: true }
]);
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: light)';

let toastTimer;
let repoDescriptionsPromise;
let selectUiListener;
let selectUiKeyListener;
let openSelectUI;
let siteErrorReturnFocus;
let searchShortcutInput;
let searchShortcutListener;
const pageFeaturePromises = new Map();
const pageFeatureStylePromises = new Map();

const EMAIL_KEY = 23;
const EMAIL_BYTES = [121, 120, 127, 98, 99, 120, 87, 99, 98, 99, 118, 57, 126, 120];

const getEmailAddress = () =>
  EMAIL_BYTES.map(byte => String.fromCharCode(byte ^ EMAIL_KEY)).join('');

function initEmailText() {
  const target = document.querySelector('[data-email-text]');
  if (target) target.textContent = getEmailAddress();
}

const afterNextPaint = () => new Promise(resolve => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
});

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

const normalizePathname = pathname => {
  const path = String(pathname || '/').replace(/^https?:\/\/[^/]+/i, '') || '/';
  if (path === '/') return '/';
  return `/${path.replace(/^\/+|\/+$/g, '')}`.toLowerCase();
};

const getMainPageRoute = pathname => MAIN_PAGE_ROUTE_ALIASES.get(normalizePathname(pathname)) || null;

const getCanonicalPagePath = pathname => {
  const route = getMainPageRoute(pathname);
  return route ? route.clean : normalizePathname(pathname);
};

const rememberActivePage = pathname => {
  const route = getMainPageRoute(pathname);
  if (!route) return;
  try {
    sessionStorage.setItem(ACTIVE_PAGE_PATH_KEY, route.clean);
  } catch { }
};

const consumeNotFoundPath = () => {
  try {
    const pathname = sessionStorage.getItem(NOT_FOUND_PATH_KEY) || '';
    sessionStorage.removeItem(NOT_FOUND_PATH_KEY);
    return pathname;
  } catch {
    return '';
  }
};

const hasSelectOption = (select, value) => Array.from(select.options).some(option => option.value === value);
const closeSelectUIs = () => {
  if (!openSelectUI) return;
  openSelectUI.classList.remove('open', 'open-up');
  openSelectUI.querySelector('.select-list')?.style.removeProperty('max-height');
  openSelectUI.querySelector('.select-trigger')?.setAttribute('aria-expanded', 'false');
  openSelectUI = null;
};

function syncPageChrome(pathname = location.pathname) {
  const activePath = getCanonicalPagePath(pathname);
  document.querySelectorAll('.nav-tabs a').forEach(a => {
    const isActive = getCanonicalPagePath(a.pathname || a.getAttribute('href')) === activePath;
    a.classList.toggle('active', isActive);
    if (isActive) {
      a.setAttribute('aria-current', 'page');
    } else {
      a.removeAttribute('aria-current');
    }
  });
}

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
      trigger.setAttribute('aria-label', label.textContent.trim());
    }

    const menu = document.createElement('div');
    menu.className = 'select-menu';
    menu.setAttribute('role', 'listbox');
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

    const toggleOpen = () => {
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
          toggleOpen();
        }
      }
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
      if (e.key === 'Escape') closeSelectUIs();
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
      const next = LIGHT_THEMES.has(current) ? DEFAULT_THEME : THEME_LIGHT;
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
  if (applied === 'starfield') {
    loadPageFeatureStyle(STARFIELD_STYLESHEET).catch(() => { });
  }
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

function applyFont(key) {
  const applied = FONT_SET.has(key) ? key : DEFAULT_FONT;
  document.documentElement.setAttribute('data-font', applied);
  document.documentElement.style.removeProperty('--font-family');
  return applied;
}

function initTypography() {
  applyFont(DEFAULT_FONT);
  storageSet(FONT_KEY, DEFAULT_FONT);
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

function hideSiteError() {
  const modal = document.getElementById('site-error-modal');
  if (!modal) return;
  modal.hidden = true;
  if (siteErrorReturnFocus?.isConnected) {
    siteErrorReturnFocus.focus();
  }
  siteErrorReturnFocus = null;
}

function createSiteErrorModal() {
  const modal = document.createElement('div');
  modal.className = 'site-error-modal';
  modal.id = 'site-error-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <section class="site-error-dialog" role="alertdialog" aria-modal="true" aria-labelledby="site-error-title" aria-describedby="site-error-message">
      <header class="site-error-header">
        <h2 id="site-error-title">404</h2>
        <button class="site-error-close" type="button" data-site-error-close aria-label="Close error message" title="Close error message">
          <svg class="bindiff-close-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
            <path d="M18 6l-12 12"></path>
            <path d="M6 6l12 12"></path>
          </svg>
        </button>
      </header>
      <div class="site-error-body">
        <p id="site-error-message">The requested page could not be found.</p>
        <code class="site-error-path"></code>
      </div>
    </section>
  `;
  const dialog = modal.querySelector('.site-error-dialog');
  const header = modal.querySelector('.site-error-header');
  if (!(dialog instanceof HTMLElement) || !(header instanceof HTMLElement)) return modal;

  const clampDialogPosition = () => {
    if (modal.hidden) return;
    const maxLeft = Math.max(0, modal.clientWidth - dialog.offsetWidth);
    const maxTop = Math.max(0, modal.clientHeight - dialog.offsetHeight);
    dialog.style.left = `${Math.min(Math.max(0, dialog.offsetLeft), maxLeft)}px`;
    dialog.style.top = `${Math.min(Math.max(0, dialog.offsetTop), maxTop)}px`;
    dialog.style.transform = 'none';
  };

  const centerDialog = () => {
    dialog.style.left = `${Math.max(0, (modal.clientWidth - dialog.offsetWidth) / 2)}px`;
    dialog.style.top = `${Math.max(0, (modal.clientHeight - dialog.offsetHeight) / 2)}px`;
    dialog.style.transform = 'none';
    dialog.dataset.positioned = 'true';
  };

  header.addEventListener('pointerdown', event => {
    if (event.button !== 0 || modal.hidden) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    event.preventDefault();
    if (dialog.dataset.positioned !== 'true') centerDialog();

    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = dialog.offsetLeft;
    const startTop = dialog.offsetTop;
    const maxLeft = Math.max(0, modal.clientWidth - dialog.offsetWidth);
    const maxTop = Math.max(0, modal.clientHeight - dialog.offsetHeight);
    let lastLeft = startLeft;
    let lastTop = startTop;

    header.setPointerCapture(event.pointerId);

    const onMove = moveEvent => {
      lastLeft = Math.min(Math.max(0, startLeft + moveEvent.clientX - startX), maxLeft);
      lastTop = Math.min(Math.max(0, startTop + moveEvent.clientY - startY), maxTop);
      dialog.style.left = `${lastLeft}px`;
      dialog.style.top = `${lastTop}px`;
    };

    const onUp = () => {
      dialog.dataset.positioned = 'true';
      header.releasePointerCapture(event.pointerId);
      header.removeEventListener('pointermove', onMove);
      header.removeEventListener('pointerup', onUp);
    };

    header.addEventListener('pointermove', onMove);
    header.addEventListener('pointerup', onUp);
  });
  window.addEventListener('resize', clampDialogPosition);
  modal.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (target === modal || target?.closest('[data-site-error-close]')) {
      hideSiteError();
    }
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
  const path = `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`;
  const pathElement = modal.querySelector('.site-error-path');
  if (pathElement) pathElement.textContent = path;
  siteErrorReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modal.hidden = false;
  const dialog = modal.querySelector('.site-error-dialog');
  if (dialog instanceof HTMLElement) {
    requestAnimationFrame(() => {
      const maxLeft = Math.max(0, modal.clientWidth - dialog.offsetWidth);
      const maxTop = Math.max(0, modal.clientHeight - dialog.offsetHeight);
      if (dialog.dataset.positioned !== 'true') {
        dialog.style.left = `${maxLeft / 2}px`;
        dialog.style.top = `${maxTop / 2}px`;
        dialog.dataset.positioned = 'true';
      } else {
        dialog.style.left = `${Math.min(Math.max(0, dialog.offsetLeft), maxLeft)}px`;
        dialog.style.top = `${Math.min(Math.max(0, dialog.offsetTop), maxTop)}px`;
      }
    });
  }
  modal.querySelector('[data-site-error-close]')?.focus();
}

function sanitizeElement(element) {
  if (!element) return;
  element.querySelectorAll('script').forEach(script => script.remove());
  element.querySelectorAll('*').forEach(node => {
    node.getAttributeNames().forEach(name => {
      if (name.toLowerCase().startsWith('on')) {
        node.removeAttribute(name);
      }
    });
    ['href', 'src'].forEach(attr => {
      const value = node.getAttribute(attr);
      if (value && value.trim().toLowerCase().startsWith('javascript:')) {
        node.removeAttribute(attr);
      }
    });
  });
}

const loadPageFeatureScript = src => {
  if (pageFeaturePromises.has(src)) return pageFeaturePromises.get(src);

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load page feature: ${src}`));
    document.head.appendChild(script);
  });
  pageFeaturePromises.set(src, promise);
  return promise;
};

const loadPageFeatureStyle = href => {
  const isLoaded = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .some(link => link.getAttribute('href') === href);
  if (isLoaded) return Promise.resolve();
  if (pageFeatureStylePromises.has(href)) return pageFeatureStylePromises.get(href);

  const promise = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load page feature stylesheet: ${href}`));
    document.head.appendChild(link);
  });
  pageFeatureStylePromises.set(href, promise);
  return promise;
};

const loadPageFeatureStyles = root => Promise.all(PAGE_FEATURES
  .filter(feature => feature.styleHref && root.querySelector(`#${feature.rootId}`))
  .map(feature => loadPageFeatureStyle(feature.styleHref)));

async function initPageFeatures() {
  for (const feature of PAGE_FEATURES) {
    if (!document.getElementById(feature.rootId)) continue;
    if (feature.deferInit) await afterNextPaint();
    if (feature.styleHref) {
      await loadPageFeatureStyle(feature.styleHref);
    }
    if (typeof window[feature.initName] !== 'function') {
      await loadPageFeatureScript(feature.src);
    }
    const initialize = window[feature.initName];
    if (typeof initialize !== 'function') {
      throw new Error(`Page feature did not register ${feature.initName}`);
    }
    initialize();
  }
}

async function loadPage(url, push = true) {
  const header = document.querySelector('header.prompt-bar');
  const main = document.querySelector('main');
  const requestedUrl = new URL(url, location.href);
  const route = getMainPageRoute(requestedUrl.pathname);
  const fetchUrl = `${route ? route.clean : requestedUrl.pathname}${requestedUrl.search}`;
  const historyUrl = route
    ? `${route.clean}${requestedUrl.search}${requestedUrl.hash}`
    : `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`;
  try {
    const res = await fetch(fetchUrl, { credentials: 'same-origin' });
    if (res.status === 404) {
      showNotFoundError(historyUrl);
      return;
    }
    if (!res.ok) throw new Error(`Page request failed with status ${res.status}`);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const newHeader = doc.querySelector('header.prompt-bar');
    const newMain = doc.querySelector('main');
    if (!newMain) throw new Error('No main element in response');
    sanitizeElement(newHeader);
    sanitizeElement(newMain);
    const newTitle = doc.querySelector('title')?.textContent || document.title;
    const nextPathname = route ? route.clean : requestedUrl.pathname;
    rememberActivePage(nextPathname);
    await loadPageFeatureStyles(newMain);
    closeSelectUIs();
    window.stopConsoleAnimation?.();
    if (header && newHeader) header.replaceWith(newHeader);
    main.replaceWith(newMain);
    if (push) {
      history.pushState({ url: historyUrl }, '', historyUrl);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    document.title = newTitle;
    syncPageChrome(nextPathname);
    initTheme();
    initEmailText();
    initRepoDescriptions();
    initClickableCards();
    initFiltering();
    initSearchShortcut();
    initSelectUI();
    await afterNextPaint();
    await initPageFeatures();

  } catch {
    location.href = historyUrl;
  }
}

document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const target = e.target instanceof Element ? e.target : e.target?.parentElement;
  const a = target?.closest('a[href]');
  const href = a?.getAttribute('href');
  if (a instanceof HTMLAnchorElement && href && getMainPageRoute(a.pathname) && a.origin === location.origin) {
    const targetPath = new URL(href, location.href).pathname;
    e.preventDefault();
    if (getCanonicalPagePath(targetPath) === getCanonicalPagePath(location.pathname)) {
      syncPageChrome(location.pathname);
      return;
    }
    loadPage(href);
  }
});

window.addEventListener('popstate', e => {
  const url = e.state?.url || location.pathname || '/';
  loadPage(url, false);
});

const loadRepoDescriptions = () => {
  if (repoDescriptionsPromise) return repoDescriptionsPromise;
  repoDescriptionsPromise = fetch(REPO_DESC_URL, { cache: 'force-cache' })
    .then(res => (res.ok ? res.json() : {}))
    .catch(() => ({}));
  return repoDescriptionsPromise;
};

async function getRepoDescription(repo) {
  if (!repo || !repo.includes('/')) return 'No description yet.';
  const data = await loadRepoDescriptions();
  const desc = Object.prototype.hasOwnProperty.call(data, repo) ? data[repo] : '';
  return desc && desc.trim() ? desc.trim() : 'No description yet.';
}

function initRepoDescriptions() {
  const cards = document.querySelectorAll('.project-card[data-repo], .home-work-item[data-repo]');
  if (!cards.length) return;
  cards.forEach(card => {
    const repo = card.getAttribute('data-repo');
    const descEl = card.querySelector('.project-desc');
    if (!repo || !descEl) return;
    getRepoDescription(repo).then(desc => {
      descEl.textContent = desc;
    });
  });
}

function initClickableCards() {
  const cards = document.querySelectorAll('.clickable-card');

  cards.forEach(card => {
    if (!(card instanceof HTMLElement) || card.dataset.cardReady === 'true') return;
    const href = card.dataset.cardHref || (card.dataset.repo ? `https://github.com/${card.dataset.repo}` : '');
    if (!href) return;

    const title = card.querySelector('h3, h4')?.textContent?.trim() || 'card';
    const link = document.createElement('a');
    link.className = 'clickable-card-link';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `Open ${title}`);

    card.dataset.cardReady = 'true';
    card.appendChild(link);
  });
}

function initFiltering() {
  const searchInput = document.getElementById('project-search');
  const cards = Array.from(document.querySelectorAll('.project-card'));

  if (!searchInput || cards.length === 0) return;

  const cardData = cards.map(card => {
    const title = (card.querySelector('.project-title')?.textContent || '').toLowerCase();
    const descEl = card.querySelector('.project-desc');
    return { card, title, descEl };
  });

  const applyFilter = () => {
    const search = searchInput.value.trim().toLowerCase();

    cardData.forEach(({ card, title, descEl }) => {
      const desc = (descEl?.textContent || '').toLowerCase();
      card.hidden = !!search && !title.includes(search) && !desc.includes(search);
    });
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
document.addEventListener('DOMContentLoaded', () => {
  const notFoundPath = consumeNotFoundPath();
  rememberActivePage(location.pathname);
  syncPageChrome(location.pathname);
  initTheme();
  initEmailText();
  initBackground();
  initTypography();
  initSelectUI();
  initRepoDescriptions();
  initClickableCards();
  initFiltering();
  initSearchShortcut();
  initPageFeatures().catch(error => console.error(error));
  initClipboard();
  if (notFoundPath) showNotFoundError(notFoundPath);
});
