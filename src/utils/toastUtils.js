import { toast } from 'react-toastify';

const toastConfig = {
  position: 'top-right',
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: 'light',
};

export const showSuccess = (message, options = {}) => {
  toast.success(message, { ...toastConfig, ...options });
};

export const showError = (message, options = {}) => {
  toast.error(message, {
    ...toastConfig,
    autoClose: 5000, // Hatalar biraz daha uzun
    ...options
  });
};

export const showInfo = (message, options = {}) => {
  toast.info(message, { ...toastConfig, ...options });
};

export const showWarning = (message, options = {}) => {
  toast.warning(message, { ...toastConfig, ...options });
};
