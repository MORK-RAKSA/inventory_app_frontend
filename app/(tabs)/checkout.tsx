import {useState} from 'react';
import {Text,View} from 'react-native';
import Animated,{FadeIn,FadeOut} from 'react-native-reanimated';
import {Plus,Minus,ScanLine,Search,CheckCircle2,ShoppingBag} from 'lucide-react-native';
import {api,Sale,Product} from '../../src/api';
import {useLiveData} from '../../src/hooks/useLiveData';
import {useSounds} from '../../src/hooks/useSounds';
import {useLanguage} from '../../src/i18n';
import {useToast} from '../../src/toast';
import {markEventNotified} from '../../src/liveSync';
import {CameraScanner} from '../../src/components/CameraScanner';
import {ReceiptModal} from '../../src/components/ReceiptModal';
import {ProductImage} from '../../src/components/ProductImage';
import {Press,Segmented,Rise,rise,listLayout,popIn,fade,fadeOut,slideOut} from '../../src/motion';
import {Screen,Card,Btn,C,Field,IconBadge,money,khr,ErrorLine,Empty,Heading} from '../../src/ui';

export default function Checkout() {
  const {t,tr,language} = useLanguage();
  const toast = useToast();
  const [scanning,setScanning] = useState(false);
  const {products,rate,refresh,loading} = useLiveData('products');
  const {playScan,playCheckout,playFail} = useSounds();
  const [receipt,setReceipt] = useState<Sale|null>(null);
  const [cart,setCart] = useState<Record<string,number>>({});
  const [search,setSearch] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [paidCurrency,setPaidCurrency] = useState<'USD'|'KHR'>('KHR');

  const selected = products.filter(p => cart[p.id] > 0);
  const total = selected.reduce((n,p) => n + Number(p.priceUsd) * cart[p.id], 0);
  const units = selected.reduce((n,p) => n + cart[p.id], 0);
  const canAdd = (p:Product) => p.stock > 0 && (cart[p.id] || 0) < p.stock;

  function scanProduct(code:string, qty = 1) {
    const p = products.find(x => x.barcode === code);
    if (p) add(p, qty);
    else {playFail(); const m=language === 'kh' ? 'រកមិនឃើញទំនិញ' : 'Product not found: ' + code;setError(m);toast.show(m,{tone:'error'});}
  }
  function add(p:Product, qty = 1) {
    if (!canAdd(p)) {playFail(); return;}
    playScan(); setError('');
    setCart(c => ({...c, [p.id]: Math.min(p.stock, (c[p.id] || 0) + qty)}));
  }
  function sub(p:Product) {
    setCart(c => {const v = {...c}; if (v[p.id] <= 1) delete v[p.id]; else v[p.id]--; return v;});
  }
  const [lastReceipt,setLastReceipt] = useState<Sale|null>(null);
  async function checkout() {
    setBusy(true); setError('');
    try {
      const sale = await api<Sale>('/sales/checkout', {method: 'POST', body: JSON.stringify({
        idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        paidCurrency,
        items: selected.map(p => ({productId: p.id, quantity: cart[p.id]})),
      })});
      markEventNotified(`sale:${sale.id}`);
      setReceipt(null); setLastReceipt(sale); playCheckout(); setCart({});
      toast.show(`${tr('Payment complete','ទំនិញបានទូទាត់')} · ${sale.id.slice(0,8).toUpperCase()}`, {tone:'success',actionLabel:tr('View receipt','មើលបង្កាន់ដៃ'),onAction:()=>setReceipt(sale),duration:8500});
      await refresh();
    } catch (e) {playFail(); setError(String(e));toast.show(String(e),{tone:'error'});} finally {setBusy(false);}
  }

  const list = products.filter(p => (p.name + ' ' + (p.barcode || '')).toLowerCase().includes(search.toLowerCase())).slice(0, 30);

  return (
    <Screen onRefresh={refresh}
      title={t('checkout')}
      subtitle={tr('Fast, easy checkout','លក់ទំនិញបានឆាប់រហ័ស')}
      right={<IconBadge icon={ShoppingBag} size={40} />}
    >
      <Rise index={2}>
        <Field
          icon={Search}
          placeholder={tr('Barcode or product name','បាកូដ ឬឈ្មោះទំនិញ')}
          value={search}
          onChangeText={setSearch}
          right={
            <Press accessibilityLabel="Open barcode scanner" onPress={() => setScanning(true)} scale={0.9}
              style={{width: 36, height: 36, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginRight: -6}}>
              <ScanLine size={18} color="#fff" />
            </Press>
          }
        />
      </Rise>

      <Heading>{tr('Products','ជ្រើសរើសទំនិញ')}</Heading>
      {list.length === 0 ? <Empty message={t('empty')} /> : list.map((p,i) => {
        const qty = cart[p.id] || 0;
        return (
          <Animated.View key={p.id} entering={rise(i)}>
            <Card>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
                <ProductImage id={p.id} name={p.name} uri={p.imageUrl ?? undefined} />
                <View style={{flex: 1}}>
                  <Text numberOfLines={1} style={{color: C.text, fontWeight: '700', fontSize: 15}}>{p.name}</Text>
                  <Text style={{color: p.stock <= 0 ? C.red : C.muted, fontSize: 11.5, marginVertical: 3}}>{p.stock <= 0 ? tr('Out of stock','អស់ស្តុក') : `${p.stock} ${tr('available','មាន')}`}</Text>
                  <Text style={{color: C.primary, fontWeight: '800'}}>{khr(p.priceUsd * rate)} <Text style={{color: C.muted, fontWeight: '500', fontSize: 11}}>{money(p.priceUsd)}</Text></Text>
                </View>
                {qty === 0 ? (
                  <Animated.View key="add" entering={popIn}>
                    <Press accessibilityLabel={`Add ${p.name}`} disabled={!canAdd(p)} onPress={() => add(p)} scale={0.88}
                      style={{width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: canAdd(p) ? C.primary : C.border}}>
                      <Plus size={20} color={canAdd(p) ? '#fff' : C.faint} />
                    </Press>
                  </Animated.View>
                ) : (
                  <Animated.View key="step" entering={popIn} style={{flexDirection: 'row', alignItems: 'center', backgroundColor: C.pale, borderRadius: 15, padding: 3}}>
                    <Press accessibilityLabel={`Remove one ${p.name}`} onPress={() => sub(p)} scale={0.85} style={{width: 34, height: 34, alignItems: 'center', justifyContent: 'center'}}><Minus size={16} color={C.primary} /></Press>
                    <Text style={{minWidth: 24, textAlign: 'center', color: C.text, fontWeight: '800'}}>{qty}</Text>
                    <Press accessibilityLabel={`Add one ${p.name}`} disabled={!canAdd(p)} onPress={() => add(p)} scale={0.85} style={{width: 34, height: 34, alignItems: 'center', justifyContent: 'center', opacity: canAdd(p) ? 1 : 0.35}}><Plus size={16} color={C.primary} /></Press>
                  </Animated.View>
                )}
              </View>
            </Card>
          </Animated.View>
        );
      })}

      <Heading>{tr('Cart','កន្ត្រក')} ({units})</Heading>
      <Card style={{padding: 20}}>
        {selected.length === 0 ? (
          <Text style={{color: C.muted, textAlign: 'center', paddingVertical: 6}}>{tr('Your cart is empty','មិនទាន់មានទំនិញក្នុងកន្ត្រក')}</Text>
        ) : selected.map(p => (
          <Animated.View key={p.id} layout={listLayout} entering={fade} exiting={slideOut}
            style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7}}>
            <Text numberOfLines={1} style={{color: C.text, flex: 1, paddingRight: 12}}>{p.name} <Text style={{color: C.muted}}>× {cart[p.id]}</Text></Text>
            <Text style={{color: C.text, fontWeight: '700'}}>{khr(p.priceUsd * cart[p.id] * rate)} <Text style={{color: C.muted, fontWeight: '500', fontSize: 11.5}}>({money(p.priceUsd * cart[p.id])})</Text></Text>
          </Animated.View>
        ))}

        <Animated.View layout={listLayout}>
          <View style={{height: 1, backgroundColor: C.border, marginVertical: 14}} />
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{color: C.muted}}>{tr('Total KHR','សរុប KHR')}</Text>
            <Text style={{color: C.primary, fontWeight: '800', fontSize: 28, letterSpacing: -0.6}}>{khr(total * rate)}</Text>
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 6}}>
            <Text style={{color: C.muted}}>{tr('Total USD','សរុប USD')}</Text>
            <Text style={{color: C.text, fontWeight: '700', fontSize: 16}}>{money(total)}</Text>
          </View>
          <Text style={{fontSize: 11.5, color: C.muted, marginTop: 8}}>1 USD = {rate.toLocaleString()} KHR</Text>
          <View style={{marginTop: 16, marginBottom: 16}}>
            <Segmented value={paidCurrency} onChange={setPaidCurrency} options={[{value: 'KHR', label: 'KHR (៛)'}, {value: 'USD', label: 'USD ($)'}]} />
          </View>
          <Btn icon={CheckCircle2} loading={busy} disabled={!units} onPress={() => void checkout()}>
            {busy ? tr('Processing…','កំពុងទូទាត់…') : tr('Complete checkout','បញ្ជាក់ទូទាត់')}
          </Btn>
        </Animated.View>
      </Card>

      <ErrorLine message={error} />
      <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />
      <CameraScanner visible={scanning} mode="add" count={units} onClose={() => setScanning(false)} onCode={scanProduct} title={tr('Scan products to cart','ស្កេនទំនិញចូលកន្ត្រក')} />
    </Screen>
  );
}
