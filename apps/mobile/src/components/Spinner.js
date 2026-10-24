import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

// A small branded ring spinner — one bright arc rotating over a faint track,
// instead of the platform-default ActivityIndicator.
export function Spinner({ size = 18, color = '#fff', trackColor = 'rgba(255,255,255,0.35)' }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 750, easing: Easing.linear }), -1, false);
  }, [rotation]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const stroke = Math.max(2, Math.round(size / 8));

  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: trackColor }} />
      <Animated.View
        style={[
          { position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: 'transparent', borderTopColor: color },
          spin,
        ]}
      />
    </View>
  );
}
