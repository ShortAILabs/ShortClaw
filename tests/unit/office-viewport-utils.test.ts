import { describe, expect, it } from 'vitest';
import { computeOfficeViewportTransform } from '@/pages/Office/viewport-utils';

describe('computeOfficeViewportTransform', () => {
  it('caps desktop zoom at the configured maximum when space is sufficient', () => {
    const result = computeOfficeViewportTransform({
      width: 1600,
      height: 1200,
      cols: 20,
      rows: 20,
      tileSize: 16,
      minZoom: 0.45,
      maxZoom: 2.5,
      paddingPx: 4,
      topExtraTiles: 1,
      nudgeYPx: 0,
    });

    expect(result.zoom).toBe(2.5);
    expect(result.panX).toBe(0);
  });

  it('reduces desktop zoom to fit the full office when the window is small', () => {
    const result = computeOfficeViewportTransform({
      width: 700,
      height: 520,
      cols: 28,
      rows: 24,
      tileSize: 16,
      minZoom: 0.45,
      maxZoom: 2.5,
      paddingPx: 4,
      topExtraTiles: 1,
      nudgeYPx: 0,
    });

    expect(result.zoom).toBeLessThan(2.5);
    expect(result.zoom).toBeGreaterThanOrEqual(0.45);
  });

  it('applies the requested vertical nudge for mobile fitting', () => {
    const result = computeOfficeViewportTransform({
      width: 420,
      height: 680,
      cols: 20,
      rows: 20,
      tileSize: 16,
      minZoom: 0.55,
      maxZoom: 6,
      paddingPx: 2,
      topExtraTiles: 0.5,
      nudgeYPx: -10,
    });

    expect(result.panY).toBeLessThanOrEqual(0);
  });
});
