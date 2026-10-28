import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Maximize, Minimize, X } from 'lucide-react-native';
import { AppText as Text } from '../../components/AppText';
import { P } from '../theme';
export function PortalFullscreen() {
 const [supported,setSupported]=useState(false);
 const [fullscreen,setFullscreen]=useState(false);
 const [prompt,setPrompt]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(Platform.OS!=='web')return;
  setSupported(!!document.fullscreenEnabled);
  const update=()=>{setFullscreen(!!document.fullscreenElement);if(document.fullscreenElement)setPrompt(false);};
  update();document.addEventListener('fullscreenchange',update);
  return ()=>document.removeEventListener('fullscreenchange',update);
 },[]);
 async function toggle(){
  setError('');
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  catch{setError('Fullscreen was blocked by this browser. Try F11 or use the browser fullscreen menu.');}
 }
 if(!supported)return null;
 return <View style={{alignItems:'center',justifyContent:'center'}}>
  <Pressable accessibilityLabel={fullscreen?'Exit fullscreen':'Enter fullscreen'} onPress={()=>void toggle()} style={{alignItems:'center',justifyContent:'center',padding:11,borderRadius:12,backgroundColor:P.primaryLight}}>
   {fullscreen?<Minimize size={18} color={P.primary}/>:<Maximize size={18} color={P.primary}/>}
  </Pressable>
  {!!error && <Text accessibilityRole="alert" style={{position:'absolute',top:46,right:0,width:240,padding:10,backgroundColor:P.surface,color:P.rose,fontSize:12,zIndex:20}}>{error}</Text>}
 </View>;
}
