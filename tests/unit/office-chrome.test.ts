import { describe, expect, it } from 'vitest';

import {
  getOfficeChromeButtonClass,
  getOfficeModalOverlayClass,
  getOfficeModalPanelClass,
} from '@/pages/Office/chrome';
import { OFFICE_AGENT_CHIP_COLORS } from '@/pages/Office/chip-colors';

describe('office chrome helpers', () => {
  it('builds modal overlay classes for mobile and desktop', () => {
    expect(getOfficeModalOverlayClass(true)).toContain('items-end');
    expect(getOfficeModalOverlayClass(true)).toContain('bg-background/72');
    expect(getOfficeModalOverlayClass(false)).toContain('items-center');
    expect(getOfficeModalOverlayClass(false)).toContain('backdrop-blur-sm');
  });

  it('builds modal panel classes with theme-aware surface tokens', () => {
    const mobile = getOfficeModalPanelClass(true, 'w-[24rem]', 'max-h-[70%]');
    const desktop = getOfficeModalPanelClass(false, 'w-[24rem]', 'max-h-[70%]');

    expect(mobile).toContain('w-full');
    expect(mobile).toContain('rounded-t-[1.25rem]');
    expect(mobile).toContain('bg-background/95');
    expect(desktop).toContain('w-[24rem]');
    expect(desktop).toContain('rounded-2xl');
    expect(desktop).toContain('text-foreground');
  });

  it('builds office chrome button classes for default, active, and destructive states', () => {
    expect(getOfficeChromeButtonClass()).toContain('text-foreground/70');

    const active = getOfficeChromeButtonClass({ active: true, size: 'sm' });
    expect(active).toContain('bg-black/5');
    expect(active).toContain('dark:bg-white/10');
    expect(active).toContain('h-8');

    const destructive = getOfficeChromeButtonClass({ destructive: true, size: 'xs' });
    expect(destructive).toContain('text-destructive');
    expect(destructive).toContain('h-7');
  });

  it('keeps light theme agent chip state colors readable', () => {
    expect(OFFICE_AGENT_CHIP_COLORS.light.working.text).toBe('#166534');
    expect(OFFICE_AGENT_CHIP_COLORS.light.idle.text).toBe('#92400e');
    expect(OFFICE_AGENT_CHIP_COLORS.light.idle.background).toContain('0.2');
  });
});
