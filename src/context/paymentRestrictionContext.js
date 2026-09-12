import { createContext } from 'react';

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
