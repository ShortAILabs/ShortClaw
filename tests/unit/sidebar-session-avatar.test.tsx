import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';

const loadSessionsMock = vi.fn();
const loadHistoryMock = vi.fn();
const switchSessionMock = vi.fn();
const newSessionMock = vi.fn();
const deleteSessionMock = vi.fn();
const setSidebarCollapsedMock = vi.fn();
const fetchAgentsMock = vi.fn();
const fetchProfileMock = vi.fn();
const logoutMock = vi.fn();
const subscribeHostEventMock = vi.fn();
const hostApiFetchMock = vi.fn();

const { settingsState, chatState, gatewayState, agentsState, userState } = vi.hoisted(() => ({
  settingsState: {
    sidebarCollapsed: false,
  },
  chatState: {
    sessions: [] as Array<Record<string, unknown>>,
    currentSessionKey: 'agent:research:main',
    sessionLabels: {} as Record<string, string>,
    sessionLastActivity: {} as Record<string, number>,
    messages: [] as Array<Record<string, unknown>>,
  },
  gatewayState: {
    status: { state: 'running', port: 18789 },
  },
  agentsState: {
    agents: [] as Array<Record<string, unknown>>,
  },
  userState: {
    profile: null as Record<string, unknown> | null,
    isAuthenticated: false,
  },
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: (selector: (state: typeof settingsState & {
    setSidebarCollapsed: typeof setSidebarCollapsedMock;
  }) => unknown) =>
    selector({
      ...settingsState,
      setSidebarCollapsed: setSidebarCollapsedMock,
    }),
}));

vi.mock('@/stores/chat', () => ({
  useChatStore: Object.assign(
    (selector: (state: typeof chatState & {
      loadSessions: typeof loadSessionsMock;
      loadHistory: typeof loadHistoryMock;
      switchSession: typeof switchSessionMock;
      newSession: typeof newSessionMock;
      deleteSession: typeof deleteSessionMock;
    }) => unknown) =>
      selector({
        ...chatState,
        loadSessions: loadSessionsMock,
        loadHistory: loadHistoryMock,
        switchSession: switchSessionMock,
        newSession: newSessionMock,
        deleteSession: deleteSessionMock,
      }),
    {
      getState: () => ({
        ...chatState,
        loadSessions: loadSessionsMock,
        loadHistory: loadHistoryMock,
        switchSession: switchSessionMock,
        newSession: newSessionMock,
        deleteSession: deleteSessionMock,
      }),
    },
  ),
}));

vi.mock('@/stores/gateway', () => ({
  useGatewayStore: (selector: (state: typeof gatewayState) => unknown) => selector(gatewayState),
}));

vi.mock('@/stores/agents', () => ({
  useAgentsStore: (selector: (state: typeof agentsState & {
    fetchAgents: typeof fetchAgentsMock;
  }) => unknown) =>
    selector({
      ...agentsState,
      fetchAgents: fetchAgentsMock,
    }),
}));

vi.mock('@/stores/user', () => ({
  useUserStore: (selector: (state: typeof userState & {
    fetchProfile: typeof fetchProfileMock;
    logout: typeof logoutMock;
  }) => unknown) =>
    selector({
      ...userState,
      fetchProfile: fetchProfileMock,
      logout: logoutMock,
    }),
}));

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: (...args: unknown[]) => hostApiFetchMock(...args),
}));

vi.mock('@/lib/host-events', () => ({
  subscribeHostEvent: (...args: unknown[]) => subscribeHostEventMock(...args),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('Sidebar session avatars', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsState.sidebarCollapsed = false;
    chatState.sessions = [
      {
        key: 'agent:research:main',
        label: 'Research plan',
      },
    ];
    chatState.currentSessionKey = 'agent:research:main';
    chatState.sessionLabels = {};
    chatState.sessionLastActivity = {
      'agent:research:main': Date.now(),
    };
    chatState.messages = [];
    gatewayState.status = { state: 'running', port: 18789 };
    agentsState.agents = [
      {
        id: 'research',
        name: 'Research',
        isDefault: false,
        modelDisplay: 'Claude',
        inheritedModel: false,
        workspace: '~/.openclaw/workspace-research',
        agentDir: '~/.openclaw/agents/research/agent',
        mainSessionKey: 'agent:research:main',
        channelTypes: [],
        avatar: {
          kind: 'default',
          avatarId: 'lobster-2',
          src: 'data:image/webp;base64,src2',
          thumbSrc: 'data:image/webp;base64,thumb2',
        },
      },
    ];
    userState.profile = null;
    userState.isAuthenticated = false;
    loadSessionsMock.mockResolvedValue(undefined);
    loadHistoryMock.mockResolvedValue(undefined);
    fetchAgentsMock.mockResolvedValue(undefined);
    fetchProfileMock.mockResolvedValue(undefined);
    subscribeHostEventMock.mockReturnValue(vi.fn());
    hostApiFetchMock.mockResolvedValue({ success: true });
    (window as Window & { electron?: { openExternal: ReturnType<typeof vi.fn> } }).electron = {
      openExternal: vi.fn(),
    };
  });

  it('shows the owning agent avatar for each session entry', async () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(fetchAgentsMock).toHaveBeenCalledTimes(1);
    });

    const avatar = screen.getByAltText('Research');
    expect(avatar).toHaveAttribute('src', 'data:image/webp;base64,thumb2');
    expect(screen.getByText('Research plan')).toBeInTheDocument();
  });
});
