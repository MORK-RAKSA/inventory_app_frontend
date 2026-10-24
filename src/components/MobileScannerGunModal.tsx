import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeType } from 'expo-camera';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  ArrowLeft,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  Radio,
  ScanLine,
  Send,
  ShoppingBag,
  Sliders,
  Smartphone,
  Sparkles,
  Wifi,
  X,
} from 'lucide-react-native';
import { api } from '../api';
import { C } from '../theme';
import { Press } from '../motion';
import { useLanguage } from '../i18n';
import { useSounds } from '../hooks/useSounds';
import { canonicalBarcode } from '../barcode';

const BARCODE_TYPES: BarcodeType[] = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'qr',
];

interface ScannedHistoryItem {
  id: string;
  barcode: string;
  mode: 'pos' | 'batch';
  time: string;
}

export function MobileScannerGunModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { tr } = useLanguage();
  const { playScan, playFail } = useSounds();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [mode, setMode] = useState<'pos' | 'batch'>('pos');
  const [history, setHistory] = useState<ScannedHistoryItem[]>([]);
  const [lastBeamed, setLastBeamed] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [beaming, setBeaming] = useState(false);

  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const scanLineAnim = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scanLineAnim.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [visible, scanLineAnim]);

  const laserStyle = useAnimatedStyle(() => ({
    top: `${scanLineAnim.value * 88 + 6}%`,
  }));

  async function beamBarcode(rawBarcode: string) {
    const clean = canonicalBarcode(rawBarcode);
    if (!clean || clean.length < 3) return;

    // Throttle duplicate reads within 1.2s to prevent runaway repeat loops
    const now = Date.now();
    if (lastScannedRef.current.code === clean && now - lastScannedRef.current.time < 1200) {
      return;
    }
    lastScannedRef.current = { code: clean, time: now };

    setBeaming(true);
    setLastBeamed(clean);

    try {
      if (Platform.OS !== 'web') {
        Vibration.vibrate(70);
      }
      playScan();

      await api('/events/scan', {
        method: 'POST',
        body: JSON.stringify({
          barcode: clean,
          scanMode: mode,
        }),
      });

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setHistory((prev) => [
        {
          id: `${Date.now()}-${clean}`,
          barcode: clean,
          mode,
          time: nowStr,
        },
        ...prev.slice(0, 19),
      ]);
    } catch {
      playFail();
    } finally {
      setTimeout(() => setBeaming(false), 300);
    }
  }

  function handleBarcodeScanned(result: { data?: string }) {
    if (!result?.data) return;
    void beamBarcode(result.data);
  }

  function handleManualSubmit() {
    if (!manualCode.trim()) return;
    const code = manualCode.trim();
    setManualCode('');
    void beamBarcode(code);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: '#0B0F19' }}>
        {/* Top Header */}
        <View
          style={{
            paddingTop: Platform.OS === 'ios' ? 68 : 30,
            paddingHorizontal: 16,
            paddingBottom: 14,
            backgroundColor: '#111827',
            borderBottomWidth: 1,
            borderColor: '#1F2937',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Press
              onPress={onClose}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#1F2937',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </Press>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Smartphone size={16} color="#A78BFA" />
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                  {tr('Mobile Scanner Gun', 'ម៉ាស៊ីនស្កេនទូរស័ព្ទ')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' }} />
                <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>
                  {tr('Connected to Web Portal', 'ភ្ជាប់ជាមួយ Portal តាម Realtime')}
                </Text>
              </View>
            </View>
          </View>

          {/* Flashlight toggle */}
          <Press
            onPress={() => setTorch((t) => !t)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: torch ? '#F59E0B' : '#1F2937',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {torch ? <Flashlight size={18} color="#000000" /> : <FlashlightOff size={18} color="#9CA3AF" />}
          </Press>
        </View>

        {/* Target Destination Switcher */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#111827',
            paddingHorizontal: 16,
            paddingVertical: 10,
            gap: 10,
          }}
        >
          <Press
            onPress={() => setMode('pos')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: mode === 'pos' ? C.primary : '#1F2937',
            }}
          >
            <ShoppingBag size={16} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
              {tr('POS Checkout', 'គិតលុយ POS')}
            </Text>
          </Press>

          <Press
            onPress={() => setMode('batch')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: mode === 'batch' ? C.primary : '#1F2937',
            }}
          >
            <Sliders size={16} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
              {tr('Batch / Ledger', 'បញ្ជីស្តុក & បង្កើត')}
            </Text>
          </Press>
        </View>

        {/* Viewfinder Camera Area */}
        <View style={{ height: 260, backgroundColor: '#000000', position: 'relative' }}>
          {permission?.granted ? (
            <CameraView
              style={{ flex: 1 }}
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
              onBarcodeScanned={handleBarcodeScanned}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>
                {tr('Camera permission is required for the scanner gun.', 'ត្រូវការសិទ្ធិប្រើប្រាស់កាមេរ៉ាដើម្បីស្កេន')}
              </Text>
              <Press
                onPress={() => void requestPermission()}
                style={{
                  backgroundColor: C.primary,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                  {tr('Grant Camera Access', 'អនុញ្ញាតប្រើកាមេរ៉ា')}
                </Text>
              </Press>
            </View>
          )}

          {/* Scanner Reticle Overlay */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 30,
              left: 40,
              right: 40,
              bottom: 30,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: beaming ? '#10B981' : 'rgba(255,255,255,0.4)',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: beaming ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            }}
          >
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: 8,
                  right: 8,
                  height: 2,
                  backgroundColor: beaming ? '#10B981' : '#A78BFA',
                  shadowColor: '#A78BFA',
                  shadowOpacity: 0.8,
                  shadowRadius: 6,
                },
                laserStyle,
              ]}
            />
          </View>
        </View>

        {/* Live Beaming HUD Alert */}
        {lastBeamed ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: '#064E3B',
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: '#10B981',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <CheckCircle2 size={20} color="#34D399" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#A7F3D0', fontSize: 11, fontWeight: '700' }}>
                  {tr('BEAMED TO WEB PORTAL', 'បានបញ្ជូនទៅកាន់ WEB PORTAL')}
                </Text>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }} numberOfLines={1}>
                  {lastBeamed}
                </Text>
              </View>
            </View>
            <View
              style={{
                backgroundColor: '#047857',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                {mode === 'pos' ? 'POS' : 'BATCH'}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Manual Barcode Fallback Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#1F2937',
            marginHorizontal: 16,
            marginTop: 12,
            borderRadius: 10,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: '#374151',
          }}
        >
          <ScanLine size={16} color="#9CA3AF" />
          <TextInput
            value={manualCode}
            onChangeText={setManualCode}
            onSubmitEditing={handleManualSubmit}
            placeholder={tr('Or type barcode to beam...', 'ឬវាយបញ្ចូលបាកូដដើម្បីបញ្ជូន...')}
            placeholderTextColor="#9CA3AF"
            keyboardType="default"
            returnKeyType="send"
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 10,
              color: '#FFFFFF',
              fontSize: 13,
            }}
          />
          <Press
            onPress={handleManualSubmit}
            style={{
              backgroundColor: manualCode.trim() ? C.primary : '#374151',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
            }}
          >
            <Send size={14} color="#FFFFFF" />
          </Press>
        </View>

        {/* Beamed Barcode Log History */}
        <View style={{ flex: 1, marginTop: 14, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
              {tr('Live Beamed Log', 'ប្រវត្តិស្កេនបញ្ជូន')} ({history.length})
            </Text>
            {history.length > 0 && (
              <Press onPress={() => setHistory([])}>
                <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>
                  {tr('Clear', 'សម្អាត')}
                </Text>
              </Press>
            )}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
            {history.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Wifi size={28} color="#4B5563" />
                <Text style={{ color: '#6B7280', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                  {tr(
                    'Point camera at items to scan continuously.\nEvery barcode beams to the Web Portal POS in real-time!',
                    'ចង្អុលកាមេរ៉ាទៅកាន់បាកូដទំនិញដើម្បីស្កេនបន្តបន្ទាប់។\nបាកូដនីមួយៗនឹងបញ្ជូនទៅកាន់ Web Portal ភ្លាមៗ!'
                  )}
                </Text>
              </View>
            ) : (
              history.map((item) => (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: '#111827',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginBottom: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderLeftWidth: 3,
                    borderLeftColor: item.mode === 'pos' ? '#10B981' : '#6366F1',
                  }}
                >
                  <View>
                    <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' }}>
                      {item.barcode}
                    </Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>
                      {item.mode === 'pos' ? tr('To POS Cart', 'ទៅកាន់ POS') : tr('To Inventory', 'ទៅកាន់ស្តុក')}
                    </Text>
                  </View>
                  <Text style={{ color: '#6B7280', fontSize: 11 }}>{item.time}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
