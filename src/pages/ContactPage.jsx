import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { contactService } from '../api/contactService';

const TYPE_CONFIG = {
  PHONE:    { icon: 'phone',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',   label: 'Telefon' },
  EMAIL:    { icon: 'email',       color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'E-posta' },
  WHATSAPP: { icon: 'chat',        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  label: 'WhatsApp' },
  ADDRESS:  { icon: 'location_on', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Adres' },
  WEBSITE:  { icon: 'language',    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',    label: 'Web Sitesi' },
  OTHER:    { icon: 'info',        color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',       label: 'Diğer' },
};

const getContactHref = (type, value) => {
  switch (type) {
    case 'PHONE':    return `tel:${value.replace(/\s/g, '')}`;
    case 'EMAIL':    return `mailto:${value}`;
    case 'WHATSAPP': return `https://wa.me/${value.replace(/[^0-9]/g, '')}`;
    case 'WEBSITE':  return value.startsWith('http') ? value : `https://${value}`;
    default:         return null;
  }
};

const ContactPage = () => {
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    const result = await contactService.getContactInfo();
    if (result.success) setContacts(result.data || []);
    setLoadingContacts(false);
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0">

        {/* Page Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
          <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary">headset_mic</span>
            İletişim
          </h1>
          <p className="text-text-secondary mt-2">
            Destek ekibimizle iletişime geçin
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">

          <h2 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">contacts</span>
            İletişim Bilgileri
          </h2>

          {loadingContacts ? (
            <div className="flex items-center justify-center min-h-[120px]">
              <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[120px] gap-2 text-text-secondary bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <span className="material-symbols-outlined text-[40px]">contact_support</span>
              <p className="text-sm">Henüz iletişim bilgisi eklenmemiş</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {contacts.map(contact => {
                const cfg = TYPE_CONFIG[contact.type] || TYPE_CONFIG.OTHER;
                const href = getContactHref(contact.type, contact.value);
                const Wrapper = href ? 'a' : 'div';
                const wrapperProps = href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {};

                return (
                  <Wrapper
                    key={contact.id}
                    {...wrapperProps}
                    className={`flex items-start gap-4 p-4 rounded-2xl border border-gray-200 dark:border-gray-700
                                bg-white dark:bg-background-dark transition-all
                                ${href ? 'hover:border-primary/50 hover:shadow-sm cursor-pointer group' : ''}`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${cfg.color}`}>
                      <span className="material-symbols-outlined text-[20px]">{cfg.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-secondary mb-0.5">{contact.label}</p>
                      <p className={`text-sm font-semibold text-text-main break-all leading-snug
                                     ${href ? 'group-hover:text-primary transition-colors' : ''}`}>
                        {contact.value}
                      </p>
                    </div>
                    {href && (
                      <span className="material-symbols-outlined text-[16px] text-text-secondary flex-shrink-0 mt-1
                                       group-hover:text-primary transition-colors">
                        open_in_new
                      </span>
                    )}
                  </Wrapper>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

export default ContactPage;
