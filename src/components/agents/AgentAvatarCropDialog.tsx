import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PREVIEW_SIZE = 240;
const EXPORT_SIZE = 512;

interface CropResult {
  base64: string;
  preview: string;
  fileName: string;
  mimeType: string;
}

function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to read image preview'));
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read image preview'));
    reader.readAsDataURL(file);
  });
}

export function AgentAvatarCropDialog({
  file,
  title,
  description,
  zoomLabel,
  cancelLabel,
  reselectLabel,
  applyLabel,
  dragHint,
  onClose,
  onReselect,
  onApply,
}: {
  file: File;
  title: string;
  description: string;
  zoomLabel: string;
  cancelLabel: string;
  reselectLabel: string;
  applyLabel: string;
  dragHint: string;
  onClose: () => void;
  onReselect: () => void;
  onApply: (result: CropResult) => Promise<void>;
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [imageSize, setImageSize] = useState({ width: PREVIEW_SIZE, height: PREVIEW_SIZE });
  const [saving, setSaving] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  useEffect(() => {
    let cancelled = false;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setImageSrc(null);
    setImageSize({ width: PREVIEW_SIZE, height: PREVIEW_SIZE });

    void readFileAsDataUrl(file)
      .then(async (nextImageSrc) => {
        if (cancelled) return;
        setImageSrc(nextImageSrc);
        try {
          const dimensions = await readImageDimensions(nextImageSrc);
          if (!cancelled) {
            setImageSize(dimensions);
          }
        } catch {
          if (!cancelled) {
            setImageSize({ width: PREVIEW_SIZE, height: PREVIEW_SIZE });
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setImageSize({ width: PREVIEW_SIZE, height: PREVIEW_SIZE });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  const baseScale = Math.max(PREVIEW_SIZE / imageSize.width, PREVIEW_SIZE / imageSize.height);
  const previewScale = baseScale * zoom;
  const previewWidth = imageSize.width * previewScale;
  const previewHeight = imageSize.height * previewScale;

  const handleApply = async () => {
    if (!imageSrc) return;
    setSaving(true);
    try {
      const image = new Image();
      image.src = imageSrc;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = EXPORT_SIZE;
      canvas.height = EXPORT_SIZE;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas context unavailable');
      }

      const exportScale = Math.max(EXPORT_SIZE / image.naturalWidth, EXPORT_SIZE / image.naturalHeight) * zoom;
      const drawWidth = image.naturalWidth * exportScale;
      const drawHeight = image.naturalHeight * exportScale;
      const dx = (EXPORT_SIZE - drawWidth) / 2 + (offset.x / PREVIEW_SIZE) * EXPORT_SIZE;
      const dy = (EXPORT_SIZE - drawHeight) / 2 + (offset.y / PREVIEW_SIZE) * EXPORT_SIZE;
      context.clearRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
      context.drawImage(image, dx, dy, drawWidth, drawHeight);

      const preview = canvas.toDataURL('image/webp', 0.92);
      await onApply({
        base64: preview.replace(/^data:image\/webp;base64,/, ''),
        preview,
        fileName: file.name.replace(/\.[^.]+$/, '') || 'agent-avatar',
        mimeType: 'image/webp',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/65 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl bg-[#f3f1e9] dark:bg-card shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between p-6 pb-2">
          <div>
            <h3 className="text-2xl font-serif font-normal tracking-tight text-foreground">{title}</h3>
            <p className="mt-1 text-[14px] text-foreground/70">{description}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-8 w-8 -mr-2 -mt-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative overflow-hidden rounded-full border border-black/10 dark:border-white/10 shadow-inner bg-black/5 dark:bg-white/5 cursor-grab active:cursor-grabbing"
              style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
              onMouseDown={(event) => {
                setDragging(true);
                dragStartRef.current = {
                  x: event.clientX,
                  y: event.clientY,
                  ox: offset.x,
                  oy: offset.y,
                };
              }}
              onMouseMove={(event) => {
                if (!dragging) return;
                const dx = event.clientX - dragStartRef.current.x;
                const dy = event.clientY - dragStartRef.current.y;
                setOffset({
                  x: dragStartRef.current.ox + dx,
                  y: dragStartRef.current.oy + dy,
                });
              }}
              onMouseUp={() => setDragging(false)}
              onMouseLeave={() => setDragging(false)}
            >
              <img
                src={imageSrc ?? ''}
                alt={file.name}
                draggable={false}
                className="absolute select-none max-w-none"
                style={{
                  width: previewWidth,
                  height: previewHeight,
                  left: (PREVIEW_SIZE - previewWidth) / 2 + offset.x,
                  top: (PREVIEW_SIZE - previewHeight) / 2 + offset.y,
                }}
              />
            </div>
            <p className="text-[12px] text-foreground/60">{dragHint}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground/80">{zoomLabel}</span>
              <span className="text-[12px] text-foreground/60">{zoom.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={2.5}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-6 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-full px-4">
            {cancelLabel}
          </Button>
          <Button type="button" variant="outline" onClick={onReselect} className="rounded-full px-4">
            <Upload className="h-4 w-4 mr-2" />
            {reselectLabel}
          </Button>
          <Button type="button" onClick={() => void handleApply()} disabled={saving} className="rounded-full px-4">
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {applyLabel}
              </>
            ) : (
              applyLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
