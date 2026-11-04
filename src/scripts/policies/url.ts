/* Copyright (c) 2026 nohuto */
export const setQueryParam = (url: URL, name: string, value: string) => {
  if (value) url.searchParams.set(name, value);
  else url.searchParams.delete(name);
};

export const replaceUrl = (url: URL) => {
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  history.replaceState({ ...(history.state || {}), url: nextUrl }, '', nextUrl);
};
