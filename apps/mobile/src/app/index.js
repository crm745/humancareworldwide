import { useEffect } from 'react';
import { Image, Pressable } from 'react-native';
import { SPLASH_BG } from '../data/images';
import { navReplace } from '../lib/nav';
import { getAccessToken } from '../lib/session';

// Splash: full-bleed brand image, shown for at least 2s (tap to skip) while we check
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
      <Image source={SPLASH_BG} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </Pressable>
  );
}
