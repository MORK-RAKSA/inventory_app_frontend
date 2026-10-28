import { ActivityIndicator, Pressable, View } from 'react-native';
import { Camera, Flashlight, FlashlightOff, ImagePlus, ZoomIn } from 'lucide-react-native';
import { AppText as Text } from './AppText';
export function ScannerControls({torch, zoom, busy, onTorch, onZoom, onCapture, onImage}: {torch:boolean;zoom:string;busy:boolean;onTorch:()=>void;onZoom:()=>void;onCapture:()=>void;onImage:()=>void}) {
 const control={padding:10,borderRadius:12,backgroundColor:'#172030',flexDirection:'row' as const,alignItems:'center' as const,gap:4};
 return <View style={{position:'absolute',bottom:10,left:12,right:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
  <Pressable accessibilityLabel="Toggle flashlight" onPress={onTorch} style={control}>{torch?<FlashlightOff size={20} color="white"/>:<Flashlight size={20} color="white"/>}</Pressable>

  <View style={{flexDirection:'row',gap:6}}><Pressable accessibilityLabel="Change zoom" onPress={onZoom} style={control}><ZoomIn size={16} color="white"/><Text style={{fontSize:11,color:'white'}}>{zoom}</Text></Pressable><Pressable accessibilityLabel="Scan barcode from image" onPress={onImage} disabled={busy} style={control}><ImagePlus size={20} color="white"/></Pressable></View>
 </View>;
}

export function ScannerCaptureButton({busy,onPress}:{busy:boolean;onPress:()=>void}) {
 return <Pressable accessibilityLabel="Capture barcode photo" disabled={busy} onPress={onPress} style={{width:56,height:56,borderRadius:28,backgroundColor:'white',borderWidth:4,borderColor:'#34D399',alignItems:'center',justifyContent:'center'}}>{busy?<ActivityIndicator color="#047857"/>:<Camera size={26} color="#047857"/>}</Pressable>;
}
