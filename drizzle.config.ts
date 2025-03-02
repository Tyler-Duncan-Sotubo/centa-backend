import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/drizzle/schema/**.schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: 'postgresql://neondb_owner:lyH0RBIP3LMD@ep-red-mud-a5ltdhlx.us-east-2.aws.neon.tech/neondb?sslmode=require ',
  },
  out: './src/drizzle/generated',
});
