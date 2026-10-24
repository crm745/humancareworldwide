import { router } from 'expo-router';

// Mirrors the prototype's navReplace(): clear history, then show `path`.
export function navReplace(path) {
  if (router.canDismiss()) router.dismissAll();
  router.replace(path);
}

// Mirrors the prototype's back(): pop, or fall back to Home when there is nothing to pop.
export function goBack() {
  if (router.canGoBack()) router.back();
  else navReplace('/home');
}
