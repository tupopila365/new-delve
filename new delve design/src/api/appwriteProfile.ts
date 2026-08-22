import { Databases, Permission, Role } from 'appwrite'
import type {
  OnboardingComplete,
  OnboardingPatch,
  ProfileUpdate,
  PublicUser,
  TravelerProfileDto,
} from '@delve/contracts'
import {
  appwriteGetCurrentUser,
  getAppwriteClient,
  isAppwriteConfigured,
  mapAppwriteError,
} from './appwriteClient'

export function isAppwriteProfileConfigured(): boolean {
  return isAppwriteConfigured() && Boolean(getDatabaseId() && getCollectionId())
}

function getDatabaseId(): string {
  return String(import.meta.env.VITE_APPWRITE_DATABASE_ID || 'delve').trim()
}

function getCollectionId(): string {
  return String(import.meta.env.VITE_APPWRITE_TRAVELER_PROFILES_COLLECTION_ID || 'traveler_profiles').trim()
}

let databases: Databases | null = null

function getDatabases(): Databases {
  if (!databases) databases = new Databases(getAppwriteClient())
  return databases
}

export class AppwriteProfileError extends Error {
  code?: string
  status?: number
  constructor(message: string, init?: { code?: string; status?: number }) {
    super(message)
    this.name = 'AppwriteProfileError'
    this.code = init?.code
    this.status = init?.status
  }
}

type ProfileDoc = {
  $id: string
  $createdAt: string
  displayName?: string
  bio?: string | null
  avatarUrl?: string | null
  coverUrl?: string | null
  homeCity?: string | null
  homeCountryCode?: string | null
  preferredCurrency?: string
  preferredLanguage?: string
  interests?: string[]
  onboardingStatus?: string
  onboardingCompletedAt?: string | null
  profileVisibility?: string
  username?: string
  email?: string
  emailVerified?: boolean
  followersCount?: number
  followingCount?: number
  delversCount?: number
}

function ownerPermissions(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]
}

function mapDocToProfile(doc: ProfileDoc, authFallback: PublicUser): TravelerProfileDto {
  const currency = (doc.preferredCurrency || 'USD') as TravelerProfileDto['preferredCurrency']
  const language = (doc.preferredLanguage || 'en') as TravelerProfileDto['preferredLanguage']
  const status = (doc.onboardingStatus || 'NOT_STARTED') as TravelerProfileDto['onboardingStatus']
  const interests = Array.isArray(doc.interests)
    ? (doc.interests.filter(Boolean) as TravelerProfileDto['interests'])
    : []

  return {
    id: doc.$id,
    displayName: doc.displayName || authFallback.username || 'Traveler',
    bio: doc.bio ?? null,
    avatarUrl: doc.avatarUrl ?? null,
    coverUrl: doc.coverUrl ?? null,
    homeCity: doc.homeCity ?? null,
    homeCountryCode: doc.homeCountryCode ?? null,
    preferredCurrency: currency,
    preferredLanguage: language,
    interests,
    onboardingStatus: status,
    onboardingCompletedAt: doc.onboardingCompletedAt ?? null,
    createdAt: doc.$createdAt || new Date().toISOString(),
    username: doc.username || authFallback.username || 'traveler',
    email: doc.email || authFallback.email,
    emailVerified: Boolean(doc.emailVerified ?? authFallback.emailVerified),
    storageConfigured: false,
    profileVisibility: (doc.profileVisibility as 'PUBLIC' | 'PRIVATE') || 'PUBLIC',
    followersCount: Number(doc.followersCount || 0),
    followingCount: Number(doc.followingCount || 0),
    delversCount: Number(doc.delversCount || 0),
  }
}

async function resolveAuthUser(): Promise<PublicUser> {
  const live = await appwriteGetCurrentUser()
  if (!live) {
    throw new AppwriteProfileError('Sign in required', { code: 'UNAUTHORIZED', status: 401 })
  }
  return live
}

function defaultCreateData(user: PublicUser) {
  return {
    displayName: user.username,
    bio: null as string | null,
    avatarUrl: null as string | null,
    coverUrl: null as string | null,
    homeCity: null as string | null,
    homeCountryCode: null as string | null,
    preferredCurrency: 'USD',
    preferredLanguage: 'en',
    interests: [] as string[],
    onboardingStatus: 'NOT_STARTED',
    onboardingCompletedAt: null as string | null,
    profileVisibility: 'PUBLIC',
    username: user.username,
    email: user.email,
    emailVerified: user.emailVerified,
    followersCount: 0,
    followingCount: 0,
    delversCount: 0,
  }
}

function toProfileError(err: unknown, fallbackMessage: string): AppwriteProfileError {
  if (err instanceof AppwriteProfileError) return err
  const mapped = mapAppwriteError(err)
  return new AppwriteProfileError(mapped.message || fallbackMessage, {
    code: mapped.code,
    status: mapped.status,
  })
}

async function getOrCreateProfileDoc(): Promise<TravelerProfileDto> {
  const user = await resolveAuthUser()
  const db = getDatabases()
  const databaseId = getDatabaseId()
  const collectionId = getCollectionId()

  try {
    const doc = await db.getDocument({
      databaseId,
      collectionId,
      documentId: user.id,
    })
    return mapDocToProfile(doc as unknown as ProfileDoc, user)
  } catch (err) {
    const mapped = mapAppwriteError(err)
    const notFound =
      mapped.status === 404 ||
      String(mapped.code || '').includes('document_not_found') ||
      String(mapped.message || '').toLowerCase().includes('not found')

    if (!notFound) throw toProfileError(err, 'Could not load traveler profile')
  }

  try {
    const doc = await db.createDocument({
      databaseId,
      collectionId,
      documentId: user.id,
      data: defaultCreateData(user),
      permissions: ownerPermissions(user.id),
    })
    return mapDocToProfile(doc as unknown as ProfileDoc, user)
  } catch (err) {
    throw toProfileError(
      err,
      'Could not create traveler profile. Create the traveler_profiles collection in Appwrite (see docs/appwrite-traveler-profile.md).',
    )
  }
}

async function patchProfileDoc(patch: Record<string, unknown>): Promise<TravelerProfileDto> {
  const user = await resolveAuthUser()
  await getOrCreateProfileDoc()
  const db = getDatabases()
  try {
    const doc = await db.updateDocument({
      databaseId: getDatabaseId(),
      collectionId: getCollectionId(),
      documentId: user.id,
      data: {
        ...patch,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    })
    return mapDocToProfile(doc as unknown as ProfileDoc, user)
  } catch (err) {
    throw toProfileError(err, 'Could not update traveler profile')
  }
}

export async function appwriteFetchProfile(): Promise<TravelerProfileDto> {
  if (!isAppwriteProfileConfigured()) {
    throw new AppwriteProfileError('Appwrite profile database is not configured', {
      code: 'APPWRITE_PROFILE_NOT_CONFIGURED',
      status: 503,
    })
  }
  return getOrCreateProfileDoc()
}

export async function appwritePatchOnboarding(body: OnboardingPatch): Promise<TravelerProfileDto> {
  const patch: Record<string, unknown> = {}
  if (body.displayName !== undefined) patch.displayName = body.displayName
  if (body.bio !== undefined) patch.bio = body.bio
  if (body.homeCity !== undefined) patch.homeCity = body.homeCity
  if (body.homeCountryCode !== undefined) patch.homeCountryCode = body.homeCountryCode
  if (body.preferredCurrency !== undefined) patch.preferredCurrency = body.preferredCurrency
  if (body.preferredLanguage !== undefined) patch.preferredLanguage = body.preferredLanguage
  if (body.interests !== undefined) patch.interests = body.interests
  patch.onboardingStatus = 'IN_PROGRESS'
  return patchProfileDoc(patch)
}

export async function appwriteCompleteOnboarding(body: OnboardingComplete): Promise<TravelerProfileDto> {
  return patchProfileDoc({
    displayName: body.displayName,
    bio: body.bio ?? null,
    homeCity: body.homeCity ?? null,
    homeCountryCode: body.homeCountryCode ?? null,
    preferredCurrency: body.preferredCurrency,
    preferredLanguage: body.preferredLanguage,
    interests: body.interests ?? [],
    onboardingStatus: 'COMPLETED',
    onboardingCompletedAt: new Date().toISOString(),
  })
}

export async function appwriteUpdateProfile(body: ProfileUpdate): Promise<TravelerProfileDto> {
  const patch: Record<string, unknown> = {}
  if (body.displayName !== undefined) patch.displayName = body.displayName
  if (body.bio !== undefined) patch.bio = body.bio
  if (body.homeCity !== undefined) patch.homeCity = body.homeCity
  if (body.homeCountryCode !== undefined) patch.homeCountryCode = body.homeCountryCode
  if (body.preferredCurrency !== undefined) patch.preferredCurrency = body.preferredCurrency
  if (body.preferredLanguage !== undefined) patch.preferredLanguage = body.preferredLanguage
  if (body.interests !== undefined) patch.interests = body.interests
  return patchProfileDoc(patch)
}
