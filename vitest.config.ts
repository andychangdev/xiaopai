import { defineConfig } from 'vitest/config'

// A zone ahead of UTC, with daylight saving, so a test that should notice
// local-versus-UTC mistakes can actually fail
process.env.TZ = 'Australia/Sydney'

// Only the pure rules module is tested (ARCHITECTURE §5)
export default defineConfig({
  test: {
    include: ['lib/roster/**/*.test.ts'],
  },
})
