import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

export const onRequest = defineRouteMiddleware(({ locals }) => {
  for (const mode of locals.starlightViewModes.modes) {
    if (!mode.href.endsWith('/')) mode.href = `${mode.href}/`;
  }
});
