import React, { useEffect, useId, useState } from 'react';
import { companyService } from '../../api/companyService';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { toUpperCase } from '../../utils/textUtils';
import { showSuccess, showError } from '../../utils/toastUtils';
import { t } from '../../locales';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;

// Sunucunun çakışma kodu → hatanın gösterileceği alan
const CODE_FIELDS = {
  COMPANY_NAME_EXISTS: 'name',
  COMPANY_SHORT_NAME_EXISTS: 'shortName',
  USER_EMAIL_EXISTS: 'adminEmail',
  USER_USERNAME_EXISTS: 'adminUsername',
  SUBSCRIPTION_END_DATE_INVALID: 'endDate',
};

// VALIDATION_FAILED `details` anahtarı → form alanı
const DETAIL_FIELDS = {
  name: 'name',
  shortName: 'shortName',
  description: 'description',
  subscriptionPlanId: 'subscriptionPlanId',
  customMaxBrokerUsers: 'customMaxBrokerUsers',
  customMaxClientCompanies: 'customMaxClientCompanies',
  'admin.email': 'adminEmail',
  'admin.username': 'adminUsername',
  'admin.password': 'adminPassword',
};

const pad = (n) => String(n).padStart(2, '0');
const toIsoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const todayIso = () => toIsoDate(new Date());

// Sunucudaki LocalDate.plusMonths / plusYears gibi: gün hedef ayda yoksa ayın son gününe çekilir (31.01 → 28.02).
const addBillingCycle = (isoDate, cycle) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate || '');
  if (!match) return '';
  const yearly = cycle === 'YEARLY';
  const target = new Date(Number(match[1]) + (yearly ? 1 : 0), Number(match[2]) - 1 + (yearly ? 0 : 1), 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(Number(match[3]), lastDay));
  return toIsoDate(target);
};

const initialForm = () => {
  const startDate = todayIso();
  return {
    name: '',
    shortName: '',
    description: '',
    subscriptionPlanId: '',
    startDate,
    endDate: '',
    billingCycle: 'MONTHLY',
    nextPaymentDue: addBillingCycle(startDate, 'MONTHLY'),
    customMaxBrokerUsers: '',
    customMaxClientCompanies: '',
    notes: '',
    adminEmail: '',
    adminUsername: '',
    adminPassword: '',
    adminPasswordConfirm: '',
  };
};

const inputClass = (hasError) =>
  `w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
    hasError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
  }`;

const describedBy = (id, error, hint) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

function Section({ icon, title, children }) {
  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2 pb-2 text-sm font-semibold text-text-main border-b border-gray-200 dark:border-gray-700">
        <span className="material-symbols-outlined text-base text-primary">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ id, label, required, error, hint, className = '', children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-text-main mb-1.5">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-text-secondary">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * SUPER_ADMIN: yeni gümrük firması, aboneliği ve ilk Broker Yöneticisi — tek istek, sunucuda tek işlem.
 * Sunucu e-posta göndermez; başlangıç şifresini SUPER_ADMIN yöneticiye kendisi iletir.
 *
 * @param {object[]} props.plans      Aktif planlar (/subscriptions/plans/active)
 * @param {Function} props.onClose    Kapatma (kaydedilmemiş değişiklik korumasından geçer)
 * @param {Function} props.onSuccess  Oluşturulan firmanın yanıtıyla çağrılır; modalı kapatmak çağıranın işi
 */
export default function CreateBrokerCompanyModal({ plans = [], onClose, onSuccess }) {
  const baseId = useId();
  const fieldId = (field) => `${baseId}-${field}`;

  const [formData, setFormData] = useState(initialForm);
  const [nextPaymentEdited, setNextPaymentEdited] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { requestClose } = useUnsavedChangesGuard({ values: formData, onClose });

  useEffect(() => {
    document.getElementById(`${baseId}-name`)?.focus();
  }, [baseId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) requestClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, requestClose]);

  const clearError = (field) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setField = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Sonraki ödeme tarihi elle değiştirilmediyse başlangıç + dönemi izler
      if ((field === 'startDate' || field === 'billingCycle') && !nextPaymentEdited) {
        next.nextPaymentDue = addBillingCycle(next.startDate, next.billingCycle);
      }
      return next;
    });
    clearError(field);
  };

  const handleNextPaymentChange = (value) => {
    if (!value) {
      // Temizlenirse yeniden başlangıç + dönem
      setNextPaymentEdited(false);
      setFormData((prev) => ({ ...prev, nextPaymentDue: addBillingCycle(prev.startDate, prev.billingCycle) }));
      return;
    }
    setNextPaymentEdited(true);
    setField('nextPaymentDue', value);
  };

  const showFieldErrors = (fieldErrors) => {
    setErrors(fieldErrors);
    const firstField = Object.keys(fieldErrors)[0];
    if (firstField) {
      requestAnimationFrame(() => document.getElementById(`${baseId}-${firstField}`)?.focus());
    }
  };

  const validate = () => {
    const found = {};
    const name = formData.name.trim();
    const shortName = formData.shortName.trim();
    if (!name) found.name = t('brokerSubscriptions.create.errors.nameRequired');
    else if (name.length < 2) found.name = t('brokerSubscriptions.create.errors.nameSize');
    if (!shortName) found.shortName = t('brokerSubscriptions.create.errors.shortNameRequired');
    else if (shortName.length < 2) found.shortName = t('brokerSubscriptions.create.errors.shortNameSize');
    if (!formData.subscriptionPlanId) found.subscriptionPlanId = t('brokerSubscriptions.create.errors.planRequired');
    if (!formData.startDate) found.startDate = t('brokerSubscriptions.create.errors.startDateRequired');
    if (formData.endDate && (formData.endDate <= formData.startDate || formData.endDate <= todayIso())) {
      found.endDate = t('brokerSubscriptions.create.errors.endDateInvalid');
    }
    ['customMaxBrokerUsers', 'customMaxClientCompanies'].forEach((field) => {
      const value = formData[field];
      if (value !== '' && !(Number.isInteger(Number(value)) && Number(value) > 0)) {
        found[field] = t('brokerSubscriptions.create.errors.limitPositive');
      }
    });
    const email = formData.adminEmail.trim();
    if (!email) found.adminEmail = t('brokerSubscriptions.create.errors.emailRequired');
    else if (!EMAIL_PATTERN.test(email)) found.adminEmail = t('brokerSubscriptions.create.errors.emailInvalid');
    const username = formData.adminUsername.trim();
    if (username.length < 3 || username.length > 50) {
      found.adminUsername = t('brokerSubscriptions.create.errors.usernameSize');
    }
    if (formData.adminPassword.length < PASSWORD_MIN) {
      found.adminPassword = t('brokerSubscriptions.create.errors.passwordMin', { min: PASSWORD_MIN });
    }
    if (formData.adminPasswordConfirm !== formData.adminPassword) {
      found.adminPasswordConfirm = t('brokerSubscriptions.create.errors.passwordMismatch');
    }
    return found;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (loading) return;

    const found = validate();
    if (Object.keys(found).length > 0) {
      showFieldErrors(found);
      return;
    }

    setLoading(true);
    const result = await companyService.createBrokerCompany({
      name: formData.name.trim(),
      shortName: formData.shortName.trim(),
      description: formData.description.trim() || null,
      subscriptionPlanId: Number(formData.subscriptionPlanId),
      startDate: `${formData.startDate}T00:00:00`,
      endDate: formData.endDate ? `${formData.endDate}T00:00:00` : null,
      billingCycle: formData.billingCycle,
      nextPaymentDue: formData.nextPaymentDue || null,
      customMaxBrokerUsers: formData.customMaxBrokerUsers ? Number(formData.customMaxBrokerUsers) : null,
      customMaxClientCompanies: formData.customMaxClientCompanies ? Number(formData.customMaxClientCompanies) : null,
      notes: formData.notes.trim() || null,
      admin: {
        email: formData.adminEmail.trim(),
        username: formData.adminUsername.trim(),
        password: formData.adminPassword,
      },
    });
    setLoading(false);

    if (result.success) {
      showSuccess(t('brokerSubscriptions.create.success', {
        name: result.data?.name ?? formData.name.trim(),
        code: result.data?.companyCode ?? '—',
      }));
      onSuccess?.(result.data);
      return;
    }

    const conflictField = CODE_FIELDS[result.code];
    if (conflictField) {
      showFieldErrors({ [conflictField]: result.error });
      return;
    }
    if (result.code === 'VALIDATION_FAILED' && result.details) {
      const mapped = {};
      Object.entries(result.details).forEach(([key, message]) => {
        if (DETAIL_FIELDS[key]) mapped[DETAIL_FIELDS[key]] = message;
      });
      if (Object.keys(mapped).length > 0) {
        showFieldErrors(mapped);
        return;
      }
    }
    showError(result.error);
  };

  const selectedPlan = plans.find((plan) => String(plan.id) === String(formData.subscriptionPlanId));
  const nextPaymentInPast = !!formData.nextPaymentDue && formData.nextPaymentDue < todayIso();

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={requestClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-title`}
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-2xl flex-shrink-0 transition-colors duration-300">
          <div>
            <h2 id={`${baseId}-title`} className="text-2xl font-bold text-text-main flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">add_business</span>
              {t('brokerSubscriptions.create.title')}
            </h2>
            <p className="text-sm text-text-secondary mt-1">{t('brokerSubscriptions.create.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={loading}
            aria-label={t('common.close')}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate autoComplete="off" className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Firma */}
            <Section icon="business" title={t('brokerSubscriptions.create.sections.company')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id={fieldId('name')} label={t('company.name')} required error={errors.name}>
                  <input
                    id={fieldId('name')}
                    type="text"
                    value={formData.name}
                    onChange={(e) => setField('name', e.target.value)}
                    maxLength={255}
                    autoComplete="off"
                    placeholder={t('brokerSubscriptions.create.namePlaceholder')}
                    aria-invalid={!!errors.name}
                    aria-describedby={describedBy(fieldId('name'), errors.name)}
                    className={inputClass(errors.name)}
                  />
                </Field>
                <Field
                  id={fieldId('shortName')}
                  label={t('company.shortName')}
                  required
                  error={errors.shortName}
                  hint={t('brokerSubscriptions.create.shortNameHint')}
                >
                  <input
                    id={fieldId('shortName')}
                    type="text"
                    value={formData.shortName}
                    onChange={(e) => setField('shortName', e.target.value)}
                    maxLength={100}
                    autoComplete="off"
                    placeholder={t('brokerSubscriptions.create.shortNamePlaceholder')}
                    aria-invalid={!!errors.shortName}
                    aria-describedby={describedBy(fieldId('shortName'), errors.shortName, true)}
                    className={inputClass(errors.shortName)}
                  />
                </Field>
                <Field
                  id={fieldId('description')}
                  label={t('company.description')}
                  error={errors.description}
                  className="sm:col-span-2"
                >
                  <textarea
                    id={fieldId('description')}
                    value={formData.description}
                    onChange={(e) => setField('description', e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder={t('brokerSubscriptions.create.descriptionPlaceholder')}
                    aria-invalid={!!errors.description}
                    aria-describedby={describedBy(fieldId('description'), errors.description)}
                    className={inputClass(errors.description)}
                  />
                </Field>
              </div>
            </Section>

            {/* Plan ve ödeme */}
            <Section icon="subscriptions" title={t('brokerSubscriptions.create.sections.plan')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  id={fieldId('subscriptionPlanId')}
                  label={t('paymentPage.gRadar.plan')}
                  required
                  error={errors.subscriptionPlanId}
                  hint={plans.length === 0
                    ? t('brokerSubscriptions.create.noPlans')
                    : selectedPlan
                      ? t('brokerSubscriptions.create.planLimits', {
                        users: selectedPlan.maxBrokerUsers ?? '—',
                        clients: selectedPlan.maxClientCompanies ?? '—',
                      })
                      : undefined}
                >
                  <select
                    id={fieldId('subscriptionPlanId')}
                    value={formData.subscriptionPlanId}
                    onChange={(e) => setField('subscriptionPlanId', e.target.value)}
                    aria-invalid={!!errors.subscriptionPlanId}
                    aria-describedby={describedBy(fieldId('subscriptionPlanId'), errors.subscriptionPlanId, plans.length === 0 || selectedPlan)}
                    className={inputClass(errors.subscriptionPlanId)}
                  >
                    <option value="">{t('brokerSubscriptions.create.selectPlan')}</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>{plan.name}</option>
                    ))}
                  </select>
                </Field>
                <Field id={fieldId('billingCycle')} label={t('brokerSubscriptions.edit.billingCycle')} required>
                  <select
                    id={fieldId('billingCycle')}
                    value={formData.billingCycle}
                    onChange={(e) => setField('billingCycle', e.target.value)}
                    className={inputClass(false)}
                  >
                    <option value="MONTHLY">{t('adminCommon.monthly')}</option>
                    <option value="YEARLY">{t('adminCommon.yearly')}</option>
                  </select>
                </Field>
                <Field id={fieldId('startDate')} label={t('brokerSubscriptions.create.startDate')} required error={errors.startDate}>
                  <input
                    id={fieldId('startDate')}
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setField('startDate', e.target.value)}
                    aria-invalid={!!errors.startDate}
                    aria-describedby={describedBy(fieldId('startDate'), errors.startDate)}
                    className={inputClass(errors.startDate)}
                  />
                </Field>
                <Field
                  id={fieldId('endDate')}
                  label={t('brokerSubscriptions.create.endDate')}
                  error={errors.endDate}
                  hint={t('brokerSubscriptions.create.endDateHint')}
                >
                  <input
                    id={fieldId('endDate')}
                    type="date"
                    value={formData.endDate}
                    min={formData.startDate || undefined}
                    onChange={(e) => setField('endDate', e.target.value)}
                    aria-invalid={!!errors.endDate}
                    aria-describedby={describedBy(fieldId('endDate'), errors.endDate, true)}
                    className={inputClass(errors.endDate)}
                  />
                </Field>
                <Field
                  id={fieldId('nextPaymentDue')}
                  label={t('brokerSubscriptions.edit.nextPaymentDate')}
                  error={errors.nextPaymentDue}
                  hint={nextPaymentEdited ? undefined : t('brokerSubscriptions.create.nextPaymentHint')}
                  className="sm:col-span-2"
                >
                  <input
                    id={fieldId('nextPaymentDue')}
                    type="date"
                    value={formData.nextPaymentDue}
                    onChange={(e) => handleNextPaymentChange(e.target.value)}
                    aria-describedby={nextPaymentInPast ? `${fieldId('nextPaymentDue')}-past` : describedBy(fieldId('nextPaymentDue'), errors.nextPaymentDue, !nextPaymentEdited)}
                    className={`${inputClass(errors.nextPaymentDue)} sm:max-w-xs`}
                  />
                  {nextPaymentInPast && (
                    <p id={`${fieldId('nextPaymentDue')}-past`} className="mt-1 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      {t('brokerSubscriptions.create.nextPaymentPast')}
                    </p>
                  )}
                </Field>
                <Field
                  id={fieldId('customMaxBrokerUsers')}
                  label={t('brokerSubscriptions.edit.customUserLimit')}
                  error={errors.customMaxBrokerUsers}
                  hint={t('brokerSubscriptions.create.customLimitHint')}
                >
                  <input
                    id={fieldId('customMaxBrokerUsers')}
                    type="number"
                    min="1"
                    step="1"
                    value={formData.customMaxBrokerUsers}
                    onChange={(e) => setField('customMaxBrokerUsers', e.target.value)}
                    placeholder={t('brokerSubscriptions.edit.planLimitPlaceholder', { value: selectedPlan?.maxBrokerUsers ?? '—' })}
                    aria-invalid={!!errors.customMaxBrokerUsers}
                    aria-describedby={describedBy(fieldId('customMaxBrokerUsers'), errors.customMaxBrokerUsers, true)}
                    className={inputClass(errors.customMaxBrokerUsers)}
                  />
                </Field>
                <Field
                  id={fieldId('customMaxClientCompanies')}
                  label={t('brokerSubscriptions.edit.customClientLimit')}
                  error={errors.customMaxClientCompanies}
                  hint={t('brokerSubscriptions.create.customLimitHint')}
                >
                  <input
                    id={fieldId('customMaxClientCompanies')}
                    type="number"
                    min="1"
                    step="1"
                    value={formData.customMaxClientCompanies}
                    onChange={(e) => setField('customMaxClientCompanies', e.target.value)}
                    placeholder={t('brokerSubscriptions.edit.planLimitPlaceholder', { value: selectedPlan?.maxClientCompanies ?? '—' })}
                    aria-invalid={!!errors.customMaxClientCompanies}
                    aria-describedby={describedBy(fieldId('customMaxClientCompanies'), errors.customMaxClientCompanies, true)}
                    className={inputClass(errors.customMaxClientCompanies)}
                  />
                </Field>
                <Field id={fieldId('notes')} label={t('management.notes')} className="sm:col-span-2">
                  <input
                    id={fieldId('notes')}
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    autoComplete="off"
                    placeholder={t('brokerSubscriptions.create.notesPlaceholder')}
                    className={inputClass(false)}
                  />
                </Field>
              </div>
            </Section>

            {/* İlk Broker Yöneticisi */}
            <Section icon="admin_panel_settings" title={t('brokerSubscriptions.create.sections.admin')}>
              <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 transition-colors">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                <div className="text-sm">
                  <p className="font-semibold text-blue-900 dark:text-blue-200">{t('brokerSubscriptions.create.passwordInfoTitle')}</p>
                  <p className="mt-0.5 text-blue-800 dark:text-blue-300">{t('brokerSubscriptions.create.passwordInfo')}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id={fieldId('adminEmail')} label={t('employee.email')} required error={errors.adminEmail}>
                  <input
                    id={fieldId('adminEmail')}
                    type="email"
                    inputMode="email"
                    value={formData.adminEmail}
                    onChange={(e) => setField('adminEmail', e.target.value.toLowerCase())}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder={t('brokerSubscriptions.create.adminEmailPlaceholder')}
                    aria-invalid={!!errors.adminEmail}
                    aria-describedby={describedBy(fieldId('adminEmail'), errors.adminEmail)}
                    className={inputClass(errors.adminEmail)}
                  />
                </Field>
                <Field
                  id={fieldId('adminUsername')}
                  label={t('management.username')}
                  required
                  error={errors.adminUsername}
                  hint={t('brokerSubscriptions.create.adminUsernameHint')}
                >
                  <input
                    id={fieldId('adminUsername')}
                    type="text"
                    value={formData.adminUsername}
                    onChange={(e) => setField('adminUsername', toUpperCase(e.target.value))}
                    maxLength={50}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={t('brokerSubscriptions.create.adminUsernamePlaceholder')}
                    aria-invalid={!!errors.adminUsername}
                    aria-describedby={describedBy(fieldId('adminUsername'), errors.adminUsername, true)}
                    className={`${inputClass(errors.adminUsername)} uppercase`}
                  />
                </Field>
                <Field
                  id={fieldId('adminPassword')}
                  label={t('employee.password')}
                  required
                  error={errors.adminPassword}
                  hint={t('brokerSubscriptions.create.passwordHint', { min: PASSWORD_MIN })}
                >
                  <div className="relative">
                    <input
                      id={fieldId('adminPassword')}
                      type={showPassword ? 'text' : 'password'}
                      value={formData.adminPassword}
                      onChange={(e) => setField('adminPassword', e.target.value)}
                      autoComplete="new-password"
                      spellCheck={false}
                      aria-invalid={!!errors.adminPassword}
                      aria-describedby={describedBy(fieldId('adminPassword'), errors.adminPassword, true)}
                      className={`${inputClass(errors.adminPassword)} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? t('brokerSubscriptions.create.hidePassword') : t('brokerSubscriptions.create.showPassword')}
                      aria-pressed={showPassword}
                      title={showPassword ? t('brokerSubscriptions.create.hidePassword') : t('brokerSubscriptions.create.showPassword')}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary hover:text-text-main rounded-r-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </Field>
                <Field
                  id={fieldId('adminPasswordConfirm')}
                  label={t('brokerSubscriptions.create.passwordConfirm')}
                  required
                  error={errors.adminPasswordConfirm}
                >
                  <input
                    id={fieldId('adminPasswordConfirm')}
                    type={showPassword ? 'text' : 'password'}
                    value={formData.adminPasswordConfirm}
                    onChange={(e) => setField('adminPasswordConfirm', e.target.value)}
                    autoComplete="new-password"
                    spellCheck={false}
                    aria-invalid={!!errors.adminPasswordConfirm}
                    aria-describedby={describedBy(fieldId('adminPasswordConfirm'), errors.adminPasswordConfirm)}
                    className={inputClass(errors.adminPasswordConfirm)}
                  />
                </Field>
              </div>
            </Section>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl flex-shrink-0 transition-colors">
            <p className="text-xs text-text-secondary">
              <span className="text-red-500">*</span> {t('brokerSubscriptions.create.requiredFields')}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={requestClose}
                disabled={loading}
                className="flex-1 sm:flex-none px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-text-main rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading || plans.length === 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-base">{loading ? 'hourglass_empty' : 'add_business'}</span>
                {loading ? t('management.creating') : t('brokerSubscriptions.create.submit')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
