'use client';
import styles from './MapComponent.module.css';

import { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';
import Image from 'next/image';

// This component handles view changes from props
function MapViewUpdater({ center, zoom, flyToCoords }: { center: [number, number], zoom: number, flyToCoords: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (flyToCoords) {
      map.flyTo(flyToCoords, 10);
    } else {
      // Only set view if it's different from the map's current state to avoid conflicts
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      if (currentCenter.lat !== center[0] || currentCenter.lng !== center[1] || currentZoom !== zoom) {
        map.setView(center, zoom);
      }
    }
  }, [center, zoom, flyToCoords]);

  return null;
}

// Custom hook to handle map events for saving state
function MapStateSaver({ onMapViewChange }: { onMapViewChange: (view: { center: [number, number], zoom: number }) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onMapViewChange({ center: [center.lat, center.lng], zoom: map.getZoom() });
    },
    zoomend: () => {
      const center = map.getCenter();
      onMapViewChange({ center: [center.lat, center.lng], zoom: map.getZoom() });
    },
  });
  return null;
}

// Custom hook to handle map events and update bounds for search
function MapBoundsHandler({ onBoundsChange }: { onBoundsChange: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange({
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),
        maxLng: bounds.getEast(),
      });
    },
  });
  return null;
}

interface DiaryEntry {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  privacyLevel: 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC' | 'PUBLIC_ANONYMOUS';
  takenAt: string;
  createdAt: string;
  userId: string;
  user: {
    id: string;
    username: string;
    iconUrl: string | null;
  };
  likesCount: number;
  commentsCount: number; // Add commentsCount
  isLikedByCurrentUser: boolean;
  isFriend: boolean;
}

interface MapComponentProps {
  center: [number, number];
  zoom: number;
  flyToCoords: [number, number] | null;
  entries: DiaryEntry[];
  currentUserId: string | null;
  onDelete: (id: string) => void;
  onLikeToggle: (id: string) => void;
  onBoundsChange: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null) => void;
  onMapViewChange: (view: { center: [number, number], zoom: number }) => void;
  onHideEntry: (entryId: string) => void;
  onHideUser: (userId: string) => void;
  onOpenBookmarkModal: (diaryEntryId: string) => void;
}

export default function MapComponent({ center, zoom, flyToCoords, entries, currentUserId, onDelete, onLikeToggle, onBoundsChange, onMapViewChange, onHideEntry, onHideUser, onOpenBookmarkModal }: MapComponentProps) {
  const [hidingMenuEntryId, setHidingMenuEntryId] = useState<string | null>(null);
  const popupRef = useRef<L.Popup>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-expect-error Leaflet's type definition is missing _getIconUrl, but it's needed for image icons to work correctly.
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
    }
  }, []);

  useEffect(() => {
    if (popupRef.current) {
      popupRef.current.on('remove', () => {
        setHidingMenuEntryId(null);
      });
    }
  }, [popupRef]);

  const myPostIcon = useMemo(() => new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png', iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }), []);
  const publicPostIcon = useMemo(() => new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png', iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }), []);
  const friendsOnlyPostIcon = useMemo(() => new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png', iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png', shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }), []);
  const otherPostIcon = useMemo(() => new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png', iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }), []);

  const getMarkerIcon = useCallback((entry: DiaryEntry) => {
    if (currentUserId === entry.userId) return myPostIcon;
    if (entry.privacyLevel === 'PUBLIC' || entry.privacyLevel === 'PUBLIC_ANONYMOUS') return publicPostIcon;
    if (entry.privacyLevel === 'FRIENDS_ONLY' && entry.isFriend) return friendsOnlyPostIcon;
    return otherPostIcon;
  }, [currentUserId, myPostIcon, publicPostIcon, friendsOnlyPostIcon, otherPostIcon]);

  const handleHideEntry = async (entryId: string) => {
    if (window.confirm('この投稿を非表示にしますか？非表示にした投稿はフレンド管理ページから再表示できます。')) {
      try {
        const res = await fetch('/api/hidden-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entryId }),
        });
        if (res.ok) {
          onHideEntry(entryId);
          setHidingMenuEntryId(null);
        } else {
          alert('投稿の非表示に失敗しました。');
        }
      } catch (error) {
        alert('エラーが発生しました。');
      }
    }
  };

  const handleHideUser = async (userId: string, username: string) => {
    if (window.confirm(`${username}さんのすべての投稿を非表示にしますか？非表示にしたユーザーはフレンド管理ページから再表示できます。`)) {
      try {
        const res = await fetch('/api/hidden-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hiddenUserId: userId }),
        });
        if (res.ok) {
          onHideUser(userId);
          setHidingMenuEntryId(null);
        } else {
          alert('ユーザーの非表示に失敗しました。');
        }
      } catch (error) {
        alert('エラーが発生しました。');
      }
    }
  };

  return (
    <div className="h-full w-full">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <MapViewUpdater center={center} zoom={zoom} flyToCoords={flyToCoords} />
        <MapStateSaver onMapViewChange={onMapViewChange} />
        <MapBoundsHandler onBoundsChange={onBoundsChange} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {entries.map((entry) => (
          <Marker 
            key={entry.id} 
            position={[entry.latitude, entry.longitude]}
            icon={getMarkerIcon(entry)}
          >
            <Popup ref={popupRef}>
              <div className="font-sans w-64">
                <div className="flex items-center justify-between mb-2 border-b pb-2">
                  <Link href={`/entries/user/${entry.user.id}`} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                    <Image 
                      src={entry.user.iconUrl || '/default-avatar.svg'}
                      alt={entry.user.username} 
                      width={32} 
                      height={32} 
                      className="rounded-full object-cover bg-gray-200"
                    />
                    <span className="font-semibold text-gray-800">{entry.user.username}</span>
                  </Link>
                  {currentUserId && currentUserId !== entry.userId && (
                    <div className="relative">
                      <button onClick={() => setHidingMenuEntryId(hidingMenuEntryId === entry.id ? null : entry.id)} className="p-1 rounded-full hover:bg-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      {hidingMenuEntryId === entry.id && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 ring-1 ring-black ring-opacity-5">
                          <div className="py-1">
                            <button onClick={() => handleHideEntry(entry.id)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">この投稿を非表示</button>
                            <button onClick={() => handleHideUser(entry.user.id, entry.user.username)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{entry.user.username}さんの投稿をすべて非表示</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1">{entry.title}</h3>
                {entry.imageUrl && (
                  <a href={entry.imageUrl} target="_blank" rel="noopener noreferrer">
                    <Image src={entry.imageUrl} alt={entry.title} width={256} height={128} className="object-cover rounded-md mb-2 hover:opacity-90 transition-opacity" />
                  </a>
                )}
                <p className="text-gray-700 text-sm mb-2 line-clamp-3">{entry.description || '説明なし'}</p>
                <p className="text-gray-500 text-xs mb-1">発見日時: {new Date(entry.takenAt).toLocaleString()}</p>
                
                <div className="mt-3 flex items-center space-x-2 flex-wrap gap-y-2">
                  <button
                    onClick={() => onLikeToggle(entry.id)}
                    disabled={!currentUserId}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs transition-colors ${ 
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

                  <button
                    onClick={() => onOpenBookmarkModal(entry.id)}
                    disabled={!currentUserId}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs transition-colors bg-gray-200 text-gray-700 ${!currentUserId ? 'cursor-not-allowed' : 'hover:bg-yellow-400'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.125L5 18V4z" />
                    </svg>
                    <span>アルバム</span>
                  </button>

                  <Link href={`/entries/${entry.id}`} className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs transition-colors bg-gray-200 text-gray-700 hover:bg-blue-200">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.94 8.94 0 01-4.113-.974L3.5 17.555a1 1 0 01-1.44-1.329l.96-1.388A7.962 7.962 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM4.583 14.042a6.002 6.002 0 0011.834 0H4.583z" clipRule="evenodd" />
                    </svg>
                    <span>{entry.commentsCount}</span>
                  </Link>
                </div>

                {currentUserId === entry.userId && (
                  <div className="mt-3 flex space-x-2 border-t pt-3">
                    <Link href={`/entries/edit/${entry.id}`} className={styles.tapeButton}>
                      編集
                    </Link>
                    <button
                      onClick={() => onDelete(entry.id)}
                      className={`${styles.tapeButton} ${styles.tapeButtonDelete}`}
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
