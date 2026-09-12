import React from 'react';
import ComingSoon from '../../components/common/ComingSoon';
import { t } from '../../locales';

const ReportsPage = () => {
  return (
    <ComingSoon
      icon="assessment"
      featureName={t('nav.reports')}
      description={t('reports.comingSoonDescription')}
    />
  );
};

export default ReportsPage;
