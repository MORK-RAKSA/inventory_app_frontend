import {useEffect,useState} from 'react';
import {Modal,Pressable,Text,View} from 'react-native';
import {Image} from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Placeholder} from '../ui';
import {C} from '../theme';
import {useLanguage} from '../i18n';
import React from 'react';

export async function loadImageMap() {
  try {return JSON.parse(await AsyncStorage.getItem('retailflow.images') || '{}') as Record<string,string>;}
  catch {return {} as Record<string,string>;}
}
export async function storeProductImage(id:string,uri:string) {
  const old = await loadImageMap();
  old[id] = uri;
  await AsyncStorage.setItem('retailflow.images', JSON.stringify(old));
}

export function ProductImage({id,name,size = 52,uri}:{id:string;name:string;size?:number;uri?:string}) {
  const [image,setImage] = useState<string|undefined>(uri);
  const [open,setOpen] = useState(false);
  const {tr} = useLanguage();
  useEffect(() => {
    let active = true;
    if (uri) {setImage(uri); return;}
    void loadImageMap().then(m => {if (active) setImage(m[id]);});
    return () => {active = false;};
  }, [id,uri]);
  return (
    <>
      <Pressable onPress={() => image && setOpen(true)} accessibilityLabel={`Preview ${name}`}>
        <View style={{width: size, height: size}}>
          {image
            ? <Image source={{uri: image}} style={{width: size, height: size, borderRadius: size * 0.3}} contentFit="cover" transition={250} />
            : <Placeholder label={name} size={size} />}
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{flex: 1, backgroundColor: '#140D26EE', justifyContent: 'center', padding: 24}}>
          {image && <Image source={{uri: image}} contentFit="contain" style={{height: '75%', width: '100%'}} transition={200} />}
          <Text style={{textAlign: 'center', color: C.onPrimaryMuted, marginTop: 16}}>{name} · {tr('Tap to close','ចុចដើម្បីបិទ')}</Text>
        </Pressable>
      </Modal>
    </>
  );
}
