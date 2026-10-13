export function mainSitePlugins() {
  /** @type {Record<string, string[]>} */
  const modules = {
    'virtual:noverse-main-site-plugins': [],
    'virtual:noverse-docs-plugins': [],
  };

  return {
    /**
     * @param {import('@astrojs/starlight/types').StarlightPlugin} plugin
     * @param {string} [moduleId]
     * @returns {import('@astrojs/starlight/types').StarlightPlugin}
     */
    scope(plugin, moduleId = 'virtual:noverse-main-site-plugins') {
      const scripts = modules[moduleId];
      return {
        ...plugin,
        hooks: {
          ...plugin.hooks,
          'config:setup'(context) {
            return plugin.hooks['config:setup']?.({
              ...context,
              addIntegration(integration) {
                const setup = integration.hooks['astro:config:setup'];
                context.addIntegration({
                  ...integration,
                  hooks: {
                    ...integration.hooks,
                    'astro:config:setup'(options) {
                      return setup?.({
                        ...options,
                        injectScript(stage, code) {
                          if (stage === 'page' || stage === 'page-ssr')
                            scripts.push(code);
                          else options.injectScript(stage, code);
                        },
                      });
                    },
                  },
                });
              },
            });
          },
        },
      };
    },
    /** @type {import('astro').AstroIntegration} */
    integration: {
      name: 'noverse-main-site-plugins',
      hooks: {
        'astro:config:setup'({ updateConfig }) {
          updateConfig({
            vite: {
              plugins: [
                {
                  name: 'noverse-main-site-plugins',
                  resolveId(id) {
                    if (id in modules) return `\0${id}`;
                  },
                  load(id) {
                    return modules[id.slice(1)]?.join('\n');
                  },
                },
              ],
            },
          });
        },
      },
    },
  };
}
