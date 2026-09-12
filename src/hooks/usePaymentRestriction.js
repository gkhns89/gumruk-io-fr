import { useContext } from 'react';
import { PaymentRestrictionContext } from '../context/paymentRestrictionContext';

// Context varsayılan değer taşıdığı için sağlayıcı dışında kullanım hata vermez,
// kısıtlama yokmuş gibi davranır.
export const usePaymentRestriction = () => useContext(PaymentRestrictionContext);
