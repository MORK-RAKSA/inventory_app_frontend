import { AppTextInput as TextInput, AppText as Text } from './components/AppText';
import React,{useId,useState} from 'react';
import {KeyboardAvoidingView,KeyboardTypeOptions,Platform,ScrollView,StyleProp,StyleSheet,View,ViewStyle,ActivityIndicator,RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated,{interpolate,interpolateColor,useAnimatedStyle,useSharedValue,withTiming} from 'react-native-reanimated';
import Svg,{Circle,Defs,LinearGradient,Rect,Stop} from 'react-native-svg';
import {ArrowLeft,ChevronRight,Inbox} from 'lucide-react-native';
import {C,R,money,khr,roundKhr,shadow} from './theme';
import {Press,Rise,fade,fadeOut,rise} from './motion';

export {C,R,money,khr,roundKhr,shadow};

type IconType = React.ComponentType<{size?:number;color?:string;strokeWidth?:number}>;

/* ───────────────────────── Screen ───────────────────────── */
export function Screen({title,subtitle,children,right,onBack,tabs = true,onRefresh,refreshing = false}:{
  title:string;subtitle?:string;children:React.ReactNode;right?:React.ReactNode;onBack?:()=>void;tabs?:boolean;onRefresh?:()=>void|Promise<void>;refreshing?:boolean;
}) {
  const [pulling,setPulling] = useState(false);
  const pull = async () => {if (!onRefresh) return;setPulling(true);try{await onRefresh();}finally{setPulling(false);}};
  return (
    <SafeAreaView edges={['top']} style={{flex: 1, backgroundColor: C.bg}}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1}}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing || pulling} onRefresh={pull} tintColor={C.primary} colors={[C.primary]} /> : undefined}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal: 20, paddingTop: 22, paddingBottom: tabs ? 130 : 60}}
        >
          {onBack ? (
            <Rise>
              <Press onPress={onBack} accessibilityLabel="Go back" style={{alignSelf: 'flex-start', marginBottom: 18}}>
                <View style={{width: 40, height: 40, borderRadius: 14, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', ...shadow.sm}}>
                  <ArrowLeft size={19} color={C.primary} />
                </View>
              </Press>
            </Rise>
          ) : null}
          <Rise index={onBack ? 1 : 0}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12}}>
              <Text numberOfLines={1} style={{flex: 1, color: C.primary, fontSize: 30, fontWeight: '800', letterSpacing: -0.6}}>{title}</Text>
              {right}
            </View>
            {subtitle ? <Text style={{color: C.muted, marginTop: 6, fontSize: 13.5, lineHeight: 20}}>{subtitle}</Text> : null}
            <View style={{height: 22}} />
          </Rise>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ───────────────────────── Surfaces ───────────────────────── */
export function Card({children,style,index}:{children:React.ReactNode;style?:StyleProp<ViewStyle>;index?:number}) {
  const body = (
    <View style={[{backgroundColor: C.surface, padding: 18, borderRadius: R.lg, marginBottom: 14, ...shadow.sm}, style]}>{children}</View>
  );
  return index === undefined ? body : <Rise index={index}>{body}</Rise>;
}

/** Purple gradient hero surface with soft decorative circles (react-native-svg, no extra native deps). */
export function GradientCard({children,style}:{children:React.ReactNode;style?:StyleProp<ViewStyle>}) {
  const id = 'g' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View style={[{borderRadius: R.xl, overflow: 'hidden', marginBottom: 14, backgroundColor:'#6946B8', ...shadow.md}, style]}>
      <Svg width="100%" height="100%" pointerEvents="none" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#7E5CD6" />
            <Stop offset="1" stopColor="#4B2F94" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
        <Circle cx="92%" cy="8%" r="90" fill="#FFFFFF" opacity={0.08} />
        <Circle cx="105%" cy="70%" r="60" fill="#FFFFFF" opacity={0.06} />
      </Svg>
      <View style={{padding: 22}}>{children}</View>
    </View>
  );
}

export function IconBadge({icon:Icon,size = 42,tone = 'primary'}:{icon:IconType;size?:number;tone?:'primary'|'amber'|'red'|'solid'}) {
  const bg = tone === 'amber' ? C.amberPale : tone === 'red' ? C.redPale : tone === 'solid' ? C.primary : C.pale;
  const fg = tone === 'amber' ? C.amber : tone === 'red' ? C.red : tone === 'solid' ? '#fff' : C.primary;
  return (
    <View style={{width: size, height: size, borderRadius: size * 0.34, backgroundColor: bg, alignItems: 'center', justifyContent: 'center'}}>
      <Icon size={size * 0.48} color={fg} strokeWidth={2} />
    </View>
  );
}

export function Heading({children,action,onPress}:{children:React.ReactNode;action?:string;onPress?:()=>void}) {
  return (
    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 12}}>
      <Text style={{fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.2}}>{children}</Text>
      {action ? (
        <Press onPress={onPress} scale={0.94} style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={{color: C.primary, fontWeight: '700', fontSize: 13}}>{action}</Text>
          <ChevronRight size={15} color={C.primary} />
        </Press>
      ) : null}
    </View>
  );
}

/* ───────────────────────── Controls ───────────────────────── */
export function Btn({children,onPress,disabled = false,outline = false,soft = false,danger = false,small = false,icon:Icon,loading = false,style}:{
  children:React.ReactNode;onPress:()=>void;disabled?:boolean;outline?:boolean;soft?:boolean;danger?:boolean;small?:boolean;icon?:IconType;loading?:boolean;style?:StyleProp<ViewStyle>;
}) {
  const filled = !outline && !soft;
  const bg = disabled ? '#CFC7DF' : danger ? C.red : soft ? C.pale : outline ? C.surface : C.primary;
  const fg = filled ? '#fff' : danger ? C.red : C.primary;
  return (
    <Press
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      scale={0.97}
      style={[{
        backgroundColor: bg, borderColor: outline ? C.paleStrong : 'transparent', borderWidth: 1.5,
        paddingVertical: small ? 10 : 15, paddingHorizontal: small ? 14 : 20, borderRadius: R.md + 1,
        alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
        ...(filled && !disabled ? shadow.sm : null),
      }, style]}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : Icon ? <Icon size={small ? 15 : 18} color={fg} strokeWidth={2.2} /> : null}
      <Text style={{color: fg, fontWeight: '800', fontSize: small ? 12.5 : 14.5}}>{children}</Text>
    </Press>
  );
}

export function Pill({children,tone = 'green'}:{children:React.ReactNode;tone?:'green'|'red'|'amber'|'neutral'}) {
  const fg = tone === 'red' ? C.red : tone === 'amber' ? C.amber : tone === 'neutral' ? C.muted : C.primary;
  const bg = tone === 'red' ? C.redPale : tone === 'amber' ? C.amberPale : tone === 'neutral' ? '#F3F1F7' : C.pale;
  return (
    <View style={{alignSelf: 'flex-start', backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill}}>
      <Text style={{color: fg, fontSize: 11.5, fontWeight: '700'}}>{children}</Text>
    </View>
  );
}

export function Field({placeholder,value,onChangeText,keyboardType = 'default',style,label,icon:Icon,prefix,right,autoFocus}:{
  placeholder:string;value:string;onChangeText:(v:string)=>void;keyboardType?:KeyboardTypeOptions;style?:StyleProp<ViewStyle>;
  label?:string;icon?:IconType;prefix?:string;right?:React.ReactNode;autoFocus?:boolean;
}) {
  const focus = useSharedValue(0);
  const box = useAnimatedStyle(() => ({
    borderColor: Platform.OS === 'web' ? C.border : interpolateColor(focus.value, [0, 1], [C.border, C.primary]),
    backgroundColor: interpolateColor(focus.value, [0, 1], [C.surface, '#FFFFFF']),
    transform: [{ scale: interpolate(focus.value, [0, 1], [1, 1.018]) }],
    shadowOpacity: interpolate(focus.value, [0, 1], [0, 0.12]),
  }));
  return (
    <View style={[{marginBottom: 14}, style]}>
      {label ? <Text style={{color: C.muted, fontSize: 12, fontWeight: '700', marginBottom: 7}}>{label}</Text> : null}
      <Animated.View style={[{flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: R.md, paddingHorizontal: 14, height: 50, gap: 10}, box]}>
        {prefix ? (
          <Text style={{fontSize: 16, fontWeight: '800', color: C.primary, minWidth: 16}}>{prefix}</Text>
        ) : Icon ? (
          <Icon size={18} color="#9CA3AF" />
        ) : null}
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          onFocus={() => {focus.value = withTiming(1, {duration: 180});}}
          onBlur={() => {focus.value = withTiming(0, {duration: 180});}}
          style={[
            {flex: 1, color: C.text, fontSize: 15, height: '100%'},
            Platform.OS === 'web'
              ? ({
                  outline: 'none',
                  outlineStyle: 'none',
                  outlineWidth: 0,
                  boxShadow: 'none',
                } as any)
              : null,
          ]}
        />
        {right}
      </Animated.View>
    </View>
  );
}

/* ───────────────────────── Feedback ───────────────────────── */
export function Placeholder({label,size = 52}:{label?:string;size?:number}) {
  return (
    <View style={{width: size, height: size, borderRadius: size * 0.3, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center'}}>
      <Text style={{fontSize: size * 0.42, color: C.primary, fontWeight: '800'}}>{(label || 'P').charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function ErrorLine({message}:{message?:string}) {
  return message ? (
    <Animated.View entering={fade} exiting={fadeOut} style={{backgroundColor: C.redPale, borderRadius: R.md, padding: 12, marginVertical: 10}}>
      <Text style={{color: C.red, fontSize: 12.5, lineHeight: 18}}>{message}</Text>
    </Animated.View>
  ) : null;
}

export function Empty({message}:{message:string}) {
  return (
    <Animated.View entering={rise(0)} style={{alignItems: 'center', paddingVertical: 34, paddingHorizontal: 20, backgroundColor: C.surface, borderRadius: R.lg, marginBottom: 14, ...shadow.sm}}>
      <IconBadge icon={Inbox} size={48} />
      <Text style={{color: C.muted, textAlign: 'center', marginTop: 12, fontSize: 13.5}}>{message}</Text>
    </Animated.View>
  );
}
