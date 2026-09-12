import { useEffect, useState } from 'react';
import { companyService } from '../api/companyService';
import { getCurrentLocale } from '../locales';

/**
 * Gümrük firmasına bağlı müşteri firmaları (sözleşmesi sonlandırılmamış) — kurye durağı seçimi için.
 * Backend aynı kuralı uygular; burası yalnızca seçilebilecekleri listeler.
 */
export const useLinkedClients = (brokerCompanyId, enabled = true) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled || !brokerCompanyId) {
      setClients([]);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    companyService.getClientCompanies(brokerCompanyId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          const locale = getCurrentLocale();
          setClients(
            result.data
              .filter((client) => client.agreementStatus !== 'TERMINATED')
              .map((client) => ({ id: client.id, label: client.shortName || client.name }))
              .sort((a, b) => a.label.localeCompare(b.label, locale))
          );
        } else {
          setClients([]);
          setError(result.error);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [brokerCompanyId, enabled]);

  return { clients, loading, error };
};
