import { useMemo } from "react";

import { REORDER_ITEMS } from "@/constants/data";
import { useCatalogue } from "@/contexts/CatalogueContext";
import { useOrders } from "@/contexts/OrdersContext";

/**
 * One row of the reorder list.
 *
 * Two shapes because a past order holds two kinds of thing. A catalogue
 * medicine can go straight back into the cart; one the customer typed has no
 * id, no strip size and no catalogue entry, so it goes back where it came
 * from — the typed list the pharmacy prices by hand.
 */
export type ReorderEntry =
  | { kind: "catalogue"; id: string; name: string; item: ReorderItem }
  | { kind: "typed"; id: string; name: string };

/** How many past medicines are worth offering before the list becomes a list. */
const MAX_ENTRIES = 6;


/**
 * What this customer has actually ordered, newest first.
 *
 * The home screen used to offer the same six medicines to everyone, which is a
 * reasonable guess and never right: a reorder list is only useful if it holds
 * the things the person reading it actually takes. History is stored on the
 * device already, so this reads it rather than guessing.
 *
 * `fromHistory` is false when there is nothing to read yet. A first-time
 * customer gets the old static list, which is honest as a suggestion as long as
 * the heading above it does not claim they ordered any of it.
 */
export const useReorder = (): {
  entries: ReorderEntry[];
  fromHistory: boolean;
} => {
  const { orders } = useOrders();
  const { medicines } = useCatalogue();

  return useMemo(() => {
    /*
     * Rebuilt whenever the sheet lands, rather than once at module load as it
     * was when the catalogue was a constant. A past order holds an id, and only
     * the catalogue can turn that back into something the cart will accept.
     */
    const catalogue = new Map<string, ReorderItem>(
      [...medicines, ...REORDER_ITEMS].map((item) => [item.id, item]),
    );

    const entries: ReorderEntry[] = [];
    const seen = new Set<string>();

    const push = (entry: ReorderEntry) => {
      // Newest wins: orders arrive newest first, so the first sighting of a
      // medicine is the most recent time it was ordered.
      const key = entry.name.trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      entries.push(entry);
    };

    for (const order of orders) {
      for (const line of order.lines) {
        const item = catalogue.get(line.id);
        // A medicine that has since left the catalogue can still be named, but
        // it can no longer be priced or put in a cart, so it is offered as a
        // typed request instead of dropped.
        push(
          item
            ? { kind: "catalogue", id: item.id, name: item.name, item }
            : { kind: "typed", id: `typed:${line.name}`, name: line.name },
        );
      }

      for (const typed of order.typedItems) {
        push({ kind: "typed", id: `typed:${typed.name}`, name: typed.name });
      }

      if (entries.length >= MAX_ENTRIES) break;
    }

    if (entries.length > 0) {
      return { entries: entries.slice(0, MAX_ENTRIES), fromHistory: true };
    }

    return {
      entries: REORDER_ITEMS.map((item) => ({
        kind: "catalogue" as const,
        id: item.id,
        name: item.name,
        item,
      })),
      fromHistory: false,
    };
  }, [orders, medicines]);
};
