import { useState, useEffect, useRef, useCallback } from 'react';

import { cn } from '@/lib/utils';
import { EditTool } from '@/lib/pixel-office/types';
import type { TileType as TileTypeVal, FloorColor } from '@/lib/pixel-office/types';
import { getCatalogByCategory, getActiveCategories } from '@/lib/pixel-office/layout/furnitureCatalog';
import type { FurnitureCategory } from '@/lib/pixel-office/layout/furnitureCatalog';
import { getCachedSprite } from '@/lib/pixel-office/sprites/spriteCache';
import {
  getColorizedFloorSprite,
  getFloorPatternCount,
  hasFloorSprites,
} from '@/lib/pixel-office/floorTiles';

import {
  OFFICE_INSET_PANEL_CLASS,
  OFFICE_MUTED_TEXT_CLASS,
  OFFICE_PANEL_CLASS,
  getOfficeChromeButtonClass,
} from './chrome';

function FloorPatternPreview({
  patternIndex,
  color,
  selected,
  onClick,
}: {
  patternIndex: number;
  color: FloorColor;
  selected: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displaySize = 32;
  const tileZoom = 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = displaySize;
    canvas.height = displaySize;
    ctx.imageSmoothingEnabled = false;
    if (!hasFloorSprites()) {
      ctx.fillStyle = '#444';
      ctx.fillRect(0, 0, displaySize, displaySize);
      return;
    }
    const sprite = getColorizedFloorSprite(patternIndex, color);
    const cached = getCachedSprite(sprite, tileZoom);
    ctx.drawImage(cached, 0, 0);
  }, [patternIndex, color]);

  return (
    <button
      onClick={onClick}
      title={`Floor ${patternIndex}`}
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border p-0 transition-colors',
        'bg-black/[0.04] hover:bg-black/[0.07] dark:bg-white/[0.05] dark:hover:bg-white/[0.09]',
        selected
          ? 'border-foreground/25 bg-black/[0.08] dark:bg-white/[0.12]'
          : 'border-black/10 dark:border-white/10'
      )}
    >
      <canvas
        ref={canvasRef}
        style={{ width: displaySize, height: displaySize, display: 'block' }}
      />
    </button>
  );
}

function ColorSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn(OFFICE_MUTED_TEXT_CLASS, 'w-4 shrink-0 text-right text-[11px] font-medium')}>
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-3 flex-1 accent-[hsl(var(--primary))]"
      />
      <span className={cn(OFFICE_MUTED_TEXT_CLASS, 'w-8 shrink-0 text-right text-[11px] font-medium')}>
        {value}
      </span>
    </div>
  );
}

const DEFAULT_FURNITURE_COLOR: FloorColor = { h: 0, s: 0, b: 0, c: 0 };

const toolbarButtonClass = getOfficeChromeButtonClass({ size: 'xs' });
const toolbarButtonActiveClass = getOfficeChromeButtonClass({
  active: true,
  size: 'xs',
});
const toolbarDangerButtonClass = getOfficeChromeButtonClass({
  destructive: true,
  size: 'xs',
});

interface EditorToolbarProps {
  activeTool: EditTool;
  selectedTileType: TileTypeVal;
  selectedFurnitureType: string;
  selectedFurnitureUid: string | null;
  selectedFurnitureColor: FloorColor | null;
  floorColor: FloorColor;
  wallColor: FloorColor;
  onToolChange: (tool: EditTool) => void;
  onTileTypeChange: (type: TileTypeVal) => void;
  onFloorColorChange: (color: FloorColor) => void;
  onWallColorChange: (color: FloorColor) => void;
  onSelectedFurnitureColorChange: (color: FloorColor | null) => void;
  onFurnitureTypeChange: (type: string) => void;
  onDeleteFurniture: () => void;
}

export function EditorToolbar({
  activeTool,
  selectedTileType,
  selectedFurnitureType,
  selectedFurnitureUid,
  selectedFurnitureColor,
  floorColor,
  wallColor,
  onToolChange,
  onTileTypeChange,
  onFloorColorChange,
  onWallColorChange,
  onSelectedFurnitureColorChange,
  onFurnitureTypeChange,
  onDeleteFurniture,
}: EditorToolbarProps) {
  const [activeCategory, setActiveCategory] = useState<FurnitureCategory>('desks');
  const [showColor, setShowColor] = useState(false);
  const [showWallColor, setShowWallColor] = useState(false);
  const [showFurnitureColor, setShowFurnitureColor] = useState(false);

  const handleColorChange = useCallback(
    (key: keyof FloorColor, value: number) => {
      onFloorColorChange({ ...floorColor, [key]: value });
    },
    [floorColor, onFloorColorChange]
  );

  const handleWallColorChange = useCallback(
    (key: keyof FloorColor, value: number) => {
      onWallColorChange({ ...wallColor, [key]: value });
    },
    [wallColor, onWallColorChange]
  );

  const effectiveColor = selectedFurnitureColor ?? DEFAULT_FURNITURE_COLOR;
  const handleSelFurnColorChange = useCallback(
    (key: keyof FloorColor, value: number) => {
      onSelectedFurnitureColorChange({ ...effectiveColor, [key]: value });
    },
    [effectiveColor, onSelectedFurnitureColorChange]
  );

  const categoryItems = getCatalogByCategory(activeCategory);
  const patternCount = getFloorPatternCount();
  const floorPatterns = Array.from({ length: patternCount }, (_, i) => i + 1);
  const thumbSize = 36;

  const isSelectActive = activeTool === EditTool.SELECT;
  const isFloorActive = activeTool === EditTool.TILE_PAINT || activeTool === EditTool.EYEDROPPER;
  const isWallActive = activeTool === EditTool.WALL_PAINT;
  const isEraseActive = activeTool === EditTool.ERASE;
  const isFurnitureActive =
    activeTool === EditTool.FURNITURE_PLACE || activeTool === EditTool.FURNITURE_PICK;

  return (
    <div
      className={cn(
        OFFICE_PANEL_CLASS,
        'absolute bottom-3 left-3 z-50 flex max-w-[min(calc(100vw-1.5rem),54rem)] flex-col-reverse gap-2 rounded-2xl p-3'
      )}
    >
      <div className="flex flex-wrap gap-2">
        <button
          className={isSelectActive ? toolbarButtonActiveClass : toolbarButtonClass}
          onClick={() => onToolChange(EditTool.SELECT)}
          title="Select / move furniture"
        >
          Select
        </button>
        <button
          className={isFloorActive ? toolbarButtonActiveClass : toolbarButtonClass}
          onClick={() => onToolChange(EditTool.TILE_PAINT)}
          title="Paint floor tiles"
        >
          Floor
        </button>
        <button
          className={isWallActive ? toolbarButtonActiveClass : toolbarButtonClass}
          onClick={() => onToolChange(EditTool.WALL_PAINT)}
          title="Paint walls"
        >
          Wall
        </button>
        <button
          className={isEraseActive ? toolbarButtonActiveClass : toolbarButtonClass}
          onClick={() => onToolChange(EditTool.ERASE)}
          title="Erase tiles"
        >
          Erase
        </button>
        <button
          className={isFurnitureActive ? toolbarButtonActiveClass : toolbarButtonClass}
          onClick={() => onToolChange(EditTool.FURNITURE_PLACE)}
          title="Place furniture"
        >
          Furniture
        </button>
      </div>

      {selectedFurnitureUid && (
        <div className="flex flex-wrap gap-2">
          <button
            className={toolbarDangerButtonClass}
            onClick={onDeleteFurniture}
            title="Delete selected furniture (Delete key)"
          >
            🗑 Delete
          </button>
        </div>
      )}

      {isFloorActive && (
        <div className="flex flex-col-reverse gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={showColor ? toolbarButtonActiveClass : toolbarButtonClass}
              onClick={() => setShowColor((value) => !value)}
              title="Adjust floor color"
            >
              Color
            </button>
            <button
              className={
                activeTool === EditTool.EYEDROPPER ? toolbarButtonActiveClass : toolbarButtonClass
              }
              onClick={() => onToolChange(EditTool.EYEDROPPER)}
              title="Pick floor pattern + color"
            >
              Pick
            </button>
          </div>
          {showColor && (
            <div className={cn(OFFICE_INSET_PANEL_CLASS, 'flex flex-col gap-2 p-3')}>
              <ColorSlider
                label="H"
                value={floorColor.h}
                min={0}
                max={360}
                onChange={(value) => handleColorChange('h', value)}
              />
              <ColorSlider
                label="S"
                value={floorColor.s}
                min={0}
                max={100}
                onChange={(value) => handleColorChange('s', value)}
              />
              <ColorSlider
                label="B"
                value={floorColor.b}
                min={-100}
                max={100}
                onChange={(value) => handleColorChange('b', value)}
              />
              <ColorSlider
                label="C"
                value={floorColor.c}
                min={-100}
                max={100}
                onChange={(value) => handleColorChange('c', value)}
              />
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {floorPatterns.map((patternIndex) => (
              <FloorPatternPreview
                key={patternIndex}
                patternIndex={patternIndex}
                color={floorColor}
                selected={selectedTileType === patternIndex}
                onClick={() => onTileTypeChange(patternIndex as TileTypeVal)}
              />
            ))}
          </div>
        </div>
      )}

      {isWallActive && (
        <div className="flex flex-col-reverse gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={showWallColor ? toolbarButtonActiveClass : toolbarButtonClass}
              onClick={() => setShowWallColor((value) => !value)}
              title="Adjust wall color"
            >
              Color
            </button>
          </div>
          {showWallColor && (
            <div className={cn(OFFICE_INSET_PANEL_CLASS, 'flex flex-col gap-2 p-3')}>
              <ColorSlider
                label="H"
                value={wallColor.h}
                min={0}
                max={360}
                onChange={(value) => handleWallColorChange('h', value)}
              />
              <ColorSlider
                label="S"
                value={wallColor.s}
                min={0}
                max={100}
                onChange={(value) => handleWallColorChange('s', value)}
              />
              <ColorSlider
                label="B"
                value={wallColor.b}
                min={-100}
                max={100}
                onChange={(value) => handleWallColorChange('b', value)}
              />
              <ColorSlider
                label="C"
                value={wallColor.c}
                min={-100}
                max={100}
                onChange={(value) => handleWallColorChange('c', value)}
              />
            </div>
          )}
        </div>
      )}

      {isFurnitureActive && (
        <div className="flex flex-col-reverse gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {getActiveCategories().map((category) => (
              <button
                key={category.id}
                className={
                  activeCategory === category.id ? toolbarButtonActiveClass : toolbarButtonClass
                }
                onClick={() => setActiveCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
            <div className="mx-1 h-4 w-px shrink-0 bg-black/10 dark:bg-white/10" />
            <button
              className={
                activeTool === EditTool.FURNITURE_PICK ? toolbarButtonActiveClass : toolbarButtonClass
              }
              onClick={() => onToolChange(EditTool.FURNITURE_PICK)}
              title="Pick furniture type"
            >
              Pick
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categoryItems.map((entry) => {
              const hasSprite = entry.sprite.length > 0;
              const isSelected = selectedFurnitureType === entry.type;
              return (
                <button
                  key={entry.type}
                  onClick={() => onFurnitureTypeChange(entry.type)}
                  title={entry.label}
                  className={cn(
                    'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border p-0 transition-colors',
                    'bg-black/[0.04] hover:bg-black/[0.07] dark:bg-white/[0.05] dark:hover:bg-white/[0.09]',
                    isSelected
                      ? 'border-foreground/25 bg-black/[0.08] dark:bg-white/[0.12]'
                      : 'border-black/10 dark:border-white/10'
                  )}
                  style={{ width: thumbSize, height: thumbSize, fontSize: hasSprite ? undefined : 20 }}
                >
                  {hasSprite ? (
                    <canvas
                      ref={(element) => {
                        if (!element) return;
                        const ctx = element.getContext('2d');
                        if (!ctx) return;
                        const cached = getCachedSprite(entry.sprite, 2);
                        const scale =
                          Math.min(thumbSize / cached.width, thumbSize / cached.height) * 0.85;
                        element.width = thumbSize;
                        element.height = thumbSize;
                        ctx.imageSmoothingEnabled = false;
                        ctx.clearRect(0, 0, thumbSize, thumbSize);
                        const drawWidth = cached.width * scale;
                        const drawHeight = cached.height * scale;
                        ctx.drawImage(
                          cached,
                          (thumbSize - drawWidth) / 2,
                          (thumbSize - drawHeight) / 2,
                          drawWidth,
                          drawHeight
                        );
                      }}
                      style={{ width: thumbSize, height: thumbSize }}
                    />
                  ) : (
                    <span>{entry.emoji ?? '?'}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedFurnitureUid && (
        <div className="flex flex-col-reverse gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={showFurnitureColor ? toolbarButtonActiveClass : toolbarButtonClass}
              onClick={() => setShowFurnitureColor((value) => !value)}
              title="Adjust selected furniture color"
            >
              Color
            </button>
            {selectedFurnitureColor && (
              <button
                className={toolbarButtonClass}
                onClick={() => onSelectedFurnitureColorChange(null)}
                title="Remove color"
              >
                Clear
              </button>
            )}
          </div>
          {showFurnitureColor && (
            <div className={cn(OFFICE_INSET_PANEL_CLASS, 'flex flex-col gap-2 p-3')}>
              {effectiveColor.colorize ? (
                <>
                  <ColorSlider
                    label="H"
                    value={effectiveColor.h}
                    min={0}
                    max={360}
                    onChange={(value) => handleSelFurnColorChange('h', value)}
                  />
                  <ColorSlider
                    label="S"
                    value={effectiveColor.s}
                    min={0}
                    max={100}
                    onChange={(value) => handleSelFurnColorChange('s', value)}
                  />
                </>
              ) : (
                <>
                  <ColorSlider
                    label="H"
                    value={effectiveColor.h}
                    min={-180}
                    max={180}
                    onChange={(value) => handleSelFurnColorChange('h', value)}
                  />
                  <ColorSlider
                    label="S"
                    value={effectiveColor.s}
                    min={-100}
                    max={100}
                    onChange={(value) => handleSelFurnColorChange('s', value)}
                  />
                </>
              )}
              <ColorSlider
                label="B"
                value={effectiveColor.b}
                min={-100}
                max={100}
                onChange={(value) => handleSelFurnColorChange('b', value)}
              />
              <ColorSlider
                label="C"
                value={effectiveColor.c}
                min={-100}
                max={100}
                onChange={(value) => handleSelFurnColorChange('c', value)}
              />
              <label
                className={cn(
                  OFFICE_MUTED_TEXT_CLASS,
                  'flex cursor-pointer items-center gap-2 text-[11px] font-medium'
                )}
              >
                <input
                  type="checkbox"
                  checked={!!effectiveColor.colorize}
                  onChange={(e) =>
                    onSelectedFurnitureColorChange({
                      ...effectiveColor,
                      colorize: e.target.checked || undefined,
                    })
                  }
                  className="accent-[hsl(var(--primary))]"
                />
                Colorize
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
