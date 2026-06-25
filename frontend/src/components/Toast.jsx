import React, { useState } from 'react';
import RBToast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';
import { useTranslation } from 'react-i18next';
import { Translate } from './index.jsx';

/**
 * Reusable floating toast notification replacing the inline layout-breaking Alert
 * @param {Object} props Component props
 * @param {string} props.type Type of notification: 'success', 'danger', 'warning', 'info'
 * @param {string|Object} props.message Message to display or object with key/values
 * @param {boolean} props.translate Whether to translate the message (defaults to true)
 * @param {function|boolean} props.onClose Callback triggered when closed, or boolean to toggle dismissibility
 * @param {string} props.position Screen position: 'top-right' (default) or 'top-left'
 * @param {number} props.delay Duration in ms before auto-hiding (defaults to 5000ms)
 */
const Toast = ({
  type = 'info',
  title,
  message,
  when = 'common.justNow',
  onClose = true,
  translate = true,
  position = 'bottom-right',  // supports 'top-right', 'top-left', 'bottom-right'
  delay = 9000,               // Added standard toast auto-hide delay parameter
  ...rest
}) => {
  const { t } = useTranslation();
  const [showToast, setShowToast] = useState(true);

  if (!message) return null;
  if (!title) title = (type == 'danger') ? 'common.error' : `common.${type}`;

  // Resolve layout orientation parameter into standard Bootstrap container alignments
const containerPosition = position === 'top-left' ? 'top-start' 
                        : position === 'bottom-right' ? 'bottom-end' 
                        : 'top-end';

  // Extract translation metadata
  const translationKey = typeof message === 'object' ? message.key : message;
  const translationValues = typeof message === 'object' ? message.values : {};
  const actualTranslatedString = t(translationKey); 
  const keyHasPlaceholder = actualTranslatedString.includes('{{error}}');

  // Unified close action handling internal state + external callbacks
  const handleClose = () => {
    setShowToast(false);
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  // Match Toast backgrounds to your system color palette variants
  // Text color automatically overrides light modes if success or danger is active
  const isDarkVariant = ['danger', 'success', 'dark'].includes(type);
  const textClass = isDarkVariant ? 'text-white' : 'text-dark';

  return (
    <ToastContainer 
      position={containerPosition} 
      className="p-3 position-fixed" 
      style={{ zIndex: 1050 }}
    >
      <RBToast
        bg={type}
        show={showToast}
        onClose={handleClose}
        delay={delay}
        autohide={!!delay}
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
    </ToastContainer>
  );
};

export default Toast;
