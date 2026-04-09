import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import manifestJson from '../../resources/agent-avatars/default/manifest.json';
import sharp from 'sharp';
import { getDataDir, getResourcesDir } from './paths';

export interface AgentAvatarSelection {
  kind: 'default' | 'custom';
  avatarId: string;
}

export interface AgentAvatarSummary extends AgentAvatarSelection {
  src: string;
  thumbSrc: string;
}

interface AgentIdentityProfileDocument {
  version: 1;
  defaultAvatarCursor: number;
  agents: Record<string, { avatar: AgentAvatarSelection & { updatedAt: string } }>;
}

interface DefaultAvatarManifestEntry {
  avatarId: string;
  src: string;
  thumbSrc: string;
  sourceFile: string;
}

interface DefaultAvatarManifest {
  version: number;
  avatars: DefaultAvatarManifestEntry[];
}

const DEFAULT_PROFILE: AgentIdentityProfileDocument = {
  version: 1,
  defaultAvatarCursor: 0,
  agents: {},
};

const DEFAULT_AVATAR_MANIFEST = manifestJson as DefaultAvatarManifest;
const DATA_URL_CACHE = new Map<string, string>();
const AVATAR_IMAGE_SIZE = 512;
const AVATAR_THUMB_SIZE = 96;

function getAgentProfilePath(): string {
  return join(getDataDir(), 'agent-profiles.json');
}

function getAgentAvatarDir(agentId: string): string {
  return join(getDataDir(), 'agent-avatars', agentId);
}

function getTempAvatarDir(): string {
  return join(getDataDir(), 'agent-avatars', '_tmp');
}

function getCustomAvatarPaths(agentId: string, avatarId: string): { srcPath: string; thumbPath: string } {
  const avatarDir = getAgentAvatarDir(agentId);
  return {
    srcPath: join(avatarDir, `${avatarId}.webp`),
    thumbPath: join(avatarDir, `${avatarId}-thumb.webp`),
  };
}

function getDefaultAvatarPaths(entry: DefaultAvatarManifestEntry): { srcPath: string; thumbPath: string } {
  const root = join(getResourcesDir(), 'agent-avatars', 'default');
  return {
    srcPath: join(root, entry.src),
    thumbPath: join(root, entry.thumbSrc),
  };
}

async function readDataUrl(filePath: string): Promise<string> {
  const cached = DATA_URL_CACHE.get(filePath);
  if (cached) return cached;
  const buffer = await readFile(filePath);
  const dataUrl = `data:image/webp;base64,${buffer.toString('base64')}`;
  DATA_URL_CACHE.set(filePath, dataUrl);
  return dataUrl;
}

async function cleanupCustomAvatarFiles(agentId: string, avatarId: string): Promise<void> {
  const { srcPath, thumbPath } = getCustomAvatarPaths(agentId, avatarId);
  await Promise.all([
    rm(srcPath, { force: true }),
    rm(thumbPath, { force: true }),
  ]);
}

async function writeAvatarVariants(buffer: Buffer, outputDir: string, avatarId: string): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  await sharp(buffer)
    .resize(AVATAR_IMAGE_SIZE, AVATAR_IMAGE_SIZE, { fit: 'cover', position: 'attention' })
    .webp({ quality: 88 })
    .toFile(join(outputDir, `${avatarId}.webp`));

  await sharp(buffer)
    .resize(AVATAR_THUMB_SIZE, AVATAR_THUMB_SIZE, { fit: 'cover', position: 'attention' })
    .webp({ quality: 82 })
    .toFile(join(outputDir, `${avatarId}-thumb.webp`));
}

function cloneProfile(doc: AgentIdentityProfileDocument): AgentIdentityProfileDocument {
  return {
    version: 1,
    defaultAvatarCursor: doc.defaultAvatarCursor,
    agents: { ...doc.agents },
  };
}

export function getBundledDefaultAvatarCatalog(): DefaultAvatarManifestEntry[] {
  return [...DEFAULT_AVATAR_MANIFEST.avatars];
}

export async function listDefaultAvatarSummaries(): Promise<AgentAvatarSummary[]> {
  return Promise.all(
    DEFAULT_AVATAR_MANIFEST.avatars.map((entry) =>
      resolveSelectionSummary('__default__', {
        kind: 'default',
        avatarId: entry.avatarId,
      }),
    ),
  ).then((avatars) => avatars.filter((avatar): avatar is AgentAvatarSummary => Boolean(avatar)));
}

export async function getRecommendedDefaultAvatarId(): Promise<string | null> {
  const avatarIds = DEFAULT_AVATAR_MANIFEST.avatars.map((avatar) => avatar.avatarId);
  if (avatarIds.length === 0) return null;
  const profile = await loadAgentIdentityProfile();
  return assignDefaultAvatarId({
    cursor: profile.defaultAvatarCursor,
    avatarIds,
  }).avatarId;
}

export function assignDefaultAvatarId({
  cursor,
  avatarIds,
}: {
  cursor: number;
  avatarIds: string[];
}): { avatarId: string; nextCursor: number } {
  if (avatarIds.length === 0) {
    throw new Error('No bundled default avatars are available');
  }
  const safeCursor = cursor >= 0 ? cursor % avatarIds.length : 0;
  return {
    avatarId: avatarIds[safeCursor],
    nextCursor: (safeCursor + 1) % avatarIds.length,
  };
}

export async function loadAgentIdentityProfile(): Promise<AgentIdentityProfileDocument> {
  const profilePath = getAgentProfilePath();
  if (!existsSync(profilePath)) {
    return cloneProfile(DEFAULT_PROFILE);
  }

  try {
    const raw = await readFile(profilePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AgentIdentityProfileDocument>;
    if (
      parsed?.version === 1
      && typeof parsed.defaultAvatarCursor === 'number'
      && parsed.agents
      && typeof parsed.agents === 'object'
    ) {
      return {
        version: 1,
        defaultAvatarCursor: parsed.defaultAvatarCursor,
        agents: parsed.agents as AgentIdentityProfileDocument['agents'],
      };
    }
  } catch {
    // fall back to default profile
  }

  return cloneProfile(DEFAULT_PROFILE);
}

export async function saveAgentIdentityProfile(doc: AgentIdentityProfileDocument): Promise<void> {
  const profilePath = getAgentProfilePath();
  await mkdir(join(profilePath, '..'), { recursive: true });
  await writeFile(profilePath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
}

async function resolveSelectionSummary(
  agentId: string,
  selection: AgentAvatarSelection,
): Promise<AgentAvatarSummary | null> {
  if (selection.kind === 'default') {
    const entry = DEFAULT_AVATAR_MANIFEST.avatars.find((avatar) => avatar.avatarId === selection.avatarId);
    if (!entry) return null;
    const { srcPath, thumbPath } = getDefaultAvatarPaths(entry);
    return {
      kind: 'default',
      avatarId: selection.avatarId,
      src: await readDataUrl(srcPath),
      thumbSrc: await readDataUrl(thumbPath),
    };
  }

  const { srcPath, thumbPath } = getCustomAvatarPaths(agentId, selection.avatarId);
  if (!existsSync(srcPath) || !existsSync(thumbPath)) return null;
  return {
    kind: 'custom',
    avatarId: selection.avatarId,
    src: await readDataUrl(srcPath),
    thumbSrc: await readDataUrl(thumbPath),
  };
}

export async function ensureAvatarProfileForAgents(agentIds: string[]): Promise<void> {
  const profile = await loadAgentIdentityProfile();
  const avatarIds = DEFAULT_AVATAR_MANIFEST.avatars.map((avatar) => avatar.avatarId);
  let changed = false;

  for (const agentId of agentIds) {
    if (profile.agents[agentId]?.avatar) continue;
    const { avatarId, nextCursor } = assignDefaultAvatarId({
      cursor: profile.defaultAvatarCursor,
      avatarIds,
    });
    profile.agents[agentId] = {
      avatar: {
        kind: 'default',
        avatarId,
        updatedAt: new Date().toISOString(),
      },
    };
    profile.defaultAvatarCursor = nextCursor;
    changed = true;
  }

  if (changed) {
    await saveAgentIdentityProfile(profile);
  }
}

export async function resolveAvatarSummaryForAgent(agentId: string): Promise<AgentAvatarSummary | null> {
  const profile = await loadAgentIdentityProfile();
  const selection = profile.agents[agentId]?.avatar;
  if (!selection) return null;
  return resolveSelectionSummary(agentId, selection);
}

export async function saveAvatarSelectionForAgent(
  agentId: string,
  selection?: AgentAvatarSelection | null,
): Promise<AgentAvatarSelection> {
  const profile = await loadAgentIdentityProfile();
  const avatarIds = DEFAULT_AVATAR_MANIFEST.avatars.map((avatar) => avatar.avatarId);
  const previousSelection = profile.agents[agentId]?.avatar;
  let nextSelection = selection ?? null;

  if (nextSelection?.kind === 'default' && !avatarIds.includes(nextSelection.avatarId)) {
    throw new Error(`Unknown default avatar: ${nextSelection.avatarId}`);
  }

  if (!nextSelection) {
    const assigned = assignDefaultAvatarId({
      cursor: profile.defaultAvatarCursor,
      avatarIds,
    });
    nextSelection = {
      kind: 'default',
      avatarId: assigned.avatarId,
    };
    profile.defaultAvatarCursor = assigned.nextCursor;
  }

  if (nextSelection.kind === 'custom') {
    const tempDir = getTempAvatarDir();
    const nextTempSrc = join(tempDir, `${nextSelection.avatarId}.webp`);
    const nextTempThumb = join(tempDir, `${nextSelection.avatarId}-thumb.webp`);
    const targetDir = getAgentAvatarDir(agentId);
    const targetSrc = join(targetDir, `${nextSelection.avatarId}.webp`);
    const targetThumb = join(targetDir, `${nextSelection.avatarId}-thumb.webp`);

    if (existsSync(nextTempSrc) && existsSync(nextTempThumb)) {
      await mkdir(targetDir, { recursive: true });
      await rename(nextTempSrc, targetSrc);
      await rename(nextTempThumb, targetThumb);
    }
  }

  if (
    previousSelection?.kind === 'custom'
    && (
      previousSelection.avatarId !== nextSelection.avatarId
      || nextSelection.kind !== 'custom'
    )
  ) {
    await cleanupCustomAvatarFiles(agentId, previousSelection.avatarId);
  }

  profile.agents[agentId] = {
    avatar: {
      ...nextSelection,
      updatedAt: new Date().toISOString(),
    },
  };

  await saveAgentIdentityProfile(profile);
  return nextSelection;
}

export async function stageCustomAvatarUpload(input: {
  avatarId: string;
  base64: string;
}): Promise<AgentAvatarSummary> {
  const tempDir = getTempAvatarDir();
  const buffer = Buffer.from(input.base64, 'base64');
  await writeAvatarVariants(buffer, tempDir, input.avatarId);
  const srcPath = join(tempDir, `${input.avatarId}.webp`);
  const thumbPath = join(tempDir, `${input.avatarId}-thumb.webp`);
  return {
    kind: 'custom',
    avatarId: input.avatarId,
    src: await readDataUrl(srcPath),
    thumbSrc: await readDataUrl(thumbPath),
  };
}

export async function removeAvatarProfileForAgent(agentId: string): Promise<void> {
  const profile = await loadAgentIdentityProfile();
  const existing = profile.agents[agentId]?.avatar;
  if (!existing) return;

  delete profile.agents[agentId];
  await saveAgentIdentityProfile(profile);

  if (existing.kind === 'custom') {
    const { srcPath, thumbPath } = getCustomAvatarPaths(agentId, existing.avatarId);
    await Promise.all([
      rm(srcPath, { force: true }),
      rm(thumbPath, { force: true }),
    ]);
    await rm(getAgentAvatarDir(agentId), { recursive: true, force: true });
  }
}
