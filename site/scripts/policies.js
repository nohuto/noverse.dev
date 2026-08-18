/* Copyright (c) 2026 nohuto */
(() => {
  'use strict';

  const POLICY_DATA_URL = 'https://raw.githubusercontent.com/nohuto/admx-parser/main/assets/policies.json';
  const POLICY_CATEGORY_DATA_URL = 'https://raw.githubusercontent.com/nohuto/admx-parser/main/assets/policyCategories.json';
  const POLICY_WORKER_URL = '/main/min/policies-worker.min.js';
  let policyPayloadPromise;
  const afterNextPaint = () => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));
  const yieldUntilIdle = () => new Promise(resolve => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(resolve, { timeout: 300 });
      return;
    }
    setTimeout(resolve, 16);
  });

  const loadPolicyPayloadOnMainThread = async () => {
    const [policyResponse, categoryResponse] = await Promise.all([
      fetch(POLICY_DATA_URL, { cache: 'force-cache' }),
      fetch(POLICY_CATEGORY_DATA_URL, { cache: 'force-cache' }),
    ]);
    if (!policyResponse.ok) throw new Error(`Policy data request failed (${policyResponse.status})`);
    if (!categoryResponse.ok) console.warn(`Policy category data request failed (${categoryResponse.status})`);
    const [data, categoryJson] = await Promise.all([
      policyResponse.json(),
      categoryResponse.ok ? categoryResponse.json() : Promise.resolve({}),
    ]);
    return {
      data: Array.isArray(data) ? data : [],
      categories: categoryJson?.categories && typeof categoryJson.categories === 'object'
        ? categoryJson.categories
        : {},
    };
  };

  const loadPolicyPayload = () => {
    if (policyPayloadPromise) return policyPayloadPromise;
    if (typeof Worker === 'undefined') {
      policyPayloadPromise = loadPolicyPayloadOnMainThread();
      return policyPayloadPromise;
    }

    policyPayloadPromise = new Promise((resolve, reject) => {
      const worker = new Worker(POLICY_WORKER_URL);
      worker.addEventListener('message', event => {
        if (event.data?.type === 'loaded') {
          worker.terminate();
          if (event.data.categoryWarning) console.warn(event.data.categoryWarning);
          performance.mark('nv-policies:worker-profile', { detail: event.data.profile });
          resolve(event.data);
        } else if (event.data?.type === 'error') {
          worker.terminate();
          reject(new Error(event.data.message));
        }
      }, { once: true });
      worker.addEventListener('error', () => {
        worker.terminate();
        loadPolicyPayloadOnMainThread().then(resolve, reject);
      }, { once: true });
      worker.postMessage({
        type: 'load',
        policyUrl: POLICY_DATA_URL,
        categoryUrl: POLICY_CATEGORY_DATA_URL,
      });
    });
    return policyPayloadPromise;
  };

  const getPolicyScope = policy => {
    const hives = new Set((policy.KeyPath || [])
      .map(path => String(path || '').split('\\')[0].toUpperCase())
      .filter(Boolean));
    const hasMachine = hives.has('HKLM');
    const hasUser = hives.has('HKCU');
    if (hasMachine && hasUser) return 'Both';
    if (hasUser) return 'User';
    return 'Machine';
  };

  const formatPolicyRange = element => {
    const maxValue = element?.MaxValue;
    const minValue = element?.MinValue ?? '0';
    if (maxValue !== null && maxValue !== undefined && maxValue !== '') return `${minValue} - ${maxValue}`;
    return `${minValue}+`;
  };

  const createNode = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === 'string') node.textContent = text;
    return node;
  };

  const getPolicyElementValueNames = policy => {
    const elements = Array.isArray(policy?.Elements) ? policy.Elements : [];
    return [...new Set(elements
      .map(element => String(element?.ValueName || '').trim())
      .filter(Boolean))];
  };

  function initPolicyExplorer() {
    const root = document.getElementById('policy-explorer');
    if (!root || root.dataset.initialized === 'true') return;
    root.dataset.initialized = 'true';

    const searchInput = root.querySelector('#policy-search');
    const limitInput = root.querySelector('#policy-limit');
    const unlimitedInput = root.querySelector('#policy-limit-unlimited');
    const paneToggles = Array.from(root.querySelectorAll('[data-policy-pane]'));
    const viewDropdown = root.querySelector('#policy-view-dropdown');
    const viewTrigger = root.querySelector('#policy-view-trigger');
    const viewMenu = root.querySelector('#policy-view-menu');
    const columnDropdown = root.querySelector('#policy-column-dropdown');
    const columnTrigger = root.querySelector('#policy-column-trigger');
    const treeEl = root.querySelector('#policy-tree');
    const tablePanel = root.querySelector('.policy-table-panel');
    const tableWrap = root.querySelector('.policy-table-wrap');
    const tableEl = root.querySelector('.policy-table');
    const detailPanel = root.querySelector('#policy-detail');
    const tableHead = root.querySelector('#policy-table-head');
    const tableCols = root.querySelector('#policy-table-cols');
    const tableBody = root.querySelector('#policy-table-body');
    const tableNote = root.querySelector('#policy-table-note');
    const columnMenu = root.querySelector('#policy-column-menu');
    const detailBody = root.querySelector('#policy-detail-body');
    const settingsButton = root.querySelector('#policy-settings');
    const settingsModal = root.querySelector('#policy-settings-modal');
    const settingsDialog = root.querySelector('#policy-settings-dialog');
    const settingsHeader = root.querySelector('#policy-settings-header');
    const settingsCloseButton = root.querySelector('#policy-settings-close');
    const settingsDoneButton = root.querySelector('#policy-settings-done');
    const settingsResetButton = root.querySelector('#policy-settings-reset');
    const searchDelayInput = root.querySelector('#policy-search-delay');
    const searchOptionInputs = {
      wildcards: root.querySelector('#policy-search-wildcards'),
      whole: root.querySelector('#policy-search-whole'),
      caseSensitive: root.querySelector('#policy-search-case'),
      matchAny: root.querySelector('#policy-search-any'),
      currentPath: root.querySelector('#policy-search-current-path'),
      names: root.querySelector('#policy-search-names'),
      registry: root.querySelector('#policy-search-registry'),
      details: root.querySelector('#policy-search-details')
    };
    const splitters = Array.from(root.querySelectorAll('[data-policy-splitter]'));

    if (!searchInput || !treeEl || !tableBody || !detailBody || !tableHead || !tableCols) return;

    let policies = [];
    let policyById = new Map();
    let policyByShareId = new Map();
    let filtered = [];
    let selectedId = null;
    let selectedCategoryKey = '';
    let categoryMap = new Map();
    let categoryTree = null;
    let tableRenderId = 0;
    const expandedTreeNodes = new Set(['__admin__']);
    const defaultRowLimit = 350;
    let rowLimit = defaultRowLimit;
    let unlimitedRows = false;
    const defaultSearchDelayMs = 200;
    let searchDelayMs = defaultSearchDelayMs;
    let searchDelayTimer = 0;
    let tableFocusId = null;
    const settingsDialogManager = window.NV_CREATE_DRAGGABLE_DIALOG_MANAGER?.({
      layer: settingsModal,
      dialog: settingsDialog,
      handle: settingsHeader
    });
    const paneState = {
      tree: true,
      table: true,
      detail: false
    };
    const defaultSearchOptions = {
      wildcards: false,
      whole: false,
      caseSensitive: false,
      matchAny: false,
      currentPath: false,
      names: true,
      registry: true,
      details: true
    };
    const searchOptions = { ...defaultSearchOptions };
    const sortState = {
      id: 'setting',
      direction: 'asc'
    };
    const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

    const setBusy = busy => {
      root.setAttribute('aria-busy', busy ? 'true' : 'false');
    };

    const getCategory = policy => policy.CategoryName || 'Uncategorized';
    const normalizeCategorySegment = segment => String(segment || '').trim().toLowerCase();
    const makeCategoryKey = path => path.map(segment => normalizeCategorySegment(segment.name || segment.displayName)).join('\u001f');
    const getCategoryPath = policy => {
      const categoryName = getCategory(policy);
      const meta = categoryMap.get(categoryName);
      if (meta?.path?.length) return meta.path;
      return [{ name: categoryName, displayName: categoryName }];
    };
    const getCategoryDisplayPath = policy => (policy.categoryPath || getCategoryPath(policy))
      .map(segment => segment.displayName || segment.name)
      .join(' / ') || policy.categoryDisplayPath || getCategory(policy);
    const getPrimaryPath = policy => (policy.KeyPath || [])[0] || '';
    const getPolicyValue = policy => {
      if (policy.ValueName) return policy.ValueName;
      const valueNames = getPolicyElementValueNames(policy);
      return valueNames.length ? valueNames.join(', ') : '<ElementDefined>';
    };
    const POLICY_QUERY_PARAM = 'p';
    const getPolicyShareId = policy => {
      const policyName = String(policy?.PolicyName || '').trim();
      if (!policyName) return '';
      const fileName = String(policy?.File || '').trim().replace(/\.admx$/i, '');
      if (fileName) return `${fileName}*${policyName}`;
      const namespace = String(policy?.NameSpace || '').trim();
      return namespace ? `${namespace}*${policyName}` : policyName;
    };
    const normalizePolicyShareId = value => String(value || '').trim().toLowerCase();
    const updatePolicyUrl = policy => {
      if (!history?.replaceState) return;
      const url = new URL(location.href);
      const shareId = policy?.shareId || '';
      if (shareId) {
        url.searchParams.set(POLICY_QUERY_PARAM, shareId);
      } else {
        url.searchParams.delete(POLICY_QUERY_PARAM);
      }
      const nextUrl = `${url.pathname}${url.search}${url.hash}`;
      history.replaceState({ ...(history.state || {}), url: nextUrl }, '', nextUrl);
    };
    const getPolicyFromUrl = () => {
      const rawId = new URLSearchParams(location.search).get(POLICY_QUERY_PARAM);
      if (!rawId) return null;
      const normalized = normalizePolicyShareId(rawId);
      return policyByShareId.get(normalized)
        || policyByShareId.get(normalized.replace(':', '*'))
        || policyById.get(rawId)
        || null;
    };
    const expandTreeForPolicy = policy => {
      expandedTreeNodes.add('__admin__');
      const path = Array.isArray(policy?.categoryPath) ? policy.categoryPath : [];
      path.forEach((_, index) => {
        expandedTreeNodes.add(makeCategoryKey(path.slice(0, index + 1)));
      });
    };
    const isNumericData = value => /^-?\d+$/.test(String(value ?? '').trim());
    const getElementRegistryType = element => {
      const type = element?.Type || '';
      if (type === 'Text') return element?.Expandable ? 'REG_EXPAND_SZ' : 'REG_SZ';
      if (type === 'MultiText') return 'REG_MULTI_SZ';
      if (type === 'List') return 'REG_SZ';
      if (type === 'LongDecimal') return 'REG_QWORD';
      if (type === 'Decimal') return element?.StoreAsText ? 'REG_SZ' : 'REG_DWORD';
      if (type === 'Boolean' || type === 'TrueValue' || type === 'FalseValue') return 'REG_DWORD';
      if (type === 'Enum') {
        const items = Array.isArray(element.Items) ? element.Items : [];
        return items.some(item => item.Data !== null && item.Data !== undefined && !isNumericData(item.Data)) ? 'REG_SZ' : 'REG_DWORD';
      }
      if (type === 'EnabledValue' || type === 'DisabledValue' || type === 'EnabledList' || type === 'DisabledList') {
        if (element?.Action === 'Delete') return 'Delete';
        return isNumericData(element.Data) ? 'REG_DWORD' : 'REG_SZ';
      }
      return 'Unknown';
    };
    const getElementDisplayType = element => {
      const type = element?.Type || 'Element';
      if (type === 'EnabledValue' || type === 'DisabledValue' || type === 'EnabledList' || type === 'DisabledList') {
        return getElementRegistryType(element);
      }
      return type;
    };
    const appendUnique = (target, value) => {
      if (value === null || value === undefined) return;
      const normalized = String(value);
      if (!normalized && value !== '') return;
      if (!target.includes(normalized)) target.push(normalized);
    };
    const formatPolicyMetaValue = value => {
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (value === '') return '""';
      return String(value);
    };
    const addPolicyMeta = (group, label, value) => {
      if (value === null || value === undefined) return;
      const text = formatPolicyMetaValue(value);
      const existing = group.meta.find(item => item.label === label);
      if (existing) {
        appendUnique(existing.values, text);
      } else {
        group.meta.push({ label, values: [text] });
      }
    };
    const addElementMeta = (entry, element) => {
      [
        ['Required', element?.Required],
        ['Max length', element?.MaxLength],
        ['Max strings', element?.MaxStrings],
        ['Expandable', element?.Expandable],
        ['Stored as text', element?.StoreAsText],
        ['Client extension', element?.ClientExtension]
      ].forEach(([label, value]) => addPolicyMeta(entry, label, value));
    };
    const getPathTail = path => {
      const parts = String(path || '').split('\\').filter(Boolean);
      return parts[parts.length - 1] || '';
    };
    const getActionValue = item => (item?.Action === 'Delete' ? 'Delete' : item?.Data ?? '');
    const getEntryValueLabel = (valueName, element, paths) => {
      const cleanValue = String(valueName || '').trim();
      if (cleanValue) return cleanValue;
      if (element?.Type === 'List') return '<ListEntries>';
      if (element?.Type === 'EnabledList' || element?.Type === 'DisabledList') return '<ListValue>';
      return getPathTail(paths[0]) || '<ElementDefined>';
    };
    const getElementPaths = (policy, element) => {
      const elementPaths = Array.isArray(element?.KeyPath) ? element.KeyPath.filter(Boolean) : [];
      if (elementPaths.length) return elementPaths;
      return Array.isArray(policy?.KeyPath) ? policy.KeyPath.filter(Boolean) : [];
    };
    const makePathGroupKey = paths => (paths.length ? paths : ['__no_key__'])
      .map(path => String(path || '').toLowerCase())
      .join('\u001f');
    const getPolicyStorageGroups = policy => {
      const groups = [];
      const groupByPath = new Map();
      const ensureGroup = paths => {
        const normalizedPaths = paths.length ? paths : ['<RegistryPathNotSpecified>'];
        const key = makePathGroupKey(normalizedPaths);
        if (!groupByPath.has(key)) {
          const group = { keyPaths: normalizedPaths, entries: [] };
          groupByPath.set(key, group);
          groups.push(group);
        }
        return groupByPath.get(key);
      };
      const addEntry = (paths, valueName, element, rows, copyValue = valueName) => {
        const group = ensureGroup(paths);
        const label = getEntryValueLabel(valueName, element, paths);
        const entryKey = `${label}\u001f${copyValue ?? ''}`;
        let entry = group.entries.find(item => item.key === entryKey);
        if (!entry) {
          entry = {
            key: entryKey,
            valueName: label,
            copyValue,
            meta: [],
            rows: []
          };
          group.entries.push(entry);
        }
        addElementMeta(entry, element);
        entry.rows.push(...rows);
        return entry;
      };
      const policyValueName = String(policy?.ValueName || '').trim();
      const elements = Array.isArray(policy?.Elements) ? policy.Elements : [];

      elements.forEach(element => {
        const type = element?.Type || '';
        const paths = getElementPaths(policy, element);
        if ((type === 'EnabledValue' || type === 'DisabledValue') && policyValueName) {
          addEntry(paths, policyValueName, element, [{
            type,
            registryType: getElementRegistryType(element),
            label: type === 'EnabledValue' ? 'Enabled' : 'Disabled',
            value: getActionValue(element)
          }], policyValueName);
          return;
        }

        const rawValueName = String(element?.ValueName || '').trim();
        if (type === 'Enum' && Array.isArray(element.Items) && element.Items.length) {
          const rows = element.Items.map(item => ({
            type: 'Enum',
            registryType: getElementRegistryType(element),
            label: item.DisplayName || '<Option>',
            value: getActionValue(item)
          }));
          addEntry(paths, rawValueName || policyValueName, element, rows, rawValueName || policyValueName || null);
          element.Items.forEach(item => {
            const valueList = Array.isArray(item.ValueList) ? item.ValueList : [];
            valueList.forEach(listItem => {
              const listPaths = getElementPaths(policy, listItem);
              const listValueName = String(listItem?.ValueName || '').trim();
              addEntry(listPaths, listValueName, listItem, [{
                type: 'Enum option',
                registryType: listItem.Action === 'Delete' ? 'Delete' : isNumericData(listItem.Data) ? 'REG_DWORD' : 'REG_SZ',
                label: `When ${item.DisplayName || '<Option>'}`,
                value: getActionValue(listItem)
              }], listValueName || null);
            });
          });
          return;
        }
        if (type === 'Boolean') {
          addEntry(paths, rawValueName || policyValueName, element, [
            {
              type: 'Boolean',
              registryType: getElementRegistryType(element),
              label: 'True',
              value: element.TrueAction === 'Delete' ? 'Delete' : element.TrueValue ?? '1'
            },
            {
              type: 'Boolean',
              registryType: getElementRegistryType(element),
              label: 'False',
              value: element.FalseAction === 'Delete' ? 'Delete' : element.FalseValue ?? '0'
            }
          ], rawValueName || policyValueName || null);
          return;
        }
        if (type === 'Decimal' || type === 'LongDecimal') {
          addEntry(paths, rawValueName || policyValueName, element, [{
            type,
            registryType: getElementRegistryType(element),
            label: 'Range',
            value: formatPolicyRange(element)
          }], rawValueName || policyValueName || null);
          return;
        }
        if (type === 'EnabledList' || type === 'DisabledList') {
          addEntry(paths, rawValueName, element, [{
            type,
            registryType: getElementRegistryType(element),
            label: type === 'EnabledList' ? 'Enabled' : 'Disabled',
            value: getActionValue(element)
          }], rawValueName || null);
          return;
        }
        const fallbackValueName = type === 'List' && !rawValueName ? '' : rawValueName || policyValueName;
        addEntry(paths, fallbackValueName, element, [{
          type: getElementDisplayType(element),
          registryType: getElementRegistryType(element),
          label: type === 'List' ? '<InputEntries>' : '<InputValue>',
          value: ''
        }], fallbackValueName || null);
      });

      if (!groups.length && policyValueName) {
        addEntry(getElementPaths(policy, null), policyValueName, null, []);
      }
      const policyPathKey = makePathGroupKey(Array.isArray(policy?.KeyPath) ? policy.KeyPath.filter(Boolean) : []);
      return groups.sort((left, right) => {
        const leftMain = makePathGroupKey(left.keyPaths) === policyPathKey;
        const rightMain = makePathGroupKey(right.keyPaths) === policyPathKey;
        if (leftMain === rightMain) return 0;
        return leftMain ? -1 : 1;
      });
    };
    const getPolicyValueGroups = policy => getPolicyStorageGroups(policy).flatMap(group => group.entries.map(entry => ({
      valueName: entry.valueName,
      keyPaths: group.keyPaths,
      meta: entry.meta,
      rows: entry.rows.map(row => ({
        type: row.type,
        registryType: row.registryType,
        text: [row.label, row.value].filter(value => value !== '').join(': ')
      }))
    })));
    const getEntryRegistryTypes = entry => [...new Set(entry.rows
      .map(row => row.registryType && row.registryType !== 'Unknown' ? row.registryType : row.type)
      .filter(Boolean))];

    const columns = [
      { id: 'setting', label: 'Name', width: 420, minWidth: 180, value: policy => policy.DisplayName || policy.PolicyName || '' },
      { id: 'value', label: 'Value', width: 160, minWidth: 90, value: policy => getPolicyValue(policy) },
      { id: 'scope', label: 'Scope', width: 90, minWidth: 58, value: policy => policy.scope || '' },
      { id: 'supported', label: 'Supported On', width: 240, minWidth: 150, value: policy => policy.Supported || '' },
      { id: 'policy', label: 'Policy', width: 220, minWidth: 140, value: policy => policy.PolicyName || '' },
      { id: 'category', label: 'Category', width: 260, minWidth: 150, value: policy => policy.categoryDisplayPath || getCategoryDisplayPath(policy) },
      { id: 'registry', label: 'Registry', width: 360, minWidth: 180, value: policy => getPrimaryPath(policy) },
      { id: 'admx', label: 'ADMX', width: 150, minWidth: 90, value: policy => policy.File || '' }
    ];
    const visibleColumns = new Set(['setting', 'scope', 'supported', 'value']);
    let tableWidthSignature = '';

    const getVisibleColumns = () => columns.filter(column => visibleColumns.has(column.id));
    const getColumnMinWidth = column => column.minWidth || 80;

    const copyPolicyText = async (text, successMessage = 'Copied') => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        showToast(successMessage);
      } catch {
        showToast('Copy failed');
      }
    };

    const createCopyBox = (className, text, label = 'Copy', successMessage = 'Copied', prefixText = '') => {
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
      button.addEventListener('click', () => copyPolicyText(text || '', successMessage));
      box.appendChild(button);
      return box;
    };
    const createPolicyValueTitle = (entry, typeText) => {
      if (entry.copyValue !== null) {
        return createCopyBox('policy-copy-box policy-value-name', entry.valueName, 'Copy value name', 'Copied value', typeText);
      }

      const title = createNode('div', 'policy-value-title');
      title.appendChild(createNode('span', 'policy-copy-text', entry.valueName));
      if (typeText) {
        title.appendChild(createNode('span', 'policy-copy-prefix', typeText));
      }
      return title;
    };

    const updatePaneLayout = () => {
      root.classList.toggle('policy-hide-tree', !paneState.tree);
      root.classList.toggle('policy-hide-table', !paneState.table);
      root.classList.toggle('policy-hide-detail', !paneState.detail);
      const treePanel = root.querySelector('.policy-tree-panel');
      if (treePanel) treePanel.hidden = !paneState.tree;
      if (tablePanel) tablePanel.hidden = !paneState.table;
      if (detailPanel) detailPanel.hidden = !paneState.detail;
      splitters.forEach(splitter => {
        const type = splitter.dataset.policySplitter;
        splitter.hidden = type === 'tree'
          ? !(paneState.tree && (paneState.table || paneState.detail))
          : !(paneState.table && paneState.detail);
      });
      paneToggles.forEach(button => {
        const pane = button.dataset.policyPane;
        const active = Boolean(paneState[pane]);
        button.checked = active;
        button.closest('.policy-view-option')?.setAttribute('aria-checked', active ? 'true' : 'false');
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

    const renderDetail = policy => {
      detailBody.replaceChildren();
      if (!policy || !paneState.detail) {
        return;
      }

      const heading = createNode('div', 'policy-detail-heading');
      heading.appendChild(createNode('h2', null, policy.DisplayName || policy.PolicyName));
      detailBody.appendChild(heading);

      const fields = createNode('div', 'policy-detail-grid');
      const detailFields = [
        ['Policy', policy.PolicyName],
        ['Scope', policy.scope],
        ['ADMX', policy.File],
        ['Namespace', policy.NameSpace],
        ['Supported', policy.Supported],
        ['Category', getCategoryDisplayPath(policy)]
      ];
      if (policy.ClientExtension) {
        detailFields.splice(4, 0, ['Client Extension', policy.ClientExtension]);
      }
      detailFields.forEach(([label, value]) => {
        const row = createNode('div', 'policy-detail-field');
        row.appendChild(createNode('span', 'policy-field-label', label));
        row.appendChild(createNode('span', 'policy-field-value', value || 'Not specified'));
        fields.appendChild(row);
      });
      detailBody.appendChild(fields);

      if (policy.ExplainText) {
        const explain = createNode('p', 'policy-explain', policy.ExplainText);
        detailBody.appendChild(explain);
      }

      const elementSection = createNode('section', 'policy-section');
      elementSection.appendChild(createNode('h3', null, 'Registry Values'));
      const storageGroups = getPolicyStorageGroups(policy);
      if (!storageGroups.length) {
        elementSection.appendChild(createNode('div', 'policy-muted', 'No ADMX elements exported for this policy'));
      } else {
        const registryList = createNode('div', 'policy-registry-list');
        storageGroups.forEach(group => {
          const groupNode = createNode('div', 'policy-registry-group');
          const pathList = createNode('div', 'policy-code-list policy-registry-paths');
          group.keyPaths.forEach(path => {
            pathList.appendChild(createCopyBox('policy-copy-box', path, 'Copy registry path', 'Copied key'));
          });
          groupNode.appendChild(pathList);

          const entries = createNode('div', 'policy-registry-values');
          group.entries.forEach(entry => {
            const entryNode = createNode('div', 'policy-value-entry');
            const header = createNode('div', 'policy-value-header');
            const registryTypes = getEntryRegistryTypes(entry);
            const typeText = registryTypes.length ? registryTypes.join(', ') : '';
            header.appendChild(createPolicyValueTitle(entry, typeText));
            if (entry.meta.length) {
              const metaRow = createNode('div', 'policy-value-meta-row');
              const meta = createNode('span', 'policy-value-attrs');
              meta.textContent = entry.meta.map(item => `${item.label}: ${item.values.join(', ')}`).join('  |  ');
              metaRow.appendChild(meta);
              header.appendChild(metaRow);
            }
            entryNode.appendChild(header);

            if (entry.rows.length) {
              const rows = createNode('div', 'policy-data-list');
              if (entry.rows.some(row => row.value !== '')) {
                const head = createNode('div', 'policy-data-row policy-data-head');
                head.appendChild(createNode('span', 'policy-data-label', 'Meaning'));
                head.appendChild(createNode('span', 'policy-data-value', 'Data'));
                rows.appendChild(head);
              }
              entry.rows.forEach(row => {
                const hasValue = row.value !== '';
                const item = createNode('div', hasValue ? 'policy-data-row' : 'policy-data-row policy-data-row-single');
                item.appendChild(createNode('span', 'policy-data-label', row.label));
                if (hasValue) {
                  item.appendChild(createNode('span', 'policy-data-value', row.value));
                }
                rows.appendChild(item);
              });
              entryNode.appendChild(rows);
            }
            entries.appendChild(entryNode);
          });
          groupNode.appendChild(entries);
          registryList.appendChild(groupNode);
        });
        elementSection.appendChild(registryList);
      }
      detailBody.appendChild(elementSection);
    };

    const sortPolicies = rows => {
      if (sortState.id === 'setting') {
        return sortState.direction === 'asc' ? rows : rows.slice().reverse();
      }
      const column = columns.find(item => item.id === sortState.id) || columns[0];
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
      columns.forEach(column => {
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
          renderTable();
        });
        label.append(checkbox, createNode('span', null, column.label));
        columnMenu.appendChild(label);
      });
    };

    const openColumnMenu = (x, y, options = {}) => {
      if (!columnMenu) return;
      renderColumnMenu();
      columnMenu.hidden = false;
      columnMenu.style.left = `${x}px`;
      columnMenu.style.top = `${y}px`;
      columnTrigger?.setAttribute('aria-expanded', options.fromTrigger ? 'true' : 'false');
    };

    const openColumnMenuFromTrigger = () => {
      if (!columnTrigger) return;
      const rect = columnTrigger.getBoundingClientRect();
      openColumnMenu(rect.right, rect.bottom + 4, { fromTrigger: true });
      if (!columnMenu) return;
      const menuWidth = columnMenu.offsetWidth;
      const menuHeight = columnMenu.offsetHeight;
      const left = Math.min(Math.max(4, rect.right - menuWidth), window.innerWidth - menuWidth - 4);
      const top = Math.min(rect.bottom + 4, window.innerHeight - menuHeight - 4);
      columnMenu.style.left = `${left}px`;
      columnMenu.style.top = `${Math.max(4, top)}px`;
    };

    const closeColumnMenu = () => {
      if (columnMenu) columnMenu.hidden = true;
      columnTrigger?.setAttribute('aria-expanded', 'false');
    };

    const escapeRegExp = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const wildcardToRegExp = term => {
      const pattern = String(term)
        .split('')
        .map(char => {
          if (char === '*') return '.*';
          if (char === '?') return '.';
          return escapeRegExp(char);
        })
        .join('');
      return new RegExp(searchOptions.whole ? `^${pattern}$` : pattern, searchOptions.caseSensitive ? '' : 'i');
    };

    const splitSearchTerms = value => {
      const terms = [];
      String(value || '').replace(/"([^"]+)"|(\S+)/g, (_, quoted, bare) => {
        const term = quoted || bare;
        if (term) terms.push(term);
        return '';
      });
      return terms;
    };

    const getSearchFields = (policy, lowercase = false) => {
      if (searchOptions.registry || searchOptions.details) preparePolicySearchFields(policy);
      const source = lowercase ? policy.searchFieldsLower : policy.searchFields;
      const fields = [];
      if (searchOptions.names) fields.push(...source.names);
      if (searchOptions.registry) fields.push(...source.registry);
      if (searchOptions.details) fields.push(...source.details);
      return fields;
    };

    const compileSearchTerm = term => {
      if (searchOptions.wildcards) return { regex: wildcardToRegExp(term) };
      return { value: searchOptions.caseSensitive ? term : term.toLowerCase() };
    };

    const termMatchesPolicy = (policy, matcher) => {
      const fields = getSearchFields(policy, !searchOptions.caseSensitive && !matcher.regex);
      if (!fields.length) return false;
      if (matcher.regex) return fields.some(field => matcher.regex.test(field));
      return searchOptions.whole
        ? fields.some(field => field === matcher.value)
        : fields.some(field => field.includes(matcher.value));
    };

    const applyTableColumnWidths = () => {
      if (!tableEl || !tableCols) return;
      const visible = getVisibleColumns();
      const baseTotal = visible.reduce((sum, column) => sum + column.width, 0);
      const available = Math.max(0, Math.floor(tableWrap?.clientWidth || tablePanel?.clientWidth || 0) - 2);
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
      if (tableWrap && tableWrap.style.overflowX !== overflowX) tableWrap.style.overflowX = overflowX;
      if (tableEl.style.width !== tableWidth) tableEl.style.width = tableWidth;
      if (tableEl.style.minWidth !== tableMinWidth) tableEl.style.minWidth = tableMinWidth;
      tableCols.replaceChildren();

      widths.forEach(width => {
        const col = document.createElement('col');
        col.style.width = `${width}px`;
        tableCols.appendChild(col);
      });
    };

    const startColumnResize = (column, event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      const visible = getVisibleColumns();
      const index = visible.findIndex(item => item.id === column.id);
      if (index < 0) return;

      const startX = event.clientX;
      const startWidth = column.width;
      const minWidth = getColumnMinWidth(column);
      let rafId = 0;
      let pendingX = startX;
      let resizing = true;
      const target = event.currentTarget;

      const paint = () => {
        rafId = 0;
        if (!resizing) return;
        const delta = pendingX - startX;
        column.width = Math.max(minWidth, startWidth + delta);
        applyTableColumnWidths();
      };

      const onMove = moveEvent => {
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
        if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
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
      tableHead.replaceChildren();
      tableHead.hidden = false;
      getVisibleColumns().forEach(column => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.dataset.column = column.id;
        th.className = 'policy-table-header';
        if (sortState.id === column.id) {
          th.setAttribute('aria-sort', sortState.direction === 'asc' ? 'ascending' : 'descending');
        }
        const headerContent = createNode('span', 'policy-table-header-content');
        headerContent.appendChild(createNode('span', 'policy-table-header-label', column.label));
        if (sortState.id === column.id) {
          const sortIcon = createNode('span', `policy-sort-indicator is-${sortState.direction}`);
          sortIcon.setAttribute('aria-hidden', 'true');
          headerContent.appendChild(sortIcon);
        }
        th.appendChild(headerContent);
        const resizer = createNode('span', 'policy-column-resizer');
        th.appendChild(resizer);
        th.addEventListener('click', event => {
          if (event.target === resizer) return;
          sortState.direction = sortState.id === column.id && sortState.direction === 'asc' ? 'desc' : 'asc';
          sortState.id = column.id;
          renderTableHeader();
          renderTable();
        });
        th.addEventListener('contextmenu', event => {
          event.preventDefault();
          openColumnMenu(event.clientX, event.clientY);
        });
        resizer.addEventListener('pointerdown', event => startColumnResize(column, event));
        tableHead.appendChild(th);
      });
      applyTableColumnWidths();
    };

    const getEffectiveLimit = () => unlimitedRows ? filtered.length : Math.max(1, rowLimit);

    const renderTable = () => {
      const renderId = ++tableRenderId;
      const previouslyFocusedRow = document.activeElement instanceof Element
        ? document.activeElement.closest('tr[data-id]')
        : null;
      let restoreTableFocus = Boolean(previouslyFocusedRow && tableBody.contains(previouslyFocusedRow));
      if (restoreTableFocus) tableFocusId = previouslyFocusedRow.dataset.id || tableFocusId;
      tableBody.replaceChildren();
      if (tableNote) tableNote.textContent = '';
      const sorted = sortPolicies(filtered);
      const visible = sorted.slice(0, getEffectiveLimit());
      const activePolicy = policyById.get(selectedId);
      const columns = getVisibleColumns();
      if (!visible.some(policy => policy.id === tableFocusId)) {
        tableFocusId = visible.find(policy => policy.id === selectedId)?.id || visible[0]?.id || null;
      }
      const appendRows = start => {
        if (renderId !== tableRenderId) return;
        const end = Math.min(start + 50, visible.length);
        const fragment = document.createDocumentFragment();

        for (let index = start; index < end; index += 1) {
          const policy = visible[index];
          const row = document.createElement('tr');
          row.className = policy.id === selectedId ? 'is-active' : '';
          row.tabIndex = policy.id === tableFocusId ? 0 : -1;
          row.dataset.id = policy.id;
          columns.forEach(column => {
            const cell = document.createElement('td');
            cell.textContent = column.value(policy) || '';
            cell.dataset.column = column.id;
            row.appendChild(cell);
          });
          fragment.appendChild(row);
        }

        tableBody.appendChild(fragment);
        if (restoreTableFocus) {
          const focusRow = Array.from(tableBody.querySelectorAll('tr[data-id]'))
            .find(row => row.dataset.id === tableFocusId);
          if (focusRow instanceof HTMLElement) {
            focusRow.focus({ preventScroll: true });
            restoreTableFocus = false;
          }
        }
        if (end < visible.length) {
          setTimeout(() => appendRows(end), 0);
        } else if (tableNote) {
          tableNote.textContent = filtered.length > visible.length
            ? `Showing ${visible.length} of ${filtered.length}`
            : filtered.length ? '' : 'No matching policies';
        }
      };

      appendRows(0);
      if (activePolicy && paneState.detail) renderDetail(activePolicy);
    };

    const categoryMatches = (policy, categoryKey) => {
      if (!categoryKey) return true;
      return policy.categoryPathKey === categoryKey || policy.categoryPathKey.startsWith(`${categoryKey}\u001f`);
    };

    const selectPolicy = (policy, options = {}) => {
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
      applyFilters();
    };

    const getTreeSelectionKey = () => selectedCategoryKey;

    const selectTreeNode = (categoryKey = '') => {
      selectedCategoryKey = categoryKey || '';
      selectedId = null;
      paneState.detail = false;
      updatePolicyUrl(null);
      updatePaneLayout();
      applyFilters();
    };

    const focusTreeNode = nodeKey => {
      const item = Array.from(treeEl.querySelectorAll('.policy-tree-item'))
        .find(candidate => candidate.dataset.nodeKey === nodeKey);
      if (!(item instanceof HTMLElement)) return;
      treeEl.querySelectorAll('.policy-tree-item').forEach(candidate => {
        candidate.tabIndex = candidate === item ? 0 : -1;
      });
      item.focus({ preventScroll: true });
    };

    const toggleTreeNode = (nodeKey, restoreFocus = false) => {
      if (expandedTreeNodes.has(nodeKey)) {
        expandedTreeNodes.delete(nodeKey);
      } else {
        expandedTreeNodes.add(nodeKey);
      }
      renderTree();
      if (restoreFocus) requestAnimationFrame(() => focusTreeNode(nodeKey));
    };

    const createTreeButton = ({ label, count, categoryKey = '', depth = 0, nodeKey = '', selectionKey = '', hasChildren = false }) => {
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
        chevron.addEventListener('click', event => {
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
        button.addEventListener('dblclick', event => {
          event.preventDefault();
          toggleTreeNode(treeNodeKey);
        });
      }
      return button;
    };

    const updateTreeActive = () => {
      const activeKey = getTreeSelectionKey();
      const items = Array.from(treeEl.querySelectorAll('.policy-tree-item'));
      let activeItem = null;
      items.forEach(item => {
        const selectionKey = item.dataset.selectionKey || '';
        const categoryKey = item.dataset.categoryKey || '';
        const isActive = selectionKey === activeKey;
        const isActivePath = isActive || (
          Boolean(activeKey)
          && Boolean(categoryKey)
          && (activeKey === categoryKey || activeKey.startsWith(`${categoryKey}\u001f`))
        ) || (item.dataset.nodeKey === '__admin__' && Boolean(activeKey));
        item.classList.toggle('is-active', isActive);
        item.classList.toggle('is-active-path', isActivePath);
        item.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (isActive && !activeItem) activeItem = item;
      });
      const tabStop = activeItem || items[0];
      items.forEach(item => {
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
      const rootNode = { children: new Map() };
      policies.forEach(policy => {
        let cursor = rootNode;
        policy.categoryPath.forEach(segment => {
          const key = normalizeCategorySegment(segment.name || segment.displayName);
          if (!cursor.children.has(key)) {
            cursor.children.set(key, {
              key,
              name: segment.name || segment.displayName,
              label: segment.displayName || segment.name,
              categoryKey: '',
              count: 0,
              children: new Map()
            });
          }
          cursor = cursor.children.get(key);
          cursor.count += 1;
        });
      });
      const applyKeys = (node, prefix = []) => {
        [...node.children.values()].forEach(child => {
          const path = [...prefix, { name: child.name, displayName: child.label }];
          child.categoryKey = makeCategoryKey(path);
          applyKeys(child, path);
        });
      };
      applyKeys(rootNode);
      return rootNode;
    };

    const appendCategoryNodes = (parent, node, depth) => {
      [...node.children.values()]
        .sort((left, right) => collator.compare(left.label, right.label))
        .forEach(child => {
          const hasChildren = child.children.size > 0;
          const nodeKey = child.categoryKey;
          parent.appendChild(createTreeButton({
            label: child.label,
            count: child.count,
            categoryKey: child.categoryKey,
            depth,
            nodeKey,
            hasChildren
          }));
          if (expandedTreeNodes.has(nodeKey)) {
            const childLevel = createNode('div', 'policy-tree-level');
            childLevel.setAttribute('role', 'group');
            childLevel.style.setProperty('--policy-tree-depth', String(depth + 1));
            appendCategoryNodes(childLevel, child, depth + 1);
            parent.appendChild(childLevel);
          }
        });
    };

    const appendAdministrativeTemplatesTree = parent => {
      const count = policies.length;
      parent.appendChild(createTreeButton({
        label: 'Administrative Templates',
        count,
        depth: 0,
        nodeKey: '__admin__',
        selectionKey: '__admin__',
        hasChildren: true
      }));
      if (expandedTreeNodes.has('__admin__')) {
        const adminLevel = createNode('div', 'policy-tree-level');
        adminLevel.setAttribute('role', 'group');
        adminLevel.style.setProperty('--policy-tree-depth', '1');
        appendCategoryNodes(adminLevel, categoryTree || buildCategoryTree(), 1);
        adminLevel.appendChild(createTreeButton({ label: 'All Settings', count, depth: 1 }));
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

      filtered = !terms.length && !selectedCategoryKey
        ? policies
        : policies.filter(policy => {
          if ((!terms.length || searchOptions.currentPath) && !categoryMatches(policy, selectedCategoryKey)) return false;
          if (!terms.length) return true;
          return searchOptions.matchAny
            ? terms.some(term => termMatchesPolicy(policy, term))
            : terms.every(term => termMatchesPolicy(policy, term));
        });

      if (selectedId && !filtered.some(policy => policy.id === selectedId)) {
        selectedId = null;
        paneState.detail = false;
        updatePolicyUrl(null);
        updatePaneLayout();
      }
      updateTreeActive();
      renderTable();
      renderDetail(policyById.get(selectedId));
    };

    const normalizePolicy = (policy, index) => {
      const categoryPath = getCategoryPath(policy);
      const categoryDisplayPath = categoryPath.map(segment => segment.displayName || segment.name).join(' / ');
      const scope = getPolicyScope(policy);
      const shareId = getPolicyShareId(policy);
      const nameFields = [
        policy.DisplayName,
        policy.PolicyName,
        getCategory(policy),
        categoryDisplayPath,
        policy.File,
        policy.NameSpace,
        scope
      ].filter(value => value !== null && value !== undefined && value !== '').map(String);
      return {
        ...policy,
        id: `policy-${index}`,
        shareId,
        scope,
        categoryPath,
        categoryPathKey: makeCategoryKey(categoryPath),
        categoryDisplayPath,
        searchFields: {
          names: nameFields
        },
        searchFieldsLower: {
          names: nameFields.map(value => value.toLowerCase())
        },
      };
    };

    const preparePolicySearchFields = policy => {
      if (policy.searchFields.registry) return;
      const elements = Array.isArray(policy.Elements) ? policy.Elements : [];
      const valueGroups = getPolicyValueGroups(policy);
      const keyText = [
        ...(policy.KeyPath || []),
        ...valueGroups.flatMap(group => group.keyPaths)
      ].join(' ');
      policy.searchFields.registry = [keyText, policy.ValueName, getPolicyValue(policy)]
        .filter(value => value !== null && value !== undefined && value !== '').map(String);
      policy.searchFields.details = [
        policy.Supported,
        policy.ExplainText,
        valueGroups.flatMap(group => [
          group.valueName,
          ...group.keyPaths,
          ...group.meta.flatMap(item => [item.label, ...item.values]),
          ...group.rows.flatMap(row => [row.type, row.registryType, row.text])
        ]).join(' '),
        elements.map(element => `${element.Type || ''} ${getElementRegistryType(element)}`).join(' ')
      ].filter(value => value !== null && value !== undefined && value !== '').map(String);
      policy.searchFieldsLower.registry = policy.searchFields.registry.map(value => value.toLowerCase());
      policy.searchFieldsLower.details = policy.searchFields.details.map(value => value.toLowerCase());
    };

    const warmPolicySearchFields = async () => {
      for (let start = 0; start < policies.length; start += 50) {
        await yieldUntilIdle();
        policies.slice(start, start + 50).forEach(preparePolicySearchFields);
      }
      performance.mark('nv-policies:search-ready');
      performance.measure('nv-policies:search-index', 'nv-policies:interactive', 'nv-policies:search-ready');
    };

    const normalizePolicies = async data => {
      const normalized = [];
      for (let start = 0; start < data.length; start += 250) {
        const end = Math.min(start + 250, data.length);
        for (let index = start; index < end; index += 1) {
          normalized.push(normalizePolicy(data[index], index));
        }
        await yieldToMain();
      }
      return normalized.sort((left, right) => collator.compare(
        left.DisplayName || left.PolicyName || '',
        right.DisplayName || right.PolicyName || ''
      ));
    };

    const syncSettingsUi = () => {
      Object.entries(searchOptionInputs).forEach(([key, input]) => {
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
      Object.entries(searchOptionInputs).forEach(([key, input]) => {
        if (input) searchOptions[key] = input.checked;
      });
      if (searchDelayInput) {
        const parsedDelay = Number.parseInt(searchDelayInput.value, 10);
        searchDelayMs = Number.isFinite(parsedDelay) ? Math.min(2000, Math.max(0, parsedDelay)) : defaultSearchDelayMs;
        searchDelayInput.value = String(searchDelayMs);
      }
      applyFilters();
    };

    const openSettingsModal = () => {
      if (!settingsDialogManager) return;
      document.body.classList.add('settings-open');
      settingsDialogManager.open({
        initialFocus: settingsCloseButton,
        recenter: true
      });
    };

    const closeSettingsModal = () => {
      document.body.classList.remove('settings-open');
      settingsDialogManager?.close();
    };

    const startPaneResize = (splitter, event) => {
      if (event.button !== 0) return;
      const type = splitter.dataset.policySplitter;
      const treePanel = root.querySelector('.policy-tree-panel');
      if (!['tree', 'detail'].includes(type) || !tablePanel || !treePanel || !detailPanel) return;
      event.preventDefault();

      const startX = event.clientX;
      const widths = {
        tree: treePanel.getBoundingClientRect().width,
        table: tablePanel.getBoundingClientRect().width,
        detail: detailPanel.getBoundingClientRect().width
      };
      const isTree = type === 'tree';
      const adjacentPane = isTree && !paneState.table ? 'detail' : 'table';
      const minWidth = isTree ? 180 : 300;
      const adjacentMinWidth = adjacentPane === 'table' ? 460 : 300;
      const startWidth = widths[type];
      const maxWidth = Math.max(minWidth, startWidth + widths[adjacentPane] - adjacentMinWidth);
      const property = `--policy-${type}-width`;
      const direction = isTree ? 1 : -1;
      let rafId = 0;
      let pendingX = startX;

      if (paneState.tree && paneState.table && paneState.detail) {
        const fixedPane = isTree ? 'detail' : 'tree';
        root.style.setProperty(`--policy-${fixedPane}-width`, `${widths[fixedPane]}px`);
      }

      splitter.setPointerCapture(event.pointerId);
      splitter.classList.add('is-resizing');

      const paint = () => {
        rafId = 0;
        const nextWidth = Math.min(Math.max(minWidth, startWidth + ((pendingX - startX) * direction)), maxWidth);
        root.style.setProperty(property, `${nextWidth}px`);
      };

      const onMove = moveEvent => {
        pendingX = moveEvent.clientX;
        if (!rafId) rafId = requestAnimationFrame(paint);
      };

      const onUp = () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
          paint();
        }
        splitter.classList.remove('is-resizing');
        if (splitter.hasPointerCapture(event.pointerId)) splitter.releasePointerCapture(event.pointerId);
        splitter.removeEventListener('pointermove', onMove);
        splitter.removeEventListener('pointerup', onUp);
        splitter.removeEventListener('pointercancel', onUp);
      };

      splitter.addEventListener('pointermove', onMove);
      splitter.addEventListener('pointerup', onUp);
      splitter.addEventListener('pointercancel', onUp);
    };

    searchInput.addEventListener('input', scheduleSearch);
    treeEl.addEventListener('keydown', event => {
      const current = event.target instanceof Element ? event.target.closest('.policy-tree-item') : null;
      if (!(current instanceof HTMLElement) || !treeEl.contains(current)) return;
      const items = Array.from(treeEl.querySelectorAll('.policy-tree-item'));
      const index = items.indexOf(current);
      if (index < 0) return;

      let target = null;
      if (event.key === 'ArrowDown') target = items[index + 1] || items[0];
      else if (event.key === 'ArrowUp') target = items[index - 1] || items[items.length - 1];
      else if (event.key === 'Home') target = items[0];
      else if (event.key === 'End') target = items[items.length - 1];
      else if (event.key === 'ArrowRight') {
        if (current.getAttribute('aria-expanded') === 'false') {
          event.preventDefault();
          toggleTreeNode(current.dataset.nodeKey, true);
          return;
        }
        if (current.getAttribute('aria-expanded') === 'true') {
          const next = items[index + 1];
          if (next && Number(next.dataset.depth) > Number(current.dataset.depth)) target = next;
        }
      } else if (event.key === 'ArrowLeft') {
        if (current.getAttribute('aria-expanded') === 'true') {
          event.preventDefault();
          toggleTreeNode(current.dataset.nodeKey, true);
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
      items.forEach(item => { item.tabIndex = item === target ? 0 : -1; });
      target.focus({ preventScroll: true });
    });
    tableBody.addEventListener('click', event => {
      const row = event.target instanceof Element ? event.target.closest('tr[data-id]') : null;
      const policy = row && tableBody.contains(row) ? policyById.get(row.dataset.id) : null;
      if (policy) {
        tableFocusId = policy.id;
        selectPolicy(policy, { selectCategory: splitSearchTerms(searchInput.value).length > 0 });
      }
    });
    tableBody.addEventListener('keydown', event => {
      const row = event.target instanceof Element ? event.target.closest('tr[data-id]') : null;
      if (!(row instanceof HTMLElement) || !tableBody.contains(row)) return;
      const rows = Array.from(tableBody.querySelectorAll('tr[data-id]'));
      const index = rows.indexOf(row);
      let target = null;
      if (event.key === 'ArrowDown') target = rows[index + 1] || rows[0];
      else if (event.key === 'ArrowUp') target = rows[index - 1] || rows[rows.length - 1];
      else if (event.key === 'Home') target = rows[0];
      else if (event.key === 'End') target = rows[rows.length - 1];

      if (target instanceof HTMLElement) {
        event.preventDefault();
        rows.forEach(candidate => { candidate.tabIndex = candidate === target ? 0 : -1; });
        tableFocusId = target.dataset.id || null;
        target.focus({ preventScroll: true });
        return;
      }

      if (event.key !== 'Enter' && event.key !== ' ') return;
      const policy = policyById.get(row.dataset.id);
      if (!policy) return;
      event.preventDefault();
      tableFocusId = policy.id;
      selectPolicy(policy, { selectCategory: splitSearchTerms(searchInput.value).length > 0 });
    });
    viewTrigger?.addEventListener('click', event => {
      event.preventDefault();
      closeColumnMenu();
      toggleViewMenu();
    });
    columnTrigger?.addEventListener('click', event => {
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
    Object.values(searchOptionInputs).forEach(input => {
      input?.addEventListener('change', applySearchSettingsFromUi);
    });
    searchDelayInput?.addEventListener('change', applySearchSettingsFromUi);
    searchDelayInput?.addEventListener('input', () => {
      const parsedDelay = Number.parseInt(searchDelayInput.value, 10);
      if (Number.isFinite(parsedDelay)) {
        searchDelayMs = Math.min(2000, Math.max(0, parsedDelay));
      }
    });
    settingsModal?.addEventListener('click', event => {
      if (event.target === settingsModal) closeSettingsModal();
    });
    splitters.forEach(splitter => {
      splitter.addEventListener('pointerdown', event => startPaneResize(splitter, event));
    });
    limitInput?.addEventListener('input', () => {
      const parsed = Number.parseInt(limitInput.value, 10);
      rowLimit = Number.isFinite(parsed) ? Math.min(5000, Math.max(1, parsed)) : defaultRowLimit;
      renderTable();
    });
    unlimitedInput?.addEventListener('change', () => {
      unlimitedRows = unlimitedInput.checked;
      if (limitInput) limitInput.disabled = unlimitedRows;
      renderTable();
    });
    paneToggles.forEach(button => {
      button.addEventListener('change', () => {
        const pane = button.dataset.policyPane;
        if (!pane) return;
        if (pane === 'detail' && !selectedId && button.checked) {
          button.checked = false;
          return;
        }
        paneState[pane] = button.checked;
        updatePaneLayout();
        renderDetail(policyById.get(selectedId));
      });
    });

    document.addEventListener('click', event => {
      if (
        columnMenu
        && !columnMenu.hidden
        && !columnMenu.contains(event.target)
        && !columnDropdown?.contains(event.target)
      ) closeColumnMenu();
      if (viewDropdown && viewMenu && !viewMenu.hidden && !viewDropdown.contains(event.target)) closeViewMenu();
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      closeColumnMenu();
      closeViewMenu();
      closeSettingsModal();
    });
    window.addEventListener('resize', () => {
      applyTableColumnWidths();
    });
    if (typeof ResizeObserver !== 'undefined' && tableWrap) {
      new ResizeObserver(() => requestAnimationFrame(applyTableColumnWidths)).observe(tableWrap);
    }

    syncSettingsUi();
    updatePaneLayout();
    setBusy(true);
    performance.mark('nv-policies:start');
    afterNextPaint()
      .then(loadPolicyPayload)
      .then(async ({ data, categories }) => {
        performance.mark('nv-policies:data-ready');
        performance.measure('nv-policies:data-load', 'nv-policies:start', 'nv-policies:data-ready');
        categoryMap = new Map(Object.entries(categories || {}));
        policies = await normalizePolicies(data);
        performance.mark('nv-policies:normalized');
        performance.measure('nv-policies:normalize', 'nv-policies:data-ready', 'nv-policies:normalized');
        policyById = new Map(policies.map(policy => [policy.id, policy]));
        policyByShareId = new Map();
        policies.forEach(policy => {
          const shareKey = normalizePolicyShareId(policy.shareId);
          if (shareKey && !policyByShareId.has(shareKey)) {
            policyByShareId.set(shareKey, policy);
          }
        });
        const linkedPolicy = getPolicyFromUrl();
        if (linkedPolicy) {
          selectedId = linkedPolicy.id;
          paneState.detail = true;
          selectedCategoryKey = linkedPolicy.categoryPathKey || '';
          expandTreeForPolicy(linkedPolicy);
        } else if (new URLSearchParams(location.search).has(POLICY_QUERY_PARAM)) {
          updatePolicyUrl(null);
        }
        categoryTree = buildCategoryTree();
        updatePaneLayout();
        renderTree();
        renderTableHeader();
        applyFilters();
        performance.mark('nv-policies:interactive');
        performance.measure('nv-policies:first-render', 'nv-policies:normalized', 'nv-policies:interactive');
        performance.measure('nv-policies:total', 'nv-policies:start', 'nv-policies:interactive');
        void warmPolicySearchFields();
      })
      .catch(error => {
        if (tableNote) tableNote.textContent = error.message || 'Failed to load policy definitions';
        renderTree();
        renderTable();
        renderDetail(null);
      })
      .finally(() => {
        setBusy(false);
      });
  }
  document.addEventListener('DOMContentLoaded', initPolicyExplorer, { once: true });
})();
