import { AppText as Text } from './AppText';
import React from 'react';
import {useEffect,useRef,useState} from 'react';
import {TextStyle,StyleProp} from 'react-native';

/** Counts smoothly from the previously shown value to the new one (ease-out cubic, 650 ms). */
export function AnimatedNumber({value,format = n => Math.round(n).toLocaleString('en-US'),style}:{
  value:number;format?:(n:number)=>string;style?:StyleProp<TextStyle>;
}) {
  const target = Number.isFinite(value) ? value : 0;
  const [shown,setShown] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const from = current.current;
    if (from === target) return;
    const start = Date.now();
    let raf = 0;
    const frame = () => {
      const t = Math.min(1, (Date.now() - start) / 650);
      const v = from + (target - from) * (1 - (1 - t) ** 3);
      current.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <Text style={style}>{format(shown)}</Text>;
}
  