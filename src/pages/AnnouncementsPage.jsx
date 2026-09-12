import React from 'react';
import ComingSoon from '../components/common/ComingSoon';
import { t } from '../locales';

const AnnouncementsPage = () => {
  return (
    <ComingSoon
      icon="campaign"
      featureName={t('nav.announcements')}
      description={t('comingSoon.announcementsDescription')}
    />
  );
};

export default AnnouncementsPage;
