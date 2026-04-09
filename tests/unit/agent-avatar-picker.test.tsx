import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentAvatarPicker } from '@/components/agents/AgentAvatarPicker';

describe('AgentAvatarPicker', () => {
  it('renders default avatar options as full circular slots', () => {
    render(
      <AgentAvatarPicker
        avatars={[
          {
            kind: 'default',
            avatarId: 'lobster-1',
            src: 'data:image/webp;base64,aaa',
            thumbSrc: 'data:image/webp;base64,bbb',
          },
        ]}
        value={{ kind: 'default', avatarId: 'lobster-1' }}
        customLabel="Custom"
        onSelectDefault={vi.fn()}
        onSelectCustom={vi.fn()}
      />,
    );

    const radio = screen.getByRole('radio', { name: /default avatar 1 lobster-1/i });
    expect(radio).toHaveClass('h-16', 'w-16', 'overflow-hidden', 'rounded-full', 'p-[3px]');

    const image = screen.getByAltText('lobster-1');
    const avatarFrame = image.parentElement as HTMLElement;
    expect(avatarFrame.style.width).toBe('56px');
    expect(avatarFrame.style.height).toBe('56px');
    expect(avatarFrame).toHaveClass('rounded-full');
  });
});
