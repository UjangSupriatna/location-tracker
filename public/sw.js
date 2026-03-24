/// <reference lib="webworker" />

const CACHE_NAME = 'location-tracker-v1';
const SYNC_TAG = 'location-sync';

// Files to cache
const urlsToCache = [
  '/',
  '/manifest.json',
];

// Install event - cache files
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Background sync event
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncLocation());
  }
});

// Periodic sync for background location updates
self.addEventListener('periodicsync', (event: SyncEvent) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncLocation());
  }
});

// Function to sync location from storage
async function syncLocation() {
  try {
    const pendingData = await getPendingLocation();
    if (pendingData) {
      const response = await fetch(`/api/tracking/${pendingData.token}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: pendingData.latitude,
          longitude: pendingData.longitude,
          accuracy: pendingData.accuracy,
        }),
      });
      
      if (response.ok) {
        await clearPendingLocation();
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper functions for IndexedDB
function getPendingLocation(): Promise<{token: string, latitude: number, longitude: number, accuracy: number} | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open('LocationTrackerDB', 1);
    
    request.onerror = () => resolve(null);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingLocations'], 'readonly');
      const store = transaction.objectStore('pendingLocations');
      const getRequest = store.get('pending');
      
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => resolve(null);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('pendingLocations')) {
        db.createObjectStore('pendingLocations', { keyPath: 'id' });
      }
    };
  });
}

function clearPendingLocation(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.open('LocationTrackerDB', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingLocations'], 'readwrite');
      const store = transaction.objectStore('pendingLocations');
      store.delete('pending');
      transaction.oncomplete = () => resolve();
    };
    
    request.onerror = () => resolve();
  });
}

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Type declarations
declare const self: ServiceWorkerGlobalScope;

interface ExtendableEvent extends Event {
  waitUntil(fn: Promise<unknown>): void;
}

interface SyncEvent extends ExtendableEvent {
  tag: string;
}

interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Promise<Response | undefined> | Response | undefined): void;
}
