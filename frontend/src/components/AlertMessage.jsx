import React, { useState } from 'react';
// import { useTranslation } from 'react-i18next';
import RBAlert from 'react-bootstrap/Alert'; // Import react-bootstrap Alert

import {
  Translate,
} from './index.jsx';

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
  onClose = true,
  translate = true,
  ...rest
}) => {
  // const { t } = useTranslation();
  if (!message) return null;
  // 1. Create a state variable to control the visibility
  const [showAlert, setShowAlert] = useState(true);

  return (
    <RBAlert
      variant={type}
      dismissible={!!onClose}               // Make dismissible if onClose is provided
      show={showAlert}                      // 👈 Tells the alert when to render
      onClose={() => setShowAlert(false)}   // 👈 Changes state to false on 'X'
      {...rest}
    >
      {Translate(message, translate)}
    </RBAlert>
  );
};

export default AlertMessage;
      // {translate ? t(message) : message}
