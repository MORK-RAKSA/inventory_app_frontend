import React, { forwardRef } from 'react';
import { Text as NativeText, TextInput as NativeInput, StyleSheet, TextProps, TextInputProps } from 'react-native';
import { isLoaded } from 'expo-font';
function font(style: TextProps['style']) {
  const weight = StyleSheet.flatten(style)?.fontWeight;
  const strong = weight === 'bold' || Number(weight) >= 700;
  const family = strong ? 'NotoSansKhmer_500Medium' : 'NotoSansKhmer_400Regular';
  return { ...(isLoaded(family) ? { fontFamily: family } : {}), fontWeight: strong ? '500' as const : '400' as const };

}
export const AppText = forwardRef<NativeText, TextProps>((props, ref) =>
  <NativeText {...props} ref={ref} style={[props.style, font(props.style)]} />);
export const AppTextInput = forwardRef<NativeInput, TextInputProps>((props, ref) =>
  <NativeInput {...props} ref={ref} style={[props.style, font(props.style)]} />);
