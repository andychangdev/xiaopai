import { defineConfig } from 'drizzle-kit'
import { DB_FILE } from './lib/db/open'

export default defineConfig({
  dialect: 'sqlite',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: { url: DB_FILE },
})
