/**
 * Offline mutation queue using IndexedDB.
 * Stores failed API mutations when offline and replays them when connectivity returns.
 */

import { useState, useEffect, useCallback } from 'react';

// --- Types ---

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body: string;
  timestamp: string;
}

// --- IndexedDB helpers ---

const DB_NAME = 'cyberpong-offline';
const DB_VERSION = 1;
const STORE_NAME = 'queue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- offlineQueue singleton ---

export const offlineQueue = {
  /** Add a request to the offline queue */
  async add(request: QueuedRequest): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).add(request);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /** Get all queued requests (oldest first) */
  async getAll(): Promise<QueuedRequest[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const items = req.result as QueuedRequest[];
        items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  },

  /** Remove a single request from the queue by ID */
  async remove(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /** Clear all queued requests */
  async clear(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /** Get count of queued requests */
  async count(): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Replay all queued requests in order (oldest first).
   * Adds the auth token to each request via the provided getter.
   * Successfully replayed requests are removed from the queue.
   */
  async replay(
    getToken: () => Promise<string | null>,
  ): Promise<{ success: number; failed: number }> {
    const items = await this.getAll();
    if (items.length === 0) return { success: 0, failed: 0 };

    const token = await getToken();
    let success = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(item.url, {
          method: item.method,
          headers,
          body: item.body || undefined,
        });

        if (response.ok) {
          await this.remove(item.id);
          success++;
          console.log('[OfflineQueue] Replayed:', item.method, item.url);
        } else {
          failed++;
          console.warn('[OfflineQueue] Replay failed (server):', item.url, response.status);
        }
      } catch (err) {
        failed++;
        console.warn('[OfflineQueue] Replay failed (network):', item.url, err);
      }
    }

    console.log(`[OfflineQueue] Replay complete: ${success} success, ${failed} failed`);
    return { success, failed };
  },
};

// --- React hook ---

/**
 * React hook to track online/offline status and offline queue count.
 * Automatically replays queued mutations when coming back online.
 */
export function useOfflineStatus(): { isOnline: boolean; queueCount: number } {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [queueCount, setQueueCount] = useState(0);

  const refreshCount = useCallback(async () => {
    try {
      const count = await offlineQueue.count();
      setQueueCount(count);
    } catch {
      // IndexedDB may not be available in all contexts
    }
  }, []);

  useEffect(() => {
    // Initial count
    refreshCount();

    const handleOnline = async () => {
      setIsOnline(true);
      console.log('[OfflineQueue] Back online — replaying queue...');

      // Notify service worker to replay as well
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage('replay-queue');
      }

      // Also try replaying from the client side (with a simple no-op token getter
      // since the SW handles auth). This covers cases where the SW isn't available.
      try {
        await offlineQueue.replay(async () => null);
      } catch (err) {
        console.warn('[OfflineQueue] Client-side replay error:', err);
      }

      refreshCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('[OfflineQueue] Went offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Poll queue count periodically (covers changes made by the SW)
    const interval = setInterval(refreshCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshCount]);

  return { isOnline, queueCount };
}
