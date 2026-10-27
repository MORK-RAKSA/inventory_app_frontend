import { useEffect } from 'react';
import { Platform } from 'react-native';
import { setAudioModeAsync, setIsAudioActiveAsync, useAudioPlayer } from 'expo-audio';

let audioSessionConfigured = false;

function ensureMaxVolumeAndSilentOverride() {
  if (audioSessionConfigured) return;
  audioSessionConfigured = true;

  // Enable playback even when device physical Silent / Mute switch is ON (iOS & Android)
  void setIsAudioActiveAsync(true).catch(() => {});
  void setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
    interruptionModeAndroid: 'doNotMix',
    allowsRecording: false,
    shouldRouteThroughEarpiece: false,
  }).catch(() => {});

  // On mobile Web (iOS 17+ Safari / Chrome), setting navigator.audioSession.type = 'playback'
  // forces audio to play through the media channel even when the iPhone hardware mute switch is ON.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const applyWebPlaybackSession = () => {
      try {
        const nav = navigator as any;
        if (nav?.audioSession && nav.audioSession.type !== 'playback') {
          nav.audioSession.type = 'playback';
        }
      } catch {}
    };
    applyWebPlaybackSession();
    window.addEventListener('touchstart', applyWebPlaybackSession, { passive: true });
    window.addEventListener('click', applyWebPlaybackSession, { passive: true });
    window.addEventListener('keydown', applyWebPlaybackSession, { passive: true });
  }
}

export function useSounds() {
  useEffect(() => {
    ensureMaxVolumeAndSilentOverride();
  }, []);

  const scan = useAudioPlayer(require('../../assets/sounds/scan.wav'), {
    keepAudioSessionActive: true,
  });
  const checkout = useAudioPlayer(require('../../assets/sounds/checkout.wav'), {
    keepAudioSessionActive: true,
  });
  const fail = useAudioPlayer(require('../../assets/sounds/fail.wav'), {
    keepAudioSessionActive: true,
  });

  useEffect(() => {
    try {
      scan.volume = 1.0;
      scan.muted = false;
      checkout.volume = 1.0;
      checkout.muted = false;
      fail.volume = 1.0;
      fail.muted = false;
    } catch {}
  }, [scan, checkout, fail]);

  const playWithMaxVolume = (player: typeof scan) => {
    try {
      ensureMaxVolumeAndSilentOverride();
      player.muted = false;
      player.volume = 1.0;
      if (player.currentTime === 0) { player.play(); return; }
      player
        .seekTo(0)
        .then(() => {
          player.volume = 1.0;
          player.play();
        })
        .catch(() => {
          try {
            player.play();
          } catch {}
        });
    } catch {}
  };

  return {
    playScan: () => playWithMaxVolume(scan),
    playCheckout: () => playWithMaxVolume(checkout),
    playFail: () => playWithMaxVolume(fail),
  };
}
