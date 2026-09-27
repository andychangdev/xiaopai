import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Native module: load it from node_modules at runtime, never bundle it.
  // Next already lists it by default; it's named here so the dependency is visible.
  serverExternalPackages: ['better-sqlite3'],
}

export default nextConfig
