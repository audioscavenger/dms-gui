import React from 'react';
import { useTranslation } from 'react-i18next';
import RBSpinner from 'react-bootstrap/Spinner'; // Import react-bootstrap Spinner

/**
 * Reusable loading spinner component using react-bootstrap
 * @param {Object} props Component props
 * @param {string} props.size Size of the spinner: 'sm' or default
 * @param {string} props.variant Bootstrap color variant: 'primary', 'secondary', etc.
 * @param {string} props.animation Animation type: 'border' (default) or 'grow'
 * @param {string} props.customText Custom text for screen readers (if not using translation)
 * @param {boolean} props.isInline inline or justified-centered float
 */
const LoadingSpinner = ({
  size,
  variant = 'primary',    // https://getbootstrap.com/docs/5.3/components/spinners/
  animation = 'border',
  customText,
  isInline = false,
  ...rest
}) => {
  const { t } = useTranslation();
  const className = (Boolean(isInline)) ? "d-inline" : "d-flex justify-content-center";

  return (
    <div className={className} {...rest}>
      <RBSpinner
        animation={animation}
        variant={variant}
        size={size}
        role="status"
      >
        <span className="visually-hidden">
          {customText || t('dashboard.loading')}
        </span>
      </RBSpinner>
    </div>
  );
};

export default LoadingSpinner;
