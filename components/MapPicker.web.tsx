import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { Map as LeafletMap } from "leaflet";
import { useEffect, useRef } from "react";
import { View } from "react-native";

import { type MapPickerProps } from "@/components/MapPicker.types";
import { colors } from "@/constants/theme";
import "@/global.css";
import "leaflet/dist/leaflet.css";

/**
 * The browser's half of the map picker.
 *
 * `react-native-maps` is Android and iOS only, and the web build is the one
 * customers actually reach first, so the browser gets Leaflet over OpenStreetMap
 * tiles instead — no key, no billing, and the same tile source the address
 * lookup already leans on.
 *
 * Leaflet owns its DOM subtree, so this mounts it once into a bare div and then
 * talks to it through the instance rather than re-rendering it. React never
 * touches the inside of that node.
 *
 * The library itself is pulled in from inside the mount effect rather than at
 * the top of the file. `web.output` is `static`, so every screen is prerendered
 * in Node first, and Leaflet reaches for `window` the moment it is evaluated —
 * a plain import takes the whole build down before a browser ever sees it.
 */
export default function MapPicker({
  latitude,
  longitude,
  onMove,
}: MapPickerProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const map = useRef<LeafletMap | null>(null);
  const shown = useRef({ latitude, longitude });

  /*
   * Held in a ref so the effect below can stay a mount-once effect. Leaflet
   * keeps the handler it was given, and re-running setup on every new closure
   * would tear the map down under the customer mid-drag.
   */
  const notify = useRef(onMove);

  useEffect(() => {
    notify.current = onMove;
  }, [onMove]);

  useEffect(() => {
    if (!host.current || map.current) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");

    /*
     * Leaflet works in zoom levels rather than the degree span native takes.
     * 17 frames roughly the same couple of hundred metres as `MAP_SPAN` does
     * there, so the two platforms open on a comparable view.
     */
    const instance = L.map(host.current, {
      center: [latitude, longitude],
      zoom: 17,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(instance);

    instance.on("moveend", () => {
      const centre = instance.getCenter();
      const { latitude: lat, longitude: lng } = shown.current;
      if (
        Math.abs(lat - centre.lat) < 1e-5 &&
        Math.abs(lng - centre.lng) < 1e-5
      ) {
        return;
      }

      shown.current = { latitude: centre.lat, longitude: centre.lng };
      notify.current(centre.lat, centre.lng);
    });

    map.current = instance;

    return () => {
      instance.remove();
      map.current = null;
    };
    // Mount once. The pin's own coordinates are followed by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const { latitude: lat, longitude: lng } = shown.current;
    if (Math.abs(lat - latitude) < 1e-5 && Math.abs(lng - longitude) < 1e-5) {
      return;
    }

    shown.current = { latitude, longitude };
    map.current?.panTo([latitude, longitude]);
  }, [latitude, longitude]);

  return (
    <View className="gd-pickmap">
      <div ref={host} style={{ width: "100%", height: "100%" }} />

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
