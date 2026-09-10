import type { Href } from "expo-router";
import { useMemo } from "react";

import { QUICK_ACTIONS } from "@/constants/data";
import { useCatalogue } from "@/contexts/CatalogueContext";
import {
  LANGUAGES,
  translations,
  type TranslationKey,
} from "@/lib/i18n/translations";
import type { ReorderEntry } from "@/lib/useReorder";

export const ACTION_LABEL_KEYS: Record<QuickActionKey, TranslationKey> = {
  uploadRx: "home.action.uploadRx",
  orderMedicine: "home.action.orderMedicine",
  ambulance: "home.action.ambulance",
  doctorConsult: "home.action.doctorConsult",
  labTests: "home.action.labTests",
  insurance: "home.action.insurance",
};

/*
 * Board frames 05-07 have their own screens. Doctor Consult, Lab Tests and
 * Insurance have no board design, so they share one callback screen keyed by
 * route param rather than three invented flows.
 */
export const QUICK_ACTION_ROUTES: Record<QuickActionKey, Href> = {
  uploadRx: "/upload-prescription",
  orderMedicine: "/order-medicines",
  ambulance: "/ambulance",
  doctorConsult: "/service/doctorConsult",
  labTests: "/service/labTests",
  insurance: "/service/insurance",
};

/**
 * How many catalogue hits home shows before handing off to Order Medicines.
 *
 * Home draws its rows in a plain View rather than a FlatList, so every match
 * is a mounted row. A short query like "a" matches most of seven hundred
 * medicines, and the whole point of the dashboard is that it stays a
 * dashboard — past a screenful, "see all" is the better answer than a longer
 * list.
 */
const MAX_MEDICINE_HITS = 8;

export type ServiceHit = {
  key: QuickActionKey;
  icon: string;
  route: Href;
};

export type HomeSearch = {
  /** False when the box is empty, which is what puts the dashboard back. */
  active: boolean;
  services: ServiceHit[];
  /** Catalogue hits, capped — shaped as reorder rows so they reuse that list. */
  medicines: ReorderEntry[];
  /** Every catalogue match, not just the ones that fit on screen. */
  medicineTotal: number;
  /** Nothing matched anywhere, and the catalogue is genuinely here to say so. */
  isEmpty: boolean;
  /** The catalogue has not arrived yet, so "no match" would be a lie. */
  isLoading: boolean;
  /** The sheet could not be reached and no cache stood in for it. */
  failed: boolean;
};

/**
 * Home's search — the whole catalogue and the app's own screens.
 *
 * It used to filter the six reorder rows, which meant it could only find
 * medicines the customer had already ordered: the one search that is never
 * needed. Someone typing a medicine name wants the pharmacy's seven hundred,
 * and someone typing "lab" wants the screen that books one, so this reads both
 * and the reorder list goes back to being a list.
 */
export const useHomeSearch = (query: string): HomeSearch => {
  const { medicines, isLoading, failed } = useCatalogue();

  return useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return {
        active: false,
        services: [],
        medicines: [],
        medicineTotal: 0,
        isEmpty: false,
        isLoading,
        failed,
      };
    }

    /*
     * Matched against both dictionaries rather than the active one. The app
     * language says how a label is drawn, not what the customer types: a Hindi
     * customer typing "lab" and an English one typing "लैब" are both looking
     * for the same screen.
     */
    const services: ServiceHit[] = QUICK_ACTIONS.filter((action) => {
      const key = ACTION_LABEL_KEYS[action.key];
      return LANGUAGES.some((language) =>
        translations[language][key].toLowerCase().includes(needle),
      );
    }).map((action) => ({
      key: action.key,
      icon: action.icon,
      route: QUICK_ACTION_ROUTES[action.key],
    }));

    // Company counts as a match: a customer who knows their tablet is the
    // Cipla one should be able to find it that way, same as the order screen.
    const hits = medicines.filter(
      (med) =>
        med.name.toLowerCase().includes(needle) ||
        (med.company ?? "").toLowerCase().includes(needle),
    );

    return {
      active: true,
      services,
      medicines: hits.slice(0, MAX_MEDICINE_HITS).map((item) => ({
        kind: "catalogue" as const,
        id: item.id,
        name: item.name,
        item,
      })),
      medicineTotal: hits.length,
      isEmpty: services.length === 0 && hits.length === 0,
      isLoading,
      failed,
    };
  }, [medicines, query, isLoading, failed]);
};
