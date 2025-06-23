// drizzle.config.ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './src/modules/**/schema/*.schema.ts', // your feature modules
    './src/**/schema/*.schema.ts', // your settings module
  ],
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!, // <-- note the '!' here
  },
  out: './src/drizzle/generated',
});
