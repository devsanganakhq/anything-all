/**
 * Vercel serverless entry — Web Fetch API handler.
 * @see https://vercel.com/docs/frameworks/frontend/react-router#using-a-custom-server-entrypoint
 */
import { createRequestHandler } from 'react-router';
import { createApp } from './app';

// @ts-expect-error virtual module provided by React Router at build time
import * as build from 'virtual:react-router/server-build';

const app = createApp();
const handler = createRequestHandler(build);

app.all('*', (c) => handler(c.req.raw));

export default app.fetch;
