import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { theme } from '../theme/privateTheme';
import type { PlanId } from '../data/planCoverage';

// Carrossel de banners dos planos, usado na home pública e na home logada.
// As imagens já trazem nome do plano, preço e botão: são mostradas inteiras, sem nada por cima.

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - 36;
const BANNER_GAP = 12;

const BANNER_PLANS: PlanId[] = ['bronze', 'prata', 'ouro', 'diamante'];
const BANNERS = [
  require('../assets/Plano-Bronze.png'),
  require('../assets/Plano-Prata.png'),
  require('../assets/Plano-Ouro.png'),
  require('../assets/Plano-Diamante.png'),
];

interface PlanBannerCarouselProps {
  onPressPlan?: (planId: PlanId) => void;
}

export default function PlanBannerCarousel({ onPressPlan }: PlanBannerCarouselProps) {
  const bannerRef = useRef<any>(null);
  const [bannerIndex, setBannerIndex] = useState(0);

  // Troca de banner sozinha a cada 5 segundos.
  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((current) => {
        const next = (current + 1) % BANNERS.length;
        bannerRef.current?.scrollTo({ x: next * (BANNER_WIDTH + BANNER_GAP), animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View>
      <ScrollView
        ref={bannerRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={BANNER_WIDTH + BANNER_GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.bannerRow}
        onMomentumScrollEnd={(e) =>
          setBannerIndex(Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + BANNER_GAP)))
        }
      >
        {BANNERS.map((banner, index) => (
          <TouchableOpacity
            key={BANNER_PLANS[index]}
            activeOpacity={0.92}
            onPress={() => onPressPlan?.(BANNER_PLANS[index])}
          >
            <Image source={banner} style={styles.banner} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {BANNERS.map((_, i) => (
          <View key={i} style={[styles.dot, bannerIndex === i && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerRow: { paddingHorizontal: 18, gap: BANNER_GAP },
  banner: { width: BANNER_WIDTH, height: BANNER_WIDTH / 2, borderRadius: 18 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C9D3E3' },
  dotActive: { width: 18, backgroundColor: theme.colors.primary },
});
