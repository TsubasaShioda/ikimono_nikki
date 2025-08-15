'use client';

import { useState, useEffect, useMemo } from 'react'; // Import useMemo
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';

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
  currentUserId: string | null;
  onDelete: (id: string) => void;
}

export default function MapComponent({ userLocation, entries, error, currentUserId, onDelete }: MapComponentProps) {
  // Fix for default marker icon issue with Webpack - runs only on client
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

  // Define custom icons for my posts and other posts
  const myPostIcon = useMemo(() => {
    return new L.Icon({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }, []);

  const otherPostIcon = useMemo(() => {
    return new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
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
          <Marker 
            key={entry.id} 
            position={[entry.latitude, entry.longitude]}
            icon={currentUserId === entry.userId ? myPostIcon : otherPostIcon} // Conditional icon
          >
            <Popup>
              <div className="font-sans">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{entry.title}</h3>
                {entry.imageUrl && (
                  <img src={entry.imageUrl} alt={entry.title} className="w-full h-32 object-cover rounded-md mb-2" />
                )}
                {/* Conditionally display description and public status */}
                {entry.isPublic ? ( // If public, show all details
                  <>
                    <p className="text-gray-700 text-sm mb-1">{entry.description || '説明なし'}</p>
                    <p className="text-gray-500 text-xs">発見日時: {new Date(entry.takenAt).toLocaleString()}</p>
                    <p className="text-gray-500 text-xs">公開: {entry.isPublic ? 'はい' : 'いいえ'}</p>
                  </>
                ) : ( // If private, show limited details (only title and image are already shown above)
                  <p className="text-gray-500 text-xs">非公開</p>
                )}
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