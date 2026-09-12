import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { featureFlagService } from '../api/featureFlagService';
import { AuthContext } from './authContext';
import { FeatureFlagContext } from './featureFlagContext';

/**
 * Giriş yapmış kullanıcı için açık bayrakları bir kez yükler (kullanıcı değişince yeniden).
 * Kararın asıl sahibi backend: bayraklı uç noktalar da kontrol ediyor, burası yalnızca arayüzü açar.
 */
export default function FeatureFlagProvider({ children }) {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [features, setFeatures] = useState([]);
  const userId = user?.id;

  const loadFeatures = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setFeatures([]);
      return;
    }
    const result = await featureFlagService.getMyFeatures();
    setFeatures(result.success ? result.data : []);
  }, [isAuthenticated, userId]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  const value = useMemo(() => {
    const stateByKey = new Map(features.map((feature) => [feature.key, feature.state]));
    return {
      features,
      hasFeature: (key) => stateByKey.has(key),
      isPilotFeature: (key) => stateByKey.get(key) === 'PILOT',
      refreshFeatures: loadFeatures,
    };
  }, [features, loadFeatures]);

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}
