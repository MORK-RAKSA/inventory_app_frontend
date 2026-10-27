import { registerDeviceNotifications } from './deviceNotifications';
import { useEffect, useRef } from 'react';
import { Platform, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, CLIENT_ID, Sale } from './api';
import { useLanguage } from './i18n';
import { useToast } from './toast';

export type LiveActivityEvent = {
  id: string;
  type: 'PRODUCT_ADDED' | 'PRODUCT_UPDATED' | 'CHECKOUT' | 'SCANNER_GUN_SCAN' | 'SYSTEM';
  titleEn: string;
  titleKh: string;
  detail: string;
  createdAt: string;
  timestampMs?: number;
  clientId?: string;
  productId?: string;
  sale?: Sale;
  barcode?: string;
  scanMode?: string;
};

const LOG_KEY = 'easysell_notifications_v2';
const READ_KEY = 'easysell_notifications_read_at_v2';
const SINCE_KEY = 'easysell_notifications_since_v2';
const MAX_LOG = 200;

const recentActivityLog: LiveActivityEvent[] = [];
const notifiedEventKeys = new Set<string>();
const listeners = new Set<() => void>();
type ScannerScanListener = (barcode: string, scanMode?: string) => void;
const scannerListeners = new Set<ScannerScanListener>();

export function onRemoteScannerScan(cb: ScannerScanListener): () => void {
  scannerListeners.add(cb);
  return () => {
    scannerListeners.delete(cb);
  };
}

function emitScannerScan(barcode: string, scanMode?: string) {
  scannerListeners.forEach((cb) => {
    try {
      cb(barcode, scanMode);
    } catch {
      /* ignore */
    }
  });
}
let lastReadAt = 0;
let hydrated = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

const emit = () => listeners.forEach((cb) => cb());

function eventTime(ev: LiveActivityEvent): number {
  return ev.timestampMs || Date.parse(ev.createdAt) || 0;
}

/** Loads the stored notification history so alerts survive app restarts. */
const hydrating = (async () => {
  try {
    const [rawLog, rawRead] = await Promise.all([
      AsyncStorage.getItem(LOG_KEY),
      AsyncStorage.getItem(READ_KEY),
    ]);
    if (rawLog) {
      const saved = JSON.parse(rawLog) as LiveActivityEvent[];
      if (Array.isArray(saved)) {
        for (const ev of saved) {
          if (ev?.id && !recentActivityLog.some((x) => x.id === ev.id)) {
            recentActivityLog.push(ev);
            notifiedEventKeys.add(ev.id);
          }
        }
        recentActivityLog.sort((a, b) => eventTime(b) - eventTime(a));
        recentActivityLog.length = Math.min(recentActivityLog.length, MAX_LOG);
      }
    }
    lastReadAt = Number(rawRead) || 0;
  } catch {
    /* ignore corrupted storage */
  } finally {
    hydrated = true;
    emit();
  }
})();

function persistSoon() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    AsyncStorage.setItem(LOG_KEY, JSON.stringify(recentActivityLog)).catch(() => {});
  }, 400);
}

export function getLiveActivityLog(): LiveActivityEvent[] {
  return recentActivityLog;
}

export function subscribeLiveActivity(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Number of stored notifications newer than the last time the user opened the notification screen. */
export function getUnreadCount(): number {
  return recentActivityLog.filter((ev) => eventTime(ev) > lastReadAt).length;
}

export function markAllNotificationsRead() {
  // Guard against emit → re-render → mark-read loops when nothing is unread.
  if (getUnreadCount() === 0) return;
  lastReadAt = Date.now();
  AsyncStorage.setItem(READ_KEY, String(lastReadAt)).catch(() => {});
  emit();
}

export function clearActivityLog() {
  recentActivityLog.length = 0;
  AsyncStorage.removeItem(LOG_KEY).catch(() => {});
  emit();
}

export function isActivityHydrated(): boolean {
  return hydrated;
}

export function whenActivityHydrated(): Promise<void> {
  return hydrating;
}

export function pushActivity(ev: LiveActivityEvent) {
  if (recentActivityLog.some((x) => x.id === ev.id)) return;
  recentActivityLog.unshift(ev);
  recentActivityLog.sort((a, b) => eventTime(b) - eventTime(a));
  if (recentActivityLog.length > MAX_LOG) recentActivityLog.length = MAX_LOG;
  persistSoon();
  emit();
}

/**
 * Marks an event key as already notified on this client so the background poller
 * will not show a duplicate toast.
 */
export function markEventNotified(key: string) {
  notifiedEventKeys.add(key);
}

/**
 * Global real-time watcher mounted in Root (_layout.tsx) so BOTH the Web Portal
 * and Mobile App receive simultaneous notifications when products are added,
 * updated/restocked, or checked out across another connected device.
 *
 * Every event (including the ones this device caused) is stored in the persistent notification
 * history; only events from OTHER devices pop a banner + sound.
 */
export function LiveAlertWatcher() {
  const toast = useToast();
  const { tr } = useLanguage();
  const sinceMsRef = useRef<number>(Date.now());

  useEffect(() => {
    let active = true;
    let registered = false;

    async function checkEvents() {
      try {
        const events = await api<LiveActivityEvent[]>(
          `/events?since=${sinceMsRef.current}`
        );
        if (!registered) { registered = true; void registerDeviceNotifications().catch(() => { registered = false; }); }
        if (!active || !Array.isArray(events) || events.length === 0) return;

        const sorted = [...events].sort(
          (a, b) => (a.timestampMs || 0) - (b.timestampMs || 0)
        );

        for (const ev of sorted) {
          if (ev.timestampMs && ev.timestampMs > sinceMsRef.current) {
            sinceMsRef.current = ev.timestampMs;
            AsyncStorage.setItem(SINCE_KEY, String(sinceMsRef.current)).catch(() => {});
          }
          if (notifiedEventKeys.has(ev.id)) continue;
          notifiedEventKeys.add(ev.id);
          pushActivity(ev);

          // Do not fire a duplicate popup/sound on the exact same device that just performed the action
          if (ev.clientId && ev.clientId === CLIENT_ID) continue;
          if (ev.sale && notifiedEventKeys.has(`sale:${ev.sale.id}`)) continue;
          if (ev.productId && notifiedEventKeys.has(`add:${ev.productId}`)) continue;
          // Old events caught up after the app was closed go to the notification history only.
          if (Date.now() - (ev.timestampMs || 0) > 120000) continue;

          // Sound is based on acting device only: remote devices (Device B) do not play the checkout chime!
          // Remote mobile devices trigger native vibration and save to notification center.
          // Custom popups/toasts are reserved for the Web Portal.
          const isPortal = Platform.OS === 'web';

          // Real-time Mobile Scanner Gun event received
          if (ev.type === 'SCANNER_GUN_SCAN') {
            if (isPortal) {
              emitScannerScan(ev.barcode || ev.detail, ev.scanMode);
            }
            continue;
          }


          if (isPortal) {
            // Portal receives custom toast notification banner
            if (ev.type === 'CHECKOUT') {
              toast.show(`${tr(ev.titleEn, ev.titleKh)} · ${ev.detail}`, {
                title: tr('New sale on another device', 'មានការលក់ថ្មីពីឧបករណ៍ផ្សេង'),
                tone: 'success',
                duration: 6000,
              });
            } else if (ev.type === 'PRODUCT_ADDED') {
              toast.show(`${tr(ev.titleEn, ev.titleKh)} (${ev.detail})`, {
                title: tr('Product added elsewhere', 'មានទំនិញថ្មីបន្ថែម'),
                tone: 'success',
                duration: 5000,
              });
            } else if (ev.type === 'PRODUCT_UPDATED') {
              toast.show(`${tr(ev.titleEn, ev.titleKh)} (${ev.detail})`, {
                title: tr('Product updated elsewhere', 'មានការកែទំនិញ'),
                tone: 'info',
                duration: 4500,
              });
            }
          }
        }
      } catch {
        // Ignore transient network or 404 errors on older backends
      }
    }

    (async () => {
      // Resume from the last event this device saw, so alerts that arrived while the app was
      // closed are still delivered and stored when it opens again.
      await whenActivityHydrated();
      try {
        const saved = Number(await AsyncStorage.getItem(SINCE_KEY));
        if (saved > 0) sinceMsRef.current = Math.min(sinceMsRef.current, saved);
      } catch {
        /* ignore */
      }
      if (!active) return;
      void checkEvents();
    })();

    const timer = setInterval(() => {
      void checkEvents();
    }, Platform.OS === 'web' ? 1200 : 4000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [toast, tr]);

  return null;
}
