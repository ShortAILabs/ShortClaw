import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import { ChatToolbar } from '@/pages/Chat/ChatToolbar';

const { agentsState, chatState } = vi.hoisted(() => ({
  agentsState: {
    agents: [] as Array<Record<string, unknown>>,
  },
  chatState: {
    refresh: vi.fn(),
    loading: false,
    showThinking: false,
    toggleThinking: vi.fn(),
    currentAgentId: 'main',
  },
}));

vi.mock('@/stores/agents', () => ({
  useAgentsStore: (selector: (state: typeof agentsState) => unknown) => selector(agentsState),
}));

vi.mock('@/stores/chat', () => ({
  useChatStore: (selector: (state: typeof chatState) => unknown) => selector(chatState),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      switch (key) {
        case 'toolbar.currentAgentLabel':
          return '当前对话对象：';
        case 'toolbar.currentAgent':
          return `当前对话对象：${String(vars?.agent ?? '')}`;
        case 'toolbar.refresh':
          return '刷新';
        case 'toolbar.hideThinking':
          return '隐藏思考';
        case 'toolbar.showThinking':
          return '显示思考';
        default:
          return key;
      }
    },
  }),
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('ChatToolbar current agent header', () => {
  beforeEach(() => {
    agentsState.agents = [
      {
        id: 'main',
        name: 'Doudou',
        avatar: {
          src: 'data:image/webp;base64,doudou-avatar',
        },
      },
    ];
    chatState.currentAgentId = 'main';
    chatState.loading = false;
    chatState.showThinking = false;
  });

  it('renders current agent as label plus avatar and name', () => {
    render(<ChatToolbar />);

    expect(screen.getByText('当前对话对象：')).toBeInTheDocument();
    expect(screen.getByAltText('Doudou')).toHaveAttribute('src', 'data:image/webp;base64,doudou-avatar');
    expect(screen.getByText('Doudou')).toBeInTheDocument();
    expect(screen.queryByText('当前对话对象：Doudou')).not.toBeInTheDocument();
  });
});
