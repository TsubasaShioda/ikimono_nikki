'use client';

import { useState, useEffect, useMemo, useRef } from 'react'; // useRefをインポート
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';

// react-leaflet-drawのインポート
import { FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css'; // leaflet-drawのCSSをインポート

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
  privacyLevel: 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC';
  takenAt: string;
  createdAt: string;
  userId: string;
  user: { // Add user details to match page.tsx
    id: string;
    username: string;
    iconUrl: string | null;
  };
  likesCount: number;
  isLikedByCurrentUser: boolean;
}

interface MapComponentProps {
  userLocation: [number, number];
  entries: DiaryEntry[];
  error: string;
  currentUserId: string | null;
  onDelete: (id: string) => void;
  onLikeToggle: (id: string) => void;
  onBoundsChange: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null) => void; // 新しいプロップ
}

export default function MapComponent({ userLocation, entries, error, currentUserId, onDelete, onLikeToggle, onBoundsChange }: MapComponentProps) {
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

  const featureGroupRef = useRef<L.FeatureGroup>(null); // FeatureGroupのrefを作成

  const handleDrawCreated = (e: any) => {
    const type = e.layerType;
    const layer = e.layer;

    if (type === 'rectangle') {
      const bounds = layer.getBounds();
      onBoundsChange({
        minLat: bounds.getSouthWest().lat,
        maxLat: bounds.getNorthEast().lat,
        minLng: bounds.getSouthWest().lng,
        maxLng: bounds.getNorthEast().lng,
      });
    } else if (type === 'circle') { // 円形描画の処理を追加
      const center = layer.getLatLng();
      const radius = layer.getRadius(); // meters
      // Convert radius to degrees for approximate bounding box or pass directly to API
      // For simplicity, we'll pass center and radius to API
      onBoundsChange({
        minLat: center.lat - (radius / 111111), // Approximate degree conversion
        maxLat: center.lat + (radius / 111111),
        minLng: center.lng - (radius / (111111 * Math.cos(center.lat * Math.PI / 180))),
        maxLng: center.lng + (radius / (111111 * Math.cos(center.lat * Math.PI / 180))),
      });
    }
    
    // Clear previous drawings from the FeatureGroup
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
      featureGroupRef.current.addLayer(layer); // 描画されたレイヤーをFeatureGroupに追加
    }
  };

  const handleDrawDeleted = (e: any) => {
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
    onBoundsChange(null); // Clear bounds when drawing is deleted
  };

  return (
    <div className="h-full w-full">
      <MapContainer center={userLocation} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <MapContentUpdater center={userLocation} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FeatureGroup ref={featureGroupRef}> {/* refをFeatureGroupに渡す */}
          <EditControl
            position="topright"
            onCreated={handleDrawCreated}
            onDeleted={handleDrawDeleted}
            draw={{
              rectangle: false, // 四角形描画を無効化
              polygon: false,
              polyline: false,
              circle: true, // 円形描画を有効化
              marker: false,
              circlemarker: false,
              repeatMode: false, // これを追加
            }}
            edit={{
              edit: false, // 編集機能を無効化
              remove: true, // 削除機能を有効化
              poly: false,
              featureGroup: featureGroupRef.current || undefined, // featureGroupRefを渡す
            }}
          />
        </FeatureGroup>
        {entries.map((entry) => (
          <Marker 
            key={entry.id} 
            position={[entry.latitude, entry.longitude]}
            icon={currentUserId === entry.userId ? myPostIcon : otherPostIcon} // Conditional icon
          >
            <Popup>
              <div className="font-sans w-64">
                {/* User Info */}
                <div className="flex items-center mb-2 border-b pb-2">
                  <Link href={`/entries/user/${entry.user.id}`} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                    <img 
                      src={entry.user.iconUrl || '/default-avatar.svg'} // Use a default avatar
                      alt={entry.user.username} 
                      className="w-8 h-8 rounded-full object-cover bg-gray-200" // Added bg-gray-200 for placeholder
                    />
                    <span className="font-semibold text-gray-800">{entry.user.username}</span>
                  </Link>
                </div>

                {/* Entry Info */}
                <h3 className="text-lg font-bold text-gray-900 mb-1">{entry.title}</h3>
                {entry.imageUrl && (
                  <a href={entry.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img src={entry.imageUrl} alt={entry.title} className="w-full h-32 object-cover rounded-md mb-2 hover:opacity-90 transition-opacity" />
                  </a>
                )}
                <p className="text-gray-700 text-sm mb-2">{entry.description || '説明なし'}</p>
                <p className="text-gray-500 text-xs mb-1">発見日時: {new Date(entry.takenAt).toLocaleString()}</p>
                
                {/* Like Button */}
                <div className="mt-3 flex items-center space-x-2">
                  <button
                    onClick={() => onLikeToggle(entry.id)}
                    disabled={!currentUserId} // Disable if not logged in
                    className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors ${ 
                      entry.isLikedByCurrentUser
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    } ${!currentUserId ? 'cursor-not-allowed' : 'hover:bg-pink-600 hover:text-white'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    <span>{entry.likesCount}</span>
                  </button>
                </div>

                {/* Action Buttons for Owner */}
                {currentUserId === entry.userId && (
                  <div className="mt-3 flex space-x-2">
                    <Link href={`/entries/edit/${entry.id}`} className="px-3 py-1 bg-indigo-600 rounded-md text-sm hover:bg-indigo-700">
                      <span className="text-white">編集</span>
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
    </div>
  );
}