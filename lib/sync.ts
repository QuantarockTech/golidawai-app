import { isSupabaseConfigured, supabase } from "@/lib/supabase";

/**
 * Reading and writing the two things that have to follow a customer.
 *
 * Everything here is best-effort. A failed read leaves whatever is cached on
 * the device on screen, and a failed write leaves the device copy as the record
 * — losing an address to a dropped connection would be worse than showing a
 * slightly old one. The contexts above treat the device as the source of truth
 * for reads and this as the copy that outlives the phone.
 *
 * Every function returns null or false rather than throwing, because none of
 * them is worth interrupting a customer over.
 */

/* ------------------------------------------------------------- addresses */

type AddressRow = {
  user_id: string;
  text: string;
  area: string | null;
  flat: string | null;
  building: string | null;
  landmark: string | null;
  label: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  source: string;
  saved_at: string;
};

/** Drops the nulls Postgres returns for absent columns. */
const toAddress = (row: AddressRow): DeliveryAddress => ({
  text: row.text ?? "",
  ...(row.area ? { area: row.area } : {}),
  ...(row.flat ? { flat: row.flat } : {}),
  ...(row.building ? { building: row.building } : {}),
  ...(row.landmark ? { landmark: row.landmark } : {}),
  ...(row.label ? { label: row.label as AddressLabel } : {}),
  ...(row.latitude != null ? { latitude: row.latitude } : {}),
  ...(row.longitude != null ? { longitude: row.longitude } : {}),
  ...(row.accuracy != null ? { accuracy: row.accuracy } : {}),
  source: (row.source as DeliveryAddress["source"]) ?? "manual",
  savedAt: row.saved_at ?? new Date().toISOString(),
});

export const fetchAddress = async (
  userId: string,
): Promise<DeliveryAddress | null> => {
  if (!supabase || !isSupabaseConfigured) return null;

  try {
    // maybeSingle, not single: a customer with no address yet is the normal
    // first-run case, and single() treats no rows as an error.
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return toAddress(data as AddressRow);
  } catch {
    return null;
  }
};

export const pushAddress = async (
  userId: string,
  address: DeliveryAddress,
): Promise<boolean> => {
  if (!supabase || !isSupabaseConfigured) return false;

  try {
    // One address per customer for now, so the user id is the key and this
    // replaces rather than accumulates.
    const { error } = await supabase.from("addresses").upsert(
      {
        user_id: userId,
        text: address.text,
        area: address.area ?? null,
        flat: address.flat ?? null,
        building: address.building ?? null,
        landmark: address.landmark ?? null,
        label: address.label ?? null,
        latitude: address.latitude ?? null,
        longitude: address.longitude ?? null,
        accuracy: address.accuracy ?? null,
        source: address.source,
        saved_at: address.savedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return !error;
  } catch {
    return false;
  }
};

export const deleteAddress = async (userId: string): Promise<boolean> => {
  if (!supabase || !isSupabaseConfigured) return false;

  try {
    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("user_id", userId);
    return !error;
  } catch {
    return false;
  }
};

/* ---------------------------------------------------------------- orders */

type OrderRow = {
  id: string;
  sent_at: string;
  kind: string;
  lines: OrderLine[] | null;
  typed_items: TypedItem[] | null;
  prescription_count: number;
  delivery_text: string;
  needs_pharmacist_review: boolean;
};

const toOrder = (row: OrderRow): SentOrder => ({
  id: row.id,
  sentAt: row.sent_at,
  kind: row.kind as OrderKind,
  lines: row.lines ?? [],
  typedItems: row.typed_items ?? [],
  prescriptionCount: row.prescription_count ?? 0,
  deliveryText: row.delivery_text ?? "",
  needsPharmacistReview: Boolean(row.needs_pharmacist_review),
});

export const fetchOrders = async (
  userId: string,
  limit: number,
): Promise<SentOrder[] | null> => {
  if (!supabase || !isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(limit);

    // null rather than [] on failure: an empty history and a failed read look
    // the same to a caller that cannot tell them apart, and only one of them
    // should replace what is already cached.
    if (error || !data) return null;
    return (data as OrderRow[]).map(toOrder);
  } catch {
    return null;
  }
};

export const pushOrder = async (
  userId: string,
  order: SentOrder,
): Promise<boolean> => {
  if (!supabase || !isSupabaseConfigured) return false;

  try {
    const { error } = await supabase.from("orders").upsert(
      {
        user_id: userId,
        id: order.id,
        sent_at: order.sentAt,
        kind: order.kind,
        lines: order.lines,
        typed_items: order.typedItems,
        prescription_count: order.prescriptionCount,
        delivery_text: order.deliveryText,
        needs_pharmacist_review: order.needsPharmacistReview,
      },
      { onConflict: "user_id,id" },
    );

    return !error;
  } catch {
    return false;
  }
};

/**
 * Sends up orders this device has that the server does not.
 *
 * The one-time migration for a customer who used the app before any of this
 * existed, and the repair for any order that was sent while the connection was
 * down. Ids are stable and the write is an upsert, so running it twice writes
 * the same rows twice and changes nothing.
 */
export const pushMissingOrders = async (
  userId: string,
  local: SentOrder[],
  remote: SentOrder[],
): Promise<void> => {
  const known = new Set(remote.map((order) => order.id));
  const missing = local.filter((order) => !known.has(order.id));

  for (const order of missing) {
    await pushOrder(userId, order);
  }
};

export const clearOrders = async (userId: string): Promise<boolean> => {
  if (!supabase || !isSupabaseConfigured) return false;

  try {
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("user_id", userId);
    return !error;
  } catch {
    return false;
  }
};
