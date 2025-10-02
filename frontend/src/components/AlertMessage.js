import React from 'react';
import { useTranslation } from 'react-i18next';
import RBAlert from 'react-bootstrap/Alert'; // Import react-bootstrap Alert

/**
 * Reusable alert component using react-bootstrap
 * @param {Object} props Component props
 * @param {string} props.type Type of alert: 'success', 'danger', 'warning', 'info'
 * @param {string} props.message Message to display (can be a translation key)
 * @param {boolean} props.translate Whether to translate the message (defaults to true)
 * @param {function} props.onClose Optional close handler for dismissible alerts
 */
const AlertMessage = ({
  type = 'info',
  message,
  translate = true,
  onClose,
  ...rest
}) => {
  const { t } = useTranslation();

  if (!message) return null;

  return (
    <RBAlert
      variant={type}
      onClose={onClose}
      dismissible={!!onClose} // Make dismissible if onClose is provided
      {...rest}
    >
      {translate ? t(message) : message}
    </RBAlert>
  );
};

export default AlertMessage;
