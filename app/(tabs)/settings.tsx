import {useCallback,useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import Animated,{FadeIn,FadeOut} from 'react-native-reanimated';
import {useFocusEffect} from 'expo-router';
import {ArrowLeftRight,ShieldCheck,Globe2,Info,CheckCircle2,ScanLine,Radio,Smartphone} from 'lucide-react-native';
import {api,Settings} from '../../src/api';
import {logout} from '../../src/auth';
import {showSignedOut} from '../../src/authEvents';
import {Pressable} from 'react-native';
import {useLanguage} from '../../src/i18n';
import {Segmented,Rise} from '../../src/motion';
import {Screen,Card,Btn,C,Field,Heading,ErrorLine,IconBadge} from '../../src/ui';
import {MobileScannerGunModal} from '../../src/components/MobileScannerGunModal';

export default function SettingsPage() {
  const {language,setLanguage,t,tr} = useLanguage();
  const [rate,setRate] = useState('4100');
  const [err,setErr] = useState('');
  const [message,setMessage] = useState('');
  const [saving,setSaving] = useState(false);
  const [scannerGunOpen, setScannerGunOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    void api<Settings>('/settings').then(v => setRate(String(v.usdToKhr))).catch(e => setErr(String(e)));
  }, []));
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(''), 2800);
    return () => clearTimeout(id);
  }, [message]);

  async function save() {
    setSaving(true); setErr('');
    try {
      await api('/settings/rate', {method: 'PUT', body: JSON.stringify({usdToKhr: Number(rate)})});
      setMessage(tr('Exchange rate updated.','បានធ្វើបច្ចុប្បន្នភាពអត្រាប្តូរប្រាក់។'));
    } catch (e) {setErr(String(e));} finally {setSaving(false);}
  }

  return (
    <Screen title={t('settings')} subtitle={tr('Store preferences','គ្រប់គ្រងការកំណត់ហាង')}>
      <Pressable onPress={async()=>{await logout();showSignedOut()}} style={{backgroundColor:C.pale,padding:14,borderRadius:14,alignItems:'center',marginBottom:12}}><Text style={{color:C.primary,fontWeight:'800'}}>Sign out</Text></Pressable>
      <Card index={2}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18}}>
          <IconBadge icon={ArrowLeftRight} size={44} />
          <View style={{flex: 1}}>
            <Text style={{color: C.text, fontWeight: '800', fontSize: 16}}>{tr('Exchange rate','អត្រាប្តូរប្រាក់')}</Text>
            <Text style={{color: C.muted, fontSize: 12.5, marginTop: 2}}>{tr('USD to KHR','ដុល្លារ ទៅ រៀល')}</Text>
          </View>
        </View>
        <Field label="1 USD = ? KHR" keyboardType="decimal-pad" placeholder="4100" value={rate} onChangeText={setRate} />
        <Btn loading={saving} disabled={!Number.isFinite(Number(rate)) || Number(rate) <= 0} onPress={() => void save()}>{tr('Save exchange rate','រក្សាទុកអត្រា')}</Btn>
        {message ? (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14}}>
            <CheckCircle2 size={17} color={C.success} />
            <Text style={{color: C.success, fontWeight: '700'}}>{message}</Text>
          </Animated.View>
        ) : null}
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
                {tr('Beam barcodes to Web Portal POS & Ledger', 'បញ្ជូនបាកូដផ្ទាល់ទៅកាន់ Web Portal')}
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
              <Text style={{color: C.text, fontWeight: '800'}}>គ្រប់ហាង · EasySell</Text>
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
