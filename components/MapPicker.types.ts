/**
 * The contract both map pickers keep — `MapPicker.tsx` on Android and iOS,
 * `MapPicker.web.tsx` in the browser. Metro picks one at bundle time, so
 * nothing but this file is shared between them.
 */
export interface MapPickerProps {
  /** Where the pin starts. Usually whatever GPS last guessed. */
  latitude: number;
  longitude: number;
  /**
   * Fires when the customer has finished moving the map, not while they drag.
   * Reverse geocoding is rate-limited, so the caller must be able to trust that
   * this is a settled answer rather than a frame of an animation.
   */
  onMove: (latitude: number, longitude: number) => void;
}

/**
 * How far the map looks either side of the pin, in degrees.
 *
 * Roughly 250 m: close enough that individual buildings are distinguishable,
 * wide enough that a bad GPS fix is still somewhere on screen and the customer
 * can drag towards home rather than hunting for it.
 */
export const MAP_SPAN = 0.0045;
