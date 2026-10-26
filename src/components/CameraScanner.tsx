import React, { useEffect, useRef, useState } from 'react';
import { Modal, Text, View, TextInput, Platform, Alert, ScrollView } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { CameraView, useCameraPermissions, BarcodeType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  X,
  Flashlight,
  FlashlightOff,
  Check,
  Sparkles,
  Layers,
  Camera,
  ImagePlus,
  Search,
  PackagePlus,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  Plus,
  Minus,
} from 'lucide-react-native';
import { Btn } from '../ui';
import { Press, fade, fadeOut } from '../motion';
import { useLanguage } from '../i18n';
import {
  getWebBarcodeDetector,
  decodeBarcodeFromImageUri,
} from '../webBarcodeScanner';
import { canonicalBarcode } from '../barcode';
import { validateBarcodeRead } from '../barcodeScannerValidation';
import { createScanGate, isDuplicateScan, rememberScan } from '../scanGate';

const ALL_BARCODE_TYPES: BarcodeType[] = [
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
  'datamatrix',
  'pdf417',
  'aztec',
];

const QUICK_QUANTITIES = [1, 5, 10, 25, 50, 100];
const CHECKOUT_QUANTITIES = [1, 2, 5, 10, 24];

export type ScanResult =
  | boolean
  | void
  | {
      ok: boolean;
      label?: string;
      message?: string;
      closeScanner?: boolean;
    };

export interface CheckoutScannerItem {
  id: string;
  name: string;
  quantity: number;
  stock: number;
  unitPriceKhr: string;
  lineTotalKhr: string;
}

export function CameraScanner({
  visible,
  onClose,
  onCode,
  title,
  count = 0,
  mode = 'add',
  showQuantityMultiplier,
  showCount,
  checkoutItems = [],
  checkoutTotalKhr = '0 ៛',
  checkoutTotalUsd = '$0.00',
  onIncrementItem,
  onDecrementItem,
  onCompleteCheckout,
  checkoutBusy = false,
}: {
  visible: boolean;
  onClose: () => void;
  onCode: (code: string, quantity?: number) => ScanResult | Promise<ScanResult>;
  title: string;
  count?: number;
  mode?: 'search' | 'add' | 'checkout';
  showQuantityMultiplier?: boolean;
  showCount?: boolean;
  checkoutItems?: CheckoutScannerItem[];
  checkoutTotalKhr?: string;
  checkoutTotalUsd?: string;
  onIncrementItem?: (id: string) => void;
  onDecrementItem?: (id: string) => void;
  onCompleteCheckout?: () => void;
  checkoutBusy?: boolean;
}) {
  const isSearch = mode === 'search' || showQuantityMultiplier === false;
  const isCheckout = mode === 'checkout';
  const displayCount = !isSearch && showCount !== false;

  const [permission, requestPermission] = useCameraPermissions({ get: false });
  const [cameraError, setCameraError] = useState('');
  const [manual, setManual] = useState('');
  const [zoomLevel, setZoomLevel] = useState<0 | 1 | 2>(1);
  const [torch, setTorch] = useState(false);
  const [lastLabel, setLastLabel] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [customQty, setCustomQty] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [bannerState, setBannerState] = useState<'idle' | 'success' | 'fail'>('idle');
  const [failReason, setFailReason] = useState('');
  const last = useRef({ code: '', at: 0 });
  const pendingRead = useRef({ code: '', n: 0, at: 0 });
  const postSuccessCooldownRef = useRef<{ code: string; until: number }>({ code: '', until: 0 });
  /** Closed while the same barcode stays in the viewfinder so one item is only counted once. */
  const latch = useRef(createScanGate());
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { tr } = useLanguage();

  // Distinct color palettes for Search Finder vs POS Checkout vs Stock Add Mode
  const theme = isSearch
    ? {
        bg: '#0B1D28',
        surface: '#132D3E',
        accent: '#0D9488',
        accentBright: '#2DD4BF',
        border: '#5EEAD4',
        muted: '#88B4C8',
        badgeBg: '#0D948833',
      }
    : isCheckout
      ? {
          bg: '#0F172A',
          surface: '#1E293B',
          accent: '#6D28D9',
          accentBright: '#34D399',
          border: '#A78BFA',
          muted: '#94A3B8',
          badgeBg: '#6D28D933',
        }
      : {
          bg: '#150F26',
          surface: '#302548',
          accent: '#7550C8',
          accentBright: '#4ADE80',
          border: '#D8C5FF',
          muted: '#B7AECA',
          badgeBg: '#7550C833',
        };

  const zoomValue = zoomLevel === 0 ? 0 : zoomLevel === 1 ? 0.08 : 0.22;
  const zoomText = zoomLevel === 0 ? '1×' : zoomLevel === 1 ? '1.5×' : '2.5×';

  const sweep = useSharedValue(0);
  // flash: -1 = DANGER (Red), 0 = IDLE (Theme), +1 = SUCCESS (Green)
  const flash = useSharedValue(0);

  useEffect(() => {
    if (!visible || Platform.OS === 'web') return;
    sweep.value = withRepeat(
      withTiming(1, {
        duration: isCheckout ? 1150 : 1300,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
    // Keep the screen awake while the scanner is open (native only).
    activateKeepAwakeAsync('scanner-active').catch(() => {});
    return () => {
      deactivateKeepAwake('scanner-active').catch(() => {});
    };
  }, [visible, isCheckout]);

  const line = useAnimatedStyle(() => ({
    transform: [{ translateY: sweep.value * (isCheckout ? 118 : 140) }],
    opacity: 0.95,
  }));

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      flash.value,
      [-1, 0, 1],
      ['#7F1D1D', theme.bg, '#065F46'],
    ),
  }));

  const frame = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      flash.value,
      [-1, 0, 1],
      ['#EF4444', theme.border, '#34D399'],
    ),
    backgroundColor: interpolateColor(
      flash.value,
      [-1, 0, 1],
      [
        'rgba(239, 68, 68, 0.30)',
        'rgba(16, 185, 129, 0)',
        'rgba(16, 185, 129, 0.24)',
      ],
    ),
  }));

  useEffect(() => {
    if (visible && !permission?.granted) {
      setCameraError('');
      requestPermission().catch((e) => {
        setCameraError(String(e?.message || e || 'Camera permission denied'));
      });
    }
  }, [visible, permission?.granted]);

  function getActiveQty(): number {
    if (isSearch) return 1;
    const parsed = parseInt(customQty.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return multiplier;
  }

  function triggerVisualFeedback(kind: 'success' | 'fail', messageText: string) {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBannerState(kind);
    if (kind === 'fail') {
      setFailReason(messageText);
      flash.value = withSequence(
        withTiming(-1, { duration: 100 }),
        withTiming(-1, { duration: 650 }),
        withTiming(0, { duration: 320 }),
      );
      bannerTimer.current = setTimeout(() => {
        setBannerState('idle');
      }, 1050);
    } else {
      setLastLabel(messageText);
      flash.value = withSequence(
        withTiming(1, { duration: 110 }),
        withTiming(1, { duration: 440 }),
        withTiming(0, { duration: 280 }),
      );
      bannerTimer.current = setTimeout(() => {
        setBannerState('idle');
      }, 1000);
    }
  }

  /**
   * Entry point for every camera / detector read.
   * - Rejects EAN/UPC reads whose check digit is wrong (misreads produce a *different* product ID).
   * - GTIN symbologies (EAN-8/13, UPC-A, ITF-14) are accepted on the FIRST frame because their check
   *   digit already proves the read is intact. Other symbologies need two matching frames.
   * - The latch stops the same physical barcode from being counted again while it stays in frame.
   */
  function cameraRead(raw: string, type?: string) {
    const value = raw.trim();
    if (!value) return;
    const validated = validateBarcodeRead(value, type, 'camera');
    if (!validated.ok) return;

    // Canonical form (UPC-A → EAN-13) so the latch matches every frame of the same physical code.
    const cleanCode = canonicalBarcode(validated.code);
    const now = Date.now();

    // 1. Post-success cooldown delay: avoid scanning the same stock repeatedly in rapid succession
    if (cleanCode === postSuccessCooldownRef.current.code && now < postSuccessCooldownRef.current.until) {
      return;
    }

    // 2. Still looking at the barcode we already accepted → ignore every further frame.
    if (isDuplicateScan(latch.current, cleanCode, now, 1500)) return;

    const p = pendingRead.current;
    if (p.code === cleanCode && now - p.at < 900) {
      p.n += 1;
      p.at = now;
    } else {
      pendingRead.current = { code: cleanCode, n: 1, at: now };
    }

    // Require 2 matching frames to ensure rock-solid stability and prevent sudden erratic triggers
    const needed = 2;
    if (pendingRead.current.n >= needed) {
      pendingRead.current = { code: '', n: 0, at: 0 };
      rememberScan(latch.current, cleanCode, now);
      void scanned(cleanCode);
    }
  }

  async function scanned(raw: string) {
    const value = canonicalBarcode(raw);
    if (!value) return;
    const now = Date.now();

    // Controlled delay: 1500ms delay for the SAME barcode to avoid runaway stock increases;
    // 400ms for a DIFFERENT barcode so cashiers can scan distinct items without delay.
    const minGap = last.current.code === value ? 1500 : 400;
    if (now - last.current.at < minGap) return;

    last.current = { code: value, at: now };
    rememberScan(latch.current, value, now);
    const qty = getActiveQty();

    try {
      const result = await onCode(value, qty);
      const isFailed =
        result === false ||
        (typeof result === 'object' && result !== null && result.ok === false);

      if (isFailed) {
        const msg =
          typeof result === 'object' && result !== null && result.message
            ? result.message
            : tr(`Not found: ${value}`, `រកមិនឃើញទំនិញ៖ ${value}`);
        triggerVisualFeedback('fail', msg);
        return;
      }

      // Success: enforce delay for this barcode so stock doesn't increase too fast
      postSuccessCooldownRef.current = { code: value, until: Date.now() + 1500 };

      const customLabel =
        typeof result === 'object' && result !== null && result.label
          ? result.label
          : `${value}${qty > 1 ? ` (×${qty})` : ''}`;

      setScanCount((c) => c + qty);
      triggerVisualFeedback('success', customLabel);

      const shouldClose =
        isSearch ||
        (typeof result === 'object' && result !== null && result.closeScanner === true);

      if (shouldClose) {
        setTimeout(() => {
          onClose();
        }, 380);
      }
    } catch (e: any) {
      triggerVisualFeedback(
        'fail',
        e?.message || tr('Scan failed', 'ស្កេនបរាជ័យ'),
      );
    }
  }

  // Mobile camera barcode session — keep the device awake for the duration of scanning
  // Web 1D + 2D continuous scanner
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof document === 'undefined') return;
    let active = true;
    let busyFrame = false;

    const timer = setInterval(async () => {
      if (!active || busyFrame) return;
      const videos = document.querySelectorAll('video');
      const video = videos[videos.length - 1] as HTMLVideoElement | undefined;
      if (!video || video.readyState < 2 || !video.videoWidth) return;

      busyFrame = true;
      try {
        const detector = await getWebBarcodeDetector();
        if (!detector) return;
        const results = await detector.detect(video);
        const value = results?.[0]?.rawValue;
        if (value) cameraRead(String(value), results?.[0]?.format);
      } catch {
        // Ignore single-frame decode errors
      } finally {
        busyFrame = false;
      }
    }, 220);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [visible, multiplier, customQty, isSearch, isCheckout]);

  async function snapCurrentFrame() {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const videos = document.querySelectorAll('video');
      const video = videos[videos.length - 1] as HTMLVideoElement | undefined;
      if (video && video.videoWidth) {
        const detector = await getWebBarcodeDetector();
        if (detector) {
          try {
            const results = await detector.detect(video);
            if (results && results.length > 0 && results[0].rawValue) {
              void scanned(String(results[0].rawValue));
              return;
            }
          } catch {}
        }
      }
      triggerVisualFeedback(
        'fail',
        tr('No barcode detected in frame', 'រកមិនឃើញបាកូដក្នុងរូបភាព'),
      );
    }
  }

  async function scanFromImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const uri = result.assets[0].uri;

    if (Platform.OS === 'web') {
      const code = await decodeBarcodeFromImageUri(uri);
      if (code) {
        void scanned(code);
      } else {
        triggerVisualFeedback(
          'fail',
          tr('Could not read barcode from image', 'មិនអាចអានបាកូដពីរូបភាពនេះទេ'),
        );
      }
    }
  }

  useEffect(() => {
    if (!visible) {
      last.current = { code: '', at: 0 };
      pendingRead.current = { code: '', n: 0, at: 0 };
      setTorch(false);
      setScanCount(0);
      setLastLabel('');
      setFailReason('');
      setBannerState('idle');
      flash.value = 0;
      setCameraReady(false);
    }
  }, [visible]);

  const roundBtn = {
    backgroundColor: '#00000088',
    borderRadius: 24,
    height: 40,
    paddingHorizontal: 12,
    minWidth: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: 5,
  };

  const isSuccess = bannerState === 'success';
  const isFail = bannerState === 'fail';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Animated.View style={[{ flex: 1 }, bgStyle]}>
        {/* Header */}
        <View
          style={{
            paddingTop: 50,
            paddingHorizontal: 18,
            paddingBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: isFail
                  ? '#EF444438'
                  : isSuccess
                    ? '#10B98133'
                    : theme.badgeBg,
                borderWidth: 1,
                borderColor: isFail
                  ? '#FCA5A5'
                  : isSuccess
                    ? '#34D399'
                    : theme.border,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                marginBottom: 6,
              }}
            >
              {isFail ? (
                <AlertTriangle size={13} color="#FCA5A5" />
              ) : isSuccess ? (
                <CheckCircle2 size={13} color="#34D399" />
              ) : isSearch ? (
                <Search size={12} color={theme.accentBright} />
              ) : isCheckout ? (
                <ShoppingBag size={12} color={theme.accentBright} />
              ) : (
                <PackagePlus size={12} color={theme.accentBright} />
              )}
              <Text
                style={{
                  color: isFail
                    ? '#FECACA'
                    : isSuccess
                      ? '#34D399'
                      : theme.accentBright,
                  fontSize: 10.5,
                  fontWeight: '800',
                  letterSpacing: 0.6,
                }}
              >
                {isFail
                  ? tr('SCAN FAILED · DANGER', 'ស្កេនបរាជ័យ · មិនត្រឹមត្រូវ!')
                  : isSuccess
                    ? tr('SCAN SUCCESSFUL!', 'ស្កេនជោគជ័យ!')
                    : isSearch
                      ? tr('QUICK FINDER · INSTANT LOOKUP', 'ស្វែងរកទំនិញរហ័ស')
                      : isCheckout
                        ? tr('POS CHECKOUT SCANNER', 'ស្កេនលក់ទំនិញគិតលុយ')
                        : tr('STOCK & ADD MODE · MULTI-SCAN', 'មុខងារបន្ថែម និងបូកស្តុក')}
              </Text>
            </View>
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 19 }} numberOfLines={1}>
              {title}
            </Text>
          </View>

          {isCheckout && (
            <View
              style={{
                backgroundColor: '#10B98126',
                borderWidth: 1,
                borderColor: '#34D39988',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 14,
                alignItems: 'flex-end',
              }}
            >
              <Text style={{ color: '#A7F3D0', fontSize: 10, fontWeight: '700' }}>
                {count} {tr('in cart', 'ក្នុងកន្ត្រក')}
              </Text>
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900' }}>
                {checkoutTotalKhr}
              </Text>
            </View>
          )}

          <Press
            accessibilityLabel="Close scanner"
            onPress={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#FFFFFF1F',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X color="white" size={21} />
          </Press>
        </View>

        {/* Camera viewport — the scanner overlay visibly indicates when the camera feed is paused */}
        {permission?.granted ? (
          <View
            style={{
              flex: isCheckout ? 0 : 1,
              height: isCheckout ? 235 : undefined,
              marginHorizontal: 15,
              borderRadius: 24,
              overflow: 'hidden',
            }}
          >
            {/* No `key` here: re-mounting the camera to toggle the torch switched it straight back off. */}
            <CameraView
              active={visible}
              style={{ flex: 1 }}
              facing="back"
              autofocus="on"
              zoom={zoomValue}
              enableTorch={Platform.OS !== 'web' && torch}
              barcodeScannerSettings={{ barcodeTypes: ALL_BARCODE_TYPES }}
              onBarcodeScanned={(e) => {
                setCameraReady(true);
                cameraRead(e.data, e.type);
              }}
              onCameraReady={() => {
                setCameraReady(true);
                setCameraError('');
              }}
              onMountError={(e) => {
                setCameraReady(false);
                setCameraError(e.message || 'Camera unavailable');
              }}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: isCheckout ? '14%' : '24%',
                  left: '7%',
                  right: '7%',
                  height: isCheckout ? 142 : 165,
                  borderWidth: 3,
                  borderRadius: 22,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 12,
                },
                frame,
              ]}
            >
              {bannerState === 'idle' && (
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      top: 10,
                      left: 14,
                      right: 14,
                      height: 2.5,
                      borderRadius: 2,
                      backgroundColor: theme.accentBright,
                    },
                    line,
                  ]}
                />
              )}
              {isSuccess && (
                <Animated.View
                  entering={FadeIn.duration(100)}
                  exiting={FadeOut.duration(140)}
                  style={{
                    backgroundColor: '#059669F2',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 999,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    maxWidth: '96%',
                  }}
                >
                  <CheckCircle2 size={20} color="#FFFFFF" />
                  <Text
                    numberOfLines={1}
                    style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}
                  >
                    {tr('Scanned!', 'ស្កេនជោគជ័យ!')} {lastLabel}
                  </Text>
                </Animated.View>
              )}
              {!cameraReady && (
                <View style={{ alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ color: '#FCA5A5', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                    {tr('Camera paused', 'កាមេរ៉ាឈ្លាក់')}
                  </Text>
                </View>
              )}
              {isFail && (
                <Animated.View
                  entering={FadeIn.duration(100)}
                  exiting={FadeOut.duration(140)}
                  style={{
                    backgroundColor: '#DC2626F5',
                    borderWidth: 1.5,
                    borderColor: '#FCA5A5',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    maxWidth: '96%',
                  }}
                >
                  <AlertTriangle size={20} color="#FFFFFF" />
                  <Text
                    numberOfLines={2}
                    style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13, flexShrink: 1 }}
                  >
                    {failReason || tr('Scan Failed · Item not found', 'ស្កេនបរាជ័យ · រកមិនឃើញទំនិញ')}
                  </Text>
                </Animated.View>
              )}
            </Animated.View>

            {/* Camera Controls Overlay */}
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
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {Platform.OS === 'web' ? (
                  <>
                    <Press
                      accessibilityLabel="Snap barcode frame"
                      onPress={() => void snapCurrentFrame()}
                      style={[roundBtn, { backgroundColor: theme.accent }]}
                    >
                      <Camera color="white" size={16} />
                      <Text style={{ color: 'white', fontWeight: '800', fontSize: 11.5 }}>
                        {tr('Snap', 'ថតស្កេន')}
                      </Text>
                    </Press>
                    <Press
                      accessibilityLabel="Scan barcode from image"
                      onPress={() => void scanFromImage()}
                      style={roundBtn}
                    >
                      <ImagePlus color="white" size={16} />
                      <Text style={{ color: 'white', fontWeight: '800', fontSize: 11.5 }}>
                        {tr('Image', 'រូបភាព')}
                      </Text>
                    </Press>
                  </>
                ) : (
                  <View
                    style={{
                      backgroundColor: '#00000099',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Sparkles size={13} color={theme.border} />
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                      {tr('Anti-glare active', 'ការពារចាំងពន្លឺ')}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Press
                  onPress={() => setZoomLevel((z) => ((z + 1) % 3) as 0 | 1 | 2)}
                  style={roundBtn}
                >
                  <Text style={{ color: 'white', fontWeight: '800', fontSize: 12.5 }}>{zoomText}</Text>
                </Press>
                <Press
                  accessibilityLabel={torch ? 'Turn flashlight off' : 'Turn flashlight on'}
                  onPress={() => {
                    if (Platform.OS === 'web')
                      Alert.alert(
                        'Flashlight unavailable',
                        'Use the native iOS or Android app for camera torch control.',
                      );
                    else setTorch((v) => !v);
                  }}
                  style={roundBtn}
                >
                  {torch ? (
                    <FlashlightOff color="white" size={18} />
                  ) : (
                    <Flashlight color="white" size={18} />
                  )}
                </Press>
              </View>
            </View>
          </View>
        ) : (              <View style={{ flex: 1, justifyContent: 'center', padding: 30, gap: 12 }}>
            <Text style={{ color: 'white', textAlign: 'center', marginBottom: 8 }}>
              {cameraError
                ? tr(
                    'Camera access was blocked. Allow camera permission or pick a barcode photo below.',
                    'កាមេរ៉ាត្រូវបានបិទ។ សូមអនុញ្ញាតកាមេរ៉ា ឬជ្រើសរូបភាពបាកូដខាងក្រោម។',
                  )
                : tr('Allow camera access to scan products.', 'សូមអនុញ្ញាតកាមេរ៉ាដើម្បីស្កេនទំនិញ។')}
            </Text>
            <Btn
              onPress={() => {
                setCameraReady(false);
                setCameraError('');
                requestPermission().catch((e) =>
                  setCameraError(String(e?.message || e || 'Camera permission denied')),
                );
              }}
            >
              {tr('Allow camera', 'អនុញ្ញាតកាមេរ៉ា')}
            </Btn>

            {!cameraReady && Platform.OS !== 'web' && (
              <View style={{ marginTop: 10 }}>
                <Btn
                  onPress={() => {
                    setCameraReady(false);
                    setCameraError('');
                    requestPermission();
                  }}
                  style={{ marginBottom: 6 }}
                >
                  {tr('Tap to resume camera', 'ចុចដើម្បីបន្តកាមេរ៉ា')}
                </Btn>
              </View>
            )}
            {Platform.OS === 'web' && (
              <Btn soft icon={ImagePlus} onPress={() => void scanFromImage()}>
                {tr('Scan from photo / image instead', 'ស្កេនពីរូបភាពជំនួសវិញ')}
              </Btn>
            )}
          </View>
        )}

        {/* Mode-specific Bottom Controls */}
        {isSearch ? (
          /* 1. SEARCH FINDER FOOTER — NO COUNT DISPLAY */
          <View style={{ padding: 18, paddingBottom: 32, gap: 12 }}>
            {isFail && (
              <View
                style={{
                  backgroundColor: '#DC262655',
                  borderWidth: 1,
                  borderColor: '#FCA5A5',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertTriangle size={16} color="#FECACA" />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12.5, flex: 1 }}>
                  {failReason}
                </Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                accessibilityLabel="Enter barcode to search"
                placeholder={tr('Type barcode to find product…', 'វាយបាកូដដើម្បីស្វែងរកទំនិញ…')}
                placeholderTextColor="#9CA3AF"
                value={manual}
                onChangeText={setManual}
                onSubmitEditing={() => {
                  void scanned(manual);
                  setManual('');
                }}
                autoCapitalize="none"
                style={{
                  flex: 1,
                  color: 'white',
                  backgroundColor: theme.surface,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  height: 46,
                }}
              />
              <Press
                accessibilityLabel="Find barcode"
                onPress={() => {
                  void scanned(manual);
                  setManual('');
                }}
                style={{
                  backgroundColor: theme.accent,
                  paddingHorizontal: 18,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Search size={16} color="white" />
                <Text style={{ color: 'white', fontWeight: '800' }}>
                  {tr('Find', 'ស្វែងរក')}
                </Text>
              </Press>
            </View>
            <Press
              onPress={onClose}
              style={{
                backgroundColor: '#FFFFFF14',
                borderRadius: 15,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 14.5 }}>
                {tr('Cancel search', 'បោះបង់ការស្វែងរក')}
              </Text>
            </Press>
          </View>
        ) : isCheckout ? (
          /* 2. DEDICATED POS CHECKOUT SCANNER UI */
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, gap: 10 }}>
            {/* Quick Qty + Manual Barcode Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ gap: 6, alignItems: 'center' }}
              >
                {CHECKOUT_QUANTITIES.map((q) => {
                  const active = multiplier === q;
                  return (
                    <Press
                      key={q}
                      onPress={() => setMultiplier(q)}
                      style={{
                        backgroundColor: active ? theme.accent : theme.surface,
                        borderWidth: 1,
                        borderColor: active ? '#C4B5FD' : '#334155',
                        paddingHorizontal: 11,
                        paddingVertical: 8,
                        borderRadius: 11,
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>×{q}</Text>
                    </Press>
                  );
                })}
              </ScrollView>

              <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                <TextInput
                  placeholder={tr('Barcode…', 'បាកូដ…')}
                  placeholderTextColor="#9CA3AF"
                  value={manual}
                  onChangeText={setManual}
                  onSubmitEditing={() => {
                    void scanned(manual);
                    setManual('');
                  }}
                  autoCapitalize="none"
                  style={{
                    flex: 1,
                    color: 'white',
                    backgroundColor: theme.surface,
                    borderRadius: 11,
                    paddingHorizontal: 11,
                    height: 36,
                    fontSize: 12.5,
                  }}
                />
                <Press
                  onPress={() => {
                    void scanned(manual);
                    setManual('');
                  }}
                  style={{
                    backgroundColor: theme.accent,
                    paddingHorizontal: 12,
                    borderRadius: 11,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>+{multiplier}</Text>
                </Press>
              </View>
            </View>

            {/* Live Status Banner (Success / Danger / Ready) */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isFail
                  ? '#DC262666'
                  : isSuccess
                    ? '#05966966'
                    : '#1E293B',
                borderWidth: 1,
                borderColor: isFail
                  ? '#FCA5A5'
                  : isSuccess
                    ? '#34D399'
                    : '#334155',
                paddingHorizontal: 13,
                paddingVertical: 9,
                borderRadius: 13,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: isFail ? '#FECACA' : '#FFFFFF',
                  fontSize: 12.5,
                  fontWeight: '700',
                  flex: 1,
                }}
              >
                {isFail
                  ? failReason
                  : lastLabel
                    ? lastLabel
                    : tr('Point camera at product barcode to add to cart', 'ដាក់កាមេរ៉ាលើបាកូដដើម្បីដាក់ចូលកន្ត្រក')}
              </Text>
            </View>

            {/* Live Scanned Cart List inside Scanner */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#1E293B',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#334155',
                padding: 12,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: '#E2E8F0', fontWeight: '800', fontSize: 13 }}>
                  {tr('Scanned Cart Items', 'ទំនិញក្នុងកន្ត្រក')} ({checkoutItems.length})
                </Text>
                <Text style={{ color: '#94A3B8', fontWeight: '600', fontSize: 11.5 }}>
                  {checkoutTotalUsd}
                </Text>
              </View>

              {checkoutItems.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 }}>
                  <ShoppingBag size={24} color="#64748B" />
                  <Text style={{ color: '#94A3B8', fontSize: 12.5, marginTop: 6, textAlign: 'center' }}>
                    {tr('No items scanned yet — scan any barcode above', 'មិនទាន់មានទំនិញក្នុងកន្ត្រក — សូមស្កេនបាកូដខាងលើ')}
                  </Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {checkoutItems.map((item) => (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#0F172A',
                        borderRadius: 13,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        gap: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13.5 }}>
                          {item.name}
                        </Text>
                        <Text style={{ color: '#94A3B8', fontSize: 11.5, marginTop: 2 }}>
                          {item.unitPriceKhr} × {item.quantity} ={' '}
                          <Text style={{ color: '#34D399', fontWeight: '800' }}>{item.lineTotalKhr}</Text>
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#1E293B',
                          borderRadius: 11,
                          padding: 2,
                        }}
                      >
                        <Press
                          onPress={() => onDecrementItem?.(item.id)}
                          style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Minus size={14} color="#C4B5FD" />
                        </Press>
                        <Text
                          style={{
                            color: '#FFFFFF',
                            fontWeight: '800',
                            minWidth: 22,
                            textAlign: 'center',
                            fontSize: 13,
                          }}
                        >
                          {item.quantity}
                        </Text>
                        <Press
                          disabled={item.quantity >= item.stock}
                          onPress={() => onIncrementItem?.(item.id)}
                          style={{
                            width: 28,
                            height: 28,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: item.quantity >= item.stock ? 0.35 : 1,
                          }}
                        >
                          <Plus size={14} color="#C4B5FD" />
                        </Press>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Bottom Actions: Review Cart or Instant Pay */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Press
                onPress={onClose}
                style={{
                  backgroundColor: '#334155',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>
                  {tr('View Cart', 'មើលកន្ត្រក')}
                </Text>
              </Press>

              <Press
                disabled={count === 0 || checkoutBusy}
                onPress={() => {
                  if (onCompleteCheckout) onCompleteCheckout();
                  else onClose();
                }}
                style={{
                  flex: 1,
                  backgroundColor: count > 0 ? '#10B981' : '#334155',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 15,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: count === 0 || checkoutBusy ? 0.5 : 1,
                }}
              >
                <CheckCircle2 size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15 }}>
                  {checkoutBusy
                    ? tr('Processing…', 'កំពុងទូទាត់…')
                    : `${tr('Pay Now', 'គិតលុយ')} · ${checkoutTotalKhr}`}
                </Text>
              </Press>
            </View>
          </View>
        ) : (
          /* 3. STOCK / ADD MODE FOOTER */
          <>
            <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 7,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Layers size={14} color={theme.border} />
                  <Text style={{ color: theme.border, fontSize: 12, fontWeight: '700' }}>
                    {tr('Quantity per scan (bulk stock)', 'ចំនួនក្នុង ១ ស្កេន (សម្រាប់ស្តុកច្រើន)')}
                  </Text>
                </View>
                <Text style={{ color: theme.accentBright, fontSize: 12, fontWeight: '800' }}>
                  ×{getActiveQty()} {tr('per scan', 'ក្នុង ១ ស្កេន')}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, alignItems: 'center' }}
              >
                {QUICK_QUANTITIES.map((q) => {
                  const active = !customQty.trim() && multiplier === q;
                  return (
                    <Press
                      key={q}
                      onPress={() => {
                        setCustomQty('');
                        setMultiplier(q);
                      }}
                      style={{
                        backgroundColor: active ? theme.accent : theme.surface,
                        borderWidth: 1,
                        borderColor: active ? '#B596FF' : 'transparent',
                        paddingHorizontal: 13,
                        paddingVertical: 8,
                        borderRadius: 12,
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '800', fontSize: 12.5 }}>+{q}</Text>
                    </Press>
                  );
                })}
                <TextInput
                  placeholder={tr('Custom (e.g. 100)', 'ចំនួនផ្សេង')}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  value={customQty}
                  onChangeText={setCustomQty}
                  style={{
                    color: 'white',
                    backgroundColor: customQty.trim() ? theme.accent : theme.surface,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    height: 35,
                    minWidth: 110,
                    fontSize: 12.5,
                    fontWeight: '700',
                  }}
                />
              </ScrollView>
            </View>

            <View style={{ paddingHorizontal: 18, paddingTop: 10, flexDirection: 'row', gap: 8 }}>
              <TextInput
                accessibilityLabel="Enter barcode manually"
                placeholder={tr(
                  'Type or paste barcode to add stock…',
                  'វាយបាកូដដើម្បីបន្ថែមស្តុក…',
                )}
                placeholderTextColor="#9CA3AF"
                value={manual}
                onChangeText={setManual}
                onSubmitEditing={() => {
                  void scanned(manual);
                  setManual('');
                }}
                autoCapitalize="none"
                style={{
                  flex: 1,
                  color: 'white',
                  backgroundColor: theme.surface,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  height: 44,
                }}
              />
              <Press
                accessibilityLabel="Submit barcode"
                onPress={() => {
                  void scanned(manual);
                  setManual('');
                }}
                style={{
                  backgroundColor: theme.accent,
                  paddingHorizontal: 17,
                  borderRadius: 14,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: 'white', fontWeight: '800' }}>+{getActiveQty()}</Text>
              </Press>
            </View>

            <View style={{ padding: 16, paddingBottom: 30, gap: 10 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: isFail
                    ? '#DC262666'
                    : isSuccess
                      ? '#05966966'
                      : '#FFFFFF12',
                  borderWidth: isFail ? 1 : 0,
                  borderColor: isFail ? '#FCA5A5' : 'transparent',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 14,
                }}
              >
                <Animated.Text
                  key={isFail ? failReason : lastLabel}
                  entering={fade}
                  exiting={fadeOut}
                  numberOfLines={1}
                  style={{
                    color: isFail ? '#FECACA' : '#FFFFFF',
                    fontSize: 12.5,
                    fontWeight: '700',
                    flex: 1,
                  }}
                >
                  {isFail
                    ? failReason
                    : lastLabel
                      ? `${tr('Last scan', 'ស្កេនចុងក្រោយ')}: ${lastLabel}`
                      : tr('Ready to scan items into stock', 'រួចរាល់សម្រាប់ស្កេនបញ្ចូលស្តុក')}
                </Animated.Text>
                {displayCount && (
                  <View
                    style={{
                      backgroundColor: isFail
                        ? '#DC2626'
                        : isSuccess
                          ? '#10B981'
                          : theme.accent,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>
                      {count || scanCount} {tr('units', 'ឯកតា')}
                    </Text>
                  </View>
                )}
              </View>
              <Btn icon={Check} onPress={onClose}>
                {tr('Done · Save scanned stock', 'រួចរាល់ · បញ្ជាក់ចំនួនស្កេន')}
              </Btn>
            </View>
          </>
        )}
      </Animated.View>
    </Modal>
  );
}
