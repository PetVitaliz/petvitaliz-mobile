import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme/privateTheme';

// Certo verde animado das telas de sucesso:
// 1. o círculo "salta" na tela, 2. o certo aparece girando de leve,
// 3. duas ondas saem do círculo e somem.

interface SuccessCheckProps {
  size?: number;
  color?: string;
}

export default function SuccessCheck({ size = 84, color = theme.colors.success }: SuccessCheckProps) {
  const circle = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const waveAnim = (v: Animated.Value) =>
      Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true });

    const anim = Animated.sequence([
      Animated.spring(circle, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(check, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
        waveAnim(wave1),
        Animated.sequence([Animated.delay(220), waveAnim(wave2)]),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  const waveStyle = (v: Animated.Value) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    borderColor: color,
    opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.45, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
  });

  return (
    <View style={[styles.box, { width: size * 1.7, height: size * 1.7 }]}>
      <Animated.View style={[styles.wave, waveStyle(wave1)]} />
      <Animated.View style={[styles.wave, waveStyle(wave2)]} />
      <Animated.View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            shadowColor: color,
            opacity: circle.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
            transform: [{ scale: circle }],
          },
        ]}
      >
        <Animated.View
          style={{
            opacity: check,
            transform: [
              { scale: check.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
              { rotate: check.interpolate({ inputRange: [0, 1], outputRange: ['-45deg', '0deg'] }) },
            ],
          }}
        >
          <Feather name="check" size={size * 0.48} color="#FFFFFF" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  wave: { position: 'absolute', borderWidth: 3 },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
});
