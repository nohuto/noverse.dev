/// <reference types="@astrojs/starlight" />

declare module 'virtual:docs-plugins';

declare module 'virtual:starlight/pagefind-config' {
  export const pagefindUserConfig: Record<string, unknown>;
}
