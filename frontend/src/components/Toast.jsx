import React from 'react';
import RBToast from 'react-bootstrap/Toast';
import { useTranslation } from 'react-i18next';
import {
  Translate,
} from './index.jsx';

/**
 * Reusable floating toast notification replacing the inline layout-breaking Alert
 * https://react-bootstrap.netlify.app/docs/components/toasts
 * @param {Object} props Component props
 * @param {string} props.type Type of notification: 'success', 'danger', 'warning', 'info'
 * @param {string|Object} props.message Message to display or object with key/values
 * @param {boolean} props.translate Whether to translate the message (defaults to true)
 * @param {function|boolean} props.onClose Callback triggered when closed, or boolean to toggle dismissibility
 * @param {string} props.position Screen position: 'top-right' (default) or 'top-left'
 * @param {number} props.delay Duration in ms before auto-hiding (defaults to 5000ms)
 */
const Toast = ({
  // key = Date.now(),        // key is handled by the React collection loop in the Provider, not inside props
  type = 'info',
  title,
  message,
  when = 'common.justNow',
  onClose,                    // strictly receives the remove function from the Provider
  translate = true,
  position = 'bottom-right',  // supports 'top-right', 'top-left', 'bottom-right'
  delay = 9000,               // Added standard toast auto-hide delay parameter
  animation = true,
  ...rest
}) => {
  const { t } = useTranslation();

  if (!message) return null;
  if (!title) title = (type == 'danger') ? 'common.error' : `common.${type}`;
  type = (type == 'error') ? 'danger' : type;
  const shouldAutohide = delay !== 0; // BUG: that does not work at all

  // Unified close action handling internal state + external callbacks
  // const handleClose = () => {
  //   setShowToast(false);
  //   if (typeof onClose === 'function') {
  //     onClose();
  //   }
  // };

  // Extract translation metadata
  const translationKey = typeof message === 'object' ? message.key : message;
  const translationValues = typeof message === 'object' ? message.values : {};
  const actualTranslatedString = t(translationKey); 
  const keyHasPlaceholder = actualTranslatedString.includes('{{error}}');

  // Match Toast backgrounds to your system color palette variants
  // Text color automatically overrides light modes if success or danger is active
  // const isDarkVariant = ['error', 'danger', 'success', 'dark', 'primary', 'secondary'].includes(type);
  // const textClass = isDarkVariant ? 'text-light' : '';

  const bgMap = {
    light: '',
    dark: '',
  };
  const textMap = {
    primary: 'text-primary',
    warning: '',
    light: '',
    dark: 'text-light',
  };
  const bgClass = bgMap[type] || 'bg-opacity-25';
  const textClass = textMap[type] || `text-${type}`;

      // key={key}
      // show={showToast}
      // onClose={handleClose}

  return (
    <RBToast
      bg={type}
      onClose={onClose}
      delay={delay}
      autohide={shouldAutohide}
      animation={animation}
      className={`${bgClass} shadow-sm`}
      {...rest}
    >
      {/* Render a clean header line with a built-in dismissal action if onClose is enabled */}
      <RBToast.Header closeButton={!!onClose} className="border-bottom-0 pb-1">
        <strong className="me-auto text-capitalize">{t(title)}</strong>
        <small className="text-muted">{t(when)}</small>
      </RBToast.Header>
      
      <RBToast.Body className={`${textClass} pt-1`}>
        <span>
          {Translate(translationKey, translate, translationValues)}
          {!keyHasPlaceholder && translationValues?.error && ` : ${translationValues.error}`}
        </span>
      </RBToast.Body>
    </RBToast>
  );
};

export default Toast;
