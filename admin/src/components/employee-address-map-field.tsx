"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useCallback, useEffect, useRef, useState } from "react";

/** Valeur adresse + coordonnées (Firestore `employee`). */
export type EmployeeAddressValue = {
  address: string;
  addressLat: number | null;
  addressLng: number | null;
};

const DEFAULT_CENTER = { lat: 4.0511, lng: 9.7085 };

export type EmployeeAddressMapFieldLabels = {
  addressLabel: string;
  searchPlaceholder: string;
  mapHint: string;
  missingKey: string;
  loadError: string;
  clear: string;
};

type Props = {
  value: EmployeeAddressValue;
  onChange: (v: EmployeeAddressValue) => void;
  disabled?: boolean;
  labels: EmployeeAddressMapFieldLabels;
};

/**
 * Recherche Places + carte : clic ou glisser le marqueur met à jour l’adresse
 * et les coordonnées. Clé : `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` dans `.env`.
 * Remonter `key={id}` depuis le parent pour réinitialiser la carte au
 * changement d’employé.
 */
export function EmployeeAddressMapField({
  value,
  onChange,
  disabled,
  labels,
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const mapElRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [libsReady, setLibsReady] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const syncInputText = useCallback((text: string) => {
    const el = inputRef.current;
    if (el) el.value = text;
  }, []);

  const applyCoords = useCallback(
    (lat: number, lng: number, formatted?: string) => {
      if (formatted !== undefined) {
        onChangeRef.current({
          address: formatted,
          addressLat: lat,
          addressLng: lng,
        });
        syncInputText(formatted);
        return;
      }
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        const label =
          status === "OK" && results?.[0]?.formatted_address ?
            results[0].formatted_address
          : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        onChangeRef.current({
          address: label,
          addressLat: lat,
          addressLng: lng,
        });
        syncInputText(label);
      });
    },
    [syncInputText],
  );

  useEffect(() => {
    if (!apiKey) {
      setLibsReady(false);
      setLoadErr(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        setOptions({ key: apiKey, v: "weekly" });
        await importLibrary("maps");
        await importLibrary("places");
        if (!cancelled) {
          setLibsReady(true);
          setLoadErr(null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setLibsReady(false);
          setLoadErr(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    syncInputText(value.address);
  }, [value.address, syncInputText]);

  useEffect(() => {
    if (!libsReady || !apiKey || disabled) return;
    const mapEl = mapElRef.current;
    const inputEl = inputRef.current;
    if (!mapEl || !inputEl) return;

    listenersRef.current = [];

    const lat0 = value.addressLat;
    const lng0 = value.addressLng;
    const center =
      lat0 != null && lng0 != null ?
        { lat: lat0, lng: lng0 }
      : DEFAULT_CENTER;
    const zoom = lat0 != null && lng0 != null ? 14 : 6;

    const map = new google.maps.Map(mapEl, {
      center,
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapRef.current = map;

    const marker = new google.maps.Marker({
      map,
      position: center,
      draggable: true,
    });
    markerRef.current = marker;

    const ac = new google.maps.places.Autocomplete(inputEl, {
      fields: ["formatted_address", "geometry", "name"],
    });

    const pushL = (...ls: google.maps.MapsEventListener[]) => {
      listenersRef.current.push(...ls);
    };

    pushL(
      marker.addListener("dragend", () => {
        const p = marker.getPosition();
        if (!p) return;
        applyCoords(p.lat(), p.lng());
      }),
    );

    pushL(
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        marker.setPosition(e.latLng);
        applyCoords(e.latLng.lat(), e.latLng.lng());
      }),
    );

    pushL(
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const loc = place.geometry?.location;
        if (!loc) return;
        const lat = loc.lat();
        const lng = loc.lng();
        marker.setPosition(loc);
        map.panTo(loc);
        map.setZoom(14);
        const addr =
          place.formatted_address ??
          place.name ??
          `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        onChangeRef.current({ address: addr, addressLat: lat, addressLng: lng });
        syncInputText(addr);
      }),
    );

    return () => {
      for (const l of listenersRef.current) {
        l.remove();
      }
      listenersRef.current = [];
      marker.setMap(null);
      mapRef.current = null;
      markerRef.current = null;
    };
    // `value` lu au montage / quand la lib devient prête ; ne pas le mettre
    // dans les deps pour ne pas recréer la carte à chaque déplacement.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- voir ci-dessus
  }, [libsReady, apiKey, disabled, applyCoords, syncInputText]);

  if (!apiKey) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        {labels.missingKey}
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        {labels.loadError}: {loadErr}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm text-gray-700">
        {labels.addressLabel}
        <input
          ref={inputRef}
          type="text"
          disabled={disabled || !libsReady}
          placeholder={labels.searchPlaceholder}
          defaultValue={value.address}
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none disabled:opacity-60"
        />
      </label>
      <p className="text-xs text-gray-500">{labels.mapHint}</p>
      <div
        ref={mapElRef}
        className="h-[220px] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
      />
      {!libsReady ?
        <p className="text-xs text-gray-500">…</p>
      : null}
      <button
        type="button"
        disabled={disabled || !libsReady}
        onClick={() => {
          onChangeRef.current({
            address: "",
            addressLat: null,
            addressLng: null,
          });
          syncInputText("");
          const m = markerRef.current;
          const map = mapRef.current;
          if (m && map) {
            m.setPosition(DEFAULT_CENTER);
            map.panTo(DEFAULT_CENTER);
            map.setZoom(6);
          }
        }}
        className="text-sm text-gray-600 underline decoration-gray-400 hover:text-gray-900 disabled:opacity-50"
      >
        {labels.clear}
      </button>
    </div>
  );
}
