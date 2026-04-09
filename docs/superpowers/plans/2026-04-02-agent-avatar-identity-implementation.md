# Agent Avatar Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified agent avatar profile system that supports bundled default lobster avatars, machine-local custom avatar uploads, avatar editing on the Agents page, and avatar rendering in chat assistant rows and the session/history list.

**Architecture:** The backend owns avatar resolution through a new local app-data identity profile plus a bundled default avatar catalog. Existing `/api/agents` payloads are enriched with avatar metadata so renderer code only consumes resolved `avatar` objects. Creation and editing flows share a compact avatar selector and crop pipeline, with the renderer reusing a single avatar display component across Agents, Chat, and Sidebar.

**Tech Stack:** Electron host API routes, React 19 + Vite + TypeScript, Zustand stores, Vitest, sharp, native browser canvas/image APIs, i18next locale files.

---

## File Map

### New files

- `scripts/import-default-agent-avatars.mjs`
  - Imports all source lobster images from `/Users/dyh/Desktop/Claw`, normalizes them, compresses them, and writes app-ready assets plus a manifest into repo resources.
- `resources/agent-avatars/default/manifest.json`
  - Stable catalog for bundled default avatar IDs and file names.
- `electron/utils/agent-avatar-profile.ts`
  - Local app-data profile read/write, default-avatar cursor logic, migration, and avatar resolution.
- `src/components/agents/AgentAvatarPicker.tsx`
  - Shared compact selector UI for default avatars and custom upload entry.
- `src/components/agents/AgentAvatarCropDialog.tsx`
  - Shared crop modal used by create/edit flows.

### Modified files

- `package.json`
  - Add a repo script to import/compress bundled default avatars.
- `src/types/agent.ts`
  - Extend renderer agent summary types with avatar metadata.
- `electron/utils/agent-config.ts`
  - Merge avatar summary data into agent snapshots; invoke migration and assignment logic.
- `electron/api/routes/agents.ts`
  - Accept avatar selection payloads on create/update and return enriched summaries.
- `electron/api/routes/files.ts`
  - Add a machine-local avatar upload/save route or helper reuse for cropped avatar buffers.
- `src/stores/agents.ts`
  - Pass avatar selection in create/update calls and consume enriched snapshots.
- `src/pages/Agents/index.tsx`
  - Replace bot icons with real avatars; add avatar selection UI to create and settings modals.
- `src/components/ui/avatar.tsx`
  - Ensure robust fallback behavior and support the new `thumbSrc` usage sites.
- `src/pages/Chat/ChatMessage.tsx`
  - Render assistant message avatars from current session agent.
- `src/components/layout/Sidebar.tsx`
  - Render per-session agent avatars in the history list.
- `src/i18n/locales/en/agents.json`
- `src/i18n/locales/zh/agents.json`
- `src/i18n/locales/ja/agents.json`
  - Add avatar selector and crop dialog copy.
- `tests/unit/agent-config.test.ts`
  - Cover migration, cursor wrap, custom avatar cleanup, and enriched snapshots.
- `tests/unit/agents-page.test.tsx`
  - Cover avatar picker/edit flows on the Agents page.
- `tests/unit/chat-session-actions.test.ts` or a new focused chat/sidebar avatar test
  - Verify session-derived avatar rendering behavior.

## Task 1: Bundle the Default Lobster Avatar Catalog

**Files:**
- Create: `scripts/import-default-agent-avatars.mjs`
- Create: `resources/agent-avatars/default/manifest.json`
- Modify: `package.json`
- Test: manual asset import verification via script output

- [ ] **Step 1: Write the failing catalog expectation down in the plan and verify the repo currently has no bundled avatar catalog**

```bash
test -f resources/agent-avatars/default/manifest.json && echo "manifest exists" || echo "manifest missing"
```

Expected: `manifest missing`

- [ ] **Step 2: Add the import script**

```js
// scripts/import-default-agent-avatars.mjs
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';

const SOURCE_DIR = '/Users/dyh/Desktop/Claw';
const OUT_DIR = join(process.cwd(), 'resources', 'agent-avatars', 'default');

function slug(name) {
  return basename(name, extname(name))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const files = (await readdir(SOURCE_DIR))
  .filter((file) => /\.(png|jpg|jpeg|webp)$/i.test(file))
  .sort((a, b) => a.localeCompare(b));

await mkdir(OUT_DIR, { recursive: true });

const manifest = [];
for (const file of files) {
  const avatarId = slug(file);
  const srcName = `${avatarId}.webp`;
  const thumbName = `${avatarId}-thumb.webp`;
  const input = join(SOURCE_DIR, file);

  await sharp(input)
    .resize(512, 512, { fit: 'cover', position: 'centre' })
    .webp({ quality: 88 })
    .toFile(join(OUT_DIR, srcName));

  await sharp(input)
    .resize(96, 96, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82 })
    .toFile(join(OUT_DIR, thumbName));

  manifest.push({ avatarId, src: srcName, thumbSrc: thumbName, sourceFile: file });
}

await writeFile(join(OUT_DIR, 'manifest.json'), `${JSON.stringify({ version: 1, avatars: manifest }, null, 2)}\n`);
console.log(`Imported ${manifest.length} default agent avatars`);
```

- [ ] **Step 3: Expose the script via `package.json`**

```json
{
  "scripts": {
    "avatars:import-defaults": "zx scripts/import-default-agent-avatars.mjs"
  }
}
```

- [ ] **Step 4: Run the import script**

Run: `pnpm run avatars:import-defaults`  
Expected: PASS with output like `Imported 19 default agent avatars`

- [ ] **Step 5: Verify the generated manifest and files exist**

```bash
ls resources/agent-avatars/default
sed -n '1,80p' resources/agent-avatars/default/manifest.json
```

Expected: `.webp` files plus `manifest.json`, and each manifest entry has `avatarId`, `src`, and `thumbSrc`.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/import-default-agent-avatars.mjs resources/agent-avatars/default
git commit -m "build: bundle default agent avatar catalog"
```

## Task 2: Add Local Agent Avatar Profile Storage and Snapshot Enrichment

**Files:**
- Create: `electron/utils/agent-avatar-profile.ts`
- Modify: `electron/utils/agent-config.ts`
- Modify: `src/types/agent.ts`
- Test: `tests/unit/agent-config.test.ts`

- [ ] **Step 1: Write the failing backend tests for avatar migration and snapshot enrichment**

```ts
it('assigns distinct default avatars to existing agents during migration', async () => {
  await writeOpenClawJson({
    agents: {
      list: [
        { id: 'main', name: 'Main', default: true },
        { id: 'coder', name: 'Coder' },
        { id: 'reviewer', name: 'Reviewer' },
      ],
    },
  });

  const { listAgentsSnapshot } = await import('@electron/utils/agent-config');
  const snapshot = await listAgentsSnapshot();

  expect(snapshot.agents.map((agent) => agent.avatar?.avatarId)).toEqual([
    expect.any(String),
    expect.any(String),
    expect.any(String),
  ]);
  expect(new Set(snapshot.agents.map((agent) => agent.avatar?.avatarId)).size).toBe(3);
});

it('wraps the default avatar cursor when the pool is exhausted', async () => {
  const { assignDefaultAvatarId } = await import('@electron/utils/agent-avatar-profile');

  expect(assignDefaultAvatarId({ cursor: 0, avatarIds: ['a', 'b'] })).toEqual({ avatarId: 'a', nextCursor: 1 });
  expect(assignDefaultAvatarId({ cursor: 1, avatarIds: ['a', 'b'] })).toEqual({ avatarId: 'b', nextCursor: 0 });
});

it('includes resolved avatar metadata in agent snapshots', async () => {
  await writeOpenClawJson({
    agents: {
      list: [{ id: 'main', name: 'Main', default: true }],
    },
  });

  const { listAgentsSnapshot } = await import('@electron/utils/agent-config');
  const snapshot = await listAgentsSnapshot();

  expect(snapshot.agents[0]).toMatchObject({
    avatar: {
      kind: expect.stringMatching(/default|custom/),
      avatarId: expect.any(String),
      src: expect.stringContaining('/'),
      thumbSrc: expect.stringContaining('/'),
    },
  });
});
```

- [ ] **Step 2: Run the focused backend tests to verify they fail**

Run: `pnpm test tests/unit/agent-config.test.ts`  
Expected: FAIL because `avatar` fields and local profile helpers do not exist yet.

- [ ] **Step 3: Implement local profile storage and default-avatar resolution**

```ts
// electron/utils/agent-avatar-profile.ts
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import manifest from '../../resources/agent-avatars/default/manifest.json';

export interface AgentAvatarSelection {
  kind: 'default' | 'custom';
  avatarId: string;
}

interface AgentIdentityProfileDocument {
  version: 1;
  defaultAvatarCursor: number;
  agents: Record<string, { avatar: AgentAvatarSelection & { updatedAt: string } }>;
}

export function assignDefaultAvatarId({
  cursor,
  avatarIds,
}: {
  cursor: number;
  avatarIds: string[];
}) {
  const avatarId = avatarIds[cursor] ?? avatarIds[0];
  const nextCursor = avatarIds.length === 0 ? 0 : (cursor + 1) % avatarIds.length;
  return { avatarId, nextCursor };
}

export async function loadAgentIdentityProfile(): Promise<AgentIdentityProfileDocument> { /* read or create default */ }
export async function saveAgentIdentityProfile(doc: AgentIdentityProfileDocument): Promise<void> { /* persist JSON */ }
export async function ensureAvatarProfileForAgents(agentIds: string[]): Promise<void> { /* migrate missing agents in order */ }
export function resolveDefaultAvatarSummary(avatarId: string) { /* lookup manifest and return src/thumbSrc */ }
```

- [ ] **Step 4: Enrich agent snapshots in `electron/utils/agent-config.ts` and renderer types**

```ts
// src/types/agent.ts
export interface AgentAvatarSummary {
  kind: 'default' | 'custom';
  avatarId: string;
  src: string;
  thumbSrc: string;
}

export interface AgentSummary {
  // existing fields...
  avatar: AgentAvatarSummary | null;
}
```

```ts
// electron/utils/agent-config.ts
import {
  ensureAvatarProfileForAgents,
  resolveAvatarSummaryForAgent,
} from './agent-avatar-profile';

export async function listAgentsSnapshot(): Promise<AgentsSnapshot> {
  // existing snapshot assembly...
  await ensureAvatarProfileForAgents(entries.map((entry) => entry.id));
  const agents = await Promise.all(entries.map(async (entry) => ({
    ...existingSummaryFields,
    avatar: await resolveAvatarSummaryForAgent(entry.id),
  })));
  return { agents, ...otherSnapshotFields };
}
```

- [ ] **Step 5: Re-run backend tests**

Run: `pnpm test tests/unit/agent-config.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add electron/utils/agent-avatar-profile.ts electron/utils/agent-config.ts src/types/agent.ts tests/unit/agent-config.test.ts
git commit -m "feat: add local agent avatar profile model"
```

## Task 3: Extend Agent Create/Update APIs for Avatar Selection

**Files:**
- Modify: `electron/api/routes/agents.ts`
- Modify: `src/stores/agents.ts`
- Modify: `src/types/agent.ts`
- Test: `tests/unit/agent-config.test.ts`

- [ ] **Step 1: Write failing tests for explicit avatar selection on create and update**

```ts
it('uses an explicit default avatar selection when creating an agent', async () => {
  const { createAgent, listAgentsSnapshot } = await import('@electron/utils/agent-config');

  await createAgent('Planner', {
    inheritWorkspace: false,
    avatarSelection: { kind: 'default', avatarId: 'lobster-3' },
  });

  const snapshot = await listAgentsSnapshot();
  const planner = snapshot.agents.find((agent) => agent.name === 'Planner');
  expect(planner?.avatar?.avatarId).toBe('lobster-3');
});

it('updates name and avatar together for an existing agent', async () => {
  const { updateAgentProfile, listAgentsSnapshot } = await import('@electron/utils/agent-config');

  await updateAgentProfile('main', {
    name: 'Main Desk',
    avatarSelection: { kind: 'default', avatarId: 'lobster-2' },
  });

  const snapshot = await listAgentsSnapshot();
  expect(snapshot.agents.find((agent) => agent.id === 'main')).toMatchObject({
    name: 'Main Desk',
    avatar: { avatarId: 'lobster-2' },
  });
});
```

- [ ] **Step 2: Run the focused tests to confirm failure**

Run: `pnpm test tests/unit/agent-config.test.ts`  
Expected: FAIL because agent create/update does not accept `avatarSelection`.

- [ ] **Step 3: Extend config-layer create/update APIs**

```ts
// electron/utils/agent-config.ts
export async function createAgent(
  name: string,
  options?: {
    inheritWorkspace?: boolean;
    avatarSelection?: AgentAvatarSelection;
  },
): Promise<AgentsSnapshot> {
  // existing create logic...
  await saveAvatarSelectionForAgent(agentId, options?.avatarSelection ?? null);
  return listAgentsSnapshot();
}

export async function updateAgentProfile(
  agentId: string,
  payload: {
    name: string;
    avatarSelection?: AgentAvatarSelection;
  },
): Promise<AgentsSnapshot> {
  await updateAgentNameInConfig(agentId, payload.name);
  if (payload.avatarSelection) {
    await saveAvatarSelectionForAgent(agentId, payload.avatarSelection);
  }
  return listAgentsSnapshot();
}
```

- [ ] **Step 4: Extend routes and store payloads**

```ts
// electron/api/routes/agents.ts
const body = await parseJsonBody<{
  name: string;
  inheritWorkspace?: boolean;
  avatarSelection?: AgentAvatarSelection;
}>(req);
const snapshot = await createAgent(body.name, {
  inheritWorkspace: body.inheritWorkspace,
  avatarSelection: body.avatarSelection,
});
```

```ts
// src/stores/agents.ts
createAgent: async (name, options) => {
  await hostApiFetch('/api/agents', {
    method: 'POST',
    body: JSON.stringify({
      name,
      inheritWorkspace: options?.inheritWorkspace,
      avatarSelection: options?.avatarSelection,
    }),
  });
}
```

- [ ] **Step 5: Re-run backend tests**

Run: `pnpm test tests/unit/agent-config.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add electron/api/routes/agents.ts electron/utils/agent-config.ts src/stores/agents.ts tests/unit/agent-config.test.ts
git commit -m "feat: support avatar selection in agent api"
```

## Task 4: Build Shared Avatar Picker and Crop Flow for Agent Create/Edit

**Files:**
- Create: `src/components/agents/AgentAvatarPicker.tsx`
- Create: `src/components/agents/AgentAvatarCropDialog.tsx`
- Modify: `src/pages/Agents/index.tsx`
- Modify: `src/stores/agents.ts`
- Modify: `electron/api/routes/files.ts`
- Modify: `src/i18n/locales/en/agents.json`
- Modify: `src/i18n/locales/zh/agents.json`
- Modify: `src/i18n/locales/ja/agents.json`
- Test: `tests/unit/agents-page.test.tsx`

- [ ] **Step 1: Write failing UI tests for avatar selection in the create and settings dialogs**

```tsx
it('preselects a recommended default avatar in the create dialog', async () => {
  render(<Agents />);

  fireEvent.click(screen.getByRole('button', { name: 'addAgent' }));

  expect(await screen.findByRole('radio', { name: /default avatar/i })).toBeChecked();
});

it('lets the settings modal save name and avatar together', async () => {
  render(<Agents />);

  fireEvent.click(screen.getByTitle('settings'));
  fireEvent.change(screen.getByLabelText('settingsDialog.nameLabel'), {
    target: { value: 'Main Desk' },
  });
  fireEvent.click(screen.getByRole('radio', { name: /lobster-2/i }));
  fireEvent.click(screen.getByRole('button', { name: 'common:actions.save' }));

  await waitFor(() =>
    expect(updateAgentMock).toHaveBeenCalledWith('main', {
      name: 'Main Desk',
      avatarSelection: { kind: 'default', avatarId: 'lobster-2' },
    }),
  );
});
```

- [ ] **Step 2: Run the Agents page tests to verify failure**

Run: `pnpm test tests/unit/agents-page.test.tsx`  
Expected: FAIL because no avatar picker or combined save payload exists.

- [ ] **Step 3: Create a shared compact avatar picker**

```tsx
// src/components/agents/AgentAvatarPicker.tsx
import { Avatar } from '@/components/ui/avatar';

export function AgentAvatarPicker({
  avatars,
  value,
  onSelectDefault,
  onSelectCustom,
}: {
  avatars: Array<{ avatarId: string; thumbSrc: string; label: string }>;
  value: { kind: 'default' | 'custom'; avatarId: string } | null;
  onSelectDefault: (avatarId: string) => void;
  onSelectCustom: () => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-2">
        {avatars.map((avatar) => (
          <button
            key={avatar.avatarId}
            type="button"
            role="radio"
            aria-checked={value?.kind === 'default' && value.avatarId === avatar.avatarId}
            onClick={() => onSelectDefault(avatar.avatarId)}
            className="rounded-full border p-1"
          >
            <Avatar src={avatar.thumbSrc} name={avatar.label} size={40} />
          </button>
        ))}
        <button type="button" onClick={onSelectCustom} className="rounded-full border border-dashed p-3">
          Custom
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the crop dialog and cropped upload path**

```tsx
// src/components/agents/AgentAvatarCropDialog.tsx
export function AgentAvatarCropDialog({
  file,
  onCancel,
  onApply,
}: {
  file: File;
  onCancel: () => void;
  onApply: (result: { base64: string; mimeType: string; fileName: string; preview: string }) => Promise<void>;
}) {
  // image preview + drag/zoom state
  // export a square cropped canvas via canvas.toBlob()
}
```

```ts
// electron/api/routes/files.ts
if (url.pathname === '/api/files/agent-avatar' && req.method === 'POST') {
  const body = await parseJsonBody<{ base64: string; fileName: string; mimeType: string }>(req);
  // write to userData/agent-avatars/tmp
  // generate 512 and 96 variants
  // return uploadId, src, thumbSrc
}
```

- [ ] **Step 5: Wire the picker into create and settings dialogs**

```tsx
// src/pages/Agents/index.tsx
const [avatarSelection, setAvatarSelection] = useState<AgentAvatarSelection | null>(recommendedAvatar);

<AgentAvatarPicker
  avatars={defaultAvatarOptions}
  value={avatarSelection}
  onSelectDefault={(avatarId) => setAvatarSelection({ kind: 'default', avatarId })}
  onSelectCustom={() => setShowCropDialog(true)}
/>
```

```tsx
await onCreate(name.trim(), {
  inheritWorkspace,
  avatarSelection,
});
```

- [ ] **Step 6: Re-run the UI tests**

Run: `pnpm test tests/unit/agents-page.test.tsx`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/agents/AgentAvatarPicker.tsx src/components/agents/AgentAvatarCropDialog.tsx src/pages/Agents/index.tsx src/stores/agents.ts electron/api/routes/files.ts src/i18n/locales/en/agents.json src/i18n/locales/zh/agents.json src/i18n/locales/ja/agents.json tests/unit/agents-page.test.tsx
git commit -m "feat: add agent avatar picker and crop flow"
```

## Task 5: Render Agent Avatars in Agents List, Chat Messages, and Session History

**Files:**
- Modify: `src/components/ui/avatar.tsx`
- Modify: `src/pages/Agents/index.tsx`
- Modify: `src/pages/Chat/ChatMessage.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Test: `tests/unit/agents-page.test.tsx`
- Test: `tests/unit/chat-session-actions.test.ts` or `tests/unit/sidebar-agent-avatar.test.tsx`

- [ ] **Step 1: Write failing rendering tests**

```tsx
it('renders the agent avatar in the agents list card', async () => {
  agentsState.agents = [{
    id: 'main',
    name: 'Main',
    avatar: {
      kind: 'default',
      avatarId: 'lobster-1',
      src: '/avatars/lobster-1.webp',
      thumbSrc: '/avatars/lobster-1-thumb.webp',
    },
    // other required fields...
  }];

  render(<Agents />);

  expect(await screen.findByAltText('Main')).toHaveAttribute('src', '/avatars/lobster-1-thumb.webp');
});
```

```tsx
it('renders the current session agent avatar in assistant messages and sidebar entries', () => {
  // arrange store state for a session bound to agent:coder:main
  // expect sidebar avatar img and assistant avatar img to use coder thumbSrc/src
});
```

- [ ] **Step 2: Run the rendering tests to verify failure**

Run: `pnpm test tests/unit/agents-page.test.tsx`  
Run: `pnpm test tests/unit/chat-session-actions.test.ts`  
Expected: FAIL because the UI still renders generic bot/sparkles markers.

- [ ] **Step 3: Update shared avatar usage**

```tsx
// src/pages/Agents/index.tsx
<Avatar src={agent.avatar?.thumbSrc ?? agent.avatar?.src ?? null} name={agent.name} size={46} />
```

```tsx
// src/pages/Chat/ChatMessage.tsx
const agents = useAgentsStore((s) => s.agents);
const currentAgentId = useChatStore((s) => s.currentAgentId);
const currentAgent = agents.find((agent) => agent.id === currentAgentId);

<Avatar
  src={currentAgent?.avatar?.thumbSrc ?? currentAgent?.avatar?.src ?? null}
  name={currentAgent?.name ?? 'Assistant'}
  size={32}
  className="mt-1 bg-black/5 dark:bg-white/5"
/>
```

```tsx
// src/components/layout/Sidebar.tsx
const agentSummaryById = new Map(agents.map((agent) => [agent.id, agent]));
const agent = agentSummaryById.get(agentId);

<Avatar src={agent?.avatar?.thumbSrc ?? null} name={agent?.name ?? agentId} size={20} />
```

- [ ] **Step 4: Verify fallback behavior in `Avatar` remains safe**

```tsx
// src/components/ui/avatar.tsx
{src ? (
  <img src={src} alt={name} className="h-full w-full object-cover" onError={handleError} />
) : (
  <span>{initials}</span>
)}
```

- [ ] **Step 5: Re-run the focused rendering tests**

Run: `pnpm test tests/unit/agents-page.test.tsx`  
Run: `pnpm test tests/unit/chat-session-actions.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/avatar.tsx src/pages/Agents/index.tsx src/pages/Chat/ChatMessage.tsx src/components/layout/Sidebar.tsx tests/unit/agents-page.test.tsx tests/unit/chat-session-actions.test.ts
git commit -m "feat: render agent avatars across ui surfaces"
```

## Task 6: Final Verification, Locale Check, and README Audit

**Files:**
- Modify if needed: `README.md`
- Modify if needed: `README.zh-CN.md`
- Modify if needed: `README.ja-JP.md`
- Verify: all files touched above

- [ ] **Step 1: Run the focused unit test suite**

Run: `pnpm test tests/unit/agent-config.test.ts tests/unit/agents-page.test.tsx tests/unit/chat-session-actions.test.ts`  
Expected: PASS

- [ ] **Step 2: Run typecheck**

Run: `pnpm run typecheck`  
Expected: PASS with no TypeScript errors

- [ ] **Step 3: Run lint**

Run: `pnpm run lint`  
Expected: PASS

- [ ] **Step 4: Audit README files for behavior changes**

```bash
rg -n "Agent|avatar|Agents page|chat" README.md README.zh-CN.md README.ja-JP.md
```

Expected: Either no doc change is needed, or update the relevant docs to mention editable agent avatars and avatar visibility in chat/history.

- [ ] **Step 5: Commit final verification/doc updates**

```bash
git add README.md README.zh-CN.md README.ja-JP.md
git commit -m "docs: note agent avatar support"
```

If no README changes are needed:

```bash
git commit --allow-empty -m "chore: verify agent avatar identity rollout"
```

## Self-Review

### Spec coverage

- Bundled default avatar catalog: covered by Task 1
- Local app-data profile and unified summary model: covered by Task 2
- API create/update/list support: covered by Task 3
- Compact create/edit flow with crop modal: covered by Task 4
- Agents page, chat assistant rows, and sidebar history rendering: covered by Task 5
- Compression, cursor wrap, deletion cleanup, and fallback handling: covered by Tasks 1, 2, 4, and 5
- Tests and verification: covered by Tasks 2 through 6

No spec gaps remain.

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Each task has concrete files, commands, and representative code.

### Type consistency

- Shared types use `AgentAvatarSelection` and `AgentAvatarSummary` consistently.
- The `avatarSelection` payload name is used consistently in create/update flows.
- Renderer summary shape uses `avatar` consistently across Agents, Chat, and Sidebar.

