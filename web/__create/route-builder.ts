import { Hono } from 'hono';
import type { Handler } from 'hono/types';
import updatedFetch from '../src/__create/fetch';

const API_BASENAME = '/api';
const api = new Hono();

if (globalThis.fetch) {
  globalThis.fetch = updatedFetch;
}

type RouteModule = Record<
  string,
  ((request: Request, ctx: { params: Record<string, string> }) => Promise<Response> | Response) | undefined
>;

/** Vite-bundled API route modules (required for Vercel / production). */
const routeModules = import.meta.glob('../src/app/api/**/route.js', {
  eager: true,
}) as Record<string, RouteModule>;

function getHonoPath(globKey: string): { name: string; pattern: string }[] {
  const relativePath = globKey
    .replace(/^\.\.\/src\/app\/api/, '')
    .replace(/\/route\.js$/, '');
  const parts = relativePath.split('/').filter(Boolean);
  if (parts.length === 0) {
    return [{ name: 'root', pattern: '' }];
  }
  return parts.map((segment) => {
    const match = segment.match(/^\[(\.{3})?([^\]]+)\]$/);
    if (match) {
      const [, dots, param] = match;
      return dots === '...'
        ? { name: param, pattern: `:${param}{.+}` }
        : { name: param, pattern: `:${param}` };
    }
    return { name: segment, pattern: segment };
  });
}

function registerRoutes() {
  const entries = Object.entries(routeModules)
    .slice()
    .sort(([a], [b]) => {
      const score = (file: string) => {
        const parts = getHonoPath(file);
        const dynamicCount = parts.filter((p) => p.pattern.startsWith(':')).length;
        return parts.length * 1000 - dynamicCount * 100 + file.length;
      };
      return score(b) - score(a);
    });

  api.routes = [];

  for (const [routeFile, route] of entries) {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
    for (const method of methods) {
      const fn = route[method];
      if (!fn) continue;
      try {
        const parts = getHonoPath(routeFile);
        const honoPath = `/${parts.map(({ pattern }) => pattern).join('/')}`;
        const handler: Handler = async (c) => {
          const params = c.req.param();
          return await fn(c.req.raw, { params });
        };
        switch (method.toLowerCase()) {
          case 'get':
            api.get(honoPath, handler);
            break;
          case 'post':
            api.post(honoPath, handler);
            break;
          case 'put':
            api.put(honoPath, handler);
            break;
          case 'delete':
            api.delete(honoPath, handler);
            break;
          case 'patch':
            api.patch(honoPath, handler);
            break;
          default:
            break;
        }
      } catch (error) {
        console.error(`Error registering route ${routeFile} for method ${method}:`, error);
      }
    }
  }
}

registerRoutes();

if (import.meta.env.DEV && import.meta.hot) {
  import.meta.hot.accept(() => {
    registerRoutes();
  });
}

export { api, API_BASENAME };
