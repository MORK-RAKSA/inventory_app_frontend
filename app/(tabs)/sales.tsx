import { AppTextInput as TextInput, AppText as Text } from '../../src/components/AppText';
import {useState} from 'react';
import {View,ScrollView} from 'react-native';
import Animated,{FadeIn,FadeOut} from 'react-native-reanimated';
import {ReceiptText,CalendarDays,ChevronRight,Download,Search} from 'lucide-react-native';
import {Sale} from '../../src/api';
import {exportExcel} from '../../src/exportExcel';
import {DateRangeFilterButton} from '../../src/components/CalendarPickerModal';
import {Press as Tap} from '../../src/motion';
import {useLiveData} from '../../src/hooks/useLiveData';
import {ReceiptModal} from '../../src/components/ReceiptModal';
import {useLanguage} from '../../src/i18n';
import {Chip,Press,Rise,rise} from '../../src/motion';
import {Screen,Card,GradientCard,IconBadge,Heading,C,money,khr,ErrorLine,Empty} from '../../src/ui';

const options = [
  {key: 'Today', en: 'Today', kh: 'ថ្ងៃនេះ'},
  {key: 'Yesterday', en: 'Yesterday', kh: 'ម្សិលមិញ'},
  {key: '7 days', en: '7 days', kh: '៧ ថ្ងៃ'},
  {key: '30 days', en: '30 days', kh: '៣០ ថ្ងៃ'},
  {key: 'This month', en: 'This month', kh: 'ខែនេះ'},
  {key: 'All time', en: 'All time', kh: 'ទាំងអស់'},
] as const;
type Filter = typeof options[number]['key'];

export default function Sales() {
  const {sales,error,loading,refresh} = useLiveData('sales');
  const {tr} = useLanguage();
  const [filter,setFilter] = useState<Filter>('7 days');
  const [detail,setDetail] = useState<Sale|null>(null);
  const [notice,setNotice] = useState('');
  const [limit,setLimit] = useState(20);
  const [searchId,setSearchId] = useState('');
  const [fromDate,setFromDate] = useState('');
  const [toDate,setToDate] = useState('');

  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const displayed = sales.filter(s => {
    const d = new Date(s.createdAt).getTime();
    const day = s.createdAt.slice(0,10);
    if (searchId.trim() && !s.id.toLowerCase().includes(searchId.trim().toLowerCase())) return false;
    if (fromDate && day < fromDate) return false;
    if (toDate && day > toDate) return false;
    if (fromDate || toDate) return true;
    if (filter === 'Today') return d >= startDay;
    if (filter === 'Yesterday') return d >= startDay - 86400000 && d < startDay;
    if (filter === '7 days') return d >= startDay - 6 * 86400000;
    if (filter === '30 days') return d >= startDay - 29 * 86400000;
    if (filter === 'This month') return d >= new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return true;
  });
  const usd = displayed.reduce((n,s) => n + Number(s.totalUsd), 0);
  const khrTotal = displayed.reduce((n,s) => n + Number(s.totalKhr), 0);
  const units = displayed.reduce((n,s) => n + s.items.reduce((x,i) => x + i.quantity, 0), 0);
  const label = options.find(o => o.key === filter)!;

  return (
    <Screen onRefresh={refresh} title={tr('Sales','ការលក់')} subtitle={tr('Transaction history and reports','ប្រវត្តិប្រតិបត្តិការ និងរបាយការណ៍')}>
      <Rise index={2}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}}>
          {options.map(o => <Chip key={o.key} active={filter === o.key} label={tr(o.en, o.kh)} onPress={() => setFilter(o.key)} />)}
        </ScrollView>
      </Rise>

      <View style={{borderWidth:1,borderColor:C.border,borderRadius:13,backgroundColor:C.surface,flexDirection:'row',alignItems:'center',paddingHorizontal:12,marginBottom:12,gap:8}}>
        <Search size={18} color={C.muted}/>
        <TextInput accessibilityLabel="Search transaction ID" placeholder="Search transaction ID" value={searchId} onChangeText={setSearchId} autoCapitalize="none" style={{flex:1,height:48,color:C.text}}/>
      </View>
      <View style={{marginBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <DateRangeFilterButton
          label={tr('Filter by Date','ចម្រាញ់តាមកាលបរិច្ឆេទ')}
          startDate={fromDate}
          endDate={toDate}
          onApply={(start,end) => {
            setFromDate(start);
            setToDate(end);
          }}
          onClear={() => {
            setFromDate('');
            setToDate('');
          }}
        />
        {(fromDate || toDate) ? (
          <Tap
            onPress={() => {
              setFromDate('');
              setToDate('');
            }}
            style={{paddingHorizontal:12,paddingVertical:6,backgroundColor:C.pale,borderRadius:10}}
          >
            <Text style={{color:C.primary,fontSize:11.5,fontWeight:'700'}}>{tr('Reset Dates','សម្អាត')}</Text>
          </Tap>
        ) : null}
      </View>
      <Rise index={3}>
        <GradientCard>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{color: C.onPrimaryMuted, fontSize: 13, fontWeight: '600'}}>{tr('Sales total','ការលក់សរុប')} · {tr(label.en, label.kh)}</Text>
            <CalendarDays color={C.onPrimaryMuted} size={19} />
          </View>
          <Text style={{color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 8, letterSpacing: -1}}>{khr(khrTotal)}</Text>
          <Text style={{color: C.onPrimaryMuted, fontSize: 15, marginTop: 2}}>{money(usd)}</Text>
          <View style={{height: 1, backgroundColor: '#FFFFFF2A', marginVertical: 16}} />
          <Text style={{color: '#fff', fontSize: 12.5}}>{displayed.length} {tr('transactions','ប្រតិបត្តិការ')} · {units} {tr('units','ឯកតា')}</Text>
          <Tap accessibilityLabel="Export filtered transactions to Excel" onPress={() => void exportExcel('transactions.xlsx',['ID','Date','USD','KHR','Paid Currency','Status','Units'],displayed.map(s=>[s.id,s.createdAt,s.totalUsd,s.totalKhr,s.paidCurrency,s.status,s.items.reduce((n,i)=>n+i.quantity,0)]))}
            style={{backgroundColor:'#FFFFFF24',borderRadius:13,padding:12,alignSelf:'flex-start',marginTop:16}}><Download size={20} color="white" /></Tap>
        </GradientCard>
      </Rise>
      {notice ? <Animated.View entering={FadeIn} exiting={FadeOut}><ErrorLine message={notice} /></Animated.View> : null}

      <Heading>{tr('Transactions','ប្រតិបត្តិការ')}</Heading>
      {displayed.length === 0 ? <Empty message={tr('No transactions for this period','គ្មានប្រតិបត្តិការសម្រាប់រយៈពេលនេះ')} /> : displayed.slice(0,limit).map((s,i) => (
        <Animated.View key={s.id} entering={rise(i)}>
          <Press scale={0.985} onPress={() => setDetail(s)}>
            <Card>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
                <IconBadge icon={ReceiptText} size={44} />
                <View style={{flex: 1}}>
                  <Text style={{color: C.text, fontWeight: '800'}}>#{s.id.slice(0,8).toUpperCase()}</Text>
                  <Text style={{color: C.muted, fontSize: 11.5, marginTop: 4}}>{new Date(s.createdAt).toLocaleString()}</Text>
                  <Text style={{color: C.muted, fontSize: 11.5, marginTop: 2}}>{s.items.reduce((n,x) => n + x.quantity, 0)} {tr('units','ឯកតា')}</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={{color: C.primary, fontWeight: '800', fontSize: 15.5}}>{khr(s.totalKhr)}</Text>
                  <Text style={{color: C.muted, fontSize: 11, marginTop: 3}}>{money(s.totalUsd)}</Text>
                </View>
                <ChevronRight size={16} color={C.faint} />
              </View>
            </Card>
          </Press>
        </Animated.View>
      ))}
      {displayed.length > limit && <Press onPress={() => setLimit(x => x+20)} style={{padding:16,alignItems:'center',backgroundColor:C.pale,borderRadius:14,marginBottom:14}}><Text style={{color:C.primary,fontWeight:'800'}}>{tr('Load more transactions','បង្ហាញប្រតិបត្តិការបន្ថែម')} ({displayed.length-limit})</Text></Press>}
      <ErrorLine message={error} />
      <ReceiptModal sale={detail} onClose={() => setDetail(null)} />
    </Screen>
  );
}
