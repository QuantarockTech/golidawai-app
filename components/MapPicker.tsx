import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import MapView, { type Region } from "react-native-maps";

import { MAP_SPAN, type MapPickerProps } from "@/components/MapPicker.types";
import { colors } from "@/constants/theme";
import "@/global.css";

/**
 * The map the customer drags onto their own roof.
 *
 * This exists because reverse geocoding cannot answer the question a rider is
 * actually asking. A perfect satellite fix in Indore still resolves to a road
 * and a colony, never a door — but a customer looking at their own street from
 * above knows exactly which building is theirs, and can say so in one gesture.
 * The coordinates they leave behind are what travels to the pharmacy.
 *
 * No `provider` is set. Android has only Google Maps, so it uses it either way,
 * and leaving iOS on Apple Maps means the project needs one API key instead of
 * two.
 */
export default function MapPicker({
  latitude,
  longitude,
  onMove,
}: MapPickerProps) {
  const map = useRef<MapView>(null);

  /*
   * What the map last told us it was looking at.
   *
   * Two jobs. It stops the region change that fires on first layout from being
   * reported as if the customer had moved something, and it distinguishes a
   * coordinate the map itself produced from one that arrived from outside —
   * only the latter should drag the view somewhere new.
   */
  const shown = useRef({ latitude, longitude });

  useEffect(() => {
    const { latitude: lat, longitude: lng } = shown.current;
    // A hair under a metre. Below this the difference is float noise, not a move.
    if (Math.abs(lat - latitude) < 1e-5 && Math.abs(lng - longitude) < 1e-5) {
      return;
    }

    shown.current = { latitude, longitude };
    map.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: MAP_SPAN,
        longitudeDelta: MAP_SPAN,
      },
      350,
    );
  }, [latitude, longitude]);

  const onSettled = (region: Region) => {
    const { latitude: lat, longitude: lng } = shown.current;
    if (
      Math.abs(lat - region.latitude) < 1e-5 &&
      Math.abs(lng - region.longitude) < 1e-5
    ) {
      return;
    }

    shown.current = { latitude: region.latitude, longitude: region.longitude };
    onMove(region.latitude, region.longitude);
  };

  return (
    <View className="gd-pickmap">
      <MapView
        ref={map}
        style={{ flex: 1 }}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: MAP_SPAN,
          longitudeDelta: MAP_SPAN,
        }}
        onRegionChangeComplete={onSettled}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
      />

      <View className="gd-map-pin" pointerEvents="none">
        <View className="gd-map-pin-inner">
          <MaterialCommunityIcons
            name="map-marker"
            size={40}
            color={colors.brandDark}
          />
        </View>
      </View>
    </View>
  );
}
