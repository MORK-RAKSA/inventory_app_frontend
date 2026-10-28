import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Updates from 'expo-updates';
export function useAppUpdates() {
 const [required,setRequired]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const checking=useRef(false),locked=useRef(false),lastCheck=useRef(0);
 const download=useCallback(async()=>{
  if(locked.current)return;locked.current=true;setBusy(true);setError('');
  try{await Updates.fetchUpdateAsync();setReady(true);}catch{setError('Download failed. Check your connection and retry.');}finally{locked.current=false;setBusy(false);}
 },[]);
 const restart=useCallback(async()=>{setError('');try{await Updates.reloadAsync();}catch{setError('Please fully close and reopen EasySell to apply the downloaded update.');}},[]);
 useEffect(()=>{
  if(__DEV__ || Platform.OS==='web' || !Updates.isEnabled)return;
  let disposed=false;
  const check=async()=>{
   if(checking.current || AppState.currentState!=='active' || Date.now()-lastCheck.current<60000)return;
   checking.current=true;lastCheck.current=Date.now();
   try{const result=await Updates.checkForUpdateAsync();if(!disposed&&result.isAvailable)setRequired(true);}catch{/* Retry when connectivity returns. */}finally{checking.current=false;}
  };
  void check();const sub=AppState.addEventListener('change',state=>{if(state==='active')void check();});const timer=setInterval(()=>void check(),60000);
  return()=>{disposed=true;sub.remove();clearInterval(timer);};
 },[]);
 return {required,ready,busy,error,download,restart};
}
