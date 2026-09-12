import React from 'react';
import ComingSoon from '../components/common/ComingSoon';
import { t } from '../locales';

const ShippingPage = () => {
  return (
    <ComingSoon
      icon="local_shipping"
      featureName={t('nav.cargoTracking')}
      description={t('comingSoon.shippingDescription')}
    />
  );
};

export default ShippingPage;
