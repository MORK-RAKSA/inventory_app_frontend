import { useEffect, useRef, useState } from 'react';
import { useWindowDimensions, Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { QrCode, X, ShieldCheck } from 'lucide-react-native';
import { P } from '../theme';
import { api } from '../../api';

type Payment = { id: string; status: string; amount: number; currency: string; qrImage?: string; expiresAt: number };
// An idempotency identifier, never an authentication credential.
const requestId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.floor(Math.random() * 16);
  return (c === 'x' ? r : (r & 3) | 8).toString(16);
});

export function PayWaySandbox({ amount = 0.01, visible, onClose }: { amount?: number; visible?: boolean; onClose?: () => void }) {
  const { width, height } = useWindowDimensions();
  const wide = width >= 720;
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const key = useRef(requestId());
  const inFlight = useRef(false);
  async function create() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const config = await api<{ enabled: boolean }>('/payments/sandbox/config');
      if (!config.enabled) throw new Error('The connected backend has not loaded ABA sandbox settings. Restart the local backend with its sandbox configuration, or configure PAYWAY_SANDBOX_ENABLED, PAYWAY_MERCHANT_ID and PAYWAY_API_KEY on the hosted backend.');
      const result = await api<Payment>('/payments/sandbox', {
        method: 'POST', body: JSON.stringify({ requestId: key.current, amount: Number(amount.toFixed(2)) }),
      });
      setPayment(result);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create sandbox QR'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function check(id: string) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {
      setPayment(await api<Payment>(`/payments/sandbox/${encodeURIComponent(id)}/check`, { method: 'POST' }));
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Verification unavailable. Payment is unconfirmed.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  useEffect(() => {
    if (!(visible ?? open) || payment?.status !== 'PENDING') return;
    const timer = setInterval(() => { void check(payment.id); }, 5000);
    return () => clearInterval(timer);
  }, [visible, open, payment?.id, payment?.status]);
  const button = (label: string, action: () => void) => <Pressable disabled={busy} onPress={action}
    style={{ backgroundColor: '#47645A', padding: 15, borderRadius: 12, alignItems: 'center', opacity: busy ? 0.5 : 1 }}>
    <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{label}</Text>
  </Pressable>;
  return <>
    {visible === undefined && button('Generate QR sandbox test', () => setOpen(true))}
    <Modal visible={visible ?? open} transparent animationType="fade" onRequestClose={() => { setOpen(false); onClose?.(); }}>
      <View style={{ flex: 1, backgroundColor: 'rgba(26,25,50,0.48)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ flexShrink: 1, maxHeight: '90%', width: '100%', maxWidth: payment ? 860 : 520, backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: P.border , overflow: 'hidden' }}>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 24, gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ padding: 12, borderRadius: 14, backgroundColor: P.primaryLight }}><QrCode size={24} color={P.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 19, fontWeight: '700', color: P.text }}>{payment ? 'ស្កេន QR ដើម្បីទូទាត់' : 'បញ្ជាក់ការទូទាត់'}</Text>
              <Text style={{ color: P.muted, fontSize: 12, marginTop: 3 }}>EasySell · ABA PayWay</Text>
            </View>
            <Pressable accessibilityLabel="Close" onPress={() => { setOpen(false); onClose?.(); }} style={{ padding: 9, backgroundColor: P.surfaceAlt, borderRadius: 10 }}><X size={20} color={P.muted} /></Pressable>
          </View>
          <View style={{ flexDirection: wide && payment ? 'row-reverse' : 'column-reverse', gap: 24, alignItems: 'stretch' }}>
          <View style={{ flex: 1, minWidth: 0, gap: 18 }}>
          <View style={{ backgroundColor: '#F1F5F4', padding: 20, borderRadius: 16, alignItems: 'center', gap: 5 }}>
            <Text style={{ color: P.muted, fontSize: 12 }}>សរុបត្រូវបង់ · Total due</Text>
            <Text style={{ fontSize: 32, fontWeight: '700', color: '#31594B' }}>${amount.toFixed(2)} <Text style={{ fontSize: 14 }}>USD</Text></Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <ShieldCheck size={16} color={P.primary} /><Text style={{ color: P.muted, fontSize: 12, flex: 1 }}>សាកល្បង Sandbox · No sale or stock changes</Text>
          </View>
          {payment && <>
            <View style={{ backgroundColor: P.primaryLight, padding: 10, borderRadius: 10, alignItems: 'center' }}><Text style={{ color: P.primary, fontWeight: '700' }}>{payment.status === 'APPROVED' ? '✓ Verified by ABA · Sandbox' : payment.status === 'PENDING' ? 'រង់ចាំការទូទាត់ · Awaiting payment' : payment.status}</Text></View>
            <Text selectable style={{ color: P.muted, fontSize: 11, textAlign: 'center' }}>{payment.id}</Text>

            <Text style={{ color: P.muted, fontSize: 12, textAlign: 'center' }}>QR expires: {new Date(payment.expiresAt * 1000).toLocaleTimeString()}</Text>

          </>}
          {!!error && <View style={{ padding: 12, borderRadius: 12, backgroundColor: '#FFF1F2' }}><Text style={{ color: '#A13333', fontSize: 13 }}>{error}</Text></View>}
          </View>
          {payment && <View style={{ flex: wide ? 1 : undefined, minWidth: 0, backgroundColor: '#FAFAFD', borderWidth: 1, borderColor: P.border, borderRadius: 18, padding: 16, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: P.text, fontWeight: '700' }}>KHQR</Text>
            {payment.qrImage && payment.status === 'PENDING' ?
              <Image source={{ uri: payment.qrImage }} style={{ width: '100%', height: Math.max(240, Math.min(460, height - 300)), backgroundColor: '#FFFFFF', borderRadius: 12 }} resizeMode="contain" accessibilityLabel="ABA sandbox payment QR" /> :
              <View style={{ padding: 48 }}><QrCode size={72} color={P.muted} /></View>}
            <Text style={{ color: P.muted, fontSize: 12, textAlign: 'center' }}>ស្កេន QR ដើម្បីទូទាត់ · Scan to pay</Text>
          </View>}
          </View>
        </ScrollView>
        <View style={{ flexShrink: 0, paddingHorizontal: 24, paddingBottom: 20, paddingTop: 14, borderTopWidth: 1, borderColor: P.border, backgroundColor: '#FFFFFF', flexDirection: 'row', gap: 24 }}>
          {wide && payment && <View style={{ flex: 1 }} />}
          <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
            {!payment && <Text style={{ color: P.textSub, fontSize: 12 }}>បញ្ជាក់ចំនួនទឹកប្រាក់ ដើម្បីបង្កើត QR</Text>}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => { setOpen(false); onClose?.(); }} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: P.border, backgroundColor: P.surfaceAlt }}>
                <Text style={{ color: P.textSub, textAlign: 'center', fontWeight: '700' }}>បិទ · Close</Text>
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                {!payment ? button(busy ? 'Creating…' : 'បង្ហាញ QR', () => { setConfirmed(true); void create(); }) :
                  ['APPROVED', 'EXPIRED', 'ERROR'].includes(payment.status) ? button('New test', () => { key.current = requestId(); setPayment(null); setError(''); }) :
                  button('Check payment', () => { void check(payment.id); })}
              </View>
            </View>
          </View>
                  </View>
        </View>
      </View>
    </Modal>
  </>;
}
