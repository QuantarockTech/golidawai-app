/**
 * The contract both halves keep — `PrintableOrder.web.tsx` renders a sheet the
 * browser can print, and `PrintableOrder.tsx` renders nothing at all, because
 * there is no print dialog on a phone.
 */
export interface PrintableOrderProps {
  order: SentOrder;
  /** Who the medicines were for, when it was not the customer themselves. */
  patientText?: string;
}
