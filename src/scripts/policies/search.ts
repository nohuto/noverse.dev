/* Copyright (c) 2026 nohuto */
import { wildcardPattern } from '../shell/wildcard';
import { preparePolicySearchFields } from './model';
import type { Policy, SearchOptions } from './types';

export const createPolicyMatcher = (searchOptions: SearchOptions) => {
  const wildcardToRegExp = (term: string) => {
    const pattern = wildcardPattern(term);
    return new RegExp(
      searchOptions.whole ? `^${pattern}$` : pattern,
      searchOptions.caseSensitive ? '' : 'i',
    );
  };

  const getSearchFields = (policy: Policy, { lowercase = false } = {}) => {
    if (searchOptions.registry || searchOptions.details)
      preparePolicySearchFields(policy);
    const source = lowercase ? policy.searchFieldsLower : policy.searchFields;
    const fields: string[] = [];
    if (searchOptions.names) fields.push(...source.names);
    if (searchOptions.registry) fields.push(...(source.registry || []));
    if (searchOptions.details) fields.push(...(source.details || []));
    return fields;
  };

  const compileSearchTerm = (
    term: string,
  ):
    | { regex: RegExp; value?: undefined }
    | { regex?: undefined; value: string } => {
    if (searchOptions.wildcards) return { regex: wildcardToRegExp(term) };
    return { value: searchOptions.caseSensitive ? term : term.toLowerCase() };
  };

  const termMatchesPolicy = (
    policy: Policy,
    matcher: ReturnType<typeof compileSearchTerm>,
  ) => {
    const fields = getSearchFields(policy, {
      lowercase: !searchOptions.caseSensitive && !matcher.regex,
    });
    if (!fields.length) return false;
    if (matcher.regex) return fields.some((field) => matcher.regex.test(field));
    return searchOptions.whole
      ? fields.some((field) => field === matcher.value)
      : fields.some((field) => field.includes(matcher.value));
  };

  return { compileSearchTerm, termMatchesPolicy };
};
