#!/usr/bin/env node
/**
 * One-shot Appwrite schema setup for traveler_profiles.
 *
 * Usage (PowerShell):
 *   $env:APPWRITE_API_KEY="your_server_api_key"
 *   # optional if not already in .env:
 *   $env:APPWRITE_ENDPOINT="https://REGION.cloud.appwrite.io/v1"
 *   $env:APPWRITE_PROJECT_ID="your_project_id"
 *   pnpm appwrite:setup-profile
 *
 * Never put APPWRITE_API_KEY in VITE_* or commit it.
 */
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client, Databases, Permission, Role } from 'node-appwrite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  const text = readFileSync(filePath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadEnvFile(path.join(root, '.env'))
loadEnvFile(path.join(root, '.env.local'))

const endpoint = (
  process.env.APPWRITE_ENDPOINT ||
  process.env.VITE_APPWRITE_ENDPOINT ||
  ''
).trim()
const projectId = (
  process.env.APPWRITE_PROJECT_ID ||
  process.env.VITE_APPWRITE_PROJECT_ID ||
  ''
).trim()
const apiKey = (process.env.APPWRITE_API_KEY || '').trim()
const databaseId = (
  process.env.APPWRITE_DATABASE_ID ||
  process.env.VITE_APPWRITE_DATABASE_ID ||
  'delve'
).trim()
const collectionId = (
  process.env.APPWRITE_TRAVELER_PROFILES_COLLECTION_ID ||
  process.env.VITE_APPWRITE_TRAVELER_PROFILES_COLLECTION_ID ||
  'traveler_profiles'
).trim()

function fail(message) {
  console.error(`[appwrite:setup-profile] ${message}`)
  process.exit(1)
}

if (!endpoint) fail('Set APPWRITE_ENDPOINT or VITE_APPWRITE_ENDPOINT')
if (!projectId) fail('Set APPWRITE_PROJECT_ID or VITE_APPWRITE_PROJECT_ID')
if (!apiKey) {
  fail(
    'Set APPWRITE_API_KEY (Console → Overview → API keys). Never use a VITE_ prefix for this key.',
  )
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
const databases = new Databases(client)

function isAlreadyExists(err) {
  const code = err?.code
  const type = String(err?.type || '')
  const message = String(err?.message || '').toLowerCase()
  return (
    code === 409 ||
    type.includes('already_exists') ||
    message.includes('already exists') ||
    message.includes('already used')
  )
}

async function ignoreExists(label, fn) {
  try {
    await fn()
    console.log(`  ✓ ${label}`)
  } catch (err) {
    if (isAlreadyExists(err)) {
      console.log(`  · ${label} (already exists)`)
      return
    }
    throw err
  }
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('[appwrite:setup-profile] starting')
  console.log(`  endpoint: ${endpoint}`)
  console.log(`  project:  ${projectId}`)
  console.log(`  database: ${databaseId}`)
  console.log(`  collection: ${collectionId}`)

  await ignoreExists(`database "${databaseId}"`, () =>
    databases.create(databaseId, 'Delve'),
  )

  await ignoreExists(`collection "${collectionId}"`, () =>
    databases.createCollection(
      databaseId,
      collectionId,
      'Traveler profiles',
      [Permission.create(Role.users())],
      true, // documentSecurity — owner perms set by client SDK
      true,
    ),
  )

  // Small delay so collection is ready for attributes
  await sleep(800)

  const stringAttrs = [
    { key: 'displayName', size: 60, required: true },
    { key: 'bio', size: 280, required: false },
    { key: 'avatarUrl', size: 512, required: false },
    { key: 'coverUrl', size: 512, required: false },
    { key: 'homeCity', size: 80, required: false },
    { key: 'homeCountryCode', size: 2, required: false },
    { key: 'preferredCurrency', size: 8, required: false, xdefault: 'USD' },
    { key: 'preferredLanguage', size: 8, required: false, xdefault: 'en' },
    { key: 'onboardingStatus', size: 32, required: false, xdefault: 'NOT_STARTED' },
    { key: 'onboardingCompletedAt', size: 40, required: false },
    { key: 'profileVisibility', size: 16, required: false, xdefault: 'PUBLIC' },
    { key: 'username', size: 64, required: true },
    { key: 'email', size: 320, required: true },
  ]

  for (const attr of stringAttrs) {
    await ignoreExists(`string ${attr.key}`, () =>
      databases.createStringAttribute(
        databaseId,
        collectionId,
        attr.key,
        attr.size,
        attr.required,
        attr.xdefault,
        false,
      ),
    )
    await sleep(200)
  }

  await ignoreExists('string[] interests', () =>
    databases.createStringAttribute(databaseId, collectionId, 'interests', 64, false, undefined, true),
  )
  await sleep(200)

  await ignoreExists('boolean emailVerified', () =>
    databases.createBooleanAttribute(databaseId, collectionId, 'emailVerified', false, false),
  )
  await sleep(200)

  for (const key of ['followersCount', 'followingCount', 'delversCount']) {
    await ignoreExists(`integer ${key}`, () =>
      databases.createIntegerAttribute(databaseId, collectionId, key, false, 0, undefined, 0),
    )
    await sleep(200)
  }

  console.log('[appwrite:setup-profile] done')
  console.log('Next: wait until attributes show Available in Console, then test traveler onboarding.')
}

main().catch(err => {
  console.error('[appwrite:setup-profile] failed:', err?.message || err)
  process.exit(1)
})
