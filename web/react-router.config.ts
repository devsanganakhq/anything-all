import type { Config } from '@react-router/dev/config';
import { vercelPreset } from '@vercel/react-router/vite';

const isVercel = process.env.VERCEL === '1';

export default {
  appDirectory: './src/app',
  ssr: true,
  presets: isVercel ? [vercelPreset()] : [],
} satisfies Config;
