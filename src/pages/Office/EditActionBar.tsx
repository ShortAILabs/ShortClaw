import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { OFFICE_PANEL_CLASS, getOfficeChromeButtonClass } from './chrome';

interface EditActionBarProps {
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onReset: () => void;
}

export function EditActionBar({
  isDirty,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onReset,
}: EditActionBarProps) {
  const { t } = useTranslation();

  if (!isDirty && !canUndo && !canRedo) return null;

  const buttonClass = getOfficeChromeButtonClass({ size: 'xs' });

  return (
    <div
      className={cn(
        OFFICE_PANEL_CLASS,
        'absolute left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-2'
      )}
    >
      <button
        className={buttonClass}
        onClick={onUndo}
        disabled={!canUndo}
        title="Ctrl+Z"
      >
        {t('pixelOffice.undo')}
      </button>
      <button
        className={buttonClass}
        onClick={onRedo}
        disabled={!canRedo}
        title="Ctrl+Y"
      >
        {t('pixelOffice.redo')}
      </button>
      {isDirty && (
        <>
          <button
            className={getOfficeChromeButtonClass({ active: true, size: 'xs', shape: 'pill' })}
            onClick={onSave}
          >
            {t('pixelOffice.save')}
          </button>
          <button className={buttonClass} onClick={onReset}>
            {t('pixelOffice.reset')}
          </button>
        </>
      )}
    </div>
  );
}
