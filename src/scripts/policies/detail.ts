/* Copyright (c) 2026 nohuto */
import { createCopyBox, createNode, createPolicyValueTitle } from './dom';
import { getEntryRegistryTypes, getPolicyStorageGroups } from './model';
import type { Policy } from './types';

export const renderPolicyDetail = (detailBody: HTMLElement, policy: Policy) => {
  const heading = createNode('div', 'policy-detail-heading');
  heading.appendChild(
    createNode('h2', null, policy.DisplayName || policy.PolicyName),
  );
  detailBody.appendChild(heading);

  const fields = createNode('div', 'policy-detail-grid');
  const detailFields: [string, string | undefined][] = [
    ['Policy', policy.PolicyName],
    ['Scope', policy.scope],
    ['ADMX', policy.File],
    ['Namespace', policy.NameSpace],
    ['Supported', policy.Supported],
    ['Category', policy.categoryDisplayPath],
  ];
  if (policy.ClientExtension) {
    detailFields.splice(4, 0, ['Client Extension', policy.ClientExtension]);
  }
  detailFields.forEach(([label, value]) => {
    const row = createNode('div', 'policy-detail-field');
    row.appendChild(createNode('span', 'policy-field-label', label));
    row.appendChild(
      createNode('span', 'policy-field-value', value || 'Not specified'),
    );
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
    elementSection.appendChild(
      createNode(
        'div',
        'policy-muted',
        'No ADMX elements exported for this policy',
      ),
    );
  } else {
    const registryList = createNode('div', 'policy-registry-list');
    storageGroups.forEach((group) => {
      const groupNode = createNode('div', 'policy-registry-group');
      const pathList = createNode(
        'div',
        'policy-code-list policy-registry-paths',
      );
      group.keyPaths.forEach((path) => {
        pathList.appendChild(
          createCopyBox(
            'policy-copy-box',
            path,
            'Copy registry path',
            'Copied key',
          ),
        );
      });
      groupNode.appendChild(pathList);

      const entries = createNode('div', 'policy-registry-values');
      group.entries.forEach((entry) => {
        const entryNode = createNode('div', 'policy-value-entry');
        const header = createNode('div', 'policy-value-header');
        const registryTypes = getEntryRegistryTypes(entry);
        const typeText = registryTypes.length ? registryTypes.join(', ') : '';
        header.appendChild(createPolicyValueTitle(entry, typeText));
        if (entry.meta.length) {
          const metaRow = createNode('div', 'policy-value-meta-row');
          const meta = createNode('span', 'policy-value-attrs');
          meta.textContent = entry.meta
            .map((item) => `${item.label}: ${item.values.join(', ')}`)
            .join('  |  ');
          metaRow.appendChild(meta);
          header.appendChild(metaRow);
        }
        entryNode.appendChild(header);

        if (entry.rows.length) {
          const rows = createNode('div', 'policy-data-list');
          if (entry.rows.some((row) => row.value !== '')) {
            const head = createNode('div', 'policy-data-row policy-data-head');
            head.appendChild(
              createNode('span', 'policy-data-label', 'Meaning'),
            );
            head.appendChild(createNode('span', 'policy-data-value', 'Data'));
            rows.appendChild(head);
          }
          entry.rows.forEach((row) => {
            const hasValue = row.value !== '';
            const item = createNode(
              'div',
              hasValue
                ? 'policy-data-row'
                : 'policy-data-row policy-data-row-single',
            );
            item.appendChild(
              createNode('span', 'policy-data-label', row.label),
            );
            if (hasValue) {
              item.appendChild(
                createNode('span', 'policy-data-value', row.value),
              );
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
