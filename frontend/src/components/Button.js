import React from 'react';
import { useTranslation } from 'react-i18next';
import RBButton from 'react-bootstrap/Button'; // Import react-bootstrap Button

/**
 * Reusable button component using react-bootstrap
 * @param {Object} props Component props
 * @param {string} props.type Button type: 'button', 'submit', 'reset'
 * @param {string} props.variant Button variant: 'primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark', 'link', 'outline-primary', etc.
 * @param {function} props.onClick Click handler
 * @param {string} props.text Button text (translation key)
 * @param {string} props.icon Bootstrap icon class name (without 'bi-' prefix)
 * @param {string} props.size Button size: 'sm', 'lg'
 * @param {boolean} props.disabled Whether the button is disabled
 * @param {string} props.className Additional CSS classes
 * @param {React.ReactNode} props.children Children elements
 */
const Button = ({
  type = 'button',
  variant = 'primary',
  onClick,
  text,
  icon,
  size,
  disabled = false,
  className = '',
  children,
  ...rest // Pass any other props down
}) => {
  const { t } = useTranslation();

  return (
    <RBButton
      type={type}
      variant={variant}
      onClick={onClick}
      size={size}
      disabled={disabled}
      className={className}
      {...rest} // Spread remaining props
    >
      {icon && (
        <i className={`bi bi-${icon} ${text || children ? 'me-2' : ''}`}></i>
      )}
      {text && t(text)}
      {children}
    </RBButton>
  );
};

export default Button;
