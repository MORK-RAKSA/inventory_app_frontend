import { useState } from 'react';
import { Platform, View } from 'react-native';
import { AppTextInput as TextInput } from './AppText';
import { DropdownPicker } from './DropdownPicker';
export function UnitSelect({value,options,onChange,placeholder}:{value:string;options:string[];onChange:(value:string)=>void;placeholder:string}) {
 const [adding,setAdding]=useState(false);
 const units=Array.from(new Set([...options,value].filter(Boolean)));
 if(Platform.OS !== 'web')return <DropdownPicker value={value} options={units} onChange={onChange} placeholder={placeholder} allowCustom/>;
 return <View style={{gap:6}}><select aria-label={placeholder} value={adding?'__new_unit__':value} onChange={e=>{if(e.target.value==='__new_unit__'){setAdding(true);}else{setAdding(false);onChange(e.target.value);}}} style={{width:'100%',height:40,border:'1px solid #CFC3E8',borderRadius:8,padding:'0 10px',background:'#FAF9FD',color:'#30264F',fontSize:13,fontFamily:'inherit',cursor:'pointer'}}><option value="" disabled>{placeholder}</option>{units.map(unit=><option key={unit} value={unit}>{unit}</option>)}<option value="__new_unit__">+ បន្ថែមឯកតាថ្មី / Add unit</option></select>
 {adding && <TextInput autoFocus value={value} onChangeText={onChange} placeholder="ឈ្មោះឯកតាថ្មី / New unit name" style={{minHeight:40,borderWidth:1,borderColor:'#CFC3E8',borderRadius:8,paddingHorizontal:10,fontSize:13}}/>}</View>;
}
