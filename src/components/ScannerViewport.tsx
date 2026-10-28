import React, { forwardRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CameraView } from 'expo-camera';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { AppText as Text } from './AppText';
import { ScannerControls } from './ScannerControls';
type Props = React.ComponentProps<typeof CameraView> & {
 ready:boolean; allowed:boolean; onAllow:()=>void; onSize:(size:{width:number;height:number})=>void;
 torchOn:boolean; zoomLabel:string; photoBusy:boolean; onTorch:()=>void; onZoom:()=>void; onImage:()=>void;
 feedback?:React.ReactNode;
};
export const scannerFrame = (width:number) => ({x:26,y:34,width:width-52,height:164});
export const ScannerViewport=forwardRef<CameraView,Props>(({ready,allowed,onAllow,onSize,torchOn,zoomLabel,photoBusy,onTorch,onZoom,onImage,feedback,...cameraProps},ref)=>{
 const sweep=useSharedValue(0);
 React.useEffect(()=>{sweep.value=withRepeat(withTiming(144,{duration:1600}),-1,true);},[]);
 const laser=useAnimatedStyle(()=>({transform:[{translateY:sweep.value}]}));
 return <View onLayout={e=>onSize(e.nativeEvent.layout)} style={{height:232,borderRadius:24,overflow:'hidden',backgroundColor:'#000'}}>
  {allowed?<CameraView {...cameraProps} ref={ref} style={StyleSheet.absoluteFill}/>:<View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Pressable onPress={onAllow}><Text style={{color:'white'}}>អនុញ្ញាតកាមេរ៉ា · Allow camera</Text></Pressable></View>}
  {allowed && <>
   <View pointerEvents="none" style={{position:'absolute',top:12,left:20,flexDirection:'row',gap:6,alignItems:'center'}}><View style={{width:6,height:6,borderRadius:3,backgroundColor:ready?'#34D399':'#FBBF24'}}/><Text style={{color:'white',fontSize:11}}>{ready?'LIVE':'PAUSED'}</Text></View>
   <View pointerEvents="none" style={{position:'absolute',top:34,left:26,right:26,height:164,borderRadius:18,borderWidth:2,borderColor:'#FFFFFF55',overflow:'hidden'}}>
    <Animated.View style={[{position:'absolute',top:8,left:8,right:8,height:2,backgroundColor:'#34D39999'},laser]}/>
    {[{top:6,left:6,borderTopWidth:3,borderLeftWidth:3},{top:6,right:6,borderTopWidth:3,borderRightWidth:3},{bottom:6,left:6,borderBottomWidth:3,borderLeftWidth:3},{bottom:6,right:6,borderBottomWidth:3,borderRightWidth:3}].map((corner,i)=><View key={i} style={[{position:'absolute',width:22,height:22,borderColor:'#34D399'},corner]}/>)}
    {!ready && <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text style={{color:'#FBBF24',fontSize:12}}>កំពុងបើកកាមេរ៉ា…</Text></View>}
   </View>
   {feedback}
   <ScannerControls torch={torchOn} zoom={zoomLabel} busy={photoBusy} onTorch={onTorch} onZoom={onZoom} onCapture={()=>{}} onImage={onImage}/>
  </>}
 </View>;
});
