import {useState} from 'react';
import {KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,Text,View} from 'react-native';
import Animated,{Easing,FadeIn,FadeOut,SlideInDown,SlideOutDown} from 'react-native-reanimated';
import {Check,ChevronDown,Plus,Search} from 'lucide-react-native';
import {Field,Btn,C,R} from '../ui';
import {Press} from '../motion';
import {useLanguage} from '../i18n';

export function CategorySelect({value,categories,onChange}:{value:string;categories:string[];onChange:(v:string)=>void}) {
  const [open,setOpen] = useState(false);
  const [search,setSearch] = useState('');
  const {t,tr} = useLanguage();
  const q = search.trim();
  const choices = categories.filter(c => c.toLowerCase().includes(q.toLowerCase()));
  const close = () => setOpen(false);
  return (
    <>
      <Press scale={0.985} onPress={() => {setSearch(''); setOpen(true);}}
        style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, height: 50, backgroundColor: C.surface, borderRadius: R.md, borderColor: C.border, borderWidth: 1.5, marginBottom: 14}}>
        <Text style={{color: value ? C.text : C.faint, fontSize: 15}}>{value || t('category')}</Text>
        <ChevronDown size={18} color={C.muted} />
      </Press>
      <Modal visible={open} animationType="none" transparent statusBarTranslucent onRequestClose={close}>
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)} style={{position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#140D2699'}}>
          <Pressable style={{flex: 1}} onPress={close} />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none" style={{flex: 1, justifyContent: 'flex-end'}}>
          <Animated.View entering={SlideInDown.duration(260).easing(Easing.out(Easing.cubic))} exiting={SlideOutDown.duration(200)}
            style={{backgroundColor: C.bg, padding: 20, paddingBottom: 30, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '78%'}}>
            <View style={{alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.paleStrong, marginBottom: 16}} />
            <Text style={{fontSize: 20, fontWeight: '800', marginBottom: 14, color: C.text}}>{t('category')}</Text>
            <View style={{flexDirection:'row',alignItems:'center',gap:7,marginBottom:10}}>
              <View style={{flex:1}}><Field icon={Search} placeholder={t('search')} value={search} onChangeText={setSearch} /></View>
              {q && !categories.some(c=>c.toLowerCase()===q.toLowerCase()) ? <Press accessibilityLabel="Add category" onPress={()=>{onChange(q);close();}} style={{width:46,height:48,borderRadius:13,backgroundColor:C.primary,alignItems:'center',justifyContent:'center'}}><Plus color="white" size={22}/></Press> : null}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={{marginBottom: 8}}>
              {choices.map(c => (
                <Press key={c} scale={0.985} onPress={() => {onChange(c); close();}}
                  style={{paddingVertical: 15, paddingHorizontal: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: C.border}}>
                  <Text style={{color: C.text, fontSize: 15, fontWeight: c === value ? '800' : '500'}}>{c}</Text>
                  {c === value ? <Check size={18} color={C.primary} /> : null}
                </Press>
              ))}
            </ScrollView>
            <Btn outline onPress={close}>{tr('Close','បិទ')}</Btn>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
