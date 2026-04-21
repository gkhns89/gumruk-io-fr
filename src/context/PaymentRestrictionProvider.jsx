import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { paymentService } from '../api/paymentService';
import { AuthContext } from './authContext';

export const PaymentRestrictionContext = createContext({
  restrictionLevel: 'NONE',
  daysOverdue: 0,
  nextPaymentDue: null,
  billingCycle: null,
  isWarning: false,
  isWriteBlocked: false,
  isFullReadOnly: false,
  refreshStatus: () => {},
});

export function usePaymentRestriction() {
  return useContext(PaymentRestrictionContext);
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 dakika

export default function PaymentRestrictionProvider({ children }) {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [status, setStatus] = useState({
    restrictionLevel: 'NONE',
    daysOverdue: 0,
    nextPaymentDue: null,
    billingCycle: null,
  });
  const intervalRef = useRef(null);

  const shouldSkip = !isAuthenticated || !user ||
    user.globalRole === 'SUPER_ADMIN' || user.globalRole === 'CLIENT_USER';

  const fetchStatus = useCallback(async () => {
    if (shouldSkip) return;
    try {
      const data = await paymentService.getRestrictionStatus();
      setStatus({
        restrictionLevel: data.level ?? 'NONE',
        daysOverdue: data.daysOverdue ?? 0,
        nextPaymentDue: data.nextPaymentDue ?? null,
        billingCycle: data.billingCycle ?? null,
      });
    } catch {
      // sessiz hata - poll devam eder
    }
  }, [shouldSkip]);

  useEffect(() => {
    if (shouldSkip) {
      setStatus({ restrictionLevel: 'NONE', daysOverdue: 0, nextPaymentDue: null, billingCycle: null });
      return;
    }

    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus, shouldSkip]);

  const level = status.restrictionLevel;

  const value = {
    ...status,
    isWarning: level === 'WARNING',
    isWriteBlocked: level === 'WRITE_BLOCKED',
    isFullReadOnly: level === 'FULL_READONLY',
    refreshStatus: fetchStatus,
  };

  return (
    <PaymentRestrictionContext.Provider value={value}>
      {children}
    </PaymentRestrictionContext.Provider>
  );
}
