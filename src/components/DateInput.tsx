import { AppTextInput as TextInput, AppText as Text } from './AppText';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Dimensions,FlatList,Modal,Platform,View} from 'react-native';
import {CalendarDays,ChevronLeft,ChevronRight,X} from 'lucide-react-native';
import Animated,{FadeIn,FadeOut,SlideInDown,SlideOutDown} from 'react-native-reanimated';
import {Press} from '../motion';
import {C,R,shadow} from '../theme';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const iso = (y:number,m:number,d:number) => [y,String(m+1).padStart(2,'0'),String(d).padStart(2,'0')].join('-');

function CalendarGrid({year,month,selected,onSelect}:{year:number;month:number;selected:string;onSelect:(v:string)=>void}) {
  const first = new Date(year,month,1).getDay();
  const days = new Date(year,month+1,0).getDate();
  const today = iso(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());
  const cells: (number|null)[] = [];
  for (let i=0;i<first;i++) cells.push(null);
  for (let i=1;i<=days;i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number|null)[][] = [];
  for (let i=0;i<cells.length;i+=7) rows.push(cells.slice(i,i+7));

  return (
    <View>
      <View style={{flexDirection:'row',marginBottom:8}}>
        {DAYS.map(d => <View key={d} style={{flex:1,alignItems:'center'}}><Text style={{color:C.muted,fontSize:11,fontWeight:'700'}}>{d}</Text></View>)}
      </View>
      {rows.map((row,ri) => (
        <View key={ri} style={{flexDirection:'row'}}>
          {row.map((d,ci) => {
            if (d === null) return <View key={ci} style={{flex:1,height:42}} />;
            const val = iso(year,month,d);
            const isSelected = val === selected;
            const isToday = val === today;
            return (
              <Press key={ci} onPress={() => onSelect(val)} style={{flex:1,height:42,alignItems:'center',justifyContent:'center'}}>
                <View style={{
                  width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center',
                  backgroundColor: isSelected ? C.primary : 'transparent',
                  ...(isToday && !isSelected ? {borderWidth:1.5,borderColor:C.primary} : {}),
                }}>
                  <Text style={{
                    fontSize:14,fontWeight: isSelected || isToday ? '700' : '400',
                    color: isSelected ? '#fff' : isToday ? C.primary : C.text,
                  }}>{d}</Text>
                </View>
              </Press>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function DateInput({label,value,onChange,placeholder='Select date',clearable=true}:{label?:string;value:string;onChange:(value:string)=>void;placeholder?:string;clearable?:boolean}) {
 const [show,setShow]=useState(false);
 const parsed = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value+'T12:00:00') : null;
 const [year,setYear] = useState(parsed ? parsed.getFullYear() : new Date().getFullYear());
 const [month,setMonth] = useState(parsed ? parsed.getMonth() : new Date().getMonth());

 useEffect(() => {
   if (show) {
     const p = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value+'T12:00:00') : new Date();
     setYear(p.getFullYear());
     setMonth(p.getMonth());
   }
 }, [show]);

 function prevMonth() { if (month === 0) {setMonth(11);setYear(y => y-1);} else setMonth(m => m-1); }
 function nextMonth() { if (month === 11) {setMonth(0);setYear(y => y+1);} else setMonth(m => m+1); }

 if (Platform.OS === 'web') {
   return (
     <View style={{flex:1,minWidth:120,marginBottom:12}}>
       {label ? <Text style={{color:C.muted,fontWeight:'700',fontSize:12,marginBottom:7}}>{label}</Text> : null}
       <TextInput accessibilityLabel={label||placeholder} placeholder="YYYY-MM-DD" value={value} onChangeText={onChange} style={{height:48,borderWidth:1,borderColor:C.border,borderRadius:12,paddingHorizontal:12,color:C.text,backgroundColor:C.surface}} />
     </View>
   );
 }

 return (
   <View style={{flex:1,minWidth:120,marginBottom:12}}>
     {label ? <Text style={{color:C.muted,fontWeight:'700',fontSize:12,marginBottom:7}}>{label}</Text> : null}
     <View style={{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:C.border,borderRadius:12,backgroundColor:C.surface,minHeight:48}}>
       <Press accessibilityLabel={label||placeholder} onPress={() => setShow(true)} style={{flex:1,flexDirection:'row',alignItems:'center',paddingHorizontal:12,gap:7,minHeight:48}}>
         <CalendarDays size={17} color={C.primary}/>
         <Text style={{color:value?C.text:C.muted,fontSize:13}}>{value||placeholder}</Text>
       </Press>
       {clearable && value ? <Press accessibilityLabel="Clear date" onPress={() => onChange('')} style={{padding:10}}><X size={17} color={C.muted}/></Press> : null}
     </View>

     {/* Calendar popup modal */}
     <Modal visible={show} transparent animationType="none" onRequestClose={() => setShow(false)}>
       <Press onPress={() => setShow(false)} style={{flex:1,backgroundColor:'rgba(0,0,0,0.35)',justifyContent:'flex-end'}}>
         <Animated.View entering={SlideInDown.duration(280)} exiting={SlideOutDown.duration(200)}>
           <Press onPress={() => {/* prevent closing */}} style={{backgroundColor:C.bg,borderTopLeftRadius:28,borderTopRightRadius:28,paddingBottom:40,...shadow.lg}}>
             {/* Handle bar */}
             <View style={{alignItems:'center',paddingTop:12,paddingBottom:8}}>
               <View style={{width:40,height:4,borderRadius:2,backgroundColor:C.paleStrong}} />
             </View>

             <View style={{paddingHorizontal:22}}>
               {/* Month/year header */}
               <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                 <Press onPress={prevMonth} style={{width:40,height:40,borderRadius:12,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'}}>
                   <ChevronLeft size={20} color={C.primary} />
                 </Press>
                 <Text style={{fontSize:17,fontWeight:'800',color:C.text}}>{MONTHS[month]} {year}</Text>
                 <Press onPress={nextMonth} style={{width:40,height:40,borderRadius:12,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'}}>
                   <ChevronRight size={20} color={C.primary} />
                 </Press>
               </View>

               {/* Calendar grid */}
               <CalendarGrid year={year} month={month} selected={value} onSelect={v => {onChange(v);setShow(false);}} />

               {/* Actions */}
               <View style={{flexDirection:'row',gap:10,marginTop:18}}>
                 <Press onPress={() => {onChange(iso(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()));setShow(false);}} style={{flex:1,paddingVertical:14,borderRadius:14,backgroundColor:C.pale,alignItems:'center'}}>
                   <Text style={{color:C.primary,fontWeight:'800',fontSize:13.5}}>Today</Text>
                 </Press>
                 {value ? (
                   <Press onPress={() => {onChange('');setShow(false);}} style={{flex:1,paddingVertical:14,borderRadius:14,backgroundColor:C.redPale,alignItems:'center'}}>
                     <Text style={{color:C.red,fontWeight:'800',fontSize:13.5}}>Clear</Text>
                   </Press>
                 ) : null}
                 <Press onPress={() => setShow(false)} style={{flex:1,paddingVertical:14,borderRadius:14,backgroundColor:C.primary,alignItems:'center',...shadow.sm}}>
                   <Text style={{color:'#fff',fontWeight:'800',fontSize:13.5}}>Done</Text>
                 </Press>
               </View>
             </View>
           </Press>
         </Animated.View>
       </Press>
     </Modal>
   </View>
 );
}
