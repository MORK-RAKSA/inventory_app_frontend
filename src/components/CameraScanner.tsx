import { acceptCameraRead } from '../scannerRead';
import { ScannerViewport, scannerFrame } from './ScannerViewport';
import { ScannerControls, ScannerCaptureButton } from './ScannerControls';
import { captureBarcode, decodeNativePhoto, photoScanningAvailable } from '../scannerPhoto';
import { AppTextInput as TextInput, AppText as Text } from './AppText';
import { insideFrame, confirmRead } from '../scannerAcceptance';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Platform, Alert, ScrollView, Vibration, StyleSheet } from 'react-native';
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
import { useSounds } from '../hooks/useSounds';

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

function isInsideScannerFrame(
  bounds: { origin: { x: number; y: number }; size: { width: number; height: number } } | undefined,
  layout: { width: number; height: number },
  isCheckout: boolean
): boolean {
  if (!layout.width || !layout.height) return false;
  return insideFrame(bounds, scannerFrame(layout.width));
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
  const [zoomLevel, setZoomLevel] = useState<0 | 1 | 2>(0);
  const [torch, setTorch] = useState(false);
  const [lastLabel, setLastLabel] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [customQty, setCustomQty] = useState('');
  const cameraRef = useRef<CameraView>(null);
  const photoBusy = useRef(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [bannerState, setBannerState] = useState<'idle' | 'success' | 'fail'>('idle');
  const [failReason, setFailReason] = useState('');
  const last = useRef({ code: '', at: 0 });
  const pendingRead = useRef({ code: '', n: 0, at: 0 });
  /** Closed while the same barcode stays in the viewfinder so one item is only counted once. */
  const processingRead = useRef(false);
  const closingScanner = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latch = useRef(createScanGate());
  const cameraLayout = useRef({ width: 0, height: 0 });
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { tr } = useLanguage();
  const { playScan, playFail } = useSounds();

  const theme = {bg:'#0A0E1A',surface:'#151B2C',accent:'#34D399',accentBright:'#34D399',border:'#2A334D',muted:'#8F9BB7',badgeBg:'#153936'};

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

  const screenFlashStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      flash.value,
      [-1, 0, 1],
      ['rgba(239, 68, 68, 0.45)', 'rgba(0, 0, 0, 0)', 'rgba(34, 197, 94, 0.45)'],
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
      playFail();
      if (Platform.OS !== 'web') Vibration.vibrate([0, 50, 40, 50]);
      setFailReason(messageText);
      flash.value = withSequence(
        withTiming(-1, { duration: 25 }),
        withTiming(-1, { duration: 180 }),
        withTiming(0, { duration: 120 }),
      );
      bannerTimer.current = setTimeout(() => {
        setBannerState('idle');
      }, 880);
    } else {
      playScan();
      if (Platform.OS !== 'web') Vibration.vibrate(45);
      setLastLabel(messageText);
      flash.value = withSequence(
        withTiming(1, { duration: 25 }),
        withTiming(1, { duration: 180 }),
        withTiming(0, { duration: 120 }),
      );
      bannerTimer.current = setTimeout(() => {
        setBannerState('idle');
      }, 730);
    }
  }

  /** Validate camera reads, require three stable detections, then apply duplicate suppression. */
  function cameraRead(raw:string,type?:string) {
    if(closingScanner.current || photoBusy.current)return;
    if(processingRead.current){isDuplicateScan(latch.current,canonicalBarcode(raw),Date.now(),800);return;}
    const code=acceptCameraRead(latch.current,pendingRead.current,raw,type,Date.now());
    if(code)void scanned(code);
  }

  async function scanned(raw: string) {
    const value = canonicalBarcode(raw);
    if (!value || processingRead.current || closingScanner.current) return;
    processingRead.current = true;
    const now = Date.now();

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
        closingScanner.current = true;
        closeTimer.current = setTimeout(() => {
          onClose();
        }, 380);
      }
    } catch (e: any) {
      triggerVisualFeedback(
        'fail',
        e?.message || tr('Scan failed', 'ស្កេនបរាជ័យ'),
      );
    } finally { processingRead.current = false; }
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
        // Decode only the visible viewfinder, accounting for the preview cover crop.
        const layout = cameraLayout.current;
        if (!layout.width || !layout.height) return;
        const scale = Math.max(layout.width / video.videoWidth, layout.height / video.videoHeight);
        const offsetX = (video.videoWidth * scale - layout.width) / 2;
        const offsetY = (video.videoHeight * scale - layout.height) / 2;
        const crop = document.createElement('canvas');
        crop.width = Math.round((layout.width - 52) / scale);
        crop.height = Math.round(164 / scale);
        const ctx = crop.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, (26 + offsetX) / scale,
          (34 + offsetY) / scale,
          crop.width, crop.height, 0, 0, crop.width, crop.height);
        const results = await detector.detect(crop);
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

  async function capturePhoto() {
    if (!photoScanningAvailable()) return;
    if (photoBusy.current || !cameraReady) return;
    if (!cameraRef.current) return;
    photoBusy.current=true;setPhotoLoading(true);
    try {
      const layout=cameraLayout.current;
      const code=await captureBarcode(cameraRef.current,layout,scannerFrame(layout.width));
      if(code) { await scanned(code); } else { triggerVisualFeedback('fail', 'No barcode found in frame. Hold steady and try again.'); }
    } catch { triggerVisualFeedback('fail', 'No barcode found in frame. Hold steady and try again.'); } finally {photoBusy.current=false;setPhotoLoading(false);}
  }

  async function snapCurrentFrame() {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const videos = document.querySelectorAll('video');
      const video = videos[videos.length - 1] as HTMLVideoElement | undefined;
      if (video && video.videoWidth) {
        const detector = await getWebBarcodeDetector();
        if (detector) {
          try {
            // Decode only the visible viewfinder, accounting for the preview cover crop.
        const layout = cameraLayout.current;
        if (!layout.width || !layout.height) return;
        const scale = Math.max(layout.width / video.videoWidth, layout.height / video.videoHeight);
        const offsetX = (video.videoWidth * scale - layout.width) / 2;
        const offsetY = (video.videoHeight * scale - layout.height) / 2;
        const crop = document.createElement('canvas');
        crop.width = Math.round((layout.width - 52) / scale);
        crop.height = Math.round(164 / scale);
        const ctx = crop.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, (26 + offsetX) / scale,
          (34 + offsetY) / scale,
          crop.width, crop.height, 0, 0, crop.width, crop.height);
        const results = await detector.detect(crop);
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
    if (!photoScanningAvailable()) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const uri = result.assets[0].uri;

    {
      const code = Platform.OS === 'web' ? await decodeBarcodeFromImageUri(uri) : await decodeNativePhoto(uri);
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
      closingScanner.current = false;
      if(closeTimer.current)clearTimeout(closeTimer.current);
      setTorch(false);
      setScanCount(0);
      setLastLabel('');
      setFailReason('');
      setBannerState('idle');
      flash.value = 0;
      setCameraReady(false);
    }
  }, [visible]);

  useEffect(()=>()=>{if(closeTimer.current)clearTimeout(closeTimer.current);},[]);

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

        <View style={{marginHorizontal:16,marginTop:12}}>
          <ScannerViewport ref={cameraRef} allowed={!!permission?.granted} ready={cameraReady} onAllow={()=>void requestPermission()} onSize={size=>{cameraLayout.current=size;}} active={visible} facing="back" autofocus="on" zoom={zoomValue} enableTorch={torch} barcodeScannerSettings={{barcodeTypes:ALL_BARCODE_TYPES}}
            onBarcodeScanned={(e:any)=>{if(photoBusy.current)return;if(!isInsideScannerFrame(e.bounds,cameraLayout.current,isCheckout)){pendingRead.current.n=0;return;}cameraRead(e.data,e.type);}}
            onCameraReady={()=>{setCameraReady(true);setCameraError('');}} onMountError={e=>{setCameraReady(false);setCameraError(e.message);}}
            torchOn={torch} zoomLabel={zoomText} photoBusy={photoLoading} onTorch={()=>setTorch(v=>!v)} onZoom={()=>setZoomLevel(z=>((z+1)%3) as 0|1|2)} onImage={()=>void scanFromImage()}
            feedback={<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,screenFlashStyle]}/>}/>
          {!!cameraError && <Text style={{color:'#FBBF24',fontSize:12,marginTop:8}}>{cameraError}</Text>}
        </View>

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
        <View style={{flexDirection:'row',justifyContent:'center',alignItems:'center',paddingVertical:10,paddingBottom:28,backgroundColor:theme.surface,borderTopWidth:1,borderColor:theme.border}}>
          <ScannerCaptureButton busy={photoLoading} onPress={()=>void capturePhoto()} />
        </View>
      </Animated.View>
    </Modal>
  );
}
