/* Copyright (c) 2026 nohuto */
import type { PolicyPayload } from './types';

const POLICY_DATA_URL =
  'https://raw.githubusercontent.com/nohuto/admx-parser/main/assets/policies.json';
const POLICY_CATEGORY_DATA_URL =
  'https://raw.githubusercontent.com/nohuto/admx-parser/main/assets/policyCategories.json';

export const loadPolicyPayload = async (): Promise<PolicyPayload> => {
  const [policyResponse, categoryResponse] = await Promise.all([
    fetch(POLICY_DATA_URL, { cache: 'force-cache' }),
    fetch(POLICY_CATEGORY_DATA_URL, { cache: 'force-cache' }),
  ]);
  if (!policyResponse.ok)
    throw new Error(`Policy data request failed (${policyResponse.status})`);
  const [data, categoryJson] = await Promise.all([
    policyResponse.json(),
    categoryResponse.ok ? categoryResponse.json() : null,
  ]);
  return {
    data,
    categories: categoryJson?.categories ?? {},
    categoryWarning: categoryResponse.ok ? '' : 'Category details unavailable',
  };
};
