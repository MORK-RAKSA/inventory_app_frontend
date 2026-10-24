import {useEffect,useMemo,useState} from 'react';
import {Alert,Modal,Platform,ScrollView,Text,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Plus,X,ArrowLeftRight,ImagePlus,Pencil,Search,ScanLine,Package,AlertTriangle,Lock} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import {api,ApiError,Product} from '../../src/api';
import {useLiveData} from '../../src/hooks/useLiveData';
import {useLanguage} from '../../src/i18n';
import {useToast} from '../../src/toast';
import {markEventNotified} from '../../src/liveSync';
import {Press,Chip,Rise,rise} from '../../src/motion';
import {Screen,Card,Btn,Field,IconBadge,C,money,khr,roundKhr,Pill,ErrorLine,Empty,Heading} from '../../src/ui';
import {ProductImage,storeProductImage} from '../../src/components/ProductImage';
import {exportExcel} from '../../src/exportExcel';
import {DateInput} from '../../src/components/DateInput';
import {Download} from 'lucide-react-native';
import {CameraScanner} from '../../src/components/CameraScanner';
import {lookupBarcodeOnline} from '../../src/barcodeLookup';
import {SwipeActions} from '../../src/components/SwipeActions';
import {CategorySelect} from '../../src/components/CategorySelect';
import {BarcodeCard} from '../../src/components/BarcodeCard';
import Animated,{FadeIn,FadeOut} from 'react-native-reanimated';

export default function Inventory() {
  const router = useRouter();
  const {products,rate,error:fetchError,refresh,loading} = useLiveData('products');
  const params = useLocalSearchParams<{low?:string;category?:string;expiry?:string}>();
  const {t,tr} = useLanguage();
  const toast=useToast();

  const [search,setSearch] = useState('');
  const [scanTarget,setScanTarget] = useState<'search'|'barcode'|null>(null);
  const [expiry,setExpiry] = useState('');
  const [filter,setFilter] = useState('All');
  const [onlyLow,setOnlyLow] = useState(false);
  const [onlyExpiry,setOnlyExpiry] = useState(false);
  const [expiryFrom,setExpiryFrom] = useState('');
  const [expiryTo,setExpiryTo] = useState('');
  const [modal,setModal] = useState(false);
  const [editing,setEditing] = useState<Product|null>(null);
  const [detail,setDetail] = useState<Product|null>(null);
  const [name,setName] = useState('');
  const [barcode,setBarcode] = useState('');
  const [category,setCategory] = useState('General');
  const [price,setPrice] = useState('');
  const [currency,setCurrency] = useState<'USD'|'KHR'>('KHR');
  const [stock,setStock] = useState('0');
  const [threshold,setThreshold] = useState('5');
  const [photo,setPhoto] = useState<string|undefined>();
  const [lookingUp,setLookingUp] = useState(false);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');

  async function handleBarcodeScan(code: string, qty = 1) {
    if (scanTarget === 'search') {
      setSearch(code);
      setFilter('All');
      setOnlyLow(false);
      setScanTarget(null);
      return;
    }

    const existing = products.find(p => p.barcode === code);
    if (existing) {
      const baseStock = editing?.id === existing.id ? (Number(stock) || existing.stock) : existing.stock;
      const nextStock = baseStock + qty;
      setEditing(existing);
      setName(existing.name);
      setBarcode(existing.barcode || code);
      setCategory(existing.category || 'General');
      setPrice(String(roundKhr(existing.priceUsd * rate)));
      setCurrency('KHR');
      setStock(String(nextStock));
      setThreshold(String(existing.lowStockThreshold ?? 5));
      setExpiry(existing.expirationDate || '');
      toast.show(
        tr(
          `${existing.name}: +${qty} added (Stock → ${nextStock})`,
          `${existing.name}: បានបូក +${qty} (ស្តុក → ${nextStock})`,
        ),
        { tone: 'success' },
      );
      return;
    }

    // New barcode scanned: accumulate quantity if scanned multiple times
    setStock(prev => {
      const currentQty = barcode === code ? (Number(prev) || 0) : 0;
      return String(currentQty + qty);
    });
    setBarcode(code);

    if (!name.trim()) {
      setLookingUp(true);
      try {
        const info = await lookupBarcodeOnline(code);
        if (info) {
          setName(prev => prev.trim() || info.name);
          if (info.category) setCategory(info.category);
          if (info.imageUrl) setPhoto(prev => prev || info.imageUrl);
          toast.show(
            tr(`Auto-filled: ${info.name}`, `បានរកឃើញទំនិញ៖ ${info.name}`),
            { tone: 'success' },
          );
        }
      } finally {
        setLookingUp(false);
      }
    }
  }

  useEffect(() => {
    setOnlyLow(params.low === '1');
    setOnlyExpiry(params.expiry === '1');
    if (typeof params.category === 'string') setFilter(params.category);
  }, [params.low, params.category, params.expiry]);

  const cats = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))], [products]);
  const low = products.filter(p => p.stock <= p.lowStockThreshold);
  const visible = products.filter(p =>
    (filter === 'All' || p.category === filter) &&
    (!onlyLow || p.stock <= p.lowStockThreshold) &&
    (!onlyExpiry || Boolean(p.expirationDate && new Date(p.expirationDate + 'T23:59:59').getTime() <= Date.now() + 7*86400000)) &&
    (!expiryFrom || Boolean(p.expirationDate && p.expirationDate >= expiryFrom)) &&
    (!expiryTo || Boolean(p.expirationDate && p.expirationDate <= expiryTo)) &&
    (p.name + ' ' + (p.barcode || '') + ' ' + p.category).toLowerCase().includes(search.toLowerCase()));

  function open(p?:Product) {
    setEditing(p || null); setName(p?.name || ''); setBarcode(p?.barcode || ''); setCategory(p?.category || 'General');
    setPrice(p ? String(roundKhr(p.priceUsd * rate)) : ''); setCurrency('KHR'); setStock(String(p?.stock ?? 0)); setThreshold(String(p?.lowStockThreshold ?? 5));
    setPhoto(undefined); setExpiry(p?.expirationDate || ''); setDetail(null); setError(''); setModal(true);
  }
  function switchCurrency() {
    if (price && Number.isFinite(Number(price))) {
      setPrice(currency === 'USD' ? String(roundKhr(Number(price) * rate)) : String(Number((Number(price) / rate).toFixed(2))));
    }
    setCurrency(currency === 'USD' ? 'KHR' : 'USD');
  }
  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {Alert.alert('Permission required', 'Allow photo library access to select a product image.'); return;}
    const result = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], allowsEditing: true, quality: 0.75});
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }
  function genCode() {
    setBarcode('RF' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 7).toUpperCase());
  }
  /** Upload to the server (Cloudflare R2) when it is configured; otherwise keep the photo on this device. */
  async function attachPhoto(id:string, uri:string) {
    try {
      const ext = (uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
      const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const form = new FormData();
      form.append('file', {uri, name: `product.${ext}`, type} as any);
      await api<Product>(`/products/${id}/image`, {method: 'POST', body: form});
    } catch (e) {
      await storeProductImage(id, uri); // always keep a local copy so the photo is never lost
      if (!(e instanceof ApiError && e.status === 501))
        Alert.alert(tr('Photo saved on this device only','រូបភាពរក្សាទុកក្នុងឧបករណ៍នេះប៉ុណ្ណោះ'), String(e instanceof Error ? e.message : e));
    }
  }
  async function save() {
    const qty = Number(stock), amount = Number(price), limit = Number(threshold);
    if (!name.trim() || !category.trim() || !Number.isFinite(amount) || amount < 0 || !Number.isInteger(qty) || qty < 0 || !Number.isInteger(limit) || limit < 0) {
      setError('Enter a valid name, category, non-negative price, stock and threshold'); return;
    }
    if (expiry && (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) || Number.isNaN(new Date(expiry).getTime()))) {setError('Expiry date must be YYYY-MM-DD');return;}
    setSaving(true); setError('');
    try {
      const body = {name: name.trim(), ...(editing ? {} : {barcode: barcode.trim() || null}), category: category.trim(), price: amount, currency, stock: qty, lowStockThreshold: limit, expirationDate: expiry || null};
      const result = await api<Product>(editing ? `/products/${editing.id}` : '/products', {method: editing ? 'PUT' : 'POST', body: JSON.stringify(body)});
      if (result?.id) {
        markEventNotified(`add:${result.id}`);
        markEventNotified(`upd:${result.id}:${result.stock}:${Number(result.priceUsd).toFixed(4)}:${result.name}`);
      }
      if (photo) await attachPhoto(result.id || editing!.id, photo);
      setModal(false); toast.show(editing ? tr('Product updated','បានកែប្រែទំនិញ') : tr('Product added','បានបន្ថែមទំនិញ'),{tone:'success'}); await refresh();
    } catch (e) {const m=e instanceof Error ? e.message : String(e);setError(m);toast.show(m,{tone:'error'});} finally {setSaving(false);}
  }
  function remove(p:Product) {
    const doArchive = () =>
      void api(`/products/${p.id}`, {method: 'DELETE'})
        .then(() => {
          toast.show(tr('Product archived','បានលុបទំនិញ'), {tone:'success'});
          return refresh();
        })
        .catch(e => {
          setError(String(e));
          toast.show(String(e), {tone:'error'});
        });
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Archive ${p.name}?`)) doArchive();
      return;
    }
    Alert.alert('Archive product?', `Archive ${p.name}?`, [
      {text: 'Cancel'},
      {text: 'Archive', style: 'destructive', onPress: doArchive},
    ]);
  }

  return (
    <Screen onRefresh={refresh}
      title={t('inventory')}
      subtitle={`${products.length} ${tr('products','ទំនិញ')} · ${products.reduce((n,p) => n + p.stock, 0)} ${tr('units','ឯកតា')}`}

    >
      <Rise index={2} style={{flexDirection: 'row', gap: 12}}>
        <Card style={{flex: 1}}>
          <IconBadge icon={Package} size={36} />
          <Text style={{color: C.muted, marginTop: 12, fontSize: 12.5}}>{t('products')}</Text>
          <Text style={{color: C.text, fontSize: 26, fontWeight: '800'}}>{products.length}</Text>
        </Card>
        <Press scale={0.97} onPress={() => setOnlyLow(!onlyLow)} style={{flex: 1}}>
          <Card style={onlyLow ? {borderWidth: 1.5, borderColor: C.amber} : undefined}>
            <IconBadge icon={AlertTriangle} size={36} tone="amber" />
            <Text style={{color: C.muted, marginTop: 12, fontSize: 12.5}}>{t('lowStock')}</Text>
            <Text style={{color: C.amber, fontSize: 26, fontWeight: '800'}}>{low.length}</Text>
          </Card>
        </Press>
      </Rise>

      <Rise index={3}>
        <View style={{flexDirection:'row',gap:12,alignItems:'center'}}><View style={{flex:1}}><Btn soft icon={ScanLine} onPress={() => router.push('/batch')}>{tr('Batch add','បន្ថែមច្រើន')}</Btn></View><Press accessibilityLabel="Export all inventory to Excel" onPress={() => void exportExcel('all-items.xlsx',['ID','Name','Barcode','Category','USD Price','Stock','Threshold','Expiration Date'],products.map(p=>[p.id,p.name,p.barcode,p.category,p.priceUsd,p.stock,p.lowStockThreshold,p.expirationDate]))} style={{height:48,width:48,borderRadius:13,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'}}><Download size={20} color={C.primary}/></Press></View>
        <View style={{height: 16}} />
        <View style={{flexDirection:'row',alignItems:'center',gap:7,marginBottom:12}}>
          <View style={{flex:1}}><Field icon={Search} placeholder={t('search')} value={search} onChangeText={setSearch} style={{marginBottom:0}} /></View>
          <Press accessibilityLabel="Scan barcode to search" onPress={() => setScanTarget('search')} style={{height:50,paddingHorizontal:13,borderRadius:14,backgroundColor:'#E6F7F5',borderWidth:1,borderColor:'#99E6DC',flexDirection:'row',alignItems:'center',gap:5}}>
            <ScanLine color="#0D9488" size={19}/>
            <Text style={{color:'#0D9488',fontWeight:'800',fontSize:12}}>{tr('Find','ស្វែងរក')}</Text>
          </Press>
          <Press accessibilityLabel="Add product" onPress={() => open()} style={{width:50,height:50,borderRadius:14,backgroundColor:C.primary,alignItems:'center',justifyContent:'center'}}><Plus color="white" size={22}/></Press>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 6}}>
          {['All', ...cats].map(c => <Chip key={c} active={filter === c} label={c === 'All' ? t('all') : c} onPress={() => setFilter(c)} />)}
        </ScrollView>
      </Rise>

      <View style={{flexDirection:'row',gap:10}}><DateInput label="Expiry from" value={expiryFrom} onChange={setExpiryFrom}/><DateInput label="Expiry to" value={expiryTo} onChange={setExpiryTo}/></View>
      {onlyExpiry && <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
        <Press onPress={()=>setOnlyExpiry(false)} style={{padding:14,backgroundColor:C.amberPale,borderRadius:14,marginVertical:8,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:'#E8D9A8'}}>
          <AlertTriangle size={18} color={C.amber} />
          <Text style={{color:C.amber,fontWeight:'800',flex:1,fontSize:13.5}}>Expired / expiring within 7 days ({visible.length})</Text>
          <View style={{width:28,height:28,borderRadius:8,backgroundColor:'rgba(217,142,18,0.15)',alignItems:'center',justifyContent:'center'}}><X color={C.amber} size={15}/></View>
        </Press>
      </Animated.View>}
      {onlyLow && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={{marginTop: 8}}>
          <Btn outline small onPress={() => setOnlyLow(false)}>{tr('Showing low stock · Clear filter','កំពុងបង្ហាញស្តុកជិតអស់ · សម្អាតតម្រង')}</Btn>
        </Animated.View>
      )}
      <Heading>{onlyExpiry ? tr('Expired / expiring products','ទំនិញផុតកំណត់ / ជិតផុតកំណត់') : onlyLow ? t('lowStock') : t('products')}</Heading>


      {visible.length === 0 ? <Empty message={t('empty')} /> : visible.map((p,i) => (
        <Animated.View key={p.id} entering={rise(i)}>
          <SwipeActions onEdit={() => open(p)} onDelete={() => remove(p)} editLabel={tr('Edit','កែប្រែ')} deleteLabel={tr('Archive','លុប')}>
            <Press scale={0.985} onPress={() => setDetail(p)}>
              <Card>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
                  <ProductImage id={p.id} name={p.name} uri={p.imageUrl ?? undefined} />
                  <View style={{flex: 1}}>
                    <Text numberOfLines={1} style={{fontWeight: '700', color: C.text, fontSize: 15.5}}>{p.name}</Text>
                    <Text numberOfLines={1} style={{color: C.muted, fontSize: 11.5, marginVertical: 4}}>{p.category} · {p.barcode || tr('No barcode','គ្មានបាកូដ')}</Text>
                    <Text style={{color: C.primary, fontWeight: '800', fontSize: 14}}>{khr(p.priceUsd * rate)} <Text style={{color: C.muted, fontWeight: '500', fontSize: 11.5}}>{money(p.priceUsd)}</Text></Text>
                  </View>
                  {p.expirationDate && <Text style={{fontSize:10.5,color:new Date(p.expirationDate+'T23:59:59').getTime() <= Date.now()+7*86400000?C.red:C.muted}}>{'EXP '+p.expirationDate}</Text>}
                  <Pill tone={p.stock === 0 ? 'red' : p.stock <= p.lowStockThreshold ? 'amber' : 'green'}>{p.stock === 0 ? tr('Out of stock','អស់ស្តុក') : `${p.stock} ${tr('left','នៅសល់')}`}</Pill>
                </View>
              </Card>
            </Press>
          </SwipeActions>
        </Animated.View>
      ))}
      <ErrorLine message={fetchError || error} />

      {/* Product details */}
      <Modal visible={!!detail} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetail(null)}>
        <ScrollView style={{backgroundColor: C.bg}} contentContainerStyle={{padding: 22, flexGrow: 1}} showsVerticalScrollIndicator={false}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18}}>
            <Text style={{fontWeight: '800', color: C.text, fontSize: 24, letterSpacing: -0.4}}>{tr('Product details','ព័ត៌មានទំនិញ')}</Text>
            {detail && (
              <Press accessibilityLabel="Edit product" onPress={() => open(detail)} style={{width: 42, height: 42, borderRadius: 14, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center'}}>
                <Pencil size={19} color={C.primary} />
              </Press>
            )}
          </View>
          {detail && (
            <>
              <Rise>
                <Card style={{alignItems: 'center', paddingVertical: 26}}>
                  <ProductImage id={detail.id} name={detail.name} size={150} uri={detail.imageUrl ?? undefined} />
                  <Text style={{fontWeight: '800', color: C.text, fontSize: 21, marginTop: 16, textAlign: 'center'}}>{detail.name}</Text>
                  <Text style={{color: C.muted, marginVertical: 8}}>{detail.category} · {detail.stock} {tr('in stock','ក្នុងស្តុក')}</Text>
                  <Text style={{color: C.primary, fontWeight: '800', fontSize: 24}}>{khr(detail.priceUsd * rate)}</Text>
                  <Text style={{color: C.muted, fontWeight: '600', fontSize: 14, marginTop: 3}}>{money(detail.priceUsd)}</Text>
                </Card>
              </Rise>
              <Rise index={1}>
                <BarcodeCard
                  value={detail.barcode || ('RF' + detail.id.replace(/-/g, '').slice(0, 15).toUpperCase())}
                  onGenerate={() => Alert.alert('Existing barcode protected', 'An existing product barcode cannot be replaced. Create a new product for a new barcode.')} />
              </Rise>
            </>
          )}
          <Btn outline onPress={() => setDetail(null)}>{tr('Close','បិទ')}</Btn>
        </ScrollView>
      </Modal>

      {/* Add / edit form */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}>
        <ScrollView style={{backgroundColor: C.bg}} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding: 22, flexGrow: 1, paddingBottom: 40}} showsVerticalScrollIndicator={false}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22}}>
            <Text style={{color: C.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.4}}>{editing ? t('edit') : tr('Add product','បន្ថែមទំនិញ')}</Text>
            <Press accessibilityLabel="Close" onPress={() => setModal(false)} style={{width: 40, height: 40, borderRadius: 14, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center'}}><X color={C.primary} size={20} /></Press>
          </View>

          <Field label={tr('Product name','ឈ្មោះទំនិញ')} placeholder={tr('Product name','ឈ្មោះទំនិញ')} value={name} onChangeText={setName} />
          <Text style={{color: C.muted, fontSize: 12, fontWeight: '700', marginBottom: 7}}>{t('category')}</Text>
          <CategorySelect value={category} categories={cats} onChange={setCategory} />

          <Text style={{color: C.muted, fontSize: 12, fontWeight: '700', marginBottom: 7}}>{tr('Barcode','បាកូដ')}{lookingUp ? ` · ${tr('Looking up product info…','កំពុងស្វែងរកព័ត៌មានទំនិញ…')}` : ''}</Text>
          {editing ? (
            <View style={{backgroundColor: C.pale, borderRadius: 14, padding: 15, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12}}>
              <Lock size={18} color={C.primary} />
              <View style={{flex: 1}}>
                <Text selectable style={{color: C.text, fontWeight: '700'}}>{barcode || tr('No barcode','គ្មានបាកូដ')}</Text>
                <Text style={{color: C.muted, fontSize: 11.5, marginTop: 2}}>{tr('Existing product — scan again to add more stock','ទំនិញមានស្រាប់ — ស្កេនម្តងទៀតដើម្បីបូកស្តុកបន្ថែម')}</Text>
              </View>
              <Press accessibilityLabel="Scan to add stock" onPress={() => setScanTarget('barcode')} style={{padding: 10, borderRadius: 10, backgroundColor: C.surface}}>
                <ScanLine color={C.primary} size={20} />
              </Press>
            </View>
          ) : (
            <>
              <View style={{flexDirection:'row',gap:8,alignItems:'center'}}><View style={{flex:1}}><Field placeholder={tr('Barcode','បាកូដ')} value={barcode} onChangeText={setBarcode}/></View><Press accessibilityLabel="Scan barcode" onPress={() => setScanTarget('barcode')} style={{padding:13,borderRadius:12,backgroundColor:C.pale}}><ScanLine color={C.primary} size={22}/></Press></View>
              <Btn soft small onPress={genCode} style={{marginBottom: 16}}>{tr('Generate unique Code 128 value','បង្កើតបាកូដ Code 128')}</Btn>
            </>
          )}

          <Text style={{color: C.muted, fontSize: 12, fontWeight: '700', marginBottom: 7}}>{tr('Selling price','តម្លៃលក់')} ({currency === 'KHR' ? '៛ KHR' : '$ USD'})</Text>
          <View style={{flexDirection: 'row', alignItems: 'flex-start', gap: 10}}>
            <Field style={{flex: 1}} placeholder={currency === 'KHR' ? '0 ៛' : '0.00'} value={price} keyboardType="decimal-pad" onChangeText={setPrice} />
            <Press onPress={switchCurrency} style={{height: 50, paddingHorizontal: 14, backgroundColor: C.pale, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <ArrowLeftRight size={15} color={C.primary} />
              <Text style={{color: C.primary, fontWeight: '800'}}>{currency === 'KHR' ? '៛ KHR' : '$ USD'}</Text>
            </Press>
          </View>
          <View style={{flexDirection: 'row', gap: 12}}>
            <Field style={{flex: 1}} label={t('stock')} placeholder="0" value={stock} keyboardType="number-pad" onChangeText={setStock} />
            <Field style={{flex: 1}} label={tr('Low stock at','ស្តុកជិតអស់នៅ')} placeholder="5" value={threshold} keyboardType="number-pad" onChangeText={setThreshold} />
          </View>

          <DateInput label={tr('Expiration date','កាលបរិច្ឆេទផុតកំណត់')} value={expiry} onChange={setExpiry} placeholder="Select expiration date" />
          <Text style={{color: C.muted, fontSize: 12, fontWeight: '700', marginBottom: 7}}>{t('image')} · {tr('uploaded when server storage is on','ផ្ទុកឡើងបើម៉ាស៊ីនមេបើកដំណើរការ')}</Text>
          <Press onPress={() => void pickPhoto()} style={{backgroundColor: C.pale, padding: 15, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16}}>
            <ImagePlus size={20} color={C.primary} />
            <Text style={{color: C.primary, fontWeight: '700'}}>{photo ? tr('Change selected image','ប្តូររូបភាព') : tr('Choose image from gallery','ជ្រើសរូបភាពពីវិចិត្រសាល')}</Text>
          </Press>
          {photo && <View style={{marginBottom: 16}}><ProductImage id="preview" name={name} uri={photo} size={110} /></View>}
          <ErrorLine message={error} />
          <View style={{flexDirection:'row',gap:10}}><View style={{flex:1}}><Btn outline onPress={() => setModal(false)}>{tr('Cancel','បោះបង់')}</Btn></View><View style={{flex:1}}><Btn loading={saving} onPress={() => void save()}>{saving ? tr('Saving…','កំពុងរក្សាទុក…') : t('save')}</Btn></View></View>
        </ScrollView>
      </Modal>
      <CameraScanner
        visible={!!scanTarget}
        mode={scanTarget === 'search' ? 'search' : 'add'}
        title={scanTarget === 'search' ? tr('Scan to find product','ស្កេនដើម្បីស្វែងរកទំនិញ') : tr('Scan item / bulk restock','ស្កេនទំនិញ ឬបូកស្តុកច្រើន')}
        count={scanTarget === 'barcode' ? Number(stock) || 0 : 0}
        onClose={() => setScanTarget(null)}
        onCode={(code, qty = 1) => {
          void handleBarcodeScan(code, qty);
        }}
      />
    </Screen>
  );
}
