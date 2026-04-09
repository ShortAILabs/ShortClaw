import { cn } from '@/lib/utils';

type OfficeChromeButtonOptions = {
  active?: boolean;
  destructive?: boolean;
  size?: 'xs' | 'sm' | 'md';
  shape?: 'rounded' | 'pill';
};

export const OFFICE_PANEL_CLASS = cn(
  'border border-black/10 dark:border-white/10',
  'bg-background/95 text-foreground shadow-xl backdrop-blur-sm'
);

export const OFFICE_INSET_PANEL_CLASS = cn(
  'rounded-xl border border-black/10 dark:border-white/10',
  'bg-black/[0.03] dark:bg-white/[0.04]'
);

export const OFFICE_TOOLTIP_CLASS = cn(
  'rounded-xl border border-black/10 dark:border-white/10',
  'bg-background/95 text-foreground shadow-lg backdrop-blur-sm'
);

export const OFFICE_MUTED_TEXT_CLASS = 'text-muted-foreground';
export const OFFICE_CLOSE_BUTTON_CLASS =
  'text-muted-foreground hover:text-foreground text-lg leading-none transition-colors';

export function getOfficeModalOverlayClass(isMobileViewport: boolean): string {
  return cn(
    'absolute inset-0 z-20 flex bg-background/72 dark:bg-black/60 backdrop-blur-sm',
    isMobileViewport ? 'items-end justify-center' : 'items-center justify-center'
  );
}

export function getOfficeModalPanelClass(
  isMobileViewport: boolean,
  desktopWidth = 'w-80',
  maxHeight = 'max-h-[80%]'
): string {
  return cn(
    OFFICE_PANEL_CLASS,
    maxHeight,
    'overflow-y-auto p-4 text-foreground',
    isMobileViewport
      ? cn('w-full rounded-t-[1.25rem] border-x border-t pb-6')
      : cn(desktopWidth, 'rounded-2xl')
  );
}

export function getOfficeChromeButtonClass({
  active = false,
  destructive = false,
  size = 'sm',
  shape = 'rounded',
}: OfficeChromeButtonOptions = {}): string {
  return cn(
    'inline-flex items-center justify-center border transition-colors',
    'border-black/10 dark:border-white/10',
    'bg-transparent text-foreground/70 hover:bg-black/5 hover:text-foreground',
    'dark:hover:bg-white/5',
    shape === 'pill' ? 'rounded-full' : 'rounded-lg',
    size === 'xs' && 'h-7 px-2.5 text-[11px] font-medium',
    size === 'sm' && 'h-8 px-3 text-xs font-medium',
    size === 'md' && 'h-9 px-4 text-[13px] font-medium',
    active && 'bg-black/5 text-foreground dark:bg-white/10',
    destructive &&
      'border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive'
  );
}
