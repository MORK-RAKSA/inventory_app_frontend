import { AppTextInput as TextInput, AppText as Text } from '../src/components/AppText';
import {useFonts, NotoSansKhmer_400Regular, NotoSansKhmer_500Medium} from '@expo-google-fonts/noto-sans-khmer';
import 'react-native-gesture-handler';
import {useAppUpdates} from '../src/hooks/useAppUpdates';
import {Stack} from 'expo-router';
import {useEffect,useState} from 'react';
import {ActivityIndicator,View,KeyboardAvoidingView,Platform,ScrollView,useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated,{
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {User,Lock,Eye,EyeOff,ArrowRight,Store,AlertCircle,Monitor,Smartphone} from 'lucide-react-native';
import {login,restore,apiFetch} from '../src/auth';
import {registerSignOut} from '../src/authEvents';
import {StatusBar} from 'expo-status-bar';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {LanguageProvider} from '../src/i18n';
import {C,R,shadow} from '../src/theme';
import {Press,Rise,ease} from '../src/motion';
import {ToastProvider} from '../src/toast';
import {WebPortal} from '../src/components/WebPortal';
import {LiveAlertWatcher} from '../src/liveSync';
import {AppLogo} from '../src/components/AppLogo';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  if (typeof HTMLMediaElement !== 'undefined' && HTMLMediaElement.prototype?.play) {
    const origPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      try {
        const res = origPlay.apply(this, args);
        if (res && typeof res.catch === 'function') {
          return res.catch((err) => {
            if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') return;
            throw err;
          });
        }
        return res;
      } catch (err: any) {
        if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') return Promise.resolve();
        return Promise.reject(err);
      }
    };
  }
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = String(reason?.message || reason || '');
    if (
      reason?.name === 'NotAllowedError' ||
      reason?.name === 'AbortError' ||
      msg.toLowerCase().includes('not allowed by the user agent')
    ) {
      event.preventDefault();
    }
  });
}

function MinimalField({
  label,
  placeholder,
  value,
  onChangeText,
  icon: Icon,
  secureTextEntry,
  autoComplete,
  right,
  onSubmitEditing,
  returnKeyType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  icon: typeof User;
  secureTextEntry?: boolean;
  autoComplete?: 'username' | 'password';
  right?: React.ReactNode;
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'go';
}) {
  const focus = useSharedValue(0);
  const [focused, setFocused] = useState(false);

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: C.border,
    backgroundColor: interpolateColor(focus.value, [0, 1], ['#FAF9FD', '#FFFFFF']),
    transform: [{scale: withTiming(focus.value ? 1.004 : 1, {duration: 200, easing: ease})}],
  }));

  return (
    <View style={{marginBottom: 18}}>
      <Text
        style={{
          color: focused ? C.primary : C.muted,
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 0.3,
          marginBottom: 8,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1.5,
            borderRadius: R.md + 2,
            paddingHorizontal: 15,
            height: 54,
            gap: 12,
          },
          containerStyle,
        ]}
      >
        <Icon size={18} color={focused ? C.primary : C.muted} strokeWidth={2} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.faint}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          secureTextEntry={secureTextEntry}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => {
            setFocused(true);
            focus.value = withTiming(1, {duration: 200, easing: ease});
          }}
          onBlur={() => {
            setFocused(false);
            focus.value = withTiming(0, {duration: 200, easing: ease});
          }}
          style={[
            {
              flex: 1,
              color: C.text,
              fontSize: 15.5,
              fontWeight: '500',
              height: '100%',
            },
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

export default function Root() {
  const [fontsLoaded, fontsError] = useFonts({ NotoSansKhmer_400Regular, NotoSansKhmer_500Medium });
  useAppUpdates();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const [booted, setBooted] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUser, setForgotUser] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotPin, setForgotPin] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  // Default to Portal Website UI on Web desktop/tablet, or allow instant switching on any web screen
  const [uiMode, setUiMode] = useState<'portal' | 'mobile'>(() =>
    Platform.OS === 'web' && width >= 768 ? 'portal' : 'mobile'
  );

  useEffect(() => {
    if (Platform.OS === 'web' && width >= 768) {
      setUiMode('portal');
    }
  }, [width]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      for (const [name, content] of Object.entries({
        'viewport': 'width=device-width, initial-scale=1, viewport-fit=cover',
        'apple-mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-title': 'EasySell',
        'apple-mobile-web-app-status-bar-style': 'default',
        'theme-color': '#F7F4FC',
      })) {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', name); document.head.appendChild(meta); }
        meta.setAttribute('content', content);
      }
      const styleId = 'global-portal-no-focus-outline';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          *,
          *::before,
          *::after,
          *:focus,
          *:focus-visible,
          *:focus-within,
          input,
          input:focus,
          input:focus-visible,
          input:focus-within,
          textarea,
          textarea:focus,
          textarea:focus-visible,
          button,
          button:focus,
          button:focus-visible,
          [tabindex],
          [tabindex]:focus,
          [tabindex]:focus-visible {
            outline: none !important;
            outline-style: none !important;
            outline-width: 0 !important;
            outline-color: transparent !important;
            box-shadow: none !important;
            -webkit-tap-highlight-color: transparent !important;
            -webkit-focus-ring-color: transparent !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{translateX: shakeX.value}],
  }));

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-8, {duration: 55}),
      withTiming(8, {duration: 55}),
      withTiming(-5, {duration: 55}),
      withTiming(5, {duration: 55}),
      withTiming(0, {duration: 55}),
    );
  };

  useEffect(() => registerSignOut(() => setAuthenticated(false)), []);
  useEffect(() => {
    let active = true;
    restore()
      .then((ok) => {
        if (active) setAuthenticated(ok);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setBooted(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSignIn = async () => {
    if (busy) return;
    if (!username.trim() || !password) {
      setError('Please enter both username and password');
      triggerShake();
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password);
      setPassword('');
      setAuthenticated(true);
    } catch (e) {
      const raw = String(e instanceof Error ? e.message : e);
      if (raw.toLowerCase().includes('network request failed')) {
        setError('Cannot connect to server. If on cloud, the server may be waking up (please retry). If running locally, make sure your backend is running.');
      } else {
        setError(raw);
      }
      triggerShake();
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotUser.trim() || !forgotNewPass.trim()) {
      setForgotMsg('Please enter username and new password');
      return;
    }
    setForgotLoading(true);
    setForgotMsg('');
    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: forgotUser.trim(),
          newPassword: forgotNewPass.trim(),
          recoveryKey: forgotPin.trim(),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = 'Reset failed';
        try { msg = JSON.parse(text).error || msg; } catch (_) {}
        throw new Error(msg);
      }
      setForgotMsg('Password reset! You can sign in now.');
      setUsername(forgotUser.trim());
      setPassword(forgotNewPass.trim());
      setTimeout(() => {
        setShowForgot(false);
        setForgotMsg('');
      }, 1500);
    } catch (err: any) {
      setForgotMsg(err?.message || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  if (!booted || (!fontsLoaded && !fontsError)) {
    return (
      <Animated.View
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(200)}
        style={{flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center'}}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 22,
            backgroundColor: C.pale,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
          }}
        >
          <AppLogo size={36} />
        </View>
        <Text style={{fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginBottom: 14}}>
          គ្រប់គ្រងហាង · EasySell
        </Text>
        <ActivityIndicator size="small" color={C.primary} />
      </Animated.View>
    );
  }

  if (!authenticated) {
    const canSubmit = username.trim().length > 0 && password.length > 0 && !busy;

    return (
      <GestureHandlerRootView style={{flex: 1, backgroundColor: C.bg}}>
        <StatusBar style="dark" />
        <SafeAreaView style={{flex: 1}}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{flex: 1}}
          >
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'center',
                paddingHorizontal: 26,
                paddingVertical: 32,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Soft background ambient accents */}
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: -60,
                  right: -60,
                  width: 220,
                  height: 220,
                  borderRadius: 110,
                  backgroundColor: C.pale,
                  opacity: 0.7,
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  bottom: -40,
                  left: -50,
                  width: 170,
                  height: 170,
                  borderRadius: 85,
                  backgroundColor: C.pale,
                  opacity: 0.5,
                }}
              />

              {/* Brand Header */}
              <Rise index={0} style={{alignItems: 'center', marginBottom: 32}}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 22,
                    backgroundColor: '#EDE9FE',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                    ...shadow.md,
                  }}
                >
                  <AppLogo size={36} />
                </View>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '800',
                    color: C.text,
                    letterSpacing: -0.7,
                  }}
                >
                  គ្រប់គ្រងហាង · EasySell
                </Text>
                <Text
                  style={{
                    color: C.muted,
                    fontSize: 14,
                    marginTop: 6,
                    textAlign: 'center',
                  }}
                >
                  Sign in to your គ្រប់គ្រងហាង · EasySell workspace
                </Text>
              </Rise>

              {/* Minimal Form Card */}
              <Rise index={1} style={{width: '100%', maxWidth: 440, alignSelf: 'center'}}>
                <Animated.View
                  style={[
                    {
                      backgroundColor: C.surface,
                      borderRadius: R.xl,
                      padding: 24,
                      borderWidth: 1,
                      borderColor: C.border,
                      ...shadow.sm,
                    },
                    shakeStyle,
                  ]}
                >
                  <Rise index={2}>
                    <MinimalField
                      label="Username"
                      placeholder="Enter your username"
                      value={username}
                      onChangeText={(v) => {
                        setUsername(v);
                        if (error) setError('');
                      }}
                      icon={User}
                      autoComplete="username"
                      returnKeyType="next"
                    />
                  </Rise>

                  <Rise index={3}>
                    <MinimalField
                      label="Password"
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={(v) => {
                        setPassword(v);
                        if (error) setError('');
                      }}
                      icon={Lock}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      returnKeyType="go"
                      onSubmitEditing={handleSignIn}
                      right={
                        <Press
                          onPress={() => setShowPassword((prev) => !prev)}
                          scale={0.9}
                          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                          style={{padding: 4}}
                        >
                          {showPassword ? (
                            <EyeOff size={18} color={C.muted} />
                          ) : (
                            <Eye size={18} color={C.muted} />
                          )}
                        </Press>
                      }
                    />
                  </Rise>

                  <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: -8, marginBottom: 16}}>
                    <Press onPress={() => setShowForgot((prev) => !prev)}>
                      <Text style={{color: C.primary, fontSize: 12.5, fontWeight: '700'}}>
                        {showForgot ? 'Back to sign in' : 'Forgot password?'}
                      </Text>
                    </Press>
                  </View>

                  {showForgot && (
                    <View
                      style={{
                        backgroundColor: '#FFFBEB',
                        borderRadius: R.md,
                        padding: 16,
                        marginBottom: 16,
                        borderWidth: 1,
                        borderColor: '#FDE68A',
                        gap: 10,
                      }}
                    >
                      <Text style={{color: '#92400E', fontSize: 13, fontWeight: '800'}}>
                        Reset Account Password
                      </Text>
                      <TextInput
                        placeholder="Your username (e.g. admin)"
                        placeholderTextColor="#9CA3AF"
                        value={forgotUser}
                        onChangeText={setForgotUser}
                        autoCapitalize="none"
                        style={{
                          height: 40,
                          borderWidth: 1,
                          borderColor: '#FCD34D',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          fontSize: 13,
                          backgroundColor: '#FFFFFF',
                          color: C.text,
                        }}
                      />
                      <TextInput
                        placeholder="New password"
                        placeholderTextColor="#9CA3AF"
                        value={forgotNewPass}
                        onChangeText={setForgotNewPass}
                        secureTextEntry
                        style={{
                          height: 40,
                          borderWidth: 1,
                          borderColor: '#FCD34D',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          fontSize: 13,
                          backgroundColor: '#FFFFFF',
                          color: C.text,
                        }}
                      />
                      <TextInput
                        placeholder="Master Recovery Key / PIN"
                        placeholderTextColor="#9CA3AF"
                        value={forgotPin}
                        onChangeText={setForgotPin}
                        style={{
                          height: 40,
                          borderWidth: 1,
                          borderColor: '#FCD34D',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          fontSize: 13,
                          backgroundColor: '#FFFFFF',
                          color: C.text,
                        }}
                      />
                      {forgotMsg ? (
                        <Text style={{color: forgotMsg.includes('reset!') ? '#059669' : '#DC2626', fontSize: 12, fontWeight: '700'}}>
                          {forgotMsg}
                        </Text>
                      ) : null}
                      <Press
                        disabled={forgotLoading}
                        onPress={handleForgotPassword}
                        style={{
                          height: 40,
                          backgroundColor: '#D97706',
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {forgotLoading ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={{color: '#FFFFFF', fontSize: 13, fontWeight: '800'}}>
                            Reset & Apply Password
                          </Text>
                        )}
                      </Press>
                    </View>
                  )}

                  {error ? (
                    <Animated.View
                      entering={FadeInDown.duration(200).easing(ease)}
                      exiting={FadeOut.duration(150)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: C.redPale,
                        borderRadius: R.md,
                        paddingHorizontal: 13,
                        paddingVertical: 11,
                        marginBottom: 16,
                      }}
                    >
                      <AlertCircle size={16} color={C.red} />
                      <Text style={{color: C.red, fontSize: 12.5, fontWeight: '600', flex: 1}}>
                        {error}
                      </Text>
                    </Animated.View>
                  ) : null}

                  <Rise index={4} style={{marginTop: 4}}>
                    <Press
                      disabled={busy}
                      onPress={handleSignIn}
                      scale={0.98}
                      style={{
                        backgroundColor: canSubmit ? C.primary : '#D7CEEC',
                        borderRadius: R.md + 2,
                        height: 54,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        ...(canSubmit ? shadow.sm : null),
                      }}
                    >
                      {busy ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Text style={{color: '#FFFFFF', fontWeight: '800', fontSize: 15}}>
                            Sign in
                          </Text>
                          <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.4} />
                        </>
                      )}
                    </Press>
                  </Rise>
                </Animated.View>
              </Rise>

              {/* Subtle Footer */}
              <Rise index={5} style={{alignItems: 'center', marginTop: 28}}>
                <Text style={{color: C.faint, fontSize: 12, fontWeight: '600'}}>
                  គ្រប់គ្រងហាង · EasySell POS · Secure Session (24h)
                </Text>
              </Rise>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{flex: 1, backgroundColor: C.bg}}>
      <ToastProvider>
        <LanguageProvider>
          <StatusBar style="dark" />
          <LiveAlertWatcher />
          {Platform.OS === 'web' && uiMode === 'portal' ? (
            <WebPortal onSwitchToMobile={() => setUiMode('mobile')} />
          ) : (
            <View style={{flex: 1}}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: {backgroundColor: C.bg},
                  animation: 'slide_from_right',
                }}
              />

            </View>
          )}
        </LanguageProvider>
      </ToastProvider>
    </GestureHandlerRootView>
  );
}
