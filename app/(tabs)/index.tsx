import {Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {ArrowUpRight,Boxes,TrendingUp,Plus,ScanLine,ChartNoAxesCombined,ShoppingBag,PackageCheck,Layers,AlertTriangle,Clock,PackageX,ChevronRight} from 'lucide-react-native';
import {useLiveData} from '../../src/hooks/useLiveData';
import {getUsername} from '../../src/auth';
import {AnimatedNumber} from '../../src/components/AnimatedNumber';
import {useLanguage} from '../../src/i18n';
import {Press,Rise} from '../../src/motion';
import {Screen,Card,GradientCard,IconBadge,C,Heading,Pill,money,khr,ErrorLine} from '../../src/ui';
import type {Sale} from '../../src/api';

export default function Dashboard() {
  const username = getUsername();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const greetingText = `${greeting}, ${username}!`;
  const router = useRouter();
  const {products:ps,sales:ss,rate,error,loading,refresh} = useLiveData('all');
  const {t,tr} = useLanguage();

  const today = new Date().toDateString();
  const daily = ss.filter(s => new Date(s.createdAt).toDateString() === today);
  const last7 = ss.filter(s => Date.now() - new Date(s.createdAt).getTime() < 7 * 86400000);
  const sum = (arr:Sale[]) => arr.reduce((n,s) => n + Number(s.totalUsd), 0);
  const sumKhr = (arr:Sale[]) => arr.reduce((n,s) => n + Number(s.totalKhr), 0);
  const low = ps.filter(p => p.stock <= p.lowStockThreshold);
  const expiring = ps.filter(p => p.expirationDate && new Date(p.expirationDate + 'T23:59:59').getTime() <= Date.now()+7*86400000);
  const out = ps.filter(p => p.stock === 0);
  const categories = [...new Set(ps.map(p => p.category))];
  const units = ps.reduce((n,p) => n + p.stock, 0);
  const retail = ps.reduce((n,p) => n + p.stock * Number(p.priceUsd), 0);

  const previous7 = ss.filter(s => {const age=Date.now()-new Date(s.createdAt).getTime();return age>=7*86400000 && age<14*86400000;});
  const comparison = sum(previous7)>0 ? (sum(last7)-sum(previous7))/sum(previous7)*100 : null;
  const topProducts = ps.slice().sort((a,b) => a.stock-b.stock).slice(0,3);
  const quick = [
    {label: tr('Add items','បន្ថែមទំនិញ'), Icon: Plus, to: '/inventory'},
    {label: tr('Scan & sell','ស្កេន / ទូទាត់'), Icon: ScanLine, to: '/checkout'},
    {label: tr('View sales','មើលការលក់'), Icon: ChartNoAxesCombined, to: '/sales'},
  ];

  return (
    <Screen onRefresh={refresh}
      title={t('home')}
      subtitle={`${greetingText} ${t('overviewSubtitle')}`}
      right={<Press onPress={() => router.push('/notifications' as any)} accessibilityLabel="Notifications"><IconBadge icon={ShoppingBag} size={40} /></Press>}
    >
      <Rise index={2}>
        <GradientCard>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
            <Text style={{color: C.onPrimaryMuted, fontSize: 13, fontWeight: '600'}}>{tr("Today's sales",'ការលក់ថ្ងៃនេះ')}</Text>
            <ArrowUpRight color={C.onPrimaryMuted} size={20} />
          </View>
          <AnimatedNumber value={sumKhr(daily)} format={khr} style={{color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 10, letterSpacing: -1}} />
          <Text style={{color: C.onPrimaryMuted, fontSize: 15, marginTop: 2}}>{money(sum(daily))}</Text>
          <View style={{height: 1, backgroundColor: '#FFFFFF2A', marginVertical: 16}} />
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={{color: C.onPrimaryMuted, fontSize: 12.5}}>{tr('Transactions','ប្រតិបត្តិការ')}</Text>
            <Text style={{color: '#fff', fontSize: 12.5, fontWeight: '800'}}>{daily.length}</Text>
          </View>
        </GradientCard>
      </Rise>

      <Rise index={3} style={{flexDirection: 'row', gap: 12}}>
        <Card style={{flex: 1}}>
          <IconBadge icon={TrendingUp} size={38} />
          <Text style={{color: C.muted, fontSize: 12, marginTop: 14}}>{tr('Last 7 days','៧ ថ្ងៃចុងក្រោយ')}</Text>
          <Text style={{fontWeight: '800', fontSize: 20, color: C.text, marginTop: 3}}>{khr(sumKhr(last7))}</Text>
          <Text style={{color: C.muted, fontSize: 11.5, marginTop: 3}}>{money(sum(last7))} · {last7.length} {tr('sales','ការលក់')}</Text>
        </Card>
        <Card style={{flex: 1}}>
          <IconBadge icon={Boxes} size={38} />
          <Text style={{color: C.muted, fontSize: 12, marginTop: 14}}>{tr('Total stock','ស្តុកសរុប')}</Text>
          <Text style={{fontWeight: '800', fontSize: 21, color: C.text, marginTop: 3}}>{units.toLocaleString('en-US')}</Text>
          <Text style={{color: C.muted, fontSize: 11.5, marginTop: 3}}>{ps.length} {tr('products','ទំនិញ')}</Text>
        </Card>
      </Rise>

      <Card index={4}>
        <Text style={{color: C.muted, fontSize: 12.5}}>{tr('Potential inventory value','តម្លៃលក់ស្តុកសរុប')}</Text>
        <Text style={{color: C.text, fontSize: 26, fontWeight: '800', marginTop: 6, letterSpacing: -0.5}}>{khr(retail * rate)}</Text>
        <Text style={{color: C.muted, marginTop: 3, fontSize: 12.5}}>{money(retail)}</Text>
      </Card>

      <Card>
        <Text style={{color:C.muted,fontSize:12,fontWeight:'700'}}>{tr('Weekly performance','លទ្ធផលប្រចាំសប្តាហ៍')}</Text>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:10}}>
          <Text style={{color:C.text,fontWeight:'800',fontSize:20}}>{comparison===null ? '—' : `${comparison>=0?'+':''}${comparison.toFixed(1)}%`}</Text>
          <Pill tone={low.length ? 'amber' : 'green'}>{low.length} {tr('low-stock alerts','ស្តុកជិតអស់')}</Pill>
        </View>
        <Text style={{color:C.muted,fontSize:12,marginTop:6}}>{tr('Compared with previous 7 days','ធៀបនឹង៧ថ្ងៃមុន')} · {tr('Last sync on screen focus / every 5 sec','ធ្វើបច្ចុប្បន្នភាពដោយស្វ័យប្រវត្តិ')}</Text>
      </Card>
      <Rise index={5}>
        <Heading>{tr('Quick actions','សកម្មភាពរហ័ស')}</Heading>
        <View style={{flexDirection: 'row', gap: 10, marginBottom: 12}}>
          {quick.map(x => (
            <Press key={x.to} onPress={() => router.push(x.to as any)} style={{flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 6, backgroundColor: C.surface, borderRadius: 18, shadowColor: '#3B2A7A', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: {width: 0, height: 4}, elevation: 2}}>
              <IconBadge icon={x.Icon} size={42} />
              <Text style={{fontSize: 11.5, fontWeight: '700', color: C.text, textAlign: 'center', marginTop: 10}}>{x.label}</Text>
            </Press>
          ))}
        </View>
      </Rise>

      <Rise index={6}>
        <Heading action={tr('View all','មើលទាំងអស់')} onPress={() => router.push('/inventory?low=1' as any)}>{tr('Low stock','ស្តុកជិតអស់')}</Heading>
        <Card>
          {low.length === 0 ? (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
              <IconBadge icon={PackageCheck} size={38} />
              <Text style={{color: C.muted, flex: 1}}>{tr('All products are well stocked','គ្មានទំនិញស្តុកជិតអស់')}</Text>
            </View>
          ) : low.slice(0,4).map((p,i,arr) => (
            <View key={p.id} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: C.border}}>
              <View style={{flex: 1, paddingRight: 10}}>
                <Text numberOfLines={1} style={{color: C.text, fontWeight: '700'}}>{p.name}</Text>
                <Text style={{fontSize: 11.5, color: C.muted, marginTop: 2}}>{tr('Threshold','កម្រិត')}: {p.lowStockThreshold}</Text>
              </View>
              <Pill tone={p.stock===0 ? "red" : "amber"}>{p.stock} {tr('left','នៅសល់')}</Pill>
            </View>
          ))}
        </Card>
      </Rise>

      <Rise index={7}>
        <Heading action={tr('View all','មើលទាំងអស់')} onPress={() => router.push('/inventory?expiry=1' as any)}>{tr('Important alerts','ការជូនដំណឹងសំខាន់')}</Heading>

        {/* Alert summary cards */}
        <View style={{flexDirection:'row',gap:10,marginBottom:12}}>
          <Press onPress={() => router.push('/inventory?low=1' as any)} style={{flex:1}}>
            <View style={{backgroundColor:out.length > 0 ? C.redPale : C.successPale,borderRadius:18,padding:16,...(out.length > 0 ? {borderWidth:1,borderColor:'#E8C4C4'} : {})}}>
              <IconBadge icon={PackageX} size={36} tone={out.length > 0 ? 'red' : 'primary'} />
              <Text style={{color:out.length > 0 ? C.red : C.success,fontSize:24,fontWeight:'800',marginTop:10}}>{out.length}</Text>
              <Text style={{color:out.length > 0 ? C.red : C.muted,fontSize:11.5,fontWeight:'600',marginTop:2}}>{tr('Out of stock','អស់ស្តុក')}</Text>
            </View>
          </Press>
          <Press onPress={() => router.push('/inventory?expiry=1' as any)} style={{flex:1}}>
            <View style={{backgroundColor:expiring.length > 0 ? C.amberPale : C.successPale,borderRadius:18,padding:16,...(expiring.length > 0 ? {borderWidth:1,borderColor:'#E8D9A8'} : {})}}>
              <IconBadge icon={Clock} size={36} tone={expiring.length > 0 ? 'amber' : 'primary'} />
              <Text style={{color:expiring.length > 0 ? C.amber : C.success,fontSize:24,fontWeight:'800',marginTop:10}}>{expiring.length}</Text>
              <Text style={{color:expiring.length > 0 ? C.amber : C.muted,fontSize:11.5,fontWeight:'600',marginTop:2}}>{tr('Expiring soon','ជិតផុតកំណត់')}</Text>
            </View>
          </Press>
        </View>

        {/* Expiring product list */}
        {expiring.length > 0 && (
          <Card>
            <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12}}>
              <AlertTriangle size={16} color={C.amber} />
              <Text style={{color:C.text,fontWeight:'800',fontSize:13.5,flex:1}}>{tr('Expiring within 7 days','ផុតកំណត់ក្នុង ៧ ថ្ងៃ')}</Text>
            </View>
            {expiring.slice(0,4).map((p,i,arr) => {
              const expDate = new Date(p.expirationDate! + 'T23:59:59');
              const daysLeft = Math.ceil((expDate.getTime() - Date.now()) / 86400000);
              const isExpired = daysLeft < 0;
              return (
                <Press key={p.id} scale={0.98} onPress={() => router.push(('/inventory?expiry=1') as any)}
                  style={{flexDirection:'row',alignItems:'center',paddingVertical:10,borderTopWidth:i===0?0:1,borderTopColor:C.border,gap:12}}>
                  <View style={{width:38,height:38,borderRadius:12,backgroundColor:isExpired ? C.redPale : C.amberPale,alignItems:'center',justifyContent:'center'}}>
                    <Text style={{fontSize:14,fontWeight:'800',color:isExpired ? C.red : C.amber}}>{isExpired ? '!' : daysLeft}</Text>
                  </View>
                  <View style={{flex:1}}>
                    <Text numberOfLines={1} style={{color:C.text,fontWeight:'700',fontSize:13.5}}>{p.name}</Text>
                    <Text style={{color:C.muted,fontSize:11,marginTop:2}}>{p.expirationDate}</Text>
                  </View>
                  <Pill tone={isExpired ? 'red' : 'amber'}>{isExpired ? tr('Expired','ផុតកំណត់') : `${daysLeft}d ${tr('left','នៅសល់')}`}</Pill>
                </Press>
              );
            })}
            {expiring.length > 4 && (
              <Press onPress={() => router.push('/inventory?expiry=1' as any)} style={{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingTop:10,gap:4}}>
                <Text style={{color:C.primary,fontWeight:'700',fontSize:12.5}}>{tr(`View all ${expiring.length} items`,`មើលទាំង ${expiring.length} ទំនិញ`)}</Text>
                <ChevronRight size={14} color={C.primary} />
              </Press>
            )}
          </Card>
        )}

        {out.length === 0 && expiring.length === 0 && (
          <Card>
            <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
              <IconBadge icon={PackageCheck} size={38} />
              <View style={{flex:1}}>
                <Text style={{color:C.text,fontWeight:'700'}}>{tr('All clear!','គ្រប់យ៉ាងល្អ!')}</Text>
                <Text style={{color:C.muted,fontSize:12,marginTop:2}}>{tr('No stock or expiry alerts right now','គ្មានការជូនដំណឹងអំពីស្តុក ឬផុតកំណត់')}</Text>
              </View>
            </View>
          </Card>
        )}
      </Rise>
      <Rise index={8}>
        <Heading>{tr('Stock by category','ស្តុកតាមប្រភេទ')}</Heading>
        <Card>
          {categories.length === 0 ? (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
              <IconBadge icon={Layers} size={38} />
              <Text style={{color: C.muted, flex: 1}}>{tr('No categories yet','មិនទាន់មានប្រភេទទំនិញ')}</Text>
            </View>
          ) : categories.map((c,i) => {
            const items = ps.filter(p => p.category === c);
            return (
              <Press key={c} scale={0.98} onPress={() => router.push(('/inventory?category=' + encodeURIComponent(c)) as any)}
                style={{paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: i === categories.length - 1 ? 0 : 1, borderBottomColor: C.border}}>
                <Text style={{color: C.text, fontWeight: '700'}}>{c}</Text>
                <Text style={{color: C.muted, fontSize: 12.5}}>{items.length} {tr('items','ទំនិញ')} · {items.reduce((n,p) => n + p.stock, 0)} {tr('units','ឯកតា')}</Text>
              </Press>
            );
          })}
        </Card>
      </Rise>
      {loading && !ps.length && !ss.length && <Card><Text style={{color:C.muted}}>Loading overview…</Text><View style={{height:14,backgroundColor:C.pale,borderRadius:8,marginTop:12}}/><View style={{height:14,width:'70%',backgroundColor:C.pale,borderRadius:8,marginTop:8}}/></Card>}
      <ErrorLine message={error} />
    </Screen>
  );
}
