import { describe, expect, it } from 'vitest';
import { resolveOfficeAgentChipAvatarSrc } from '@/pages/Office/avatar-utils';

describe('resolveOfficeAgentChipAvatarSrc', () => {
  it('returns the direct agent avatar when available', () => {
    const avatarById = new Map([
      ['huahua', 'data:image/webp;base64,huahua'],
    ]);

    expect(resolveOfficeAgentChipAvatarSrc('huahua', avatarById)).toBe('data:image/webp;base64,huahua');
  });

  it('falls back to the parent agent avatar for temp workers', () => {
    const avatarById = new Map([
      ['huahua', 'data:image/webp;base64,huahua'],
    ]);

    expect(resolveOfficeAgentChipAvatarSrc('subagent:huahua:task-1', avatarById)).toBe('data:image/webp;base64,huahua');
  });

  it('returns null when neither direct nor parent avatar exists', () => {
    const avatarById = new Map<string, string | null>();

    expect(resolveOfficeAgentChipAvatarSrc('qiuqiu', avatarById)).toBeNull();
    expect(resolveOfficeAgentChipAvatarSrc('subagent:qiuqiu:task-1', avatarById)).toBeNull();
  });
});
