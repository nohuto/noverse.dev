/* Copyright (c) 2026 nohuto */
'use strict';

self.addEventListener('message', async event => {
  if (event.data?.type !== 'load') return;
  const startedAt = performance.now();
  try {
    const [policyResponse, categoryResponse] = await Promise.all([
      fetch(event.data.policyUrl, { cache: 'force-cache' }),
      fetch(event.data.categoryUrl, { cache: 'force-cache' }),
    ]);
    if (!policyResponse.ok) throw new Error(`Policy data request failed (${policyResponse.status})`);

    const categoryAvailable = categoryResponse.ok;
    const [policyText, categoryText] = await Promise.all([
      policyResponse.text(),
      categoryAvailable ? categoryResponse.text() : Promise.resolve('{}'),
    ]);
    const downloadedAt = performance.now();
    const policyJson = JSON.parse(policyText);
    const categoryJson = JSON.parse(categoryText);
    const parsedAt = performance.now();

    self.postMessage({
      type: 'loaded',
      data: Array.isArray(policyJson) ? policyJson : [],
      categories: categoryJson?.categories && typeof categoryJson.categories === 'object'
        ? categoryJson.categories
        : {},
      categoryWarning: categoryAvailable ? '' : `Policy category data request failed (${categoryResponse.status})`,
      profile: {
        fetchMs: downloadedAt - startedAt,
        parseMs: parsedAt - downloadedAt,
        policyBytes: policyText.length,
        categoryBytes: categoryText.length,
      },
    });
  } catch (error) {
    self.postMessage({ type: 'error', message: error?.message || 'Failed to load policy definitions' });
  }
});
