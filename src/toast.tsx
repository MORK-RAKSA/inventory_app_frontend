import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {Pressable,Text,View, Platform, ToastAndroid, Alert} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type Tone='success'|'error'|'warning'|'info';
type Notice={id:number;message:string;tone:Tone;actionLabel?:string;onAction?:()=>void;duration?:number};
type ToastApi={show:(message:string,opts?:Partial<Omit<Notice,'id'|'message'>> )=>void;dismiss:()=>void};
const Context=createContext<ToastApi|null>(null);
export function useToast():ToastApi {const ctx=useContext(Context);if(!ctx)throw new Error('ToastProvider missing');return ctx;}
export function ToastProvider({children}:{children:React.ReactNode}) {
  const [notice,setNotice]=useState<Notice|null>(null);
  const id=useRef(0);
  const show=useCallback((message:string,opts:Partial<Omit<Notice,'id'|'message'>>={})=>{
    // Platform‑aware handling
    if (Platform.OS==='android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    if (Platform.OS==='ios') {
      Alert.alert('', message);
      return;
    }
    setNotice({id:++id.current,message,tone:opts.tone||'info',actionLabel:opts.actionLabel,onAction:opts.onAction,duration:opts.duration??4500});
  },[]);
  const dismiss=useCallback(()=>setNotice(null),[]);
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(n=>n?.id===notice.id?null:n),notice.duration);return()=>clearTimeout(t);},[notice]);
  const insets=useSafeAreaInsets();
  const palette={success:{bg:'#E5F7ED',fg:'#176A3C'},error:{bg:'#FDEBEC',fg:'#A92335'},warning:{bg:'#FFF2D8',fg:'#85560A'},info:{bg:'#F0ECFF',fg:'#513A9B'}};
  const c=palette[notice?.tone||'info'];
  return <Context.Provider value={{show,dismiss}}>
    {children}
    {notice?<View pointerEvents="box-none" style={{position:'absolute',top:insets.top+8,left:16,right:16,zIndex:9999,elevation:30}}>
      <View accessibilityRole="alert" style={{backgroundColor:c.bg,borderColor:c.fg,borderWidth:1,borderRadius:16,padding:14,flexDirection:'row',alignItems:'center',gap:10,shadowColor:'#000',shadowOpacity:0.16,shadowRadius:10,elevation:8}}>
        <Text style={{color:c.fg,flex:1,fontWeight:'700'}}>{notice.message}</Text>
        {notice.actionLabel&&notice.onAction?
          <Pressable accessibilityRole="button" onPress={()=>{const fn=notice.onAction;dismiss();fn?.();}}>
            <Text style={{color:c.fg,textDecorationLine:'underline',fontWeight:'800'}}>{notice.actionLabel}</Text>
          </Pressable>
          :null}
        <Pressable accessibilityLabel="Dismiss notification" onPress={dismiss}>
          <Text style={{color:c.fg,fontSize:18,fontWeight:'700'}}>×</Text>
        </Pressable>
      </View>
    </View>:null}
  </Context.Provider>;
}
