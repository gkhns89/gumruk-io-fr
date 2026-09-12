import { createContext } from 'react';

// Varsayılan değer: sağlayıcı dışında ya da bayraklar yüklenmeden önce her bayrak kapalı sayılır.
export const FeatureFlagContext = createContext({
  features: [],
  hasFeature: () => false,
  isPilotFeature: () => false,
  refreshFeatures: () => {},
});
