// S-025-002: single resolver for the data directory.
//
// Laptop default: <cwd>/data (unchanged behavior for local users).
// Cloud (v2.0):   /data via MORBIUS_DATA_DIR env var, set in fly.toml + Dockerfile.
//
// Resolved once at module load — env vars don't change at runtime.

import path from 'node:path';

export function resolveDataDir(): string {
  const env = process.env.MORBIUS_DATA_DIR;
  if (env && env.trim()) return path.resolve(env.trim());
  return path.join(process.cwd(), 'data');
}

export const DATA_DIR = resolveDataDir();
