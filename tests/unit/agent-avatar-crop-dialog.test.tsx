import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AgentAvatarCropDialog } from '@/components/agents/AgentAvatarCropDialog';

class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;

  readAsDataURL(_file: Blob) {
    this.result = 'data:image/png;base64,preview123';
    queueMicrotask(() => {
      this.onload?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
    });
  }
}

describe('AgentAvatarCropDialog', () => {
  beforeEach(() => {
    vi.stubGlobal('FileReader', MockFileReader);
  });

  it('renders uploaded image previews from a data url', async () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    render(
      <AgentAvatarCropDialog
        file={file}
        title="Crop Avatar"
        description="Crop it"
        zoomLabel="Zoom"
        cancelLabel="Cancel"
        reselectLabel="Reselect"
        applyLabel="Apply"
        dragHint="Drag"
        onClose={vi.fn()}
        onReselect={vi.fn()}
        onApply={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await waitFor(() => {
      expect(screen.getByAltText('avatar.png')).toHaveAttribute('src', 'data:image/png;base64,preview123');
    });
  });
});
