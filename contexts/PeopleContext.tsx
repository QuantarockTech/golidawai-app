import { useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  deleteEmergency,
  deleteMember,
  fetchEmergency,
  fetchFamily,
  pushEmergency,
  pushMember,
  pushMissingMembers,
} from "@/lib/sync";

const FAMILY_KEY = "golidawayi.family";
const EMERGENCY_KEY = "golidawayi.emergencyContact";

type PeopleContextValue = {
  family: FamilyMember[];
  addMember: (member: Omit<FamilyMember, "id">) => void;
  updateMember: (id: string, member: Omit<FamilyMember, "id">) => void;
  removeMember: (id: string) => void;
  emergency: EmergencyContact | null;
  saveEmergency: (contact: EmergencyContact) => void;
  clearEmergency: () => void;
  /** False until storage has been read, so no screen flashes "nobody yet". */
  isLoaded: boolean;
};

const PeopleContext = createContext<PeopleContextValue | null>(null);

const isMember = (value: unknown): value is FamilyMember => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<FamilyMember>;
  return typeof candidate.id === "string" && typeof candidate.name === "string";
};

const isContact = (value: unknown): value is EmergencyContact => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<EmergencyContact>;
  return (
    typeof candidate.name === "string" && typeof candidate.phone === "string"
  );
};

/**
 * Minted on the device so a row exists the instant it is typed.
 *
 * No crypto module for this: it has to tell six names apart on one account,
 * not resist anyone guessing it. Being generated here rather than by Postgres
 * is what lets a member be added with no network round trip and keep the same
 * id when it syncs.
 */
const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * The people an order is for, and the person to ring if it goes wrong.
 *
 * Device first, server second, like the address and the order history. The
 * copy on the phone is what the screens read — instant, and readable with no
 * signal — and Supabase is what stops the list dying with the handset or
 * having to be retyped on a laptop.
 *
 * Reaches the pharmacy only inside a WhatsApp message the customer sends.
 */
export function PeopleProvider({ children }: React.PropsWithChildren) {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [emergency, setEmergency] = useState<EmergencyContact | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let members: FamilyMember[] = [];
      let contact: EmergencyContact | null = null;

      try {
        const [rawFamily, rawContact] = await Promise.all([
          AsyncStorage.getItem(FAMILY_KEY),
          AsyncStorage.getItem(EMERGENCY_KEY),
        ]);

        if (rawFamily) {
          const parsed: unknown = JSON.parse(rawFamily);
          if (Array.isArray(parsed)) members = parsed.filter(isMember);
        }

        if (rawContact) {
          const parsed: unknown = JSON.parse(rawContact);
          if (isContact(parsed)) contact = parsed;
        }
      } catch {
        // Unreadable or corrupt: start empty rather than block the screen.
      }

      if (cancelled) return;

      setFamily(members);
      setEmergency(contact);
      setIsLoaded(true);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Reconciles both lists with the account once Clerk knows who is signed in.
   *
   * The family list is a union by id rather than a replacement: a phone that
   * added someone while offline has a row the account has never seen, and that
   * goes up rather than being dropped in favour of the server's view. A read
   * that fails changes nothing at all — an empty list would look like a family
   * somebody had deleted.
   *
   * The emergency contact is one row, so the server's copy wins when there is
   * one and the device's goes up when there is not. That is the migration for
   * anyone who saved a contact before this synced anywhere.
   */
  useEffect(() => {
    if (!userId || !isLoaded) return;

    let cancelled = false;

    const reconcile = async () => {
      const [remoteFamily, remoteContact] = await Promise.all([
        fetchFamily(userId),
        fetchEmergency(userId),
      ]);

      if (cancelled) return;

      if (remoteFamily) {
        setFamily((current) => {
          const byId = new Map(current.map((member) => [member.id, member]));
          for (const member of remoteFamily) byId.set(member.id, member);

          const merged = [...byId.values()];
          void AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(merged)).catch(
            () => {},
          );
          void pushMissingMembers(userId, current, remoteFamily);
          return merged;
        });
      }

      setEmergency((current) => {
        if (remoteContact) {
          void AsyncStorage.setItem(
            EMERGENCY_KEY,
            JSON.stringify(remoteContact),
          ).catch(() => {});
          return remoteContact;
        }

        if (current) void pushEmergency(userId, current);
        return current;
      });
    };

    void reconcile();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isLoaded]);

  /*
   * Written from inside the updater rather than beside it, so the list that
   * reaches storage is the one React just computed. Writing `family` from the
   * closure instead would save the version from before the change.
   */
  const persist = (next: FamilyMember[]) => {
    void AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(next)).catch(() => {});
    return next;
  };

  const addMember = useCallback(
    (member: Omit<FamilyMember, "id">) => {
      const created = { ...member, id: newId() };
      setFamily((current) => persist([...current, created]));
      if (userId) void pushMember(userId, created);
    },
    [userId],
  );

  const updateMember = useCallback(
    (id: string, member: Omit<FamilyMember, "id">) => {
      const updated = { ...member, id };
      setFamily((current) =>
        persist(current.map((entry) => (entry.id === id ? updated : entry))),
      );
      if (userId) void pushMember(userId, updated);
    },
    [userId],
  );

  const removeMember = useCallback(
    (id: string) => {
      setFamily((current) =>
        persist(current.filter((entry) => entry.id !== id)),
      );
      // Otherwise the next launch would pull them straight back down.
      if (userId) void deleteMember(userId, id);
    },
    [userId],
  );

  const saveEmergency = useCallback(
    (contact: EmergencyContact) => {
      setEmergency(contact);
      void AsyncStorage.setItem(EMERGENCY_KEY, JSON.stringify(contact)).catch(
        () => {},
      );
      if (userId) void pushEmergency(userId, contact);
    },
    [userId],
  );

  const clearEmergency = useCallback(() => {
    setEmergency(null);
    void AsyncStorage.removeItem(EMERGENCY_KEY).catch(() => {});
    if (userId) void deleteEmergency(userId);
  }, [userId]);

  const value = useMemo<PeopleContextValue>(
    () => ({
      family,
      addMember,
      updateMember,
      removeMember,
      emergency,
      saveEmergency,
      clearEmergency,
      isLoaded,
    }),
    [
      family,
      addMember,
      updateMember,
      removeMember,
      emergency,
      saveEmergency,
      clearEmergency,
      isLoaded,
    ],
  );

  return (
    <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>
  );
}

export function usePeople(): PeopleContextValue {
  const context = useContext(PeopleContext);

  if (!context) {
    throw new Error("usePeople must be used inside a PeopleProvider");
  }

  return context;
}

/** "Sunita — Mother, 62". One line for a list row or a message. */
export const describeMember = (member: FamilyMember): string =>
  [member.name, [member.relation, member.age].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" — ");
