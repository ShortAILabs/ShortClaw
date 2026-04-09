import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from '@/pages/Chat/ChatMessage';

describe('ChatMessage agent avatar', () => {
  it('renders the agent avatar for assistant messages', () => {
    render(
      <ChatMessage
        message={{ role: 'assistant', content: 'Hello from Research' }}
        showThinking={false}
        assistantAvatarSrc="data:image/webp;base64,avatar123"
        assistantName="Research"
      />,
    );

    expect(screen.getByAltText('Research')).toHaveAttribute('src', 'data:image/webp;base64,avatar123');
  });

  it('does not render the agent avatar for user messages', () => {
    render(
      <ChatMessage
        message={{ role: 'user', content: 'Hello' }}
        showThinking={false}
        assistantAvatarSrc="data:image/webp;base64,avatar123"
        assistantName="Research"
      />,
    );

    expect(screen.queryByAltText('Research')).not.toBeInTheDocument();
  });
});
