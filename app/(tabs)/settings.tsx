import {useCallback,useEffect,useState} from 'react';
import {Text,View,ActivityIndicator} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated,{FadeIn,FadeOut} from 'react-native-reanimated';
import {useFocusEffect} from 'expo-router';
import {ArrowLeftRight,ShieldCheck,Globe2,Info,CheckCircle2,ScanLine,Radio,Smartphone,User,LogOut,Sparkles,SlidersHorizontal,RefreshCw} from 'lucide-react-native';
import {api,Settings} from '../../src/api';
import {logout,getUsername,getUserRole,getFullName} from '../../src/auth';
import {showSignedOut} from '../../src/authEvents';
import {Pressable} from 'react-native';
import {useLanguage} from '../../src/i18n';
import {Segmented,Rise} from '../../src/motion';
import {Screen,Card,Btn,C,Field,Heading,ErrorLine,IconBadge,roundKhr,khr} from '../../src/ui';
import {MobileScannerGunModal} from '../../src/components/MobileScannerGunModal';
import {fetchUsdKhrRate,ExchangeRateQuote,describeRateSource,loadLastRateQuote} from '../../src/exchangeRate';

export default function SettingsPage() {
  const {language,setLanguage,t,tr} = useLanguage();
  const [rate,setRate] = useState('4100');
  const [rateQuote,setRateQuote] = useState<ExchangeRateQuote | null>(null);
  const [currencyMode, setCurrencyMode] = useState<'live' | 'manual'>('manual');
  const [syncingLive, setSyncingLive] = useState(false);
  const [err,setErr] = useState('');
  const [message,setMessage] = useState('');
  const [saving,setSaving] = useState(false);
  const [scannerGunOpen, setScannerGunOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    void api<Settings>('/settings').then(v => setRate(String(v.usdToKhr))).catch(e => setErr(String(e)));
    AsyncStorage.getItem('retailflow_currency_mode').then((saved) => {
      if (saved === 'live' || saved === 'manual') setCurrencyMode(saved as 'live' | 'manual');
    }).catch(() => {});
    // Keep the last known source visible even before the next sync finishes.
    void loadLastRateQuote().then((q) => { if (q) setRateQuote(q); });
  }, []));

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(''), 2800);
    return () => clearTimeout(id);
  }, [message]);

  async function fetchLiveRate() {
    setSyncingLive(true);
    setErr('');
    try {
      const quote = await fetchUsdKhrRate();
      const rounded = roundKhr(quote.khrPerUsd);
      setRateQuote(quote);
      setRate(String(rounded));
      await api('/settings/rate', {method: 'PUT', body: JSON.stringify({usdToKhr: rounded})});
      setMessage(
        tr(
          `${quote.sourceName} rate: 1 USD = ${khr(rounded)}`,
          `អត្រាផ្លូវការ ${quote.sourceName}៖ 1 USD = ${khr(rounded)}`
        )
      );
    } catch (e: any) {
      setErr(e?.message || 'Failed to sync live rate');
    } finally {
      setSyncingLive(false);
    }
  }

  async function switchMode(m: 'live' | 'manual') {
    setCurrencyMode(m);
    await AsyncStorage.setItem('retailflow_currency_mode', m).catch(() => {});
    if (m === 'live') {
      void fetchLiveRate();
    }
  }

  async function save() {
    setSaving(true); setErr('');
    try {
      await api('/settings/rate', {method: 'PUT', body: JSON.stringify({usdToKhr: Number(rate)})});
      setMessage(tr('Exchange rate updated.','បានធ្វើបច្ចុប្បន្នភាពអត្រាប្តូរប្រាក់។'));
    } catch (e) {setErr(String(e));} finally {setSaving(false);}
  }

  return (
    <Screen title={t('settings')} subtitle={tr('Store preferences','គ្រប់គ្រងការកំណត់ហាង')}>
      <Card index={1}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 16,
              backgroundColor: C.pale,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={24} color={C.primary} strokeWidth={2.2} />
          </View>
          <View style={{flex: 1}}>
            <Text style={{color: C.text, fontWeight: '800', fontSize: 16}}>
              {getFullName() || getUsername() || 'Administrator'}
            </Text>
            <Text style={{color: C.muted, fontSize: 12.5, marginTop: 2}}>
              @{getUsername() || 'admin'} · {getUserRole() === 'ADMIN' ? tr('Administrator', 'អ្នកគ្រប់គ្រង') : tr('Staff', 'បុគ្គលិក')}
            </Text>
          </View>
          <Pressable
            onPress={async () => {
              await logout();
              showSignedOut();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: C.redPale,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 12,
            }}
          >
            <LogOut size={14} color={C.red} strokeWidth={2.2} />
            <Text style={{color: C.red, fontWeight: '800', fontSize: 12.5}}>{tr('Sign out', 'ចាកចេញ')}</Text>
          </Pressable>
        </View>
      </Card>
      <Card index={2}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14}}>
          <IconBadge icon={ArrowLeftRight} size={44} />
          <View style={{flex: 1}}>
            <Text style={{color: C.text, fontWeight: '800', fontSize: 16}}>{tr('Exchange rate','អត្រាប្តូរប្រាក់')}</Text>
            <Text style={{color: C.muted, fontSize: 12.5, marginTop: 2}}>{tr('USD to KHR · Primary Store Currency is KHR','ដុល្លារ ទៅ រៀល · រូបិយប័ណ្ណហាងគឺ KHR')}</Text>
          </View>
        </View>

        {/* Currency Mode Toggle */}
        <View style={{flexDirection: 'row', gap: 8, marginBottom: 14, backgroundColor: C.pale, padding: 4, borderRadius: 12}}>
          <Pressable
            onPress={() => void switchMode('live')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 9,
              borderRadius: 8,
              backgroundColor: currencyMode === 'live' ? C.primary : 'transparent',
            }}
          >
            <Sparkles size={14} color={currencyMode === 'live' ? '#FFFFFF' : C.muted} />
            <Text style={{color: currencyMode === 'live' ? '#FFFFFF' : C.text, fontWeight: '800', fontSize: 12}}>
              {tr('Live / Market', 'អត្រាទីផ្សារ')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void switchMode('manual')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 9,
              borderRadius: 8,
              backgroundColor: currencyMode === 'manual' ? C.primary : 'transparent',
            }}
          >
            <SlidersHorizontal size={14} color={currencyMode === 'manual' ? '#FFFFFF' : C.muted} />
            <Text style={{color: currencyMode === 'manual' ? '#FFFFFF' : C.text, fontWeight: '800', fontSize: 12}}>
              {tr('Custom Static', 'កំណត់ផ្ទាល់ខ្លួន')}
            </Text>
          </Pressable>
        </View>

        {currencyMode === 'live' ? (
          <View style={{backgroundColor: C.pale, borderRadius: 14, padding: 14, gap: 10}}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
              <Text style={{color: C.muted, fontSize: 12, fontWeight: '700'}}>
                {tr('Live Exchange Rate', 'អត្រាប្តូរប្រាក់ទីផ្សារ')}
              </Text>
              <Text style={{color: C.primary, fontSize: 18, fontWeight: '900'}}>
                1$ = {khr(Number(rate))}
              </Text>
            </View>
            {rateQuote ? (
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap'}}>
                <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: rateQuote.isFallback ? C.amber : C.success}} />
                <Text style={{color: C.muted, fontSize: 11.5, fontWeight: '700', flexShrink: 1}}>
                  {tr('Source', 'ប្រភព')}: {rateQuote.sourceName}
                </Text>
                {rateQuote.asOf ? (
                  <Text style={{color: C.muted, fontSize: 11.5}}>· {rateQuote.asOf}</Text>
                ) : null}
              </View>
            ) : null}
            {rateQuote ? (
              <Text style={{color: C.muted, fontSize: 11, lineHeight: 16}}>
                {describeRateSource(rateQuote)}
                {rateQuote.isFallback
                  ? ` · ${tr('NBC feed unreachable, using market rate', 'មិនអាចភ្ជាប់ NBC បានទេ ប្រើអត្រាទីផ្សារ')}`
                  : ''}
              </Text>
            ) : (
              <Text style={{color: C.muted, fontSize: 11, lineHeight: 16}}>
                {tr('Source: National Bank of Cambodia (data.mef.gov.kh)', 'ប្រភព៖ ធនាគារជាតិនៃកម្ពុជា (data.mef.gov.kh)')}
              </Text>
            )}
            <Btn icon={RefreshCw} loading={syncingLive} onPress={() => void fetchLiveRate()}>
              {tr('Sync Official NBC Rate', 'ទាញអត្រាផ្លូវការ NBC')}
            </Btn>
          </View>
        ) : (
          <View>
            <Field label="1 USD = ? KHR" keyboardType="decimal-pad" placeholder="4100" value={rate} onChangeText={setRate} />
            <Btn loading={saving} disabled={!Number.isFinite(Number(rate)) || Number(rate) <= 0} onPress={() => void save()}>
              {tr('Save exchange rate','រក្សាទុកអត្រា')}
            </Btn>
          </View>
        )}

        {message ? (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14}}>
            <CheckCircle2 size={17} color={C.success} />
            <Text style={{color: C.success, fontWeight: '700'}}>{message}</Text>
          </Animated.View>
        ) : null}
        {err ? <ErrorLine message={err} /> : null}
      </Card>

      <Rise index={3}>
        <Card>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12}}>
            <IconBadge icon={ScanLine} size={44} />
            <View style={{flex: 1}}>
              <Text style={{color: C.text, fontWeight: '800', fontSize: 16}}>
                {tr('Mobile Scanner Gun', 'ម៉ាស៊ីនស្កេនបាកូដឥតខ្សែ')}
              </Text>
              <Text style={{color: C.muted, fontSize: 12.5, marginTop: 2}}>
                {tr('Beam barcodes to Web Portal POS', 'បញ្ជូនបាកូដផ្ទាល់ទៅកាន់ Web Portal')}
              </Text>
            </View>
          </View>
          <Text style={{color: C.muted, fontSize: 13, lineHeight: 19, marginBottom: 16}}>
            {tr(
              'Turn this phone into a handheld wireless scanner gun. Scanned barcodes beam instantly to the Web Portal POS or Inventory batch in real time!',
              'ប្រែក្លាយទូរស័ព្ទនេះទៅជាម៉ាស៊ីនស្កេនឥតខ្សែ។ រាល់ការស្កេននឹងបញ្ជូនទៅកាន់ POS ឬស្តុកលើ Web Portal ភ្លាមៗ!'
            )}
          </Text>
          <Btn onPress={() => setScannerGunOpen(true)}>
            {tr('Launch Scanner Gun', 'បើកម៉ាស៊ីនស្កេនឥតខ្សែ')}
          </Btn>
        </Card>

        <View style={{backgroundColor: C.pale, borderRadius: 20, padding: 18, marginBottom: 14, flexDirection: 'row', gap: 12}}>
          <ShieldCheck size={20} color={C.primary} />
          <View style={{flex: 1}}>
            <Text style={{color: C.text, fontWeight: '800'}}>{tr('Historical sales are protected','ការលក់ពីមុនត្រូវបានការពារ')}</Text>
            <Text style={{color: C.muted, fontSize: 12.5, lineHeight: 19, marginTop: 5}}>
              {tr('Changing this rate only affects future checkouts and current product displays. Completed transactions keep their stored USD, KHR and exchange-rate values.',
                  'ការប្តូរអត្រានេះប៉ះពាល់តែការទូទាត់ក្រោយ និងតម្លៃបង្ហាញបច្ចុប្បន្ន។ ប្រតិបត្តិការដែលបានបញ្ចប់រក្សាតម្លៃដើម។')}
            </Text>
          </View>
        </View>
      </Rise>

      <Rise index={4}>
        <Heading>{tr('Preferences','ចំណូលចិត្ត')}</Heading>
        <Card>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16}}>
            <IconBadge icon={Globe2} size={44} />
            <View style={{flex: 1}}>
              <Text style={{color: C.text, fontWeight: '800', fontSize: 16}}>{t('language')}</Text>
              <Text style={{color: C.muted, fontSize: 12.5, marginTop: 2}}>ខ្មែរ / English</Text>
            </View>
          </View>
          <Segmented value={language} onChange={setLanguage} options={[{value: 'kh', label: 'ខ្មែរ'}, {value: 'en', label: 'English'}]} />
        </Card>
        <Card>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
            <IconBadge icon={Info} size={44} />
            <View style={{flex: 1}}>
              <Text style={{color: C.text, fontWeight: '800'}}>គ្រប់គ្រងហាង · EasySell</Text>
              <Text style={{color: C.muted, fontSize: 12.5, marginTop: 2}}>{tr('API connected','បានភ្ជាប់ API')}</Text>
            </View>
          </View>
        </Card>
      </Rise>
      <ErrorLine message={err} />
      <MobileScannerGunModal visible={scannerGunOpen} onClose={() => setScannerGunOpen(false)} />
    </Screen>
  );
}
