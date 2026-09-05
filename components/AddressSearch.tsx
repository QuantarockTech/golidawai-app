import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/global.css";
import { pressRow } from "@/lib/press";
import {
  MIN_QUERY_LENGTH,
  SEARCH_DEBOUNCE_MS,
  resolvePlace,
  searchPlaces,
  startPlaceSession,
  type PlaceSuggestion,
} from "@/lib/placeSearch";

interface AddressSearchProps {
  /** Fires with a chosen place: coordinates, plus a line to show for them. */
  onPick: (place: {
    latitude: number;
    longitude: number;
    text: string;
  }) => void;
}

/**
 * "Search for area, street name…" — the way people actually give an address.
 *
 * Worth being clear about what this replaces. The locate button asks the device
 * where it is, and on a laptop the honest answer is the middle of the city. A
 * customer, meanwhile, knows the name of their own colony perfectly well and
 * can type four letters of it. That is why the food apps put this first and the
 * crosshair second, and it is the piece this screen was missing.
 */
export default function AddressSearch({ onPick }: AddressSearchProps) {
  const { t } = useLanguage();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  /** Cleared when a suggestion is taken, so the list closes behind the choice. */
  const [picking, setPicking] = useState<string | null>(null);

  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    startPlaceSession();
    return () => inFlight.current?.abort();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      inFlight.current?.abort();
      setResults([]);
      setSearching(false);
      setSearched(false);
      return;
    }

    setSearching(true);

    const timer = setTimeout(() => {
      inFlight.current?.abort();

      const controller = new AbortController();
      inFlight.current = controller;

      void searchPlaces(trimmed, controller.signal).then((found) => {
        // A later keystroke has already taken over; its answer is the real one.
        if (inFlight.current !== controller) return;

        setResults(found);
        setSearching(false);
        setSearched(true);
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const take = async (suggestion: PlaceSuggestion) => {
    setPicking(suggestion.id);
    const place = await resolvePlace(suggestion);
    setPicking(null);

    if (!place) return;

    // The chosen line belongs in the box above the map now, not in a list the
    // customer has finished with.
    setQuery("");
    setResults([]);
    setSearched(false);
    startPlaceSession();

    onPick(place);
  };

  const empty = searched && !searching && results.length === 0;

  return (
    <View>
      <View className="gd-search gd-addr-search">
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={colors.inkFaint}
        />
        <TextInput
          className="gd-search-input"
          value={query}
          onChangeText={setQuery}
          placeholder={t("address.searchPlaceholder")}
          placeholderTextColor={colors.inkFaint}
          autoCorrect={false}
          returnKeyType="search"
        />
        {searching ? (
          <ActivityIndicator size="small" color={colors.brandDark} />
        ) : query.length > 0 ? (
          <Pressable
            onPress={() => setQuery("")}
            accessibilityRole="button"
            accessibilityLabel={t("address.searchClear")}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="close"
              size={18}
              color={colors.inkFaint}
            />
          </Pressable>
        ) : null}
      </View>

      {results.length > 0 ? (
        <View className="gd-search-results">
          {results.map((suggestion, index) => (
            <Pressable
              key={suggestion.id}
              className={
                index > 0
                  ? "gd-search-result gd-search-result-divided"
                  : "gd-search-result"
              }
              style={pressRow}
              onPress={() => void take(suggestion)}
              disabled={picking !== null}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={18}
                color={colors.inkFaint}
              />
              <View className="min-w-0 flex-1">
                <Text className="gd-search-result-title" numberOfLines={1}>
                  {suggestion.title}
                </Text>
                {suggestion.subtitle ? (
                  <Text className="gd-search-result-sub" numberOfLines={1}>
                    {suggestion.subtitle}
                  </Text>
                ) : null}
              </View>
              {picking === suggestion.id ? (
                <ActivityIndicator size="small" color={colors.brandDark} />
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {empty ? (
        <Text className="gd-search-empty">{t("address.searchNoResults")}</Text>
      ) : null}
    </View>
  );
}
