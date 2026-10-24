import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Placeholder } from '../ui';
import { C } from '../theme';
import { useLanguage } from '../i18n';
import { ImagePreviewModal } from './ImagePreviewModal';

export async function loadImageMap() {
  try {
    return (JSON.parse((await AsyncStorage.getItem('retailflow.images')) || '{}') as Record<string, string>);
  } catch {
    return {} as Record<string, string>;
  }
}

export async function storeProductImage(id: string, uri: string) {
  const old = await loadImageMap();
  old[id] = uri;
  await AsyncStorage.setItem('retailflow.images', JSON.stringify(old));
}

export function ProductImage({
  id,
  name,
  size = 52,
  uri,
  barcode,
  allowPreview = true,
}: {
  id: string;
  name: string;
  size?: number;
  uri?: string;
  barcode?: string | null;
  allowPreview?: boolean;
}) {
  const [image, setImage] = useState<string | undefined>(uri);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (uri) {
      setImage(uri);
      return;
    }
    void loadImageMap().then((m) => {
      if (active) setImage(m[id]);
    });
    return () => {
      active = false;
    };
  }, [id, uri]);

  const handlePress = () => {
    if (allowPreview && image) {
      setPreviewOpen(true);
    }
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        disabled={!allowPreview || !image}
        accessibilityLabel={`Preview ${name}`}
        style={({ pressed }) => [
          { width: size, height: size },
          pressed && allowPreview && image ? { opacity: 0.85 } : null,
        ]}
      >
        <View style={{ width: size, height: size, borderRadius: size * 0.28, overflow: 'hidden' }}>
          {image ? (
            <Image
              source={{ uri: image }}
              style={{ width: size, height: size }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Placeholder label={name} size={size} />
          )}
        </View>
      </Pressable>

      <ImagePreviewModal
        visible={previewOpen}
        uri={image}
        name={name}
        barcode={barcode}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}
