import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { AppText as Text } from './AppText';
import type { useAppUpdates } from '../hooks/useAppUpdates';
export function AppUpdateGate({update}:{update:ReturnType<typeof useAppUpdates>}) {
 return <Modal visible={update.required} transparent animationType="fade" onRequestClose={()=>{}}><View style={{flex:1,backgroundColor:'#18102BCC',justifyContent:'center',padding:24}}><View style={{width:'100%',maxWidth:440,alignSelf:'center',padding:24,borderRadius:22,backgroundColor:'white',gap:16}}>
 <Text style={{fontSize:21,color:'#30264F'}}>ត្រូវធ្វើបច្ចុប្បន្នភាព · Update required</Text>
 <Text style={{fontSize:14,lineHeight:24,color:'#74698D'}}>{update.ready?'The update is ready. Restart EasySell to continue.':'A required update is available. Save any unsaved details before restarting. Download the update to continue using EasySell.'}</Text>
 {!!update.error&&<Text accessibilityRole="alert" style={{color:'#B93859'}}>{update.error}</Text>}
 <Pressable disabled={update.busy} onPress={()=>void(update.ready?update.restart():update.download())} style={{padding:16,borderRadius:12,backgroundColor:'#6946B8',alignItems:'center'}}>{update.busy?<ActivityIndicator color="white"/>:<Text style={{color:'white'}}>{update.ready?'Restart & update':'Download update'}</Text>}</Pressable>
 </View></View></Modal>;
}
