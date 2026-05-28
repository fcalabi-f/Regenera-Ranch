'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { boundsOfPotreros } from '@regenera/shared';
import type { Potrero } from '@regenera/shared';

interface Props {
  potreros: Potrero[];
  onSelect?: (p: Potrero) => void;
}

function FitToBounds({ potreros }: { potreros: Potrero[] }) {
  const map = useMap();
  useEffect(() => {
    const b = boundsOfPotreros(potreros);
    if (!b) return;
    map.fitBounds(
      L.latLngBounds(
        [b.minLat, b.minLng],
        [b.maxLat, b.maxLng],
      ),
      { padding: [40, 40] },
    );
  }, [potreros, map]);
  return null;
}

export default function PaddockMap({ potreros, onSelect }: Props) {
  const initialCenter = useMemo<[number, number]>(() => {
    if (potreros.length === 0) return [-34.6, -58.4];
    const ring = potreros[0].geometry.coordinates[0];
    const [lng, lat] = ring[0];
    return [lat, lng];
  }, [potreros]);

  return (
    <MapContainer
      center={initialCenter}
      zoom={potreros.length === 0 ? 4 : 13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='Imagery © <a href="https://www.esri.com">Esri</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
      />
      <FitToBounds potreros={potreros} />
      {potreros.map((p) => {
        const positions = p.geometry.coordinates[0].map(
          ([lng, lat]) => [lat, lng] as [number, number],
        );
        return (
          <Polygon
            key={p.id}
            positions={positions}
            pathOptions={{
              color: '#3F7B3F',
              fillColor: '#3F7B3F',
              fillOpacity: 0.25,
              weight: 2,
            }}
            eventHandlers={{
              click: () => onSelect?.(p),
            }}
          >
            <Tooltip permanent direction="center" className="!bg-white/90 !border-0 !shadow-sm !text-xs !font-semibold">
              {p.name}
            </Tooltip>
          </Polygon>
        );
      })}
    </MapContainer>
  );
}
