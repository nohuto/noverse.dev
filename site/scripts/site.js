/* Copyright (c) 2026 Nohuto */
const THEME_KEY = 'nv-theme';
const THEME_SYSTEM = 'system';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';
const DEFAULT_THEME = 'kanagawa-wave';
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
const DEFAULT_BG = 'dots';
const BG_KEYS = ['clear', 'diamonds', 'noise', 'dots', 'grid', 'starfield'];
const BG_SET = new Set(BG_KEYS);
window.NV_BACKGROUND_KEYS = BG_KEYS;
const STARFIELD_STYLESHEET = '/main/data/starfield-stars.css';
const MAIN_PAGE_ROUTES = Object.freeze([
  { slug: 'home', clean: '/' },
  { slug: 'terminal', clean: '/terminal' },
  { slug: 'product', clean: '/product' },
  { slug: 'projects', clean: '/projects' },
  { slug: 'diff', clean: '/diff' },
  { slug: 'policies', clean: '/policies' }
]);
window.NV_MAIN_ROUTES = MAIN_PAGE_ROUTES;
const FONT_KEY = 'nv-font';
const DEFAULT_FONT = 'cascadia';
const FONT_KEYS = ['cascadia'];
const FONT_SET = new Set(FONT_KEYS);
const REPO_DESC_URL = '/main/data/repos.json';
const SELECT_SEARCH_RENDER_LIMIT_DEFAULT = 300;
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: light)';

let toastTimer;
let repoDescriptionsPromise;
let selectUiListener;
let selectUiKeyListener;
let openSelectUI;
let searchShortcutInput;
let searchShortcutListener;

const EMAIL_KEY = 23;
const EMAIL_BYTES = [121, 120, 127, 98, 99, 120, 87, 99, 98, 99, 118, 57, 126, 120];

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

const hasSelectOption = (select, value) => Array.from(select.options).some(option => option.value === value);
const closeSelectUIs = () => {
  if (!openSelectUI) return;
  openSelectUI.classList.remove('open', 'open-up');
  openSelectUI.querySelector('.select-list')?.style.removeProperty('max-height');
  openSelectUI.querySelector('.select-trigger')?.setAttribute('aria-expanded', 'false');
  openSelectUI = null;
};

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

function ensureStylesheet(href) {
  const loaded = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .some(link => link.getAttribute('href') === href);
  if (loaded) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function applyBackground(key) {
  const applied = BG_SET.has(key) ? key : DEFAULT_BG;
  document.documentElement.setAttribute('data-bg', applied);
  if (applied === 'starfield') {
    ensureStylesheet(STARFIELD_STYLESHEET);
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
  initTheme();
  initEmailText();
  initBackground();
  initTypography();
  initSelectUI();
  initRepoDescriptions();
  initClickableCards();
  initFiltering();
  initSearchShortcut();
  initClipboard();
}, { once: true });
