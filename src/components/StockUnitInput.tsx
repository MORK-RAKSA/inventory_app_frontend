import { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from './AppText';
import { UnitSelect } from './UnitSelect';
import type { UomConfig } from '../api';
export function StockUnitInput({value,onChange,templates,baseUnit='',baseUnits=[],onBaseUnitChange,onTemplateChange,currentStock}:{currentStock?:number;value:string;onChange:(value:string)=>void;templates:UomConfig[];baseUnit?:string;baseUnits?:string[];onBaseUnitChange?:(unit:string)=>void;onTemplateChange?:(template:UomConfig)=>void}) {
 const [direction,setDirection]=useState<'in'|'out'>('in');
 const [adjustError,setAdjustError]=useState('');
 const [selectedId,setSelectedId]=useState('');
 const matching=templates.filter(t=>t.baseUnit.trim().toLowerCase()===baseUnit.trim().toLowerCase());
 const selected=matching.find(t=>t.id===selectedId);
 const multiplier=selected?.caseQty || 1;
 const total=Math.max(0,Math.floor(Number(value)||0));
 const baseline = currentStock === undefined ? 0 : Math.max(0, Math.floor(currentStock));
 const sign = currentStock !== undefined && direction === 'out' ? -1 : 1;
 const addition = Math.abs(total - baseline);
 const apply = (quantity:number) => {
  if(sign < 0 && quantity > baseline){setAdjustError('Stock out cannot exceed current stock');return false;}
  setAdjustError('');onChange(String(baseline+sign*quantity));return true;
 };
 const packs=Math.floor(addition/multiplier),loose=addition%multiplier;
 const [draft,setDraft]=useState(String(packs));
 const [looseDraft,setLooseDraft]=useState(String(loose));
 const [focused,setFocused]=useState<'quantity'|'loose'|null>(null);
 useEffect(()=>{if(focused!=='quantity')setDraft(String(packs));if(focused!=='loose')setLooseDraft(String(loose));},[packs,loose,focused,multiplier]);
 const labels=matching.map(t=>`${t.name} · ${t.caseUnitName} (${t.caseQty} ${t.baseUnit})`);
 const baseLabel=baseUnit || 'Base units';
 const units=Array.from(new Set([...baseUnits,...templates.map(t=>t.baseUnit),baseUnit].filter(Boolean)));
 const labelStyle={fontSize:11,color:'#74698D',marginBottom:5};
 const inputStyle={borderWidth:1,borderColor:'#DCD4EB',borderRadius:9,minHeight:44,paddingHorizontal:12,paddingVertical:8,fontSize:16,color:'#30264F',backgroundColor:'#FFFFFF'};
 return <View style={{gap:12,padding:12,borderRadius:12,backgroundColor:'#F7F5FC',borderWidth:1,borderColor:'#E9E3F3'}}>
 {currentStock !== undefined && <View style={{gap:6}}>
  <Text style={labelStyle}>Current stock · Read only</Text>
  <View style={{flexDirection:'row',gap:10}}>
    <View style={{flex:1}}><Text style={labelStyle}>{selected?.caseUnitName || baseUnit}</Text><TextInput editable={false} accessibilityLabel="Current stock read only" value={String(Math.floor(baseline/multiplier))} style={[inputStyle,{backgroundColor:'#ECEAF1',color:'#74698D'}]}/></View>
    {selected && <View style={{flex:1}}><Text style={labelStyle}>Loose {baseUnit}</Text><TextInput editable={false} accessibilityLabel="Current loose stock read only" value={String(baseline%multiplier)} style={[inputStyle,{backgroundColor:'#ECEAF1',color:'#74698D'}]}/></View>}
  </View>
 </View>}
 {currentStock !== undefined && <View style={{flexDirection:'row',gap:8}}>{(['in','out'] as const).map(mode=><Pressable key={mode} onPress={()=>{setDirection(mode);setFocused(null);setAdjustError('');onChange(String(baseline));}} style={{flex:1,padding:10,borderRadius:9,backgroundColor:direction===mode?(mode==='out'?'#FCE8EC':'#E3EEE8'):'#FFFFFF',alignItems:'center'}}><Text style={{color:mode==='out'?'#B93859':'#31594B',fontSize:13}}>{mode==='in'?'Stock In · បញ្ចូល':'Stock Out · ដកចេញ'}</Text></Pressable>)}</View>}
 <View style={{flexDirection:'row',gap:10}}>
  <View style={{flex:1,minWidth:0}}><Text style={labelStyle}>ឯកតារាយ · Base unit</Text><UnitSelect value={baseUnit} options={units} placeholder="Base unit" onChange={unit=>{setSelectedId('');onBaseUnitChange?.(unit);}}/></View>
  <View style={{flex:1,minWidth:0}}><Text style={labelStyle}>Stock entry unit</Text><UnitSelect value={selected?labels[matching.indexOf(selected)]:baseLabel} options={baseUnit?[baseLabel,...labels]:[]} placeholder="Entry unit" onChange={next=>{const template=matching[labels.indexOf(next)];setSelectedId(template?.id||'');if(template)onTemplateChange?.(template);}}/></View>
 </View>
 <View style={{flexDirection:'row',gap:10}}>
  <View style={{flex:1}}><Text style={labelStyle}>{currentStock !== undefined ? (direction === 'in' ? 'Stock to add' : 'Stock to remove') : 'Initial quantity'} · {selected?.caseUnitName || baseUnit}</Text><TextInput accessibilityLabel="Stock quantity" keyboardType="number-pad" value={draft} placeholder="0" onFocus={()=>setFocused('quantity')} onBlur={()=>setFocused(null)} onChangeText={text=>{if(!/^\d*$/.test(text))return;if(apply(Number(text || 0)*multiplier+loose))setDraft(text);}} style={inputStyle}/></View>
  {selected && <View style={{flex:1}}><Text style={labelStyle}>{currentStock !== undefined ? (direction === 'in' ? 'Loose to add' : 'Loose to remove') : 'Loose'} {baseUnit} (0–{multiplier-1})</Text><TextInput accessibilityLabel="Loose stock units" keyboardType="number-pad" value={looseDraft} placeholder="0" onFocus={()=>setFocused('loose')} onBlur={()=>setFocused(null)} onChangeText={text=>{if(!/^\d*$/.test(text))return;const n=Number(text||0);if(n>=multiplier)return;if(apply(packs*multiplier+n))setLooseDraft(text);}} style={inputStyle}/></View>}
 </View>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{[5,10,50,100].map(delta=><Pressable key={delta} accessibilityLabel={`Add ${delta} ${selected?.caseUnitName || baseUnit}`} onPress={()=>{setFocused(null);apply(addition+delta*multiplier);}} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:7,backgroundColor:'#EAE4F7'}}><Text style={{fontSize:12,color:'#6946B8'}}>{sign < 0 ? '−' : '+'}{delta}</Text></Pressable>)}</View>
 {!!adjustError && <Text accessibilityRole="alert" style={{fontSize:12,color:'#B93859'}}>{adjustError}</Text>}
 <Text style={{fontSize:12,color:'#47645A'}}>{currentStock !== undefined ? 'After saving' : 'Total'}: {total.toLocaleString()} {baseUnit || 'base units'}{selected ? ` · ${Math.floor(total/multiplier)} ${selected.caseUnitName} + ${total%multiplier} loose` : ''}</Text>
 {!!baseUnit && !matching.length && <Text style={{fontSize:11,color:'#74698D'}}>Add a UOM for {baseUnit} to enter boxes or cases.</Text>}
 </View>;
}
