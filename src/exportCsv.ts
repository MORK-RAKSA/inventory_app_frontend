import {File,Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {Alert} from 'react-native';
export async function exportCsv(filename:string,headers:string[],rows:(string|number|null|undefined)[][]){
 try {
  const quote=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const content='\uFEFF'+[headers,...rows].map(row=>row.map(quote).join(',')).join('\r\n');
  const file=new File(Paths.cache,filename);file.create({overwrite:true});file.write(content);
  if(!(await Sharing.isAvailableAsync())){Alert.alert('Export saved',file.uri);return;}
  await Sharing.shareAsync(file.uri,{mimeType:'text/csv',dialogTitle:'Export '+filename,UTI:'public.comma-separated-values-text'});
 }catch(e){Alert.alert('Export failed',String(e));}
}
