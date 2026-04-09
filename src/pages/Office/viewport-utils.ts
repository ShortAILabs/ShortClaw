export interface OfficeViewportInput {
  width: number;
  height: number;
  cols: number;
  rows: number;
  tileSize: number;
  minZoom: number;
  maxZoom: number;
  paddingPx: number;
  topExtraTiles: number;
  nudgeYPx: number;
}

export interface OfficeViewportTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export function computeOfficeViewportTransform({
  width,
  height,
  cols,
  rows,
  tileSize,
  minZoom,
  maxZoom,
  paddingPx,
  topExtraTiles,
  nudgeYPx,
}: OfficeViewportInput): OfficeViewportTransform {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const safeCols = Math.max(1, cols);
  const safeRows = Math.max(1, rows);
  const baseWidth = safeCols * tileSize;
  const fitWidth = Math.max(1, safeWidth - paddingPx * 2) / Math.max(1, baseWidth);
  const fitHeight =
    Math.max(1, safeHeight - paddingPx * 2) /
    Math.max(1, (safeRows + topExtraTiles) * tileSize);
  const fitZoom = Math.min(fitWidth, fitHeight);
  const zoom = Math.max(minZoom, Math.min(maxZoom, fitZoom || maxZoom));

  const mapHeight = safeRows * tileSize * zoom;
  const centerOffsetY = (safeHeight - mapHeight) / 2;
  const topExtraPx = topExtraTiles * tileSize * zoom;
  const minPanY = paddingPx + topExtraPx - centerOffsetY;
  const maxPanY = safeHeight - paddingPx - (centerOffsetY + mapHeight);
  const unclampedPanY = Math.max(minPanY, Math.min(maxPanY, nudgeYPx));
  const panY = Math.round(minPanY > maxPanY ? minPanY : unclampedPanY);

  return {
    zoom,
    panX: 0,
    panY,
  };
}
