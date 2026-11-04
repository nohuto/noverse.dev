import type {
  CategorySegment,
  MetaItem,
  Policy,
  PolicyElement,
  RawPolicy,
  StorageEntry,
  StorageRow,
} from './types';

export const getPolicyScope = (policy: RawPolicy) => {
  const hives = new Set(
    (policy.KeyPath || [])
      .map((path) =>
        String(path || '')
          .split('\\')[0]
          .toUpperCase(),
      )
      .filter(Boolean),
  );
  const hasMachine = hives.has('HKLM');
  const hasUser = hives.has('HKCU');
  if (hasMachine && hasUser) return 'Both';
  if (hasUser) return 'User';
  return 'Machine';
};

const formatPolicyRange = (element: PolicyElement) => {
  const maxValue = element?.MaxValue;
  const minValue = element?.MinValue ?? '0';
  if (maxValue !== null && maxValue !== undefined && maxValue !== '')
    return `${minValue} - ${maxValue}`;
  return `${minValue}+`;
};

const getPolicyElementValueNames = (policy: RawPolicy) => {
  const elements = Array.isArray(policy?.Elements) ? policy.Elements : [];
  return [
    ...new Set(
      elements
        .map((element) => String(element?.ValueName || '').trim())
        .filter(Boolean),
    ),
  ];
};

export const getCategory = (policy: RawPolicy) =>
  policy.CategoryName || 'Uncategorized';

export const normalizeCategorySegment = (segment: string) =>
  String(segment || '')
    .trim()
    .toLowerCase();

export const makeCategoryKey = (path: CategorySegment[]) =>
  path
    .map((segment) =>
      normalizeCategorySegment(segment.name || segment.displayName),
    )
    .join('\u001f');

export const getPrimaryPath = (policy: RawPolicy) =>
  (policy.KeyPath || [])[0] || '';

export const getPolicyValue = (policy: RawPolicy) => {
  if (policy.ValueName) return policy.ValueName;
  const valueNames = getPolicyElementValueNames(policy);
  return valueNames.length ? valueNames.join(', ') : '<ElementDefined>';
};

export const getPolicyShareId = (policy: RawPolicy) => {
  const policyName = String(policy?.PolicyName || '').trim();
  if (!policyName) return '';
  const fileName = String(policy?.File || '')
    .trim()
    .replace(/\.admx$/i, '');
  if (fileName) return `${fileName}*${policyName}`;
  const namespace = String(policy?.NameSpace || '').trim();
  return namespace ? `${namespace}*${policyName}` : policyName;
};

export const normalizePolicyShareId = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase();

const isNumericData = (value: string | undefined) =>
  /^-?\d+$/.test(String(value ?? '').trim());

const getElementRegistryType = (element: PolicyElement) => {
  const type = element?.Type || '';
  if (type === 'Text') return element?.Expandable ? 'REG_EXPAND_SZ' : 'REG_SZ';
  if (type === 'MultiText') return 'REG_MULTI_SZ';
  if (type === 'List') return 'REG_SZ';
  if (type === 'LongDecimal') return 'REG_QWORD';
  if (type === 'Decimal') return element?.StoreAsText ? 'REG_SZ' : 'REG_DWORD';
  if (type === 'Boolean' || type === 'TrueValue' || type === 'FalseValue')
    return 'REG_DWORD';
  if (type === 'Enum') {
    const items = Array.isArray(element.Items) ? element.Items : [];
    return items.some(
      (item) =>
        item.Data !== null &&
        item.Data !== undefined &&
        !isNumericData(item.Data),
    )
      ? 'REG_SZ'
      : 'REG_DWORD';
  }
  if (
    type === 'EnabledValue' ||
    type === 'DisabledValue' ||
    type === 'EnabledList' ||
    type === 'DisabledList'
  ) {
    if (element?.Action === 'Delete') return 'Delete';
    return isNumericData(element.Data) ? 'REG_DWORD' : 'REG_SZ';
  }
  return 'Unknown';
};

const getElementDisplayType = (element: PolicyElement) => {
  const type = element?.Type || 'Element';
  if (
    type === 'EnabledValue' ||
    type === 'DisabledValue' ||
    type === 'EnabledList' ||
    type === 'DisabledList'
  ) {
    return getElementRegistryType(element);
  }
  return type;
};

const appendUnique = (target: string[], value: string) => {
  if (value === null || value === undefined) return;
  const normalized = String(value);
  if (!normalized && value !== '') return;
  if (!target.includes(normalized)) target.push(normalized);
};

const formatPolicyMetaValue = (value: string | boolean) => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === '') return '""';
  return String(value);
};

const addPolicyMeta = (
  group: { meta: MetaItem[] },
  label: string,
  value: string | boolean | null | undefined,
) => {
  if (value === null || value === undefined) return;
  const text = formatPolicyMetaValue(value);
  const existing = group.meta.find((item) => item.label === label);
  if (existing) {
    appendUnique(existing.values, text);
  } else {
    group.meta.push({ label, values: [text] });
  }
};

const addElementMeta = (
  entry: { meta: MetaItem[] },
  element: PolicyElement | null,
) => {
  const fields: [string, string | boolean | undefined][] = [
    ['Required', element?.Required],
    ['Max length', element?.MaxLength],
    ['Max strings', element?.MaxStrings],
    ['Expandable', element?.Expandable],
    ['Stored as text', element?.StoreAsText],
    ['Client extension', element?.ClientExtension],
  ];
  fields.forEach(([label, value]) => addPolicyMeta(entry, label, value));
};

const getPathTail = (path: string | undefined) => {
  const parts = String(path || '')
    .split('\\')
    .filter(Boolean);
  return parts[parts.length - 1] || '';
};

const getActionValue = (
  item: { Action?: string; Data?: string } | null | undefined,
) => (item?.Action === 'Delete' ? 'Delete' : (item?.Data ?? ''));

const getEntryValueLabel = (
  valueName: string,
  element: PolicyElement | null,
  paths: string[],
) => {
  const cleanValue = String(valueName || '').trim();
  if (cleanValue) return cleanValue;
  if (element?.Type === 'List') return '<ListEntries>';
  if (element?.Type === 'EnabledList' || element?.Type === 'DisabledList')
    return '<ListValue>';
  return getPathTail(paths[0]) || '<ElementDefined>';
};

const getElementPaths = (policy: RawPolicy, element: PolicyElement | null) => {
  const elementPaths = Array.isArray(element?.KeyPath)
    ? element.KeyPath.filter(Boolean)
    : [];
  if (elementPaths.length) return elementPaths;
  return Array.isArray(policy?.KeyPath) ? policy.KeyPath.filter(Boolean) : [];
};

const makePathGroupKey = (paths: string[]) =>
  (paths.length ? paths : ['__no_key__'])
    .map((path) => String(path || '').toLowerCase())
    .join('\u001f');

export const getPolicyStorageGroups = (policy: RawPolicy) => {
  const groups: { keyPaths: string[]; entries: StorageEntry[] }[] = [];
  const groupByPath = new Map<string, (typeof groups)[number]>();
  const ensureGroup = (paths: string[]) => {
    const normalizedPaths = paths.length
      ? paths
      : ['<RegistryPathNotSpecified>'];
    const key = makePathGroupKey(normalizedPaths);
    if (!groupByPath.has(key)) {
      const group: (typeof groups)[number] = {
        keyPaths: normalizedPaths,
        entries: [],
      };
      groupByPath.set(key, group);
      groups.push(group);
    }
    return groupByPath.get(key)!;
  };
  const addEntry = (
    paths: string[],
    valueName: string,
    element: PolicyElement | null,
    rows: StorageRow[],
    copyValue: string | null = valueName,
  ) => {
    const group = ensureGroup(paths);
    const label = getEntryValueLabel(valueName, element, paths);
    const entryKey = `${label}\u001f${copyValue ?? ''}`;
    let entry = group.entries.find((item) => item.key === entryKey);
    if (!entry) {
      entry = {
        key: entryKey,
        valueName: label,
        copyValue,
        meta: [],
        rows: [],
      };
      group.entries.push(entry);
    }
    addElementMeta(entry, element);
    entry.rows.push(...rows);
    return entry;
  };
  const policyValueName = String(policy?.ValueName || '').trim();
  const elements = Array.isArray(policy?.Elements) ? policy.Elements : [];

  elements.forEach((element) => {
    const type = element?.Type || '';
    const paths = getElementPaths(policy, element);
    if (
      (type === 'EnabledValue' || type === 'DisabledValue') &&
      policyValueName
    ) {
      addEntry(
        paths,
        policyValueName,
        element,
        [
          {
            type,
            registryType: getElementRegistryType(element),
            label: type === 'EnabledValue' ? 'Enabled' : 'Disabled',
            value: getActionValue(element),
          },
        ],
        policyValueName,
      );
      return;
    }

    const rawValueName = String(element?.ValueName || '').trim();
    if (
      type === 'Enum' &&
      Array.isArray(element.Items) &&
      element.Items.length
    ) {
      const rows = element.Items.map((item) => ({
        type: 'Enum',
        registryType: getElementRegistryType(element),
        label: item.DisplayName || '<Option>',
        value: getActionValue(item),
      }));
      addEntry(
        paths,
        rawValueName || policyValueName,
        element,
        rows,
        rawValueName || policyValueName || null,
      );
      element.Items.forEach((item) => {
        const valueList = Array.isArray(item.ValueList) ? item.ValueList : [];
        valueList.forEach((listItem) => {
          const listPaths = getElementPaths(policy, listItem);
          const listValueName = String(listItem?.ValueName || '').trim();
          addEntry(
            listPaths,
            listValueName,
            listItem,
            [
              {
                type: 'Enum option',
                registryType:
                  listItem.Action === 'Delete'
                    ? 'Delete'
                    : isNumericData(listItem.Data)
                      ? 'REG_DWORD'
                      : 'REG_SZ',
                label: `When ${item.DisplayName || '<Option>'}`,
                value: getActionValue(listItem),
              },
            ],
            listValueName || null,
          );
        });
      });
      return;
    }
    if (type === 'Boolean') {
      addEntry(
        paths,
        rawValueName || policyValueName,
        element,
        [
          {
            type: 'Boolean',
            registryType: getElementRegistryType(element),
            label: 'True',
            value:
              element.TrueAction === 'Delete'
                ? 'Delete'
                : (element.TrueValue ?? '1'),
          },
          {
            type: 'Boolean',
            registryType: getElementRegistryType(element),
            label: 'False',
            value:
              element.FalseAction === 'Delete'
                ? 'Delete'
                : (element.FalseValue ?? '0'),
          },
        ],
        rawValueName || policyValueName || null,
      );
      return;
    }
    if (type === 'Decimal' || type === 'LongDecimal') {
      addEntry(
        paths,
        rawValueName || policyValueName,
        element,
        [
          {
            type,
            registryType: getElementRegistryType(element),
            label: 'Range',
            value: formatPolicyRange(element),
          },
        ],
        rawValueName || policyValueName || null,
      );
      return;
    }
    if (type === 'EnabledList' || type === 'DisabledList') {
      addEntry(
        paths,
        rawValueName,
        element,
        [
          {
            type,
            registryType: getElementRegistryType(element),
            label: type === 'EnabledList' ? 'Enabled' : 'Disabled',
            value: getActionValue(element),
          },
        ],
        rawValueName || null,
      );
      return;
    }
    const fallbackValueName =
      type === 'List' && !rawValueName ? '' : rawValueName || policyValueName;
    addEntry(
      paths,
      fallbackValueName,
      element,
      [
        {
          type: getElementDisplayType(element),
          registryType: getElementRegistryType(element),
          label: type === 'List' ? '<InputEntries>' : '<InputValue>',
          value: '',
        },
      ],
      fallbackValueName || null,
    );
  });

  if (!groups.length && policyValueName) {
    addEntry(getElementPaths(policy, null), policyValueName, null, []);
  }
  const policyPathKey = makePathGroupKey(
    Array.isArray(policy?.KeyPath) ? policy.KeyPath.filter(Boolean) : [],
  );
  return groups.sort((left, right) => {
    const leftMain = makePathGroupKey(left.keyPaths) === policyPathKey;
    const rightMain = makePathGroupKey(right.keyPaths) === policyPathKey;
    if (leftMain === rightMain) return 0;
    return leftMain ? -1 : 1;
  });
};

const getPolicyValueGroups = (policy: RawPolicy) =>
  getPolicyStorageGroups(policy).flatMap((group) =>
    group.entries.map((entry) => ({
      valueName: entry.valueName,
      keyPaths: group.keyPaths,
      meta: entry.meta,
      rows: entry.rows.map((row) => ({
        type: row.type,
        registryType: row.registryType,
        text: [row.label, row.value].filter((value) => value !== '').join(': '),
      })),
    })),
  );

export const getEntryRegistryTypes = (entry: StorageEntry) => [
  ...new Set(
    entry.rows
      .map((row) =>
        row.registryType && row.registryType !== 'Unknown'
          ? row.registryType
          : row.type,
      )
      .filter(Boolean),
  ),
];

export const splitSearchTerms = (value: string) => {
  const terms: string[] = [];
  String(value || '').replace(/"([^"]+)"|(\S+)/g, (_, quoted, bare) => {
    const term = quoted || bare;
    if (term) terms.push(term);
    return '';
  });
  return terms;
};

export const categoryMatches = (policy: Policy, categoryKey: string) => {
  if (!categoryKey) return true;
  return (
    policy.categoryPathKey === categoryKey ||
    policy.categoryPathKey.startsWith(`${categoryKey}\u001f`)
  );
};

export const preparePolicySearchFields = (policy: Policy) => {
  if (policy.searchFields.registry) return;
  const elements = Array.isArray(policy.Elements) ? policy.Elements : [];
  const valueGroups = getPolicyValueGroups(policy);
  const keyText = [
    ...(policy.KeyPath || []),
    ...valueGroups.flatMap((group) => group.keyPaths),
  ].join(' ');
  policy.searchFields.registry = [
    keyText,
    policy.ValueName,
    getPolicyValue(policy),
  ]
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map(String);
  policy.searchFields.details = [
    policy.Supported,
    policy.ExplainText,
    valueGroups
      .flatMap((group) => [
        group.valueName,
        ...group.keyPaths,
        ...group.meta.flatMap((item) => [item.label, ...item.values]),
        ...group.rows.flatMap((row) => [row.type, row.registryType, row.text]),
      ])
      .join(' '),
    elements
      .map(
        (element) => `${element.Type || ''} ${getElementRegistryType(element)}`,
      )
      .join(' '),
  ]
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map(String);
  policy.searchFieldsLower.registry = policy.searchFields.registry.map(
    (value) => value.toLowerCase(),
  );
  policy.searchFieldsLower.details = policy.searchFields.details.map((value) =>
    value.toLowerCase(),
  );
};
