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
      {/* Wrapper ensures i18n props do not bleed onto the Bootstrap Alert DOM node */}
      <span>
        {Translate(message, translate)}
      </span>
    </RBAlert>
  );
};

export default AlertMessage;
      // {translate ? t(message) : message}

// using <Trans> inside a bootstrap alert causes this error:
// React does not recognize the `i18nIsDynamicList` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `i18nisdynamiclist` instead. If you accidentally passed it from a parent component, remove it from the DOM element. Component Stack: 
// The warning happens because the react-bootstrap component (<RBAlert>) scans its direct children and attempts to pass down its internal animation/state props to them via cloning. Because your custom Translate helper is returning a <Trans> component directly as the root child, the props from React-Bootstrap mix with the internal properties of react-i18next and bleed onto the final DOM element.To fix this while keeping your HTML formatting, you simply need to wrap the output of your Translate() helper inside a plain HTML tag like a <span> or a <div>. This creates a boundary that prevents react-bootstrap and react-i18next from passing conflicting props to each other.
