import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeType } from 'expo-camera';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  ArrowRight,
  Boxes,
  CameraOff,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  ImagePlus,
  PackagePlus,
  Pencil,
  ScanLine,
  Search,
  Send,
  ShoppingBag,
  TriangleAlert,
  Wifi,
  WifiOff,
  X,
  ZoomIn,
} from 'lucide-react-native';
import { api, Product } from '../api';
import { C, khr, money } from '../theme';
import { Press } from '../motion';
import { useLanguage } from '../i18n';
import { useSounds } from '../hooks/useSounds';
import { useLiveData } from '../hooks/useLiveData';
import { canonicalBarcode, sameBarcode } from '../barcode';
import { createScanGate, holdScanGate, isDuplicateScan, rememberScan } from '../scanGate';
import { validateBarcodeRead } from '../barcodeScannerValidation';
import { decodeBarcodeFromImageUri } from '../webBarcodeScanner';
import { ProductImage } from './ProductImage';

const BARCODE_TYPES: BarcodeType[] = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'itf14',
  'codabar',
  'qr',
];

export type ScannerGunMode = 'checkout' | 'find' | 'create' | 'batch';

/** What the phone should show after a read — mirrors the Inventory find/create outcomes. */
type OutcomeStatus = 'cart' | 'found' | 'missing' | 'new' | 'queued';

interface ScanOutcome {
  id: string;
  code: string;
  mode: ScannerGunMode;
  product: Product | null;
  status: OutcomeStatus;
  title: string;
  detail: string;
  at: number;
  /** pending = shown instantly on the phone, waiting for the portal relay to answer. */
  beam: 'pending' | 'sent' | 'failed';
}

const G = {
  bg: '#0A0E1A',
  panel: '#141A2B',
  panelAlt: '#1B2338',
  border: '#2A3350',
  text: '#EEF1FA',
  muted: '#98A2BE',
  accent: '#8B5CF6',
  success: '#34D399',
  successBg: 'rgba(16, 185, 129, 0.14)',
  warn: '#FBBF24',
  warnBg: 'rgba(251, 191, 36, 0.14)',
  danger: '#F87171',
  dangerBg: 'rgba(248, 113, 113, 0.14)',
  sky: '#38BDF8',
  violet: '#A78BFA',
} as const;

const MODES: {
  key: ScannerGunMode;
  labelEn: string;
  labelKh: string;
  icon: typeof ShoppingBag;
  accent: string;
  hintEn: string;
  hintKh: string;
}[] = [
  {
    key: 'checkout',
    labelEn: 'Checkout',
    labelKh: 'គិតលុយ',
    icon: ShoppingBag,
    accent: G.success,
    hintEn: 'Adds the scanned item into the Web Portal POS cart.',
    hintKh: 'ដាក់ទំនិញដែលស្កេនចូលកន្ត្រក POS លើ Web Portal។',
  },
  {
    key: 'find',
    labelEn: 'Find',
    labelKh: 'ស្វែងរក',
    icon: Search,
    accent: G.sky,
    hintEn: 'Looks the product up like Inventory → Find, then opens it on the Portal.',
    hintKh: 'រកទំនិញដូចផ្ទាំងស្តុក → ស្វែងរក រួចបើកវានៅលើ Portal។',
  },
  {
    key: 'create',
    labelEn: 'Create',
    labelKh: 'បង្កើត',
    icon: PackagePlus,
    accent: G.violet,
    hintEn: 'Opens the product form: existing barcode → edit, new barcode → create.',
    hintKh: 'បើកទម្រង់ទំនិញ៖ បាកូដមានស្រាប់ → កែ, បាកូដថ្មី → បង្កើត។',
  },
  {
    key: 'batch',
    labelEn: 'Batch',
    labelKh: 'ដុំ',
    icon: Boxes,
    accent: G.warn,
    hintEn: 'Queues the item into the Portal batch intake list.',
    hintKh: 'បន្ថែមទំនិញចូលបញ្ជីស្តុកដុំនៅលើ Portal។',
  },
];

const OUTCOME_STYLE: Record<OutcomeStatus, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  cart: { color: G.success, bg: G.successBg, icon: ShoppingBag },
  found: { color: G.success, bg: G.successBg, icon: CheckCircle2 },
  queued: { color: G.warn, bg: G.warnBg, icon: Boxes },
  new: { color: G.violet, bg: 'rgba(167, 139, 250, 0.14)', icon: PackagePlus },
  missing: { color: G.danger, bg: G.dangerBg, icon: TriangleAlert },
};

/**
 * Full screen modal host. The body is only mounted while open so the camera, the product catalog
 * and the keep-awake lock are only active during a scanning session.
 */
export function MobileScannerGunModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {visible ? <ScannerGunBody onClose={onClose} /> : null}
    </Modal>
  );
}

function ScannerGunBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { tr } = useLanguage();
  const { playScan, playFail } = useSounds();
  // Same data source the Inventory screens use, so a scan resolves against the live catalog.
  const { products, rate } = useLiveData('products');

  const [permission, requestPermission] = useCameraPermissions({ get: false });
  const [mode, setMode] = useState<ScannerGunMode>('checkout');
  const [torch, setTorch] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<0 | 1 | 2>(1);
  const [manualCode, setManualCode] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [history, setHistory] = useState<ScanOutcome[]>([]);
  const [beamState, setBeamState] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [capturing, setCapturing] = useState(false);
  const [pickNotice, setPickNotice] = useState('');

  const pendingRead = useRef({ code: '', n: 0, at: 0 });
  const lastScanned = useRef({ code: '', at: 0 });
  /** Closed while the same barcode is still in the viewfinder, so one item is beamed exactly once. */
  const latch = useRef(createScanGate());
  const laser = useSharedValue(0);
  const flash = useSharedValue(0);

  const activeMode = MODES.find((m) => m.key === mode) || MODES[0];
  const canTorch = Platform.OS !== 'web';
  const zoomValue = zoomLevel === 0 ? 0 : zoomLevel === 1 ? 0.06 : 0.2;
  const zoomText = zoomLevel === 0 ? '1×' : zoomLevel === 1 ? '1.5×' : '2.5×';

  useEffect(() => {
    laser.value = withRepeat(
      withTiming(1, { duration: 1750, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    activateKeepAwakeAsync('scanner-gun').catch(() => {});
    return () => {
      deactivateKeepAwake('scanner-gun').catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission().catch((e) => setCameraError(String(e?.message || e || 'Camera permission denied')));
    }
  }, [permission?.granted, requestPermission]);

  const laserStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: laser.value * 168 }],
    opacity: 0.35 + laser.value * 0.6,
  }));

  const frameStyle = useAnimatedStyle(() => ({
    borderColor: flash.value > 0.5 ? G.success : flash.value < -0.5 ? G.danger : 'rgba(255,255,255,0.32)',
    backgroundColor: flash.value > 0.5 ? 'rgba(16,185,129,0.16)' : flash.value < -0.5 ? 'rgba(248,113,113,0.16)' : 'transparent',
  }));

  function pulse(kind: 'ok' | 'fail') {
    // Animated flash: 1 = success/green, -1 = fail/red, 0 = idle
    const target = kind === 'ok' ? 1 : -1;
    flash.value = withTiming(target, { duration: 90 });
    // Reset after animation completes so next scan starts fresh
    setTimeout(() => {
      flash.value = withTiming(0, { duration: 260 });
    }, 240);
  }

  /** Broadcast to the portal exactly like the hardware-gun relay: barcode + selected function. */
  const beam = useCallback(async (barcode: string, scanMode: ScannerGunMode) => {
    try {
      await api('/events/scan', {
        method: 'POST',
        body: JSON.stringify({ barcode, scanMode }),
      });
      setBeamState('ok');
      return true;
    } catch {
      setBeamState('fail');
      return false;
    }
  }, []);

  const switchMode = useCallback(
    (next: ScannerGunMode) => {
      setMode(next);
      // Tell the portal to show the matching screen immediately, before the first scan.
      void api('/events/scan', {
        method: 'POST',
        body: JSON.stringify({ barcode: '__SWITCH_MODE__', scanMode: next }),
      })
        .then(() => setBeamState('ok'))
        .catch(() => setBeamState('fail'));
    },
    []
  );

  const handleCode = useCallback(
    async (raw: string, options?: { skipLatch?: boolean }) => {
      const code = canonicalBarcode(raw);
      if (!code) return;

      const now = Date.now();
      // Controlled delay: 1500ms delay for the SAME barcode to avoid runaway duplicate scans; 400ms for DIFFERENT barcode.
      const minGap = lastScanned.current.code === code ? 1500 : 400;
      // Combined gate: prevent duplicate if either the scan-latch or the post-success cooldown is active.
      const onCooldown = isDuplicateScan(latch.current, code, now, 1500)
        || holdScanGate(latch.current, code, now, 1500)
      if (!options?.skipLatch && onCooldown) return;
      rememberScan(latch.current, code, now);
      lastScanned.current = { code, at: now };

      // Inventory parity: resolve the scanned code against the catalog by canonical barcode.
      const product = products.find((p) => sameBarcode(p.barcode, code)) || null;

      let status: OutcomeStatus;
      let title: string;
      let detail: string;

      if (mode === 'find') {
        if (product) {
          status = 'found';
          title = product.name;
          detail = `${khr(product.priceUsd * rate)} · ${product.stock} ${tr('in stock', 'ក្នុងស្តុក')}`;
        } else {
          status = 'missing';
          title = tr(`No product for ${code}`, `រកមិនឃើញទំនិញ ${code}`);
          detail = tr('Nothing in the catalog uses this barcode yet.', 'មិនទាន់មានទំនិញប្រើបាកូដនេះទេ។');
        }
      } else if (mode === 'create') {
        if (product) {
          status = 'found';
          title = tr(`${product.name} already exists`, `${product.name} មានរួចហើយ`);
          detail = tr('Portal opens the edit form for this product.', 'Portal បើកទម្រង់កែសម្រួលទំនិញនេះ។');
        } else {
          status = 'new';
          title = tr('New barcode', 'បាកូដថ្មី');
          detail = tr('Portal opens a blank product form.', 'Portal បើកទម្រង់បង្កើតទំនិញថ្មី។');
        }
      } else if (mode === 'batch') {
        if (product) {
          status = 'queued';
          title = product.name;
          detail = tr('+1 queued for batch intake', '+1 បានដាក់ក្នុងបញ្ជីស្តុកដុំ');
        } else {
          status = 'new';
          title = tr(`New barcode ${code}`, `បាកូដថ្មី ${code}`);
          detail = tr('Queued for creation in batch intake.', 'ដាក់ក្នុងបញ្ជីបង្កើតទំនិញថ្មី។');
        }
      } else {
        if (product) {
          status = 'cart';
          title = product.name;
          detail = `${khr(product.priceUsd * rate)} · ${money(product.priceUsd)} · ${tr('added to cart', 'បានចូលកន្ត្រក')}`;
        } else {
          status = 'missing';
          title = tr(`Unknown barcode ${code}`, `មិនស្គាល់បាកូដ ${code}`);
          detail = tr('Portal offers to create it from the cart toast.', 'Portal ផ្តល់ជម្រើសបង្កើតទំនិញពីកន្ត្រក។');
        }
      }

      // Show the result immediately — the network beam must never delay the scan feedback.
      const next: ScanOutcome = {
        id: `${now}-${code}-${Math.random().toString(36).slice(2, 6)}`,
        code,
        mode,
        product,
        status,
        title,
        detail,
        at: now,
        beam: 'pending',
      };
      setOutcome(next);
      setHistory((prev) => [next, ...prev].slice(0, 30));

      pulse(status === 'missing' ? 'fail' : 'ok');
      if (status === 'missing') playFail();
      else playScan();
      if (Platform.OS !== 'web') Vibration.vibrate(status === 'missing' ? [0, 60, 50, 60] : 45);

      const beamed = await beam(code, mode);
      const settled: Partial<ScanOutcome> = { beam: beamed ? 'sent' : 'failed' };
      setOutcome((prev) => (prev && prev.id === next.id ? { ...prev, ...settled } : prev));
      setHistory((prev) => prev.map((h) => (h.id === next.id ? { ...h, ...settled } : h)));
    },
    [beam, mode, playFail, playScan, products, rate, tr]
  );

  /**
   * A GTIN whose check digit verified is trusted on the first frame (instant feedback). Other
   * symbologies still require two matching frames before they are beamed.
   */
  function handleBarcodeScanned(result: { data?: string; type?: string }) {
    const raw = (result?.data || '').trim();
    if (!raw) return;
    setCameraReady(true);
    const validation = validateBarcodeRead(raw, result.type, 'camera');
    if (!validation.ok) return;

    const code = canonicalBarcode(validation.code);
    const now = Date.now();
    const p = pendingRead.current;
    if (p.code === code && now - p.at < 1200) {
      p.n += 1;
      p.at = now;
    } else {
      pendingRead.current = { code, n: 1, at: now };
    }

    // Require 2 matching frames to avoid jitter/burst reads from the camera
    const needed = 2;
    if (pendingRead.current.n >= needed) {
      pendingRead.current = { code: '', n: 0, at: 0 };
      void handleCode(code);
    }
  }

  function submitManual() {
    const raw = manualCode.trim();
    if (!raw) return;
    setManualCode('');
    const validation = validateBarcodeRead(raw, undefined, 'manual');
    // Explicit user action → always processed, even if the camera just saw the same code.
    void handleCode(validation.ok ? validation.code : raw, { skipLatch: true });
  }

  async function pickImage() {
    setPickNotice('');
    setCapturing(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      const uri = result.canceled ? null : result.assets?.[0]?.uri;
      if (!uri) return;
      if (Platform.OS !== 'web') {
        setPickNotice(
          tr(
            'Photo decoding needs the camera feed on this device — point the scanner at the barcode.',
            'ការអានពីរូបភាពត្រូវការកាមេរ៉ាផ្ទាល់ — សូមដាក់កាមេរ៉ាលើបាកូដ។'
          )
        );
        return;
      }
      const detected = await decodeBarcodeFromImageUri(uri);
      if (!detected) {
        playFail();
        setPickNotice(tr('No barcode found in that photo.', 'រកមិនឃើញបាកូដក្នុងរូបភាពនេះទេ។'));
        return;
      }
      void handleCode(detected, { skipLatch: true });
    } catch {
      playFail();
      setPickNotice(tr('Could not read that image.', 'មិនអាចអានរូបភាពបានទេ។'));
    } finally {
      setCapturing(false);
    }
  }

  function toggleTorch() {
    if (!canTorch) {
      setCameraError(
        tr(
          'Flashlight needs the native app camera — browsers cannot control the torch.',
          'ភ្លើងហ្វ្លាស់ត្រូវការកាមេរ៉ាក្នុងកម្មវិធីទូរស័ព្ទ — កម្មវិធីរុករកមិនអាចបើកវាបានទេ។'
        )
      );
      return;
    }
    setCameraError('');
    setTorch((t) => !t);
    // Force camera to re-evaluate torch after state change — some devices need a brief frame.
    if (cameraReady) {
      void setTorch((t) => !t);
    }
  }

  function openProductForm(params: { id?: string; barcode?: string }) {
    onClose();
    router.push({ pathname: '/product-form', params });
  }

  function retryBeam() {
    if (!outcome) return;
    const id = outcome.id;
    setOutcome({ ...outcome, beam: 'pending' });
    void beam(outcome.code, outcome.mode).then((ok) => {
      const settled: Partial<ScanOutcome> = { beam: ok ? 'sent' : 'failed' };
      setOutcome((prev) => (prev && prev.id === id ? { ...prev, ...settled } : prev));
      setHistory((prev) => prev.map((h) => (h.id === id ? { ...h, ...settled } : h)));
    });
  }

  const outcomeStyle = outcome ? OUTCOME_STYLE[outcome.status] : null;
  const OutcomeIcon = outcomeStyle?.icon || CheckCircle2;

  return (
    <View style={{ flex: 1, backgroundColor: G.bg }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View
        style={{
          paddingTop: Platform.OS === 'ios' ? 58 : 30,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderBottomWidth: 1,
          borderColor: G.border,
        }}
      >
        <Press
          onPress={onClose}
          accessibilityLabel="Close scanner"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: G.panelAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={19} color={G.text} />
        </Press>

        <View style={{ flex: 1 }}>
          <Text style={{ color: G.text, fontSize: 16, fontWeight: '800' }}>
            {tr('Mobile Scanner Gun', 'ម៉ាស៊ីនស្កេនទូរស័ព្ទ')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            {beamState === 'fail' ? (
              <WifiOff size={12} color={G.danger} />
            ) : (
              <Wifi size={12} color={beamState === 'ok' ? G.success : G.muted} />
            )}
            <Text
              style={{
                color: beamState === 'fail' ? G.danger : beamState === 'ok' ? G.success : G.muted,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {beamState === 'fail'
                ? tr('Portal not reached', 'មិនអាចភ្ជាប់ Portal')
                : tr('Beams live to Web Portal', 'បញ្ជូនផ្ទាល់ទៅ Web Portal')}
            </Text>
          </View>
        </View>

        <Press
          onPress={() => void pickImage()}
          accessibilityLabel="Scan a barcode photo"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: G.panelAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {capturing ? <ActivityIndicator color={G.text} size="small" /> : <ImagePlus size={18} color={G.muted} />}
        </Press>
      </View>

      {/* ── Function selector ──────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
      >
        {MODES.map((m) => {
          const selected = mode === m.key;
          const Icon = m.icon;
          return (
            <Press
              key={m.key}
              onPress={() => switchMode(m.key)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: selected ? m.accent : G.panel,
                borderWidth: 1,
                borderColor: selected ? m.accent : G.border,
              }}
            >
              <Icon size={15} color={selected ? '#0A0E1A' : G.muted} />
              <Text
                style={{
                  color: selected ? '#0A0E1A' : G.text,
                  fontSize: 12.5,
                  fontWeight: selected ? '900' : '700',
                }}
              >
                {tr(m.labelEn, m.labelKh)}
              </Text>
            </Press>
          );
        })}
      </ScrollView>
      <Text style={{ color: G.muted, fontSize: 11.5, lineHeight: 16, paddingHorizontal: 16, paddingBottom: 10 }}>
        {tr(activeMode.hintEn, activeMode.hintKh)}
      </Text>

      {/* ── Viewfinder ─────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ height: 232, borderRadius: 24, overflow: 'hidden', backgroundColor: '#000' }}>
          {permission?.granted ? (
            <CameraView
              active
              style={StyleSheet.absoluteFill}
              facing="back"
              autofocus="on"
              zoom={zoomValue}
              enableTorch={canTorch && torch}
              barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
              onBarcodeScanned={handleBarcodeScanned}
              onCameraReady={() => {
                setCameraReady(true);
                setCameraError('');
              }}
              onMountError={(e) => {
                setCameraReady(false);
                setCameraError(e.message || 'Camera unavailable');
              }}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, gap: 12 }}>
              <CameraOff size={26} color={G.muted} />
              <Text style={{ color: G.text, fontSize: 13, textAlign: 'center' }}>
                {cameraError ||
                  tr('Camera permission is required for the scanner gun.', 'ត្រូវការសិទ្ធិប្រើកាមេរ៉ាដើម្បីស្កេន។')}
              </Text>
              <Press
                onPress={() => void requestPermission().catch(() => {})}
                style={{ backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12.5 }}>
                  {tr('Allow camera', 'អនុញ្ញាតកាមេរ៉ា')}
                </Text>
              </Press>
            </View>
          )}

          {/* Aiming frame + laser */}
          {permission?.granted ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: 'absolute',
                    top: 34,
                    left: 26,
                    right: 26,
                    height: 164,
                    borderRadius: 18,
                    borderWidth: 2,
                    overflow: 'hidden',
                  },
                  frameStyle,
                ]}
              >
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      left: 8,
                      right: 8,
                      height: 2,
                      borderRadius: 2,
                      backgroundColor: activeMode.accent,
                      shadowColor: activeMode.accent,
                      shadowOpacity: 0.9,
                      shadowRadius: 8,
                    },
                    laserStyle,
                  ]}
                />
                {/* Corner brackets */}
                {[
                  { top: 6, left: 6, borderTopWidth: 3, borderLeftWidth: 3 },
                  { top: 6, right: 6, borderTopWidth: 3, borderRightWidth: 3 },
                  { bottom: 6, left: 6, borderBottomWidth: 3, borderLeftWidth: 3 },
                  { bottom: 6, right: 6, borderBottomWidth: 3, borderRightWidth: 3 },
                ].map((corner, i) => (
                  <View
                    key={i}
                    style={[
                      { position: 'absolute', width: 22, height: 22, borderColor: activeMode.accent, opacity: 0.9 },
                      corner,
                    ]}
                  />
                ))}
                {!cameraReady ? (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: G.warn, fontSize: 12, fontWeight: '800' }}>
                      {tr('Starting camera…', 'កំពុងបើកកាមេរ៉ា…')}
                    </Text>
                  </View>
                ) : null}
              </Animated.View>

              {/* Top badges */}
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 14,
                  right: 14,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: cameraReady ? G.success : G.warn,
                    }}
                  />
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.4 }}>
                    {cameraReady ? 'LIVE' : 'PAUSED'}
                  </Text>
                </View>
                {torch ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: 'rgba(251,191,36,0.9)',
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      borderRadius: 999,
                    }}
                  >
                    <Flashlight size={11} color="#0A0E1A" />
                    <Text style={{ color: '#0A0E1A', fontSize: 10, fontWeight: '900' }}>TORCH</Text>
                  </View>
                ) : null}
              </View>

              {/* Floating controls */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 12,
                  right: 12,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Press
                  onPress={toggleTorch}
                  accessibilityLabel={torch ? 'Turn flashlight off' : 'Turn flashlight on'}
                  style={[
                    roundControl,
                    torch && { backgroundColor: G.warn },
                  ]}
                >
                  {torch ? (
                    <FlashlightOff size={16} color="#0A0E1A" />
                  ) : (
                    <Flashlight size={16} color={canTorch ? '#FFFFFF' : G.danger} />
                  )}
                </Press>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Press
                    onPress={() => setZoomLevel((z) => ((z + 1) % 3) as 0 | 1 | 2)}
                    accessibilityLabel="Change camera zoom"
                    style={[roundControl, { paddingHorizontal: 12 }]}
                  >
                    <ZoomIn size={14} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' }}>{zoomText}</Text>
                  </Press>
                  <Press onPress={() => void pickImage()} accessibilityLabel="Scan from photo" style={roundControl}>
                    <ImagePlus size={15} color="#FFFFFF" />
                  </Press>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {cameraError && permission?.granted ? (
          <Text style={{ color: G.warn, fontSize: 11.5, marginTop: 8 }}>{cameraError}</Text>
        ) : null}
        {pickNotice ? (
          <Text style={{ color: G.warn, fontSize: 11.5, marginTop: 8 }}>{pickNotice}</Text>
        ) : null}
      </View>

      {/* ── Result card ────────────────────────────────────────── */}
      {outcome && outcomeStyle ? (
        <Animated.View
          key={outcome.id}
          entering={FadeInDown.duration(200)}
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            backgroundColor: G.panel,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: outcomeStyle.color,
            padding: 12,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {outcome.product ? (
              <ProductImage
                id={outcome.product.id}
                name={outcome.product.name}
                barcode={outcome.product.barcode}
                uri={outcome.product.imageUrl || undefined}
                size={44}
                allowPreview={false}
              />
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: outcomeStyle.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <OutcomeIcon size={20} color={outcomeStyle.color} />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: G.text, fontSize: 14, fontWeight: '800' }}>
                {outcome.title}
              </Text>
              <Text numberOfLines={1} style={{ color: G.muted, fontSize: 11.5, marginTop: 2 }}>
                {outcome.detail}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Text style={{ color: G.muted, fontSize: 10.5, fontFamily: 'monospace' }}>{outcome.code}</Text>
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 4,
                    backgroundColor:
                      outcome.beam === 'sent'
                        ? G.successBg
                        : outcome.beam === 'pending'
                          ? G.warnBg
                          : G.dangerBg,
                  }}
                >
                  <Text
                    style={{
                      color:
                        outcome.beam === 'sent'
                          ? G.success
                          : outcome.beam === 'pending'
                            ? G.warn
                            : G.danger,
                      fontSize: 9.5,
                      fontWeight: '800',
                      textTransform: 'uppercase',
                    }}
                  >
                    {outcome.beam === 'sent' ? 'Beamed' : outcome.beam === 'pending' ? 'Sending' : 'Not sent'}
                  </Text>
                </View>
              </View>
            </View>

            {outcome.product ? (
              <Press onPress={() => openProductForm({ id: outcome.product!.id })} style={pillBtn}>
                <Pencil size={13} color={G.text} />
              </Press>
            ) : (
              <Press onPress={() => openProductForm({ barcode: outcome.code })} style={[pillBtn, { backgroundColor: G.accent }]}>
                <ArrowRight size={15} color="#FFFFFF" />
              </Press>
            )}
          </View>

          {outcome.beam === 'pending' ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 8,
              }}
            >
              <ActivityIndicator size="small" color={G.warn} />
              <Text style={{ color: G.warn, fontSize: 11.5, fontWeight: '700' }}>
                {tr('Sending to Portal…', 'កំពុងបញ្ជូនទៅ Portal…')}
              </Text>
            </View>
          ) : outcome.beam === 'failed' ? (
            <Press
              onPress={retryBeam}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: G.dangerBg,
                borderWidth: 1,
                borderColor: G.danger,
              }}
            >
              <WifiOff size={14} color={G.danger} />
              <Text style={{ color: G.danger, fontSize: 12, fontWeight: '800' }}>
                {tr('Retry beam to Portal', 'ព្យាយាមបញ្ជូនទៅ Portal ម្តងទៀត')}
              </Text>
            </Press>
          ) : outcome.status === 'new' || outcome.status === 'missing' ? (
            <Press
              onPress={() => openProductForm({ barcode: outcome.code })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: G.accent,
              }}
            >
              <PackagePlus size={14} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                {tr('Create this product', 'បង្កើតទំនិញនេះ')}
              </Text>
            </Press>
          ) : null}
        </Animated.View>
      ) : null}

      {/* ── Manual entry ───────────────────────────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: G.panel,
          marginHorizontal: 16,
          marginTop: 12,
          borderRadius: 12,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: G.border,
          gap: 8,
        }}
      >
        <ScanLine size={16} color={G.muted} />
        <TextInput
          value={manualCode}
          onChangeText={setManualCode}
          onSubmitEditing={submitManual}
          placeholder={tr('Type a barcode…', 'វាយបញ្ចូលបាកូដ…')}
          placeholderTextColor={G.muted}
          keyboardType="default"
          returnKeyType="send"
          style={{ flex: 1, paddingVertical: 10, color: G.text, fontSize: 13.5 }}
        />
        <Press
          onPress={submitManual}
          style={{ backgroundColor: G.accent, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 }}
        >
          <Send size={14} color="#FFFFFF" />
        </Press>
      </View>

      {/* ── Session history ────────────────────────────────────── */}
      <View style={{ flex: 1, marginHorizontal: 16, marginTop: 12, marginBottom: 16 }}>
        <Text style={{ color: G.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 8 }}>
          {tr('SCANNED THIS SESSION', 'បានស្កេនក្នុងវគ្គនេះ')} · {history.length}
        </Text>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 6, paddingBottom: 10 }}>
          {history.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 22 }}>
              <ScanLine size={26} color={G.border} />
              <Text style={{ color: G.muted, fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                {tr(
                  'Point the camera at a barcode — the phone shows the product and beams it to the Portal.',
                  'ដាក់កាមេរ៉ាលើបាកូដ — ទូរស័ព្ទនឹងបង្ហាញទំនិញ និងបញ្ជូនទៅ Portal។'
                )}
              </Text>
            </View>
          ) : (
            history.map((item) => {
              const style = OUTCOME_STYLE[item.status];
              return (
                <Animated.View key={item.id} entering={FadeIn.duration(140)}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: G.panel,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                    }}
                  >
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: style.color }} />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ color: G.text, fontSize: 12.5, fontWeight: '700' }}>
                        {item.title}
                      </Text>
                      <Text style={{ color: G.muted, fontSize: 10.5, fontFamily: 'monospace' }}>{item.code}</Text>
                    </View>
                    <Text style={{ color: G.muted, fontSize: 10 }}>
                      {new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 5,
                        backgroundColor: item.beam === 'sent' ? G.successBg : G.dangerBg,
                      }}
                    >
                      <Text
                        style={{
                          color: item.beam === 'sent' ? G.success : G.danger,
                          fontSize: 9,
                          fontWeight: '800',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.mode}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const roundControl = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 5,
  height: 34,
  minWidth: 34,
  paddingHorizontal: 9,
  borderRadius: 17,
  backgroundColor: 'rgba(0,0,0,0.62)',
};

const pillBtn = {
  width: 36,
  height: 36,
  borderRadius: 18,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: G.panelAlt,
};
