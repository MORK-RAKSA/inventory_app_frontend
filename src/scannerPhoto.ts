import type { CameraView } from 'expo-camera';
import { Alert, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export function photoScanningAvailable() {
 if (Platform.OS === 'web' || requireOptionalNativeModule('ExpoImageManipulator')) return true;
 Alert.alert('App update required', 'Photo scanning requires a new app build. Live barcode scanning still works. Install the latest preview build to enable Capture and image scanning.');
 return false;
}
async function imageTools() { return import('expo-image-manipulator'); }
import { decode } from 'jpeg-js';
import { toByteArray } from 'base64-js';
import { BinaryBitmap, HybridBinarizer, RGBLuminanceSource, MultiFormatReader, DecodeHintType } from '@zxing/library';
export async function decodeNativePhoto(uri:string) {
 if (!photoScanningAvailable()) return null;
 const {manipulateAsync, SaveFormat} = await imageTools();
 const image=await manipulateAsync(uri,[{resize:{width:1400}}],{format:SaveFormat.JPEG,compress:1,base64:true});
 if(!image.base64)return null;
 const pixels=decode(toByteArray(image.base64),{useTArray:true});
 const gray=new Uint8ClampedArray(pixels.width*pixels.height);
 for(let i=0;i<gray.length;i++)gray[i]=(pixels.data[i*4]+2*pixels.data[i*4+1]+pixels.data[i*4+2])/4;
 const reader=new MultiFormatReader();reader.setHints(new Map([[DecodeHintType.TRY_HARDER,true]]));
 try{return reader.decodeWithState(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(gray,pixels.width,pixels.height)))).getText();}catch{return null;}finally{reader.reset();}
}
export async function captureBarcode(camera:CameraView,layout:{width:number;height:number},frame:{x:number;y:number;width:number;height:number}) {
 if (!photoScanningAvailable()) return null;
 const {manipulateAsync, SaveFormat} = await imageTools();
 const photo=await camera.takePictureAsync({quality:1,shutterSound:false});
 if(!photo || !layout.width || !layout.height)return null;
 const scale=Math.max(layout.width/photo.width,layout.height/photo.height);
 const offsetX=(photo.width*scale-layout.width)/2,offsetY=(photo.height*scale-layout.height)/2;
 const cropped=await manipulateAsync(photo.uri,[{crop:{originX:Math.max(0,Math.round((frame.x+offsetX)/scale)),originY:Math.max(0,Math.round((frame.y+offsetY)/scale)),width:Math.round(frame.width/scale),height:Math.round(frame.height/scale)}}],{format:SaveFormat.JPEG,compress:1});
 return decodeNativePhoto(cropped.uri);
}
