import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

type Palette = {
  border: string;
  accent: string;
  success: string;
  danger: string;
  primary: string;
  softIndigo: string;
  surface: string;
};

type FramedAvatarProps = {
  uri?: string | null;
  name?: string | null;
  frameId?: string | null;
  size?: number;
  colors: Palette;
  backgroundColor?: string;
  textColor?: string;
  textSize?: number;
  baseBorderWidth?: number;
  activeBorderWidth?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
};

export function getProfileFrameColor(frameId: string | null | undefined, colors: Palette) {
  switch (frameId) {
    case 'gold':
      return colors.accent;
    case 'emerald':
      return colors.success;
    case 'ruby':
      return colors.danger;
    case 'cosmic':
      return '#7C3AED';
    default:
      return colors.border;
  }
}

export function FramedAvatar({
  uri,
  name,
  frameId,
  size = 48,
  colors,
  backgroundColor,
  textColor,
  textSize,
  baseBorderWidth = 1,
  activeBorderWidth = 3,
  style,
  imageStyle,
  textStyle,
  children,
}: FramedAvatarProps) {
  const isActive = Boolean(frameId && frameId !== 'none');
  const borderWidth = isActive ? activeBorderWidth : baseBorderWidth;
  const innerSize = Math.max(size - borderWidth * 2, 1);
  const radius = size / 2;
  const initial = name?.trim()?.charAt(0).toUpperCase() || 'U';

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth,
          borderColor: getProfileFrameColor(frameId, colors),
          backgroundColor: backgroundColor || colors.softIndigo,
        },
        isActive && {
          shadowColor: getProfileFrameColor(frameId, colors),
          shadowOpacity: 0.22,
          shadowRadius: Math.max(5, size * 0.12),
          shadowOffset: { width: 0, height: Math.max(2, size * 0.05) },
          elevation: 4,
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
            imageStyle,
          ]}
        />
      ) : (
        <Text
          style={[
            {
              color: textColor || colors.primary,
              fontSize: textSize || Math.max(10, size * 0.42),
            },
            styles.initial,
            textStyle,
          ]}
        >
          {initial}
        </Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  initial: {
    fontWeight: '900',
    textAlign: 'center',
  },
});
