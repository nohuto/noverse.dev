/* Copyright (c) 2026 nohuto */
import { createDraggableDialog } from '../dialogs/draggable';
import type {
  CategoryNode,
  CategorySegment,
  Policy,
  PolicyCategory,
  PolicyColumn,
  RawPolicy,
} from './types';
import { loadPolicyPayload } from './data';
import {
  categoryMatches,
  getCategory,
  getPolicyScope,
  getPolicyShareId,
  getPolicyValue,
  getPrimaryPath,
  makeCategoryKey,
  normalizeCategorySegment,
  normalizePolicyShareId,
  preparePolicySearchFields,
  splitSearchTerms,
} from './model';
import { closeOnFocusLeave, createNode } from './dom';
import { replaceUrl, setQueryParam } from './url';
import { renderPolicyDetail } from './detail';
import { createPolicyMatcher } from './search';

const IDLE_TIMEOUT_MS = 300;
const IDLE_FALLBACK_MS = 16;
const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));
const yieldUntilIdle = () =>
  new Promise((resolve) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(resolve, { timeout: IDLE_TIMEOUT_MS });
      return;
    }
    setTimeout(resolve, IDLE_FALLBACK_MS);
  });

function initPolicyExplorer() {
  const root = document.getElementById('policy-explorer');
  if (!root) return;

  const searchInput = root.querySelector<HTMLInputElement>('#policy-search');
  const limitInput = root.querySelector<HTMLInputElement>('#policy-limit');
  const unlimitedInput = root.querySelector<HTMLInputElement>(
    '#policy-limit-unlimited',
  );
  const paneToggles = Array.from(
    root.querySelectorAll<HTMLInputElement>('[data-policy-pane]'),
  );
  const viewDropdown = root.querySelector<HTMLElement>('#policy-view-dropdown');
  const viewTrigger = root.querySelector<HTMLElement>('#policy-view-trigger');
  const viewMenu = root.querySelector<HTMLElement>('#policy-view-menu');
  const columnDropdown = root.querySelector<HTMLElement>(
    '#policy-column-dropdown',
  );
  const columnTrigger = root.querySelector<HTMLElement>(
    '#policy-column-trigger',
  );
  const treeEl = root.querySelector<HTMLElement>('#policy-tree');
  const tablePanel = root.querySelector<HTMLElement>('.policy-table-panel');
  const tableWrap = root.querySelector<HTMLElement>('.policy-table-wrap');
  const tableEl = root.querySelector<HTMLElement>('.policy-table');
  const detailPanel = root.querySelector<HTMLElement>('#policy-detail');
  const tableHead = root.querySelector<HTMLElement>('#policy-table-head');
  const tableCols = root.querySelector<HTMLElement>('#policy-table-cols');
  const tableBody = root.querySelector<HTMLElement>('#policy-table-body');
  const tableNote = root.querySelector<HTMLElement>('#policy-table-note');
  const columnMenu = root.querySelector<HTMLElement>('#policy-column-menu');
  const filterMenu = root.querySelector<HTMLElement>('#policy-filter-menu');
  const detailBody = root.querySelector<HTMLElement>('#policy-detail-body');
  const settingsButton = root.querySelector<HTMLElement>('#policy-settings');
  const settingsModal = root.querySelector<HTMLDialogElement>(
    '#policy-settings-modal',
  );
  const settingsDialog = root.querySelector<HTMLElement>(
    '#policy-settings-dialog',
  );
  const settingsHeader = root.querySelector<HTMLElement>(
    '#policy-settings-header',
  );
  const settingsCloseButton = root.querySelector<HTMLElement>(
    '#policy-settings-close',
  );
  const settingsDoneButton = root.querySelector<HTMLElement>(
    '#policy-settings-done',
  );
  const settingsResetButton = root.querySelector<HTMLElement>(
    '#policy-settings-reset',
  );
  const searchDelayInput = root.querySelector<HTMLInputElement>(
    '#policy-search-delay',
  );
  const searchOptionInputs = {
    wildcards: root.querySelector<HTMLInputElement>('#policy-search-wildcards'),
    whole: root.querySelector<HTMLInputElement>('#policy-search-whole'),
    caseSensitive: root.querySelector<HTMLInputElement>('#policy-search-case'),
    matchAny: root.querySelector<HTMLInputElement>('#policy-search-any'),
    currentPath: root.querySelector<HTMLInputElement>(
      '#policy-search-current-path',
    ),
    names: root.querySelector<HTMLInputElement>('#policy-search-names'),
    registry: root.querySelector<HTMLInputElement>('#policy-search-registry'),
    details: root.querySelector<HTMLInputElement>('#policy-search-details'),
  };
  const splitters = Array.from(
    root.querySelectorAll<HTMLElement>('[data-policy-splitter]'),
  );

  if (
    !searchInput ||
    !treeEl ||
    !tableBody ||
    !detailBody ||
    !tableHead ||
    !tableCols
  )
    return;

  let policies: Policy[] = [];
  let policyById = new Map<string, Policy>();
  let policyByShareId = new Map<string, Policy>();
  let filtered: Policy[] = [];
  let searchFiltered: Policy[] = [];
  const columnFilters = new Map<string, Set<string>>();
  let filterMenuTrigger: HTMLElement | null = null;
  let filterMenuColumn: PolicyColumn | null = null;
  let filterSearchState = '';
  let selectedId: string | null = null;
  let selectedCategoryKey = '';
  let categoryMap = new Map<string, PolicyCategory>();
  let categoryTree: CategoryNode | null = null;
  let tableRenderId = 0;
  const expandedTreeNodes = new Set(['__admin__']);
  const defaultRowLimit = 350;
  let rowLimit = defaultRowLimit;
  let unlimitedRows = false;
  const defaultSearchDelayMs = 200;
  let searchDelayMs = defaultSearchDelayMs;
  let searchDelayTimer = 0;
  let tableFocusId: string | null = null;
  let policyLoadWarning = '';
  const openSettingsDialog =
    settingsModal && settingsDialog && settingsHeader
      ? createDraggableDialog({
          layer: settingsModal,
          dialog: settingsDialog,
          handle: settingsHeader,
        })
      : null;
  const paneState = {
    tree: true,
    table: true,
    detail: false,
  };
  const defaultSearchOptions = {
    wildcards: false,
    whole: false,
    caseSensitive: false,
    matchAny: false,
    currentPath: false,
    names: true,
    registry: true,
    details: true,
  };
  const searchOptions = { ...defaultSearchOptions };
  const sortState = {
    id: 'setting',
    direction: 'asc',
  };
  const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

  const setBusy = (busy: boolean) => {
    root.setAttribute('aria-busy', busy ? 'true' : 'false');
  };
  const getCategoryPath = (policy: RawPolicy): CategorySegment[] => {
    const categoryName = getCategory(policy);
    const meta = categoryMap.get(categoryName);
    if (meta?.path?.length) return meta.path;
    return [{ name: categoryName, displayName: categoryName }];
  };
  const POLICY_QUERY_PARAM = 'p';
  const SEARCH_QUERY_PARAM = 'q';
  const CATEGORY_QUERY_PARAM = 'category';
  const CATEGORY_URL_SEPARATOR = '>';
  const updatePolicyUrl = (policy: Policy | null) => {
    const url = new URL(location.href);
    setQueryParam(url, POLICY_QUERY_PARAM, policy?.shareId || '');
    replaceUrl(url);
  };
  const updateFilterUrl = () => {
    const url = new URL(location.href);
    setQueryParam(url, SEARCH_QUERY_PARAM, searchInput.value.trim());
    setQueryParam(
      url,
      CATEGORY_QUERY_PARAM,
      selectedCategoryKey.split('\u001f').join(CATEGORY_URL_SEPARATOR),
    );
    filterColumns.forEach((column) => {
      url.searchParams.delete(column.id);
      columnFilters
        .get(column.id)
        ?.forEach((value) => url.searchParams.append(column.id, value));
    });
    replaceUrl(url);
  };
  const applyColumnFiltersFromUrl = () => {
    const params = new URLSearchParams(location.search);
    filterColumns.forEach((column) => {
      const values = params.getAll(column.id);
      if (!values.length) return;
      columnFilters.set(column.id, new Set(values));
      visibleColumns.add(column.id);
    });
  };
  const getCategoryKeyFromUrl = () =>
    (new URLSearchParams(location.search).get(CATEGORY_QUERY_PARAM) || '')
      .split(CATEGORY_URL_SEPARATOR)
      .map(normalizeCategorySegment)
      .filter(Boolean)
      .join('\u001f');
  const getPolicyFromUrl = () => {
    const rawId = new URLSearchParams(location.search).get(POLICY_QUERY_PARAM);
    if (!rawId) return null;
    const normalized = normalizePolicyShareId(rawId);
    return (
      policyByShareId.get(normalized) ||
      policyByShareId.get(normalized.replace(':', '*')) ||
      policyById.get(rawId) ||
      null
    );
  };
  const expandTreeForCategory = (categoryKey: string) => {
    expandedTreeNodes.add('__admin__');
    const parts = categoryKey.split('\u001f');
    parts.forEach((_, index) => {
      expandedTreeNodes.add(parts.slice(0, index + 1).join('\u001f'));
    });
  };
  const expandTreeForPolicy = (policy: Policy) => {
    expandedTreeNodes.add('__admin__');
    const path = Array.isArray(policy?.categoryPath) ? policy.categoryPath : [];
    path.forEach((_, index) => {
      expandedTreeNodes.add(makeCategoryKey(path.slice(0, index + 1)));
    });
  };

  const columns: PolicyColumn[] = [
    {
      id: 'setting',
      label: 'Name',
      width: 420,
      minWidth: 180,
      value: (policy) => policy.DisplayName || policy.PolicyName || '',
    },
    {
      id: 'value',
      label: 'Value',
      width: 160,
      minWidth: 90,
      value: (policy) => getPolicyValue(policy),
    },
    {
      id: 'scope',
      label: 'Scope',
      width: 90,
      minWidth: 58,
      filterable: true,
      value: (policy) => policy.scope || '',
    },
    {
      id: 'supported',
      label: 'Supported On',
      width: 240,
      minWidth: 150,
      filterable: true,
      value: (policy) => policy.Supported || '',
    },
    {
      id: 'policy',
      label: 'Policy',
      width: 220,
      minWidth: 140,
      value: (policy) => policy.PolicyName || '',
    },
    {
      id: 'category',
      label: 'Category',
      width: 260,
      minWidth: 150,
      value: (policy) => policy.categoryDisplayPath,
    },
    {
      id: 'registry',
      label: 'Registry',
      width: 360,
      minWidth: 180,
      value: (policy) => getPrimaryPath(policy),
    },
    {
      id: 'admx',
      label: 'ADMX',
      width: 150,
      minWidth: 90,
      filterable: true,
      value: (policy) => policy.File || '',
    },
  ];
  const filterColumns = columns.filter((column) => column.filterable);
  const visibleColumns = new Set(['setting', 'scope', 'supported', 'value']);
  let tableWidthSignature = '';

  const getVisibleColumns = () =>
    columns.filter((column) => visibleColumns.has(column.id));
  const getColumnMinWidth = (column: PolicyColumn) => column.minWidth || 80;

  const updatePaneLayout = () => {
    root.classList.toggle('policy-hide-tree', !paneState.tree);
    root.classList.toggle('policy-hide-table', !paneState.table);
    root.classList.toggle('policy-hide-detail', !paneState.detail);
    const treePanel = root.querySelector<HTMLElement>('.policy-tree-panel');
    if (treePanel) treePanel.hidden = !paneState.tree;
    if (tablePanel) tablePanel.hidden = !paneState.table;
    if (detailPanel) detailPanel.hidden = !paneState.detail;
    splitters.forEach((splitter) => {
      const type = splitter.dataset.policySplitter;
      splitter.hidden =
        type === 'tree'
          ? !(paneState.tree && (paneState.table || paneState.detail))
          : !(paneState.table && paneState.detail);
    });
    paneToggles.forEach((button) => {
      const pane = button.dataset.policyPane as keyof typeof paneState;
      const active = Boolean(paneState[pane]);
      button.checked = active;
      button
        .closest('.policy-view-option')
        ?.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    requestAnimationFrame(applyTableColumnWidths);
  };

  const openViewMenu = () => {
    if (!viewMenu || !viewTrigger) return;
    viewMenu.hidden = false;
    viewTrigger.setAttribute('aria-expanded', 'true');
  };

  const closeViewMenu = () => {
    if (!viewMenu || !viewTrigger) return;
    viewMenu.hidden = true;
    viewTrigger.setAttribute('aria-expanded', 'false');
  };

  const toggleViewMenu = () => {
    if (!viewMenu || viewMenu.hidden) {
      openViewMenu();
    } else {
      closeViewMenu();
    }
  };

  const renderDetail = (policy: Policy | null | undefined) => {
    detailBody.replaceChildren();
    if (!policy || !paneState.detail) {
      return;
    }
    renderPolicyDetail(detailBody, policy);
  };

  const sortPolicies = (rows: Policy[]) => {
    if (sortState.id === 'setting') {
      return sortState.direction === 'asc' ? rows : rows.slice().reverse();
    }
    const column =
      columns.find((item) => item.id === sortState.id) || columns[0];
    const direction = sortState.direction === 'desc' ? -1 : 1;
    return rows.slice().sort((left, right) => {
      const a = column.value(left);
      const b = column.value(right);
      return collator.compare(String(a), String(b)) * direction;
    });
  };

  const renderColumnMenu = () => {
    if (!columnMenu) return;
    columnMenu.replaceChildren();
    columns.forEach((column) => {
      const label = createNode('label', 'policy-column-choice');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = visibleColumns.has(column.id);
      checkbox.addEventListener('change', () => {
        if (!checkbox.checked && visibleColumns.size === 1) {
          checkbox.checked = true;
          return;
        }
        if (checkbox.checked) {
          visibleColumns.add(column.id);
        } else {
          visibleColumns.delete(column.id);
        }
        renderTableHeader();
        if (!checkbox.checked && columnFilters.delete(column.id)) {
          applyFilters();
        } else {
          renderTable();
        }
      });
      label.append(checkbox, createNode('span', null, column.label));
      columnMenu.appendChild(label);
    });
  };

  const openColumnMenu = (
    x: number,
    y: number,
    options: { fromTrigger?: boolean } = {},
  ) => {
    if (!columnMenu) return;
    closeFilterMenu();
    renderColumnMenu();
    columnMenu.hidden = false;
    columnMenu.style.left = `${x}px`;
    columnMenu.style.top = `${y}px`;
    columnTrigger?.setAttribute(
      'aria-expanded',
      options.fromTrigger ? 'true' : 'false',
    );
  };

  const openColumnMenuFromTrigger = () => {
    if (!columnTrigger) return;
    const rect = columnTrigger.getBoundingClientRect();
    openColumnMenu(rect.right, rect.bottom + 4, { fromTrigger: true });
    if (!columnMenu) return;
    const menuWidth = columnMenu.offsetWidth;
    const menuHeight = columnMenu.offsetHeight;
    const left = Math.min(
      Math.max(4, rect.right - menuWidth),
      window.innerWidth - menuWidth - 4,
    );
    const top = Math.min(rect.bottom + 4, window.innerHeight - menuHeight - 4);
    columnMenu.style.left = `${left}px`;
    columnMenu.style.top = `${Math.max(4, top)}px`;
  };

  const closeColumnMenu = () => {
    if (columnMenu) columnMenu.hidden = true;
    columnTrigger?.setAttribute('aria-expanded', 'false');
  };

  const passesColumnFilters = (policy: Policy, skipId = '') => {
    for (const column of filterColumns) {
      if (column.id === skipId) continue;
      const values = columnFilters.get(column.id);
      if (values && !values.has(column.value(policy))) return false;
    }
    return true;
  };

  const updateFilterButtons = () => {
    tableHead
      .querySelectorAll<HTMLElement>('.policy-filter-button')
      .forEach((button) => {
        button.classList.toggle(
          'is-active',
          columnFilters.has(button.dataset.column || ''),
        );
      });
  };

  const positionFilterMenu = () => {
    if (!filterMenu || filterMenu.hidden || !filterMenuTrigger) return;
    const header = filterMenuTrigger.closest('th') || filterMenuTrigger;
    const rect = header.getBoundingClientRect();
    const width = filterMenu.offsetWidth;
    const below = window.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const openAbove = below < 200 && above > below;
    filterMenu.style.maxHeight = `${Math.max(120, openAbove ? above : below)}px`;
    filterMenu.style.left = `${Math.max(4, Math.min(rect.left, window.innerWidth - width - 4))}px`;
    filterMenu.style.top = openAbove
      ? `${Math.max(4, rect.top - 4 - filterMenu.offsetHeight)}px`
      : `${rect.bottom + 4}px`;
  };

  const closeFilterMenu = ({ restoreFocus = false } = {}) => {
    if (!filterMenu || filterMenu.hidden) return;
    filterMenu.hidden = true;
    filterMenu.replaceChildren();
    filterMenuTrigger?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) filterMenuTrigger?.focus({ preventScroll: true });
    filterMenuTrigger = null;
    filterMenuColumn = null;
  };

  const getFilterChoices = () =>
    filterMenu
      ? Array.from(
          filterMenu.querySelectorAll<HTMLInputElement>(
            '.policy-filter-choice:not([hidden]) input',
          ),
        )
      : [];

  const openFilterMenu = (
    column: PolicyColumn,
    trigger: HTMLElement,
    { focus = true } = {},
  ) => {
    if (!filterMenu) return;
    closeColumnMenu();
    closeViewMenu();
    const counts = new Map<string, number>();
    searchFiltered.forEach((policy) => {
      if (!passesColumnFilters(policy, column.id)) return;
      const value = column.value(policy);
      counts.set(value, (counts.get(value) || 0) + 1);
    });
    const selected = columnFilters.get(column.id);
    selected?.forEach((value) => {
      if (!counts.has(value)) counts.set(value, 0);
    });
    const entries = [...counts].sort(
      (left, right) =>
        right[1] - left[1] || collator.compare(left[0], right[0]),
    );
    const total = entries.reduce((sum, [, count]) => sum + count, 0);

    const createChoice = (text: string, count: number, checked: boolean) => {
      const label = createNode(
        'label',
        'policy-column-choice policy-filter-choice',
      );
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = checked;
      const textNode = createNode('span', 'policy-filter-value', text);
      textNode.title = text;
      label.append(
        checkbox,
        textNode,
        createNode('span', 'policy-filter-count', String(count)),
      );
      return { label, checkbox };
    };

    const all = createChoice('All', total, !selected);
    const valueChoices = entries.map(([value, count]) => {
      const choice = createChoice(
        value || 'None',
        count,
        Boolean(selected?.has(value)),
      );
      choice.checkbox.addEventListener('change', () => {
        const values = columnFilters.get(column.id) || new Set<string>();
        if (choice.checkbox.checked) values.add(value);
        else values.delete(value);
        if (values.size) columnFilters.set(column.id, values);
        else columnFilters.delete(column.id);
        all.checkbox.checked = !values.size;
        applyFilters();
      });
      return { ...choice, search: (value || 'None').toLowerCase() };
    });
    all.checkbox.addEventListener('change', () => {
      all.checkbox.checked = true;
      if (!columnFilters.delete(column.id)) return;
      valueChoices.forEach(({ checkbox }) => {
        checkbox.checked = false;
      });
      applyFilters();
    });

    const list = createNode('div', 'policy-filter-options');
    list.append(all.label, ...valueChoices.map(({ label }) => label));
    filterMenu.replaceChildren();
    filterMenu.setAttribute('aria-label', `Filter ${column.label}`);
    if (entries.length > 10) {
      const searchBox = createNode('div', 'search-box policy-filter-search');
      const icon = createNode('span', 'icon icon-search search-icon');
      icon.setAttribute('aria-hidden', 'true');
      const input = document.createElement('input');
      input.type = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('aria-label', `Search ${column.label} values`);
      input.addEventListener('input', () => {
        const query = input.value.trim().toLowerCase();
        valueChoices.forEach(({ label, search }) => {
          label.hidden = Boolean(query) && !search.includes(query);
        });
      });
      searchBox.append(icon, input);
      filterMenu.appendChild(searchBox);
    }
    filterMenu.appendChild(list);

    filterMenuTrigger?.setAttribute('aria-expanded', 'false');
    filterMenuTrigger = trigger;
    filterMenuColumn = column;
    trigger.setAttribute('aria-expanded', 'true');
    filterMenu.hidden = false;
    positionFilterMenu();
    if (focus)
      (filterMenu.querySelector('input') as HTMLElement | null)?.focus({
        preventScroll: true,
      });
  };

  const { compileSearchTerm, termMatchesPolicy } =
    createPolicyMatcher(searchOptions);

  const applyTableColumnWidths = () => {
    if (!tableEl || !tableCols) return;
    const visible = getVisibleColumns();
    const baseTotal = visible.reduce((sum, column) => sum + column.width, 0);
    const available = Math.max(
      0,
      Math.floor(tableWrap?.clientWidth || tablePanel?.clientWidth || 0) - 2,
    );
    const renderedTotal = Math.max(baseTotal, available);
    const filler = Math.max(0, renderedTotal - baseTotal);
    const overflowX = baseTotal > available ? 'auto' : 'hidden';
    const widths = visible.map((column, index) => {
      const width = column.width + (index === visible.length - 1 ? filler : 0);
      return Math.max(getColumnMinWidth(column), width);
    });
    const signature = `${renderedTotal}|${available}|${overflowX}|${widths.join(',')}`;
    if (signature === tableWidthSignature) return;
    tableWidthSignature = signature;

    const tableWidth = renderedTotal ? `${renderedTotal}px` : '';
    const tableMinWidth = available ? `${available}px` : '100%';
    if (tableWrap && tableWrap.style.overflowX !== overflowX)
      tableWrap.style.overflowX = overflowX;
    if (tableEl.style.width !== tableWidth) tableEl.style.width = tableWidth;
    if (tableEl.style.minWidth !== tableMinWidth)
      tableEl.style.minWidth = tableMinWidth;
    tableCols.replaceChildren();

    widths.forEach((width) => {
      const col = document.createElement('col');
      col.style.width = `${width}px`;
      tableCols.appendChild(col);
    });
  };

  const startColumnResize = (column: PolicyColumn, event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const visible = getVisibleColumns();
    const index = visible.findIndex((item) => item.id === column.id);
    if (index < 0) return;

    const startX = event.clientX;
    const startWidth = column.width;
    const minWidth = getColumnMinWidth(column);
    let rafId = 0;
    let pendingX = startX;
    let resizing = true;
    const target = event.currentTarget as HTMLElement;

    const paint = () => {
      rafId = 0;
      if (!resizing) return;
      const delta = pendingX - startX;
      column.width = Math.max(minWidth, startWidth + delta);
      applyTableColumnWidths();
    };

    const onMove = (moveEvent: PointerEvent) => {
      if (!resizing || (moveEvent.buttons & 1) !== 1) {
        stop(false);
        return;
      }
      pendingX = moveEvent.clientX;
      if (!rafId) rafId = requestAnimationFrame(paint);
    };

    const stop = (commit = true) => {
      if (!resizing) return;
      resizing = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
        if (commit) {
          const delta = pendingX - startX;
          column.width = Math.max(minWidth, startWidth + delta);
          applyTableColumnWidths();
        }
      }
      document.body.classList.remove('policy-column-resizing');
      if (target.hasPointerCapture?.(event.pointerId))
        target.releasePointerCapture(event.pointerId);
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onCancel);
      target.removeEventListener('lostpointercapture', onCancel);
    };

    const onUp = () => stop(true);
    const onCancel = () => stop(false);

    document.body.classList.add('policy-column-resizing');
    target.setPointerCapture(event.pointerId);
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onCancel);
    target.addEventListener('lostpointercapture', onCancel);
  };

  const renderTableHeader = () => {
    closeFilterMenu();
    tableHead.replaceChildren();
    tableHead.hidden = false;
    getVisibleColumns().forEach((column) => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.dataset.column = column.id;
      th.className = 'policy-table-header';
      if (sortState.id === column.id) {
        th.setAttribute(
          'aria-sort',
          sortState.direction === 'asc' ? 'ascending' : 'descending',
        );
      }
      const headerContent = createNode('span', 'policy-table-header-content');
      headerContent.appendChild(
        createNode('span', 'policy-table-header-label', column.label),
      );
      if (sortState.id === column.id) {
        const sortIcon = createNode(
          'span',
          `policy-sort-indicator is-${sortState.direction}`,
        );
        sortIcon.setAttribute('aria-hidden', 'true');
        headerContent.appendChild(sortIcon);
      }
      th.appendChild(headerContent);
      if (column.filterable) {
        th.classList.add('has-filter');
        const filterButton = createNode('button', 'policy-filter-button');
        filterButton.type = 'button';
        filterButton.dataset.column = column.id;
        filterButton.title = `Filter ${column.label}`;
        filterButton.setAttribute('aria-label', `Filter ${column.label}`);
        filterButton.setAttribute('aria-controls', 'policy-filter-menu');
        filterButton.setAttribute('aria-expanded', 'false');
        filterButton.classList.toggle(
          'is-active',
          columnFilters.has(column.id),
        );
        filterButton.addEventListener('click', (event) => {
          event.stopPropagation();
          if (filterMenuTrigger === filterButton) {
            closeFilterMenu();
          } else {
            openFilterMenu(column, filterButton, {
              focus:
                event.detail === 0 || matchMedia('(pointer: fine)').matches,
            });
          }
        });
        th.appendChild(filterButton);
      }
      const resizer = createNode('span', 'policy-column-resizer');
      th.appendChild(resizer);
      th.addEventListener('click', (event) => {
        if (event.target === resizer) return;
        sortState.direction =
          sortState.id === column.id && sortState.direction === 'asc'
            ? 'desc'
            : 'asc';
        sortState.id = column.id;
        renderTableHeader();
        renderTable();
      });
      th.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        openColumnMenu(event.clientX, event.clientY);
      });
      resizer.addEventListener('pointerdown', (event) =>
        startColumnResize(column, event),
      );
      tableHead.appendChild(th);
    });
    applyTableColumnWidths();
  };

  const getEffectiveLimit = () =>
    unlimitedRows ? filtered.length : Math.max(1, rowLimit);

  const renderTable = () => {
    const renderId = ++tableRenderId;
    const previouslyFocusedRow =
      document.activeElement instanceof Element
        ? document.activeElement.closest<HTMLElement>('tr[data-id]')
        : null;
    let restoreTableFocus = Boolean(
      previouslyFocusedRow && tableBody.contains(previouslyFocusedRow),
    );
    if (restoreTableFocus && previouslyFocusedRow)
      tableFocusId = previouslyFocusedRow.dataset.id || tableFocusId;
    tableBody.replaceChildren();
    if (tableNote) tableNote.textContent = '';
    const sorted = sortPolicies(filtered);
    const visible = sorted.slice(0, getEffectiveLimit());
    const columns = getVisibleColumns();
    if (!visible.some((policy) => policy.id === tableFocusId)) {
      tableFocusId =
        visible.find((policy) => policy.id === selectedId)?.id ||
        visible[0]?.id ||
        null;
    }
    const appendRows = (start: number) => {
      if (renderId !== tableRenderId) return;
      const end = Math.min(start + 50, visible.length);
      const fragment = document.createDocumentFragment();
      let focusRow: HTMLElement | null = null;

      for (let index = start; index < end; index += 1) {
        const policy = visible[index];
        const row = document.createElement('tr');
        row.className = policy.id === selectedId ? 'is-active' : '';
        row.tabIndex = policy.id === tableFocusId ? 0 : -1;
        row.dataset.id = policy.id;
        if (policy.id === tableFocusId) focusRow = row;
        columns.forEach((column) => {
          const cell = document.createElement('td');
          cell.textContent = column.value(policy) || '';
          cell.dataset.column = column.id;
          row.appendChild(cell);
        });
        fragment.appendChild(row);
      }

      tableBody.appendChild(fragment);
      if (restoreTableFocus && focusRow) {
        (focusRow as HTMLElement).focus({ preventScroll: true });
        restoreTableFocus = false;
      }
      if (end < visible.length) {
        setTimeout(() => appendRows(end), 0);
      } else if (tableNote) {
        const countNote =
          filtered.length > visible.length
            ? `Showing ${visible.length} of ${filtered.length}`
            : filtered.length
              ? ''
              : 'No matching policies';
        const filterNote = columnFilters.size
          ? `Filtered by ${filterColumns
              .filter((column) => columnFilters.has(column.id))
              .map((column) => column.label)
              .join(', ')}`
          : '';
        tableNote.textContent = [countNote, filterNote, policyLoadWarning]
          .filter(Boolean)
          .join(' - ');
        if (filterNote) {
          const clear = createNode(
            'button',
            'policy-filter-clear',
            'Clear filters',
          );
          clear.type = 'button';
          clear.addEventListener('click', () => {
            columnFilters.clear();
            applyFilters();
          });
          tableNote.appendChild(clear);
        }
      }
    };

    appendRows(0);
  };

  const selectPolicy = (
    policy: Policy | null | undefined,
    options: { updateUrl?: boolean; selectCategory?: boolean } = {},
  ) => {
    if (!policy) return;
    const { updateUrl = true, selectCategory = false } = options;
    selectedId = policy.id;
    tableFocusId = policy.id;
    paneState.detail = true;
    if (selectCategory) {
      selectedCategoryKey = policy.categoryPathKey || '';
      expandTreeForPolicy(policy);
      renderTree();
    }
    if (updateUrl) updatePolicyUrl(policy);
    updatePaneLayout();
    if (selectCategory) return applyFilters();
    tableBody
      .querySelectorAll<HTMLElement>('tr.is-active, tr[tabindex="0"]')
      .forEach((row) => {
        row.classList.remove('is-active');
        row.tabIndex = -1;
      });
    const row = tableBody.querySelector<HTMLElement>(
      `tr[data-id="${policy.id}"]`,
    );
    row?.classList.add('is-active');
    if (row) row.tabIndex = 0;
    renderDetail(policy);
  };

  const selectTreeNode = (categoryKey = '') => {
    selectedCategoryKey = categoryKey || '';
    selectedId = null;
    paneState.detail = false;
    updatePolicyUrl(null);
    updatePaneLayout();
    applyFilters();
  };

  const focusTreeNode = (nodeKey: string) => {
    const item = Array.from(
      treeEl.querySelectorAll<HTMLElement>('.policy-tree-item'),
    ).find((candidate) => candidate.dataset.nodeKey === nodeKey);
    if (!(item instanceof HTMLElement)) return;
    treeEl
      .querySelectorAll<HTMLElement>('.policy-tree-item')
      .forEach((candidate) => {
        candidate.tabIndex = candidate === item ? 0 : -1;
      });
    item.focus({ preventScroll: true });
  };

  const toggleTreeNode = (nodeKey: string, { restoreFocus = false } = {}) => {
    if (expandedTreeNodes.has(nodeKey)) {
      expandedTreeNodes.delete(nodeKey);
    } else {
      expandedTreeNodes.add(nodeKey);
    }
    renderTree();
    if (restoreFocus) requestAnimationFrame(() => focusTreeNode(nodeKey));
  };

  const createTreeButton = ({
    label,
    count,
    categoryKey = '',
    depth = 0,
    nodeKey = '',
    selectionKey = '',
    hasChildren = false,
  }: {
    label: string;
    count: number;
    categoryKey?: string;
    depth?: number;
    nodeKey?: string;
    selectionKey?: string;
    hasChildren?: boolean;
  }) => {
    const button = document.createElement('button');
    const treeNodeKey = nodeKey || categoryKey;
    const treeSelectionKey = selectionKey || categoryKey;
    const expanded = hasChildren && expandedTreeNodes.has(treeNodeKey);
    button.type = 'button';
    button.className = 'policy-tree-item';
    button.dataset.categoryKey = categoryKey;
    button.dataset.selectionKey = treeSelectionKey;
    button.dataset.nodeKey = treeNodeKey;
    button.dataset.depth = String(depth);
    button.tabIndex = -1;
    button.style.setProperty('--policy-tree-depth', String(depth));
    button.setAttribute('role', 'treeitem');
    if (hasChildren) {
      button.setAttribute('aria-expanded', String(expanded));
      const chevron = createNode('span', 'policy-tree-chevron');
      chevron.setAttribute('aria-hidden', 'true');
      chevron.classList.toggle('is-open', expanded);
      chevron.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleTreeNode(treeNodeKey);
      });
      button.appendChild(chevron);
    } else {
      button.appendChild(createNode('span', 'policy-tree-spacer'));
    }
    button.appendChild(createNode('span', 'policy-tree-label', label));
    button.appendChild(createNode('span', 'policy-tree-count', String(count)));
    button.addEventListener('click', () => selectTreeNode(categoryKey));
    if (hasChildren) {
      button.addEventListener('dblclick', (event) => {
        event.preventDefault();
        toggleTreeNode(treeNodeKey);
      });
    }
    return button;
  };

  const updateTreeActive = () => {
    const activeKey = selectedCategoryKey;
    const items = Array.from(
      treeEl.querySelectorAll<HTMLElement>('.policy-tree-item'),
    );
    let activeItem: HTMLElement | null = null;
    items.forEach((item) => {
      const selectionKey = item.dataset.selectionKey || '';
      const categoryKey = item.dataset.categoryKey || '';
      const isActive = selectionKey === activeKey;
      const isActivePath =
        isActive ||
        (Boolean(activeKey) &&
          Boolean(categoryKey) &&
          (activeKey === categoryKey ||
            activeKey.startsWith(`${categoryKey}\u001f`))) ||
        (item.dataset.nodeKey === '__admin__' && Boolean(activeKey));
      item.classList.toggle('is-active', isActive);
      item.classList.toggle('is-active-path', isActivePath);
      item.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if (isActive && !activeItem) activeItem = item;
    });
    const tabStop = activeItem || items[0];
    items.forEach((item) => {
      item.tabIndex = item === tabStop ? 0 : -1;
    });
  };

  const clearPendingSearch = () => {
    if (!searchDelayTimer) return;
    clearTimeout(searchDelayTimer);
    searchDelayTimer = 0;
  };

  const scheduleSearch = () => {
    clearPendingSearch();
    if (searchDelayMs <= 0) {
      applyFilters();
      return;
    }
    searchDelayTimer = window.setTimeout(() => {
      searchDelayTimer = 0;
      applyFilters();
    }, searchDelayMs);
  };

  const buildCategoryTree = () => {
    const rootNode: CategoryNode = {
      key: '',
      name: '',
      label: '',
      categoryKey: '',
      count: 0,
      children: new Map(),
    };
    policies.forEach((policy) => {
      let cursor = rootNode;
      policy.categoryPath.forEach((segment) => {
        const key = normalizeCategorySegment(
          segment.name || segment.displayName,
        );
        if (!cursor.children.has(key)) {
          cursor.children.set(key, {
            key,
            name: segment.name || segment.displayName,
            label: segment.displayName || segment.name,
            categoryKey: '',
            count: 0,
            children: new Map(),
          });
        }
        cursor = cursor.children.get(key)!;
        cursor.count += 1;
      });
    });
    const applyKeys = (node: CategoryNode, prefix: CategorySegment[] = []) => {
      [...node.children.values()].forEach((child) => {
        const path = [
          ...prefix,
          { name: child.name, displayName: child.label },
        ];
        child.categoryKey = makeCategoryKey(path);
        applyKeys(child, path);
      });
    };
    applyKeys(rootNode);
    return rootNode;
  };

  const appendCategoryNodes = (
    parent: HTMLElement | DocumentFragment,
    node: CategoryNode,
    depth: number,
  ) => {
    [...node.children.values()]
      .sort((left, right) => collator.compare(left.label, right.label))
      .forEach((child) => {
        const hasChildren = child.children.size > 0;
        const nodeKey = child.categoryKey;
        parent.appendChild(
          createTreeButton({
            label: child.label,
            count: child.count,
            categoryKey: child.categoryKey,
            depth,
            nodeKey,
            hasChildren,
          }),
        );
        if (expandedTreeNodes.has(nodeKey)) {
          const childLevel = createNode('div', 'policy-tree-level');
          childLevel.setAttribute('role', 'group');
          childLevel.style.setProperty(
            '--policy-tree-depth',
            String(depth + 1),
          );
          appendCategoryNodes(childLevel, child, depth + 1);
          parent.appendChild(childLevel);
        }
      });
  };

  const appendAdministrativeTemplatesTree = (parent: DocumentFragment) => {
    const count = policies.length;
    parent.appendChild(
      createTreeButton({
        label: 'Administrative Templates',
        count,
        depth: 0,
        nodeKey: '__admin__',
        selectionKey: '__admin__',
        hasChildren: true,
      }),
    );
    if (expandedTreeNodes.has('__admin__')) {
      const adminLevel = createNode('div', 'policy-tree-level');
      adminLevel.setAttribute('role', 'group');
      adminLevel.style.setProperty('--policy-tree-depth', '1');
      appendCategoryNodes(adminLevel, categoryTree || buildCategoryTree(), 1);
      adminLevel.appendChild(
        createTreeButton({ label: 'All Settings', count, depth: 1 }),
      );
      parent.appendChild(adminLevel);
    }
  };

  const renderTree = () => {
    treeEl.replaceChildren();
    const fragment = document.createDocumentFragment();
    appendAdministrativeTemplatesTree(fragment);

    treeEl.appendChild(fragment);
    updateTreeActive();
  };

  const applyFilters = () => {
    clearPendingSearch();
    const terms = splitSearchTerms(searchInput.value).map(compileSearchTerm);

    searchFiltered =
      !terms.length && !selectedCategoryKey
        ? policies
        : policies.filter((policy) => {
            if (
              (!terms.length || searchOptions.currentPath) &&
              !categoryMatches(policy, selectedCategoryKey)
            )
              return false;
            if (!terms.length) return true;
            return searchOptions.matchAny
              ? terms.some((term) => termMatchesPolicy(policy, term))
              : terms.every((term) => termMatchesPolicy(policy, term));
          });
    filtered = columnFilters.size
      ? searchFiltered.filter((policy) => passesColumnFilters(policy))
      : searchFiltered;
    const searchState = JSON.stringify([
      searchInput.value,
      selectedCategoryKey,
      searchOptions,
    ]);
    if (
      searchState !== filterSearchState &&
      filterMenuColumn &&
      filterMenuTrigger
    )
      openFilterMenu(filterMenuColumn, filterMenuTrigger, {
        focus: Boolean(filterMenu?.contains(document.activeElement)),
      });
    filterSearchState = searchState;

    if (selectedId && !filtered.some((policy) => policy.id === selectedId)) {
      selectedId = null;
      paneState.detail = false;
      updatePolicyUrl(null);
      updatePaneLayout();
    }
    updateTreeActive();
    updateFilterButtons();
    renderTable();
    renderDetail(selectedId ? policyById.get(selectedId) : undefined);
    updateFilterUrl();
  };

  const normalizePolicy = (policy: RawPolicy, index: number): Policy => {
    const categoryPath = getCategoryPath(policy);
    const categoryDisplayPath =
      categoryPath
        .map((segment) => segment.displayName || segment.name)
        .join(' / ') || getCategory(policy);
    const scope = getPolicyScope(policy);
    const shareId = getPolicyShareId(policy);
    const nameFields = [
      policy.DisplayName,
      policy.PolicyName,
      getCategory(policy),
      categoryDisplayPath,
      policy.File,
      policy.NameSpace,
      scope,
    ]
      .filter((value) => value !== null && value !== undefined && value !== '')
      .map(String);
    return {
      ...policy,
      id: `policy-${index}`,
      shareId,
      scope,
      categoryPath,
      categoryPathKey: makeCategoryKey(categoryPath),
      categoryDisplayPath,
      searchFields: {
        names: nameFields,
      },
      searchFieldsLower: {
        names: nameFields.map((value) => value.toLowerCase()),
      },
    };
  };

  const warmPolicySearchFields = async () => {
    for (let start = 0; start < policies.length; start += 50) {
      await yieldUntilIdle();
      policies.slice(start, start + 50).forEach(preparePolicySearchFields);
    }
  };

  const normalizePolicies = async (data: RawPolicy[]) => {
    const normalized: Policy[] = [];
    for (let start = 0; start < data.length; start += 250) {
      const end = Math.min(start + 250, data.length);
      for (let index = start; index < end; index += 1) {
        normalized.push(normalizePolicy(data[index], index));
      }
      await yieldToMain();
    }
    return normalized.sort((left, right) =>
      collator.compare(
        left.DisplayName || left.PolicyName || '',
        right.DisplayName || right.PolicyName || '',
      ),
    );
  };

  const searchOptionEntries = () =>
    Object.entries(searchOptionInputs) as [
      keyof typeof searchOptions,
      HTMLInputElement | null,
    ][];

  const syncSettingsUi = () => {
    searchOptionEntries().forEach(([key, input]) => {
      if (input) input.checked = Boolean(searchOptions[key]);
    });
    if (searchDelayInput) searchDelayInput.value = String(searchDelayMs);
    if (limitInput) {
      limitInput.value = String(rowLimit);
      limitInput.disabled = unlimitedRows;
    }
    if (unlimitedInput) unlimitedInput.checked = unlimitedRows;
  };

  const applySearchSettingsFromUi = () => {
    searchOptionEntries().forEach(([key, input]) => {
      if (input) searchOptions[key] = input.checked;
    });
    if (searchDelayInput) {
      const parsedDelay = Number.parseInt(searchDelayInput.value, 10);
      searchDelayMs = Number.isFinite(parsedDelay)
        ? Math.min(2000, Math.max(0, parsedDelay))
        : defaultSearchDelayMs;
      searchDelayInput.value = String(searchDelayMs);
    }
    applyFilters();
  };

  const openSettingsModal = () =>
    openSettingsDialog?.({
      initialFocus: settingsCloseButton || undefined,
      recenter: true,
    });

  const closeSettingsModal = () => settingsModal?.close();

  const startPaneResize = (splitter: HTMLElement, event: PointerEvent) => {
    if (event.button !== 0) return;
    const splitterType = splitter.dataset.policySplitter;
    const type =
      splitterType === 'tree' || splitterType === 'detail'
        ? splitterType
        : null;
    const treePanel = root.querySelector('.policy-tree-panel');
    if (!type || !tablePanel || !treePanel || !detailPanel) return;
    event.preventDefault();

    const startX = event.clientX;
    const widths = {
      tree: treePanel.getBoundingClientRect().width,
      table: tablePanel.getBoundingClientRect().width,
      detail: detailPanel.getBoundingClientRect().width,
    };
    const isTree = type === 'tree';
    const adjacentPane = isTree && !paneState.table ? 'detail' : 'table';
    const minWidth = isTree ? 180 : 300;
    const adjacentMinWidth = adjacentPane === 'table' ? 460 : 300;
    const startWidth = widths[type];
    const maxWidth = Math.max(
      minWidth,
      startWidth + widths[adjacentPane] - adjacentMinWidth,
    );
    const property = `--policy-${type}-width`;
    const direction = isTree ? 1 : -1;
    let rafId = 0;
    let pendingX = startX;

    if (paneState.tree && paneState.table && paneState.detail) {
      const fixedPane = isTree ? 'detail' : 'tree';
      root.style.setProperty(
        `--policy-${fixedPane}-width`,
        `${widths[fixedPane]}px`,
      );
    }

    splitter.setPointerCapture(event.pointerId);
    splitter.classList.add('is-resizing');

    const paint = () => {
      rafId = 0;
      const nextWidth = Math.min(
        Math.max(minWidth, startWidth + (pendingX - startX) * direction),
        maxWidth,
      );
      root.style.setProperty(property, `${nextWidth}px`);
    };

    const onMove = (moveEvent: PointerEvent) => {
      pendingX = moveEvent.clientX;
      if (!rafId) rafId = requestAnimationFrame(paint);
    };

    const onUp = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        paint();
      }
      splitter.classList.remove('is-resizing');
      if (splitter.hasPointerCapture(event.pointerId))
        splitter.releasePointerCapture(event.pointerId);
      splitter.removeEventListener('pointermove', onMove);
      splitter.removeEventListener('pointerup', onUp);
      splitter.removeEventListener('pointercancel', onUp);
    };

    splitter.addEventListener('pointermove', onMove);
    splitter.addEventListener('pointerup', onUp);
    splitter.addEventListener('pointercancel', onUp);
  };

  searchInput.addEventListener('input', scheduleSearch);
  treeEl.addEventListener('keydown', (event) => {
    const current =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('.policy-tree-item')
        : null;
    if (!(current instanceof HTMLElement) || !treeEl.contains(current)) return;
    const items = Array.from(
      treeEl.querySelectorAll<HTMLElement>('.policy-tree-item'),
    );
    const index = items.indexOf(current);
    if (index < 0) return;

    let target: HTMLElement | null = null;
    if (event.key === 'ArrowDown') target = items[index + 1] || items[0];
    else if (event.key === 'ArrowUp')
      target = items[index - 1] || items[items.length - 1];
    else if (event.key === 'Home') target = items[0];
    else if (event.key === 'End') target = items[items.length - 1];
    else if (event.key === 'ArrowRight') {
      if (current.getAttribute('aria-expanded') === 'false') {
        event.preventDefault();
        toggleTreeNode(current.dataset.nodeKey || '', { restoreFocus: true });
        return;
      }
      if (current.getAttribute('aria-expanded') === 'true') {
        const next = items[index + 1];
        if (next && Number(next.dataset.depth) > Number(current.dataset.depth))
          target = next;
      }
    } else if (event.key === 'ArrowLeft') {
      if (current.getAttribute('aria-expanded') === 'true') {
        event.preventDefault();
        toggleTreeNode(current.dataset.nodeKey || '', { restoreFocus: true });
        return;
      }
      const currentDepth = Number(current.dataset.depth);
      for (let itemIndex = index - 1; itemIndex >= 0; itemIndex -= 1) {
        if (Number(items[itemIndex].dataset.depth) < currentDepth) {
          target = items[itemIndex];
          break;
        }
      }
    }

    if (!(target instanceof HTMLElement)) return;
    event.preventDefault();
    items.forEach((item) => {
      item.tabIndex = item === target ? 0 : -1;
    });
    target.focus({ preventScroll: true });
  });
  tableBody.addEventListener('click', (event) => {
    const row =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('tr[data-id]')
        : null;
    const policy =
      row && tableBody.contains(row)
        ? policyById.get(row.dataset.id || '')
        : null;
    if (policy) {
      tableFocusId = policy.id;
      selectPolicy(policy, {
        selectCategory: splitSearchTerms(searchInput.value).length > 0,
      });
    }
  });
  tableBody.addEventListener('keydown', (event) => {
    const row =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('tr[data-id]')
        : null;
    if (!(row instanceof HTMLElement) || !tableBody.contains(row)) return;
    const rows = Array.from(
      tableBody.querySelectorAll<HTMLElement>('tr[data-id]'),
    );
    const index = rows.indexOf(row);
    let target: HTMLElement | null = null;
    if (event.key === 'ArrowDown') target = rows[index + 1] || rows[0];
    else if (event.key === 'ArrowUp')
      target = rows[index - 1] || rows[rows.length - 1];
    else if (event.key === 'Home') target = rows[0];
    else if (event.key === 'End') target = rows[rows.length - 1];

    if (target instanceof HTMLElement) {
      event.preventDefault();
      rows.forEach((candidate) => {
        candidate.tabIndex = candidate === target ? 0 : -1;
      });
      tableFocusId = target.dataset.id || null;
      target.focus({ preventScroll: true });
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') return;
    const policy = policyById.get(row.dataset.id || '');
    if (!policy) return;
    event.preventDefault();
    tableFocusId = policy.id;
    selectPolicy(policy, {
      selectCategory: splitSearchTerms(searchInput.value).length > 0,
    });
  });
  viewTrigger?.addEventListener('click', (event) => {
    event.preventDefault();
    closeColumnMenu();
    toggleViewMenu();
  });
  columnTrigger?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeViewMenu();
    if (columnMenu && !columnMenu.hidden) {
      closeColumnMenu();
    } else {
      openColumnMenuFromTrigger();
    }
  });
  settingsButton?.addEventListener('click', openSettingsModal);
  settingsCloseButton?.addEventListener('click', closeSettingsModal);
  settingsDoneButton?.addEventListener('click', closeSettingsModal);
  settingsResetButton?.addEventListener('click', () => {
    Object.assign(searchOptions, defaultSearchOptions);
    rowLimit = defaultRowLimit;
    unlimitedRows = false;
    searchDelayMs = defaultSearchDelayMs;
    syncSettingsUi();
    applyFilters();
  });
  Object.values(searchOptionInputs).forEach((input) => {
    input?.addEventListener('change', applySearchSettingsFromUi);
  });
  searchDelayInput?.addEventListener('change', applySearchSettingsFromUi);
  searchDelayInput?.addEventListener('input', () => {
    const parsedDelay = Number.parseInt(searchDelayInput.value, 10);
    if (Number.isFinite(parsedDelay)) {
      searchDelayMs = Math.min(2000, Math.max(0, parsedDelay));
    }
  });
  settingsModal?.addEventListener('click', (event) => {
    if (event.target === settingsModal) closeSettingsModal();
  });
  splitters.forEach((splitter) => {
    splitter.addEventListener('pointerdown', (event) =>
      startPaneResize(splitter, event),
    );
  });
  limitInput?.addEventListener('input', () => {
    const parsed = Number.parseInt(limitInput.value, 10);
    rowLimit = Number.isFinite(parsed)
      ? Math.min(5000, Math.max(1, parsed))
      : defaultRowLimit;
    renderTable();
  });
  unlimitedInput?.addEventListener('change', () => {
    unlimitedRows = unlimitedInput.checked;
    if (limitInput) limitInput.disabled = unlimitedRows;
    renderTable();
  });
  paneToggles.forEach((button) => {
    button.addEventListener('change', () => {
      const pane = button.dataset.policyPane;
      if (!pane) return;
      if (pane === 'detail' && !selectedId && button.checked) {
        button.checked = false;
        return;
      }
      paneState[pane as keyof typeof paneState] = button.checked;
      updatePaneLayout();
      renderDetail(selectedId ? policyById.get(selectedId) : undefined);
    });
  });
  closeOnFocusLeave(viewDropdown, closeViewMenu);
  closeOnFocusLeave(columnDropdown, closeColumnMenu);

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (
      columnMenu &&
      !columnMenu.hidden &&
      !columnMenu.contains(target) &&
      !columnDropdown?.contains(target)
    )
      closeColumnMenu();
    if (
      viewDropdown &&
      viewMenu &&
      !viewMenu.hidden &&
      !viewDropdown.contains(target)
    )
      closeViewMenu();
    if (
      filterMenu &&
      !filterMenu.contains(target) &&
      !filterMenuTrigger?.contains(target)
    )
      closeFilterMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeColumnMenu();
    closeViewMenu();
    closeFilterMenu({
      restoreFocus: Boolean(filterMenu?.contains(document.activeElement)),
    });
  });
  document.addEventListener('focusin', (event) => {
    const target = event.target;
    if (
      filterMenu &&
      target instanceof Node &&
      !filterMenu.contains(target) &&
      !filterMenuTrigger?.contains(target)
    )
      closeFilterMenu();
  });
  filterMenu?.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const choices = getFilterChoices();
    if (!choices.length) return;
    event.preventDefault();
    const index = choices.indexOf(document.activeElement as HTMLInputElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const next =
      index < 0
        ? step > 0
          ? 0
          : choices.length - 1
        : Math.min(choices.length - 1, Math.max(0, index + step));
    choices[next].focus();
  });
  window.addEventListener('resize', positionFilterMenu);
  window.addEventListener('scroll', positionFilterMenu, {
    capture: true,
    passive: true,
  });
  if (tableWrap)
    new ResizeObserver(() =>
      requestAnimationFrame(applyTableColumnWidths),
    ).observe(tableWrap);

  syncSettingsUi();
  updatePaneLayout();
  setBusy(true);
  loadPolicyPayload()
    .then(async ({ data, categories, categoryWarning }) => {
      policyLoadWarning = categoryWarning;
      categoryMap = new Map(Object.entries(categories));
      policies = await normalizePolicies(data);
      policyById = new Map(policies.map((policy) => [policy.id, policy]));
      policyByShareId = new Map();
      policies.forEach((policy) => {
        const shareKey = normalizePolicyShareId(policy.shareId);
        if (shareKey && !policyByShareId.has(shareKey)) {
          policyByShareId.set(shareKey, policy);
        }
      });
      const linkedPolicy = getPolicyFromUrl();
      const linkedCategoryKey = getCategoryKeyFromUrl();
      searchInput.value =
        new URLSearchParams(location.search).get(SEARCH_QUERY_PARAM) ||
        searchInput.value;
      if (linkedCategoryKey && !linkedPolicy) {
        selectedCategoryKey = linkedCategoryKey;
        expandTreeForCategory(linkedCategoryKey);
      }
      if (linkedPolicy) {
        selectedId = linkedPolicy.id;
        paneState.detail = true;
        selectedCategoryKey =
          linkedCategoryKey && categoryMatches(linkedPolicy, linkedCategoryKey)
            ? linkedCategoryKey
            : linkedPolicy.categoryPathKey || '';
        expandTreeForPolicy(linkedPolicy);
      } else if (new URLSearchParams(location.search).has(POLICY_QUERY_PARAM)) {
        updatePolicyUrl(null);
      }
      applyColumnFiltersFromUrl();
      categoryTree = buildCategoryTree();
      updatePaneLayout();
      renderTree();
      renderTableHeader();
      applyFilters();
      void warmPolicySearchFields();
    })
    .catch((error) => {
      if (tableNote)
        tableNote.textContent =
          error.message || 'Failed to load policy definitions';
      renderTree();
      renderTable();
      renderDetail(null);
    })
    .finally(() => {
      setBusy(false);
    });
}
initPolicyExplorer();
