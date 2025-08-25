'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

// Component to handle map clicks and update coordinates
function MapClickHandler({ setLatitude, setLongitude }: { setLatitude: (lat: string) => void; setLongitude: (lng: string) => void }) {
  useMapEvents({
    click: (e) => {
      setLatitude(e.latlng.lat.toString());
      setLongitude(e.latlng.lng.toString());
    },
  });
  return null;
}

interface NewEntryMapProps {
  userLocation: [number, number];
  latitude: string;
  longitude: string;
  setLatitude: (lat: string) => void;
  setLongitude: (lng: string) => void;
}

export default function NewEntryMap({ userLocation, latitude, longitude, setLatitude, setLongitude }: NewEntryMapProps) {
  // Fix for default marker icon issue with Webpack
  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
  }, []);

  const markerPosition: [number, number] | null = latitude && longitude ? [parseFloat(latitude), parseFloat(longitude)] : null;

  return (
    <MapContainer center={userLocation} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markerPosition && (
        <Marker position={markerPosition}></Marker>
      )}
      <MapClickHandler setLatitude={setLatitude} setLongitude={setLongitude} />
    </MapContainer>
  );
}