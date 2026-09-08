import { type PrintableOrderProps } from "@/components/PrintableOrder.types";

/**
 * Nothing, on a phone.
 *
 * There is no print dialog to render into: `window.print()` is a browser API,
 * and the Android and iOS builds hide the button that would call it. Producing
 * a PDF on a device needs expo-print, which is a native module and therefore a
 * new build — worth doing only if someone asks for it.
 *
 * Exists so the screen can import one name on every platform. See
 * PrintableOrder.web.tsx for the sheet the browser actually prints.
 */
export default function PrintableOrder(_props: PrintableOrderProps) {
  return null;
}
