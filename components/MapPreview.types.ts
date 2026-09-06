/**
 * The contract both previews keep — `MapPreview.tsx` on Android and iOS,
 * `MapPreview.web.tsx` in the browser. Metro picks one at bundle time, so
 * nothing but this file is shared between them.
 */
export interface MapPreviewProps {
  /** The point to show. Both are required: there is nothing to draw without. */
  latitude: number;
  longitude: number;
  /**
   * What the point resolved to, for the screen reader. The map itself is a
   * picture as far as assistive tech is concerned, so without this the control
   * announces as "map" and nothing else.
   */
  label?: string;
}

/**
 * How tall the map sits.
 *
 * Enough to show the surrounding blocks, not so much that the address fields
 * below it fall off the bottom of a phone screen.
 */
export const PREVIEW_HEIGHT = 180;
