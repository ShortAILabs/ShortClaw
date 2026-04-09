# Agent Avatar Identity Design

Date: 2026-04-02
Status: Draft approved in conversation, written for review

## Goal

Add a unified `agent avatar profile` capability to ShortClaw so that:

- Agent avatars appear in chat assistant messages
- Agent avatars appear in the chat session/history list
- The Agents page supports editing both agent name and avatar
- The create-agent dialog supports selecting a default avatar or uploading a custom avatar
- Existing agents automatically receive distinct default lobster avatars
- Newly created agents automatically receive the next default lobster avatar

This work should feel aligned with current mainstream AI product interaction patterns while staying consistent with the current ShortClaw visual language and architecture.

## Confirmed Product Decisions

The following choices were explicitly confirmed during brainstorming:

- Primary UI direction: compact form flow
- Avatar appears in:
  - assistant message row in chat
  - chat session/history list entry
- Existing agents should automatically receive different default avatars
- New agents should automatically receive the next default avatar
- All images from `/Users/dyh/Desktop/Claw` are part of the default avatar candidate pool
- Default avatar assets should be compressed to appropriate UI sizes
- Custom uploaded avatars are stored in ShortClaw local app data only
- Custom avatars are machine-local and do not travel with OpenClaw agent config
- When the default avatar pool is exhausted, assignment loops back to the beginning
- Architectural direction: a medium-weight unified `agent avatar profile` model

## Non-Goals

This design does not include:

- syncing custom avatars across devices
- uploading avatars to any remote service
- introducing analytics or telemetry for avatar interactions
- redesigning the entire Agents page layout
- adding agent themes, badges, or personalities in this change

The design should leave room for those future extensions, but does not implement them now.

## UX Principles

### Identity should be visible where agent choice matters

Avatars should reinforce "which agent is acting" in the two places where identity has the highest value:

- the assistant response row
- the session list

This avoids low-value decorative repetition while increasing recognition speed during multi-agent use.

### Creation and editing should share the same mental model

The user should choose an avatar the same way in both places:

- select from defaults
- or upload and crop a custom image

The create flow and edit flow should use the same avatar selection rules, labels, and preview behavior.

### Compact flow, not wizard flow

The chosen direction is the compact form layout, not a large identity-first hero flow. The UI should therefore keep the avatar choice lightweight and adjacent to the name field rather than turning creation into a step-by-step wizard.

### Stable defaults beat clever automation

Default avatar assignment should be deterministic and easy to understand:

- avatars are assigned in order
- existing agents get distinct avatars during migration
- new agents use the next avatar
- after the pool ends, assignment restarts from the first avatar

## Information Model

### Agent summary shape

The renderer should receive avatar data as part of the existing agent summary payload rather than deriving it locally.

`AgentSummary` should be extended with an `avatar` object:

```ts
interface AgentAvatarSummary {
  kind: 'default' | 'custom';
  avatarId: string;
  src: string;
  thumbSrc: string;
}
```

```ts
interface AgentSummary {
  id: string;
  name: string;
  isDefault: boolean;
  modelDisplay: string;
  modelRef?: string | null;
  overrideModelRef?: string | null;
  inheritedModel: boolean;
  workspace: string;
  agentDir: string;
  mainSessionKey: string;
  channelTypes: string[];
  avatar: AgentAvatarSummary | null;
}
```

Renderer components should treat `avatar` as the single source of truth. They should not need to know whether the avatar came from a default lobster asset or a custom upload beyond the supplied metadata.

### Local profile store

Agent avatar state is part of a local app-owned identity layer, not part of OpenClaw runtime config.

Introduce a local profile document in ShortClaw app data, conceptually:

```ts
interface AgentIdentityProfileDocument {
  version: 1;
  defaultAvatarCursor: number;
  agents: Record<string, {
    avatar: {
      kind: 'default' | 'custom';
      avatarId: string;
      updatedAt: string;
    };
  }>;
}
```

This document is stored under the ShortClaw local user data directory.

### Default avatar catalog

The default lobster images from `/Users/dyh/Desktop/Claw` become a bundled default avatar catalog for the app. Each asset gets a stable generated ID based on its final imported filename, not on transient desktop state.

Each catalog entry should expose:

- `avatarId`
- asset source path in app resources
- `src`
- `thumbSrc`

## Storage Model

### Default avatars

Default avatars are prepared as application assets. During asset preparation:

- source PNGs are imported from the provided lobster folder
- each asset is normalized to square output
- each asset is compressed for UI use
- each asset gets:
  - a primary image around `512x512`
  - a thumbnail around `96x96`

Display remains circular in UI via CSS masking, but stored files remain square to avoid unnecessary format complexity.

### Custom avatars

Custom avatars are stored in ShortClaw app data, local-machine only.

Suggested structure:

- `<userData>/agent-avatars/<agentId>/<fileId>.webp`
- `<userData>/agent-avatars/<agentId>/<fileId>-thumb.webp`
- `<userData>/agent-profiles.json`

Custom uploads should be stored only after cropping is confirmed. The original full-size local file should not be retained by the app.

## Migration and Assignment Rules

### Existing agents

On first load after the feature ships:

- read the agent list order from the current agent configuration snapshot
- assign each existing agent the next distinct default avatar in order
- persist the assignment into the local identity profile

This migration should only assign agents that do not already have a local avatar profile.

### New agents

When a new agent is created:

- if the user explicitly chooses a default avatar, use that avatar
- if the user uploads a custom avatar, store that custom avatar
- otherwise use the current `defaultAvatarCursor`

After automatic assignment, advance the cursor by one. When the cursor exceeds the last default avatar index, wrap it back to zero.

### Deletion

When an agent is deleted:

- remove its identity profile entry
- if the avatar is custom, delete the stored local avatar files
- do not alter the default avatar catalog
- do not rewind the default avatar cursor

Not rewinding keeps the assignment rule simple and predictable.

## API Design

### GET `/api/agents`

Continue returning the existing snapshot, but enrich every agent entry with `avatar`.

The backend becomes responsible for resolving:

- effective avatar selection
- corresponding `src`
- corresponding `thumbSrc`

### POST `/api/agents`

Extend create-agent input so it can optionally include avatar selection:

```ts
type AgentAvatarSelection =
  | { kind: 'default'; avatarId: string }
  | { kind: 'custom'; uploadId: string };
```

Request shape conceptually becomes:

```ts
{
  name: string;
  inheritWorkspace?: boolean;
  avatarSelection?: AgentAvatarSelection;
}
```

If `avatarSelection` is omitted, the backend automatically applies the next default avatar.

### PUT `/api/agents/:id`

Extend update-agent input so name and avatar can be saved in one request:

```ts
{
  name: string;
  avatarSelection?: AgentAvatarSelection;
}
```

This avoids separate user-facing save actions for name and avatar.

### Avatar upload endpoint

Add a local-only upload endpoint for cropped avatar payloads. The frontend should upload the already-cropped result, not the raw original image.

Conceptually:

- input: final square image blob plus mime metadata
- output: `{ uploadId, src, thumbSrc }`

The upload record is temporary until the create or update action references it. Unused temporary uploads should be safe to clean up.

## UI Design

### Create Agent Dialog

Location: existing create dialog on the Agents page.

Order:

1. Agent name
2. Agent avatar
3. Inherit workspace

### Avatar section

The avatar section should include:

- a concise section label: `Agent Avatar`
- a row or wrapped grid of circular default avatar choices
- one final tile for `Custom`
- a visible selected state
- a small live preview if the selected custom avatar has been cropped

Behavior:

- a recommended default avatar is preselected when the dialog opens
- clicking another default avatar replaces the selection immediately
- clicking `Custom` opens the local image picker
- after file pick, the crop modal opens
- after crop confirmation, the create dialog returns with the custom avatar selected
- cancelling crop keeps the previous avatar selection unchanged

### Tone and copy

The copy should be direct and utility-first, not playful marketing copy.

Suggested English keys:

- `Agent Avatar`
- `Choose a default avatar or upload your own`
- `Custom`
- `Upload image`
- `Apply avatar`
- `Rechoose`

Equivalent zh/ja locale entries must be added at the same time.

## Crop Modal

The crop flow is a secondary modal launched from the create/edit flow.

Requirements:

- circular crop preview
- drag to reposition
- zoom control
- cancel without losing previous selection
- apply to confirm final cropped result

Output:

- square exported image
- circular semantics only in preview and downstream display

This aligns with common avatar editing flows used in messaging and AI products.

## Agent Settings Modal

Location: existing agent settings modal on the Agents page.

Add an identity block near the top containing:

- current avatar preview
- editable name field
- default avatar choices
- custom upload entry

Saving should update both name and avatar together through the same submit action. If only one field changed, the same action still applies.

The rest of the modal, such as model and channel settings, remains structurally unchanged.

## Agents List

On the main Agents page list:

- replace the generic bot icon with the resolved agent avatar
- preserve fallback initials if the image cannot be rendered
- keep current card density and actions

The avatar should make each agent easier to scan without introducing a larger card redesign.

## Chat Message Rendering

Location: assistant message row in chat.

Change:

- replace the generic assistant sparkles avatar with the current session agent avatar

Rules:

- only assistant messages use agent avatar
- user messages remain visually unchanged
- fallback to initials or existing neutral placeholder if avatar is missing

This gives a stronger "which agent responded" signal in multi-agent workflows.

## Session / History List

Location: sidebar session list.

Change:

- each session entry shows the avatar of the agent inferred from its session key

Rules:

- avatar appears before the session label
- current selected session should highlight consistently with existing selected-state styling
- if avatar lookup fails, use initials fallback

This makes agent identity visible before opening a conversation.

## Frontend Architecture

### Shared avatar rendering

Reuse the existing avatar UI component and extend it only if needed for:

- `thumbSrc`
- fallback initials
- consistent circle rendering

Avoid separate avatar renderers for Agents page, chat, and sidebar.

### Shared avatar selection state

Create a small shared avatar selection model for create and edit flows so the same rules drive:

- default selection
- custom temporary upload selection
- crop-result preview
- save payload creation

This should prevent drift between create-agent and edit-agent behavior.

## Error Handling

- Reject unsupported file types before upload
- Reject excessively large images with a clear error message
- If cropping fails, preserve the previous selected avatar
- If a custom avatar file later disappears from disk, resolve gracefully to initials fallback
- If a default avatar asset cannot be found, resolve gracefully to initials fallback
- If temp upload cleanup fails, log a warning but do not block the user flow

## Testing Strategy

### Backend tests

Extend unit coverage around agent configuration and local profile behavior:

- migration assigns distinct default avatars to existing agents
- new agents consume the next default avatar
- cursor wraps when reaching the end of the pool
- explicit default avatar selection is respected
- custom avatar metadata is stored and resolved
- deleting an agent removes custom avatar files
- `/api/agents` returns enriched avatar metadata

### Frontend tests

Extend Agents page tests:

- create dialog preselects a recommended default avatar
- selecting a different default avatar updates the pending selection
- selecting custom avatar enters crop flow state
- settings modal saves name and avatar together

Add or extend tests for:

- assistant message avatar rendering in chat
- session list avatar rendering in sidebar
- fallback avatar rendering when `src` is unavailable

## Implementation Impact

Expected areas of change:

- agent summary types in renderer and electron utils
- local app-data storage for agent identity profiles
- agent routes for create/update/list
- create-agent dialog UI
- agent settings modal UI
- chat assistant message avatar rendering
- sidebar session list avatar rendering
- locale strings
- unit tests

## Open Questions Resolved

The following points were explicitly resolved and should not be reopened during implementation unless the user changes scope:

- use the full desktop `Claw` image set as default avatar pool
- compress default assets to UI-friendly sizes
- store custom uploads in ShortClaw app data only
- assistant message avatar and session list avatar are in scope
- default avatar reuse loops from the start

## Recommended Implementation Order

1. Define local profile schema and avatar summary shape
2. Implement default avatar catalog preparation and resolution
3. Extend backend list/create/update flows
4. Add create/edit avatar selection UI and crop flow
5. Render avatars in Agents page list
6. Render avatars in chat assistant rows and sidebar sessions
7. Add tests and migration coverage
