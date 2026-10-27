import { Platform } from 'react-native';
import { api, Product } from './api';
export const isLocalImage = (uri?: string | null) => !!uri && /^(data:|blob:|file:|content:|ph:)/i.test(uri);
export async function uploadProductImage(id: string, uri: string): Promise<Product> {
 const form = new FormData();
 if (Platform.OS === 'web') {
  const blob=await (await fetch(uri)).blob();
  if(blob.size>5*1024*1024) throw new Error('Image must be 5 MB or smaller');
  form.append('file',blob,'product.'+(blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg'));
 } else {
  const ext=uri.split('?')[0].split('.').pop()?.toLowerCase();
  const type=ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg';
  form.append('file',{uri,name:'product.'+(ext==='png'?'png':ext==='webp'?'webp':'jpg'),type} as any);
 }
 return api<Product>(`/products/${encodeURIComponent(id)}/image`,{method:'POST',body:form});
}
