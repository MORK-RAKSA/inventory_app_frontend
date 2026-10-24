import React, { useEffect, useRef, useState } from 'react';
import { Modal, Text, View, TextInput, Platform, Alert, ScrollView } from 'react-native';
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
} from 'lucide-react-native';
import { Btn } from '../ui';
import { Press, fade, fadeOut } from '../motion';
import { useLanguage } from '../i18n';
import {
  getWebBarcodeDetector,
  decodeBarcodeFromImageUri,
} from '../webBarcodeScanner';

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

export function CameraScanner({
  visible,
  onClose,
  onCode,
  title,
  count = 0,
  mode = 'add',
  showQuantityMultiplier,
  showCount,
}: {
  visible: boolean;
  onClose: () => void;
  onCode: (code: string, quantity?: number) => void;
  title: string;
  count?: number;
  mode?: 'search' | 'add';
  showQuantityMultiplier?: boolean;
  showCount?: boolean;
}) {
  const isSearch = mode === 'search' || showQuantityMultiplier === false;
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
  const [successBanner, setSuccessBanner] = useState(false);
  const last = useRef({ code: '', at: 0 });
  const { tr } = useLanguage();

  // Distinct color palettes for Search Finder vs Stock Add Mode
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
  const flash = useSharedValue(0);
  useEffect(() => {
    if (!visible) return;
    sweep.value = withRepeat(
      withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [visible]);

  const line = useAnimatedStyle(() => ({
    transform: [{ translateY: sweep.value * 140 }],
    opacity: 0.95,
  }));

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      flash.value,
      [0, 1],
      [theme.bg, '#065F46'],
    ),
  }));

  const frame = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      flash.value,
      [0, 1],
      [theme.border, '#34D399'],
    ),
    backgroundColor: interpolateColor(
      flash.value,
      [0, 1],
      ['rgba(16, 185, 129, 0)', 'rgba(16, 185, 129, 0.22)'],
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

  function scanned(raw: string) {
    const value = raw.trim();
    if (!value) return;
    const now = Date.now();
    // Controlled pace: 1350ms cooldown for the same barcode, 850ms minimum between any two scans
    const minGap = last.current.code === value ? 1350 : 850;
    if (now - last.current.at < minGap) return;

    last.current = { code: value, at: now };
    const qty = getActiveQty();
    setLastLabel(`${value}${qty > 1 ? ` (×${qty})` : ''}`);
    setScanCount((c) => c + qty);

    // Visual green success background + banner
    setSuccessBanner(true);
    flash.value = withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(1, { duration: 420 }),
      withTiming(0, { duration: 280 }),
    );
    setTimeout(() => {
      setSuccessBanner(false);
    }, 680);

    if (isSearch) {
      // Brief pause so the user sees the green success state before closing
      setTimeout(() => {
        onCode(value, 1);
      }, 320);
    } else {
      onCode(value, qty);
    }
  }

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
        if (value) scanned(String(value));
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
  }, [visible, multiplier, customQty, isSearch]);

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
              scanned(String(results[0].rawValue));
              return;
            }
          } catch {}
        }
      }
      Alert.alert(
        tr('No barcode detected', 'រកមិនឃើញបាកូដ'),
        tr(
          'Center the barcode lines inside the box or use the Image button.',
          'សូមដាក់បាកូដចំកណ្តាលប្រអប់ ឬចុចប៊ូតុងរូបភាព។',
        ),
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
        scanned(code);
      } else {
        Alert.alert(
          tr('Could not read barcode', 'មិនអាចអានបាកូដពីរូបភាពនេះទេ'),
          tr('Try cropping closer to the barcode lines.', 'សូមជ្រើសរូបភាពដែលឃើញបាកូដច្បាស់។'),
        );
      }
    }
  }

  useEffect(() => {
    if (!visible) {
      last.current = { code: '', at: 0 };
      setTorch(false);
      setScanCount(0);
      setLastLabel('');
      setSuccessBanner(false);
      flash.value = 0;
    }
  }, [visible]);

  const roundBtn = {
    backgroundColor: '#00000088',
    borderRadius: 24,
    height: 44,
    paddingHorizontal: 13,
    minWidth: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: 5,
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Animated.View style={[{ flex: 1 }, bgStyle]}>
        {/* Distinct Mode Header */}
        <View
          style={{
            paddingTop: 52,
            paddingHorizontal: 20,
            paddingBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: successBanner ? '#10B98133' : theme.badgeBg,
                borderWidth: 1,
                borderColor: successBanner ? '#34D399' : theme.border,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                marginBottom: 7,
              }}
            >
              {successBanner ? (
                <CheckCircle2 size={13} color="#34D399" />
              ) : isSearch ? (
                <Search size={12} color={theme.accentBright} />
              ) : (
                <PackagePlus size={12} color={theme.accentBright} />
              )}
              <Text
                style={{
                  color: successBanner ? '#34D399' : theme.accentBright,
                  fontSize: 10.5,
                  fontWeight: '800',
                  letterSpacing: 0.6,
                }}
              >
                {successBanner
                  ? tr('SCAN SUCCESSFUL!', 'ស្កេនជោគជ័យ!')
                  : isSearch
                    ? tr('QUICK FINDER · INSTANT LOOKUP', 'ស្វែងរកទំនិញរហ័ស')
                    : tr('STOCK & ADD MODE · MULTI-SCAN', 'មុខងារបន្ថែម និងបូកស្តុក')}
              </Text>
            </View>
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 20 }}>{title}</Text>
            <Text style={{ color: successBanner ? '#A7F3D0' : theme.muted, fontSize: 11.5, marginTop: 2 }}>
              {isSearch
                ? tr(
                    'Point at barcode to immediately find this product',
                    'ដាក់កាមេរ៉ាលើបាកូដដើម្បីស្វែងរកទំនិញភ្លាមៗ',
                  )
                : tr(
                    'Scan items one by one or select a bulk multiplier below',
                    'ស្កេនម្តងមួយៗ ឬជ្រើសចំនួនបូកស្តុកខាងក្រោម',
                  )}
            </Text>
          </View>
          <Press
            accessibilityLabel="Close scanner"
            onPress={onClose}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: '#FFFFFF1A',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X color="white" size={22} />
          </Press>
        </View>

        {/* Camera Viewport */}
        {permission?.granted ? (
          <View style={{ flex: 1, marginHorizontal: 15, borderRadius: 26, overflow: 'hidden' }}>
            <CameraView
              key={torch ? 'torch-on' : 'torch-off'}
              active={visible}
              style={{ flex: 1 }}
              facing="back"
              autofocus="on"
              zoom={zoomValue}
              enableTorch={Platform.OS !== 'web' && torch}
              barcodeScannerSettings={{ barcodeTypes: ALL_BARCODE_TYPES }}
              onBarcodeScanned={(e) => scanned(e.data)}
              onMountError={(e) => setCameraError(e.message || 'Camera unavailable')}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: '26%',
                  left: '7%',
                  right: '7%',
                  height: 165,
                  borderWidth: 3,
                  borderRadius: 24,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                frame,
              ]}
            >
              {!successBanner && (
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      top: 12,
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
              {successBanner && (
                <Animated.View
                  entering={FadeIn.duration(120)}
                  exiting={FadeOut.duration(150)}
                  style={{
                    backgroundColor: '#059669EE',
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 999,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <CheckCircle2 size={20} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                    {tr('Scanned!', 'ស្កេនជោគជ័យ!')} {lastLabel}
                  </Text>
                </Animated.View>
              )}
            </Animated.View>

            {/* Controls Overlay */}
            <View
              style={{
                position: 'absolute',
                bottom: 14,
                left: 14,
                right: 14,
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
                      <Camera color="white" size={17} />
                      <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>
                        {tr('Snap', 'ថតស្កេន')}
                      </Text>
                    </Press>
                    <Press
                      accessibilityLabel="Scan barcode from image"
                      onPress={() => void scanFromImage()}
                      style={roundBtn}
                    >
                      <ImagePlus color="white" size={17} />
                      <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>
                        {tr('Image', 'រូបភាព')}
                      </Text>
                    </Press>
                  </>
                ) : (
                  <View
                    style={{
                      backgroundColor: '#00000099',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Sparkles size={14} color={theme.border} />
                    <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>
                      {tr('1.5× anti-glare active', '1.5× ការពារចាំងពន្លឺ')}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Press
                  onPress={() => setZoomLevel((z) => ((z + 1) % 3) as 0 | 1 | 2)}
                  style={roundBtn}
                >
                  <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>{zoomText}</Text>
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
                    <FlashlightOff color="white" size={19} />
                  ) : (
                    <Flashlight color="white" size={19} />
                  )}
                </Press>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', padding: 30, gap: 12 }}>
            <Text style={{ color: 'white', textAlign: 'center', marginBottom: 8 }}>
              {cameraError
                ? tr(
                    'Camera access was blocked by the browser. Allow camera permission in your browser address bar, or pick a barcode photo below.',
                    'កាមេរ៉ាត្រូវបានបិទដោយកម្មវិធីរុករក។ សូមអនុញ្ញាតកាមេរ៉ា ឬជ្រើសរូបភាពបាកូដខាងក្រោម។',
                  )
                : tr('Allow camera access to scan products.', 'សូមអនុញ្ញាតកាមេរ៉ាដើម្បីស្កេនទំនិញ។')}
            </Text>
            <Btn
              onPress={() => {
                setCameraError('');
                requestPermission().catch((e) =>
                  setCameraError(String(e?.message || e || 'Camera permission denied')),
                );
              }}
            >
              {tr('Allow camera', 'អនុញ្ញាតកាមេរ៉ា')}
            </Btn>
            {Platform.OS === 'web' && (
              <Btn soft icon={ImagePlus} onPress={() => void scanFromImage()}>
                {tr('Scan from photo / image instead', 'ស្កេនពីរូបភាពជំនួសវិញ')}
              </Btn>
            )}
          </View>
        )}

        {/* Mode-specific Bottom Controls */}
        {isSearch ? (
          /* SEARCH FINDER FOOTER — NO COUNT DISPLAY */
          <View style={{ padding: 18, paddingBottom: 32, gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                accessibilityLabel="Enter barcode to search"
                placeholder={tr('Type barcode to find product…', 'វាយបាកូដដើម្បីស្វែងរកទំនិញ…')}
                placeholderTextColor={theme.muted}
                value={manual}
                onChangeText={setManual}
                onSubmitEditing={() => {
                  scanned(manual);
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
                  scanned(manual);
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
        ) : (
          /* STOCK / ADD MODE FOOTER */
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
                  placeholderTextColor="#8E7FAA"
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
                placeholderTextColor="#A79ABB"
                value={manual}
                onChangeText={setManual}
                onSubmitEditing={() => {
                  scanned(manual);
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
                  scanned(manual);
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
                  backgroundColor: successBanner ? '#05966966' : '#FFFFFF12',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 14,
                }}
              >
                <Animated.Text
                  key={lastLabel}
                  entering={fade}
                  exiting={fadeOut}
                  numberOfLines={1}
                  style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700', flex: 1 }}
                >
                  {lastLabel
                    ? `✓ ${tr('Last scan', 'ស្កេនចុងក្រោយ')}: ${lastLabel}`
                    : tr('Ready to scan items into stock', 'រួចរាល់សម្រាប់ស្កេនបញ្ចូលស្តុក')}
                </Animated.Text>
                {displayCount && (
                  <View
                    style={{
                      backgroundColor: successBanner ? '#10B981' : theme.accent,
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
