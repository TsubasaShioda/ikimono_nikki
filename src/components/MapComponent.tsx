'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link'; // Import Link

// Component to update map center based on user location
function MapContentUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

interface DiaryEntry {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  isPublic: boolean;
  takenAt: string;
  createdAt: string;
  userId: string;
}

interface MapComponentProps {
  userLocation: [number, number];
  entries: DiaryEntry[];
  error: string;
  currentUserId: string | null; // Added
  onDelete: (id: string) => void; // Added
}

export default function MapComponent({ userLocation, entries, error, currentUserId, onDelete }: MapComponentProps) {
  // Fix for default marker icon issue with Webpack - runs only on client
  // This needs to be done once per application load where L is available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
    }
  }, []);

  return (
    <main className="flex-grow relative">
      <MapContainer key={userLocation.toString()} center={userLocation} zoom={13} scrollWheelZoom={true} style={{ height: 'calc(100vh - 100px)', width: '100%' }}>
        <MapContentUpdater center={userLocation} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {entries.map((entry) => (
          <Marker key={entry.id} position={[entry.latitude, entry.longitude]}>
            <Popup>
              <div className="font-sans">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{entry.title}</h3>
                {entry.imageUrl && (
                  <img src={entry.imageUrl} alt={entry.title} className="w-full h-32 object-cover rounded-md mb-2" />
                )}
                <p className="text-gray-700 text-sm mb-1">{entry.description || '説明なし'}</p>
                <p className="text-gray-500 text-xs">発見日時: {new Date(entry.takenAt).toLocaleString()}</p>
                <p className="text-gray-500 text-xs">公開: {entry.isPublic ? 'はい' : 'いいえ'}</p>
                {currentUserId === entry.userId && (
                  <div className="mt-2 flex space-x-2">
                    <Link href={`/entries/edit/${entry.id}`} className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
                      編集
                    </Link>
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                    >
                      削除
                    </button>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </main>
  );
}