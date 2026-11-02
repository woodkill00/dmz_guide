import { navigationPreferences } from "../domain/navigation-hub.mjs";
import { features, featureForPage } from "../ui/feature-registry.mjs";
export function readNavigation() {
  try {
    return {
      ...navigationPreferences(localStorage.getItem("dmz-navigation-v1")),
      persistent: true,
    };
  } catch {
    return { pins: [], recent: [], persistent: false };
  }
}
let session = readNavigation();
export function getNavigation() {
  return session;
}
export function updateNavigation(change) {
  session = { ...session, ...change(session) };
  try {
    localStorage.setItem(
      "dmz-navigation-v1",
      JSON.stringify({
        version: 1,
        pins: session.pins,
        recent: session.recent,
      }),
    );
    session.persistent = true;
  } catch {
    session.persistent = false;
  }
  document.dispatchEvent(new Event("navigation-preferences"));
  return session;
}
export function rememberFeature(page) {
  const f = featureForPage(page);
  if (f && f.id !== "home")
    updateNavigation((v) => ({
      recent: [f.id, ...v.recent.filter((x) => x !== f.id)].slice(0, 8),
    }));
}
export function toggleFeaturePin(id) {
  if (!features.some((f) => f.id === id)) return;
  updateNavigation((v) => ({
    pins: v.pins.includes(id)
      ? v.pins.filter((x) => x !== id)
      : [...v.pins, id].slice(-8),
  }));
}
