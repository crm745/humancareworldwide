import { useEffect } from 'react';
import { Image, Pressable, View } from 'react-native';
import { LOGO } from '../data/images';
import { navReplace } from '../lib/nav';
import { getAccessToken } from '../lib/session';

// Splash: the logo centred on white, shown for at least 2s (tap to skip) while we check
// for a saved session. A saved token means they're already logged in — AppContext's
// own startup effect loads their real profile in parallel (it runs on every app
// launch, not just this screen), so here we just need to decide where to land: Home
// if there's a token to try, Welcome if there's none.
export default function Splash() {
  useEffect(() => {
    let cancelled = false;
    const minDelay = new Promise((resolve) => setTimeout(resolve, 2000));

    Promise.all([getAccessToken(), minDelay]).then(([token]) => {
      if (cancelled) return;
      navReplace(token ? '/home' : '/welcome');
    });

    return () => { cancelled = true; };
  }, []);

  return (
    <Pressable className="flex-1 bg-white" onPress={() => navReplace('/welcome')}>
      <View className="flex-1 items-center justify-center">
        <Image source={LOGO} style={{ width: '62%', maxWidth: 320, aspectRatio: 2440 / 1405 }} resizeMode="contain" />
      </View>
    </Pressable>
  );
}
