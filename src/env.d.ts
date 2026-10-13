/// <reference types="@astrojs/starlight" />

declare module 'virtual:noverse-main-site-plugins';
declare module 'virtual:noverse-docs-plugins';

declare module 'virtual:starlight/pagefind-config' {
  export const pagefindUserConfig: Record<string, unknown>;
}
