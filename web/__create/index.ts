import { createHonoServer } from 'react-router-hono-server/node';
import { createApp } from './app';

const app = createApp();

export default await createHonoServer({
  app,
  defaultLogger: false,
});
