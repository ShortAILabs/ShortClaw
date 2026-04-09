import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { AgentAvatarSummary } from '@/types/agent';

interface AgentAvatarSelection {
  kind: 'default' | 'custom';
  avatarId: string;
}

const AVATAR_IMAGE_SIZE = 56;

export function AgentAvatarPicker({
  avatars,
  value,
  customPreviewSrc,
  customLabel,
  onSelectDefault,
  onSelectCustom,
}: {
  avatars: AgentAvatarSummary[];
  value: AgentAvatarSelection | null;
  customPreviewSrc?: string | null;
  customLabel: string;
  onSelectDefault: (avatarId: string) => void;
  onSelectCustom: () => void;
}) {
  return (
    <div className="space-y-2.5">
      <div role="radiogroup" aria-label="Agent avatar choices" className="flex flex-wrap gap-2">
        {avatars.map((avatar, index) => {
          const checked = value?.kind === 'default' && value.avatarId === avatar.avatarId;
          return (
            <button
              key={avatar.avatarId}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`default avatar ${index + 1} ${avatar.avatarId}`}
              onClick={() => onSelectDefault(avatar.avatarId)}
              className={cn(
                'flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border bg-background p-[3px] transition-all',
                checked
                  ? 'border-foreground shadow-sm ring-2 ring-foreground/15'
                  : 'border-black/10 dark:border-white/10 hover:border-foreground/30',
              )}
            >
              <Avatar
                src={avatar.thumbSrc}
                name={avatar.avatarId}
                size={AVATAR_IMAGE_SIZE}
                className="bg-transparent"
              />
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={value?.kind === 'custom'}
          aria-label={customLabel}
          onClick={onSelectCustom}
          className={cn(
            'flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-dashed bg-background p-[3px] text-[12px] font-medium transition-all',
            value?.kind === 'custom'
              ? 'border-foreground shadow-sm ring-2 ring-foreground/15'
              : 'border-black/15 dark:border-white/15 hover:border-foreground/30',
          )}
        >
          {customPreviewSrc ? (
            <Avatar
              src={customPreviewSrc}
              name={customLabel}
              size={AVATAR_IMAGE_SIZE}
              className="bg-transparent"
            />
          ) : (
            <span>{customLabel}</span>
          )}
        </button>
      </div>
    </div>
  );
}
