/* Copyright (c) 2026 nohuto */
import { wildcardPattern } from '../shell/wildcard';

const DEFAULT_LIMIT = 300;

type Item = { value: string; text: string; lower: string; disabled: boolean };

let openSelectUI: HTMLElement | null = null;
const closeSelectUIs = (restoreFocus = false) => {
  if (!openSelectUI) return;
  const trigger = openSelectUI.querySelector<HTMLElement>('.select-trigger');
  openSelectUI.classList.remove('open', 'open-up');
  openSelectUI
    .querySelector<HTMLElement>('.select-list')
    ?.style.removeProperty('max-height');
  trigger?.setAttribute('aria-expanded', 'false');
  openSelectUI = null;
  if (restoreFocus) trigger?.focus({ preventScroll: true });
};

const buildMatcher = (filterText: string) => {
  const checks = filterText
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) =>
      /[*?]/.test(term)
        ? new RegExp(wildcardPattern(term), 'i')
        : term.toLowerCase(),
    );
  if (!checks.length) return null;
  return (item: Item) =>
    checks.every((check) =>
      typeof check === 'string'
        ? item.lower.includes(check)
        : check.test(item.text),
    );
};

document
  .querySelectorAll<HTMLSelectElement>('select.select-enhanced')
  .forEach((select) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'select-ui';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const triggerLabel = document.createElement('span');
    triggerLabel.className = 'select-trigger-label';
    triggerLabel.id = `${select.id}-value`;
    trigger.append(triggerLabel);

    const menu = document.createElement('div');
    menu.className = 'select-menu';
    const isSearchable = select.dataset.searchable === 'true';
    wrapper.classList.toggle('is-searchable', isSearchable);
    let searchValue = '';
    let limit = DEFAULT_LIMIT;

    let searchInput: HTMLInputElement | null = null;
    let menuMetaText: HTMLSpanElement | null = null;
    let limitInput: HTMLInputElement | null = null;
    let unlimitedInput: HTMLInputElement | null = null;
    const list = document.createElement('div');
    list.className = 'select-list';
    list.id = `${select.id}-listbox`;
    list.setAttribute('role', 'listbox');
    trigger.setAttribute('aria-controls', list.id);

    const label = document.querySelector(`label[for="${select.id}"]`);
    if (label) {
      label.id ||= `${select.id}-label`;
      label.removeAttribute('for');
      trigger.setAttribute('aria-labelledby', `${label.id} ${triggerLabel.id}`);
      list.setAttribute('aria-labelledby', label.id);
    }

    if (isSearchable) {
      searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'select-search';
      searchInput.placeholder = 'Filter...';
      searchInput.setAttribute('aria-label', 'Filter options');

      const menuMeta = document.createElement('div');
      menuMeta.className = 'select-menu-meta';
      menuMetaText = document.createElement('span');
      menuMetaText.className = 'select-menu-meta-text';

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
      limitInput.value = String(DEFAULT_LIMIT);
      limitLabel.append(limitInput);
      const unlimitedLabel = document.createElement('label');
      unlimitedLabel.className = 'select-limit-toggle';
      unlimitedInput = document.createElement('input');
      unlimitedInput.type = 'checkbox';
      unlimitedLabel.append(unlimitedInput, 'Unlimited');
      limitControls.append(limitLabel, unlimitedLabel);
      menuMeta.append(menuMetaText, limitControls);
      menu.append(searchInput, list, menuMeta);
    } else {
      menu.append(list);
    }

    let optionsDirty = true;
    let items: Item[] = [];
    const toItem = (value: string, text = value, disabled = false) => ({
      value,
      text,
      lower: text.toLowerCase(),
      disabled,
    });
    const readItems = () => {
      items = Array.from(select.options, (option) =>
        toItem(option.value, option.textContent || '', option.disabled),
      );
    };
    readItems();

    const buildOptions = () => {
      const matcher = buildMatcher(searchValue);
      const filtered = matcher ? items.filter(matcher) : items;
      const shown = isSearchable ? filtered.slice(0, limit) : filtered;
      list.replaceChildren(
        ...shown.map((item) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'select-option';
          const text = document.createElement('span');
          text.className = 'select-option-label';
          text.textContent = item.text;
          button.append(text);
          button.dataset.value = item.value;
          button.setAttribute('role', 'option');
          if (item.disabled) {
            button.disabled = true;
            button.classList.add('is-disabled');
          }
          return button;
        }),
      );
      if (menuMetaText)
        menuMetaText.textContent = !filtered.length
          ? 'No matches'
          : filtered.length > shown.length
            ? `Showing ${shown.length} / ${filtered.length}`
            : `${filtered.length} option${filtered.length === 1 ? '' : 's'}`;
      optionsDirty = false;
    };

    const updateActive = () => {
      const selected = select.options[select.selectedIndex];
      triggerLabel.textContent = selected ? selected.textContent : select.value;
      list
        .querySelectorAll<HTMLButtonElement>('.select-option')
        .forEach((button) => {
          const active = button.dataset.value === select.value;
          button.classList.toggle('is-active', active);
          button.setAttribute('aria-selected', String(active));
        });
    };

    const refresh = () => {
      buildOptions();
      updateActive();
    };

    const syncMenuOptions = () => {
      if (wrapper.classList.contains('open') && optionsDirty) buildOptions();
      updateActive();
    };

    const setLimit = (value: number) => {
      limit = value;
      if (limitInput && unlimitedInput) {
        unlimitedInput.checked = !Number.isFinite(value);
        limitInput.disabled = unlimitedInput.checked;
      }
      refresh();
    };

    const positionMenu = () => {
      wrapper.classList.remove('open-up');
      list.style.removeProperty('max-height');
      const triggerRect = trigger.getBoundingClientRect();
      const below = Math.max(0, innerHeight - triggerRect.bottom - 12);
      const above = Math.max(0, triggerRect.top - 12);
      const menuHeight = menu.offsetHeight;
      const openUp = below < menuHeight && above > below;
      const chromeHeight = menuHeight - list.offsetHeight;
      list.style.maxHeight = `${Math.min(240, Math.max(0, (openUp ? above : below) - chromeHeight))}px`;
      wrapper.classList.toggle('open-up', openUp);

      const menuRect = menu.getBoundingClientRect();
      const overflow = openUp
        ? 8 - menuRect.top
        : menuRect.bottom - (innerHeight - 8);
      if (overflow > 0)
        list.style.maxHeight = `${Math.max(0, list.offsetHeight - Math.ceil(overflow))}px`;
    };

    const focusListOption = (target: string) => {
      const options = Array.from(
        list.querySelectorAll<HTMLButtonElement>(
          '.select-option:not(:disabled)',
        ),
      );
      const activeIndex = options.findIndex((option) =>
        option.classList.contains('is-active'),
      );
      const index =
        target === 'last'
          ? options.length - 1
          : target === 'active' && activeIndex >= 0
            ? activeIndex
            : 0;
      options[index]?.focus({ preventScroll: true });
    };

    const toggleOpen = (focusTarget = 'active') => {
      const opening = !wrapper.classList.contains('open');
      closeSelectUIs();
      if (!opening) return;
      openSelectUI = wrapper;
      wrapper.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      syncMenuOptions();
      positionMenu();
      requestAnimationFrame(() =>
        searchInput
          ? searchInput.focus({ preventScroll: true })
          : focusListOption(focusTarget),
      );
    };

    updateActive();
    select.addEventListener('change', syncMenuOptions);
    select.addEventListener('nv:options-updated', (event) => {
      const detail = (event as CustomEvent).detail;
      if (searchInput && detail?.resetSearch)
        searchValue = searchInput.value = '';
      if (Array.isArray(detail?.options))
        items = detail.options.map((value: string) => toItem(value));
      else readItems();
      optionsDirty = true;
      syncMenuOptions();
    });
    list.addEventListener('click', (event) => {
      const option = (event.target as Element).closest<HTMLButtonElement>(
        '.select-option',
      );
      if (!option || option.disabled) return;
      const value = option.dataset.value || '';
      if (!select.querySelector(`option[value="${CSS.escape(value)}"]`))
        select.replaceChildren(new Option(value, value));
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      closeSelectUIs();
      trigger.focus({ preventScroll: true });
    });
    trigger.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleOpen();
    });
    trigger.addEventListener('click', (event) => {
      if (event.detail === 0) toggleOpen();
    });
    trigger.addEventListener('keydown', (event) => {
      if (!['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
      event.preventDefault();
      if (!wrapper.classList.contains('open'))
        toggleOpen(event.key === 'ArrowUp' ? 'last' : 'active');
    });
    list.addEventListener('keydown', (event) => {
      const options = Array.from(
        list.querySelectorAll<HTMLButtonElement>(
          '.select-option:not(:disabled)',
        ),
      );
      const current = (event.target as Element).closest<HTMLButtonElement>(
        '.select-option',
      );
      const index = current ? options.indexOf(current) : -1;
      let nextIndex = -1;
      if (event.key === 'ArrowDown')
        nextIndex = index < 0 ? 0 : (index + 1) % options.length;
      else if (event.key === 'ArrowUp')
        nextIndex =
          index < 0
            ? options.length - 1
            : (index - 1 + options.length) % options.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = options.length - 1;
      else if (event.key === 'Tab') return closeSelectUIs();
      if (nextIndex < 0 || !options.length) return;
      event.preventDefault();
      options[nextIndex]?.focus({ preventScroll: true });
    });
    menu.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      requestAnimationFrame(() => {
        if (!wrapper.contains(document.activeElement)) closeSelectUIs();
      });
    });
    searchInput?.addEventListener('input', () => {
      searchValue = searchInput!.value;
      refresh();
    });
    limitInput?.addEventListener('input', () => {
      const value = Number.parseInt(limitInput!.value, 10);
      if (value > 0) setLimit(value);
    });
    unlimitedInput?.addEventListener('change', () => {
      const value = Number.parseInt(limitInput!.value, 10);
      setLimit(
        unlimitedInput!.checked ? Infinity : value > 0 ? value : DEFAULT_LIMIT,
      );
    });

    select.before(wrapper);
    wrapper.append(trigger, menu, select);
    select.classList.add('select-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
  });

document.addEventListener('click', (event) => {
  if (!(event.target as Element).closest('.select-ui')) closeSelectUIs();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeSelectUIs(true);
});
window.addEventListener('resize', () => closeSelectUIs());
window.addEventListener('scroll', () => closeSelectUIs(), { passive: true });
