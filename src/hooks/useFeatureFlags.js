import { useContext } from 'react';
import { FeatureFlagContext } from '../context/featureFlagContext';

// { features, hasFeature(key), isPilotFeature(key), refreshFeatures() } — anahtarlar utils/featureFlags.js'te
export const useFeatureFlags = () => useContext(FeatureFlagContext);
