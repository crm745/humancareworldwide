import { useEffect } from 'react';
import { Image, Pressable } from 'react-native';
import { SPLASH_BG } from '../data/images';
import { navReplace } from '../lib/nav';

// Splash: full-bleed brand image, auto-advances to Welcome (tap to skip).
export default function Splash() {
  useEffect(() => {
    const timer = setTimeout(() => navReplace('/welcome'), 2000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <Pressable className="flex-1 bg-white" onPress={() => navReplace('/welcome')}>
      <Image source={SPLASH_BG} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </Pressable>
  );
}
