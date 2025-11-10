import React from 'react';
import { useTranslation } from 'react-i18next';
import Dropdown from 'react-bootstrap/Dropdown'; // Import react-bootstrap Dropdown

/**
 * Reusable dropdown button component using react-bootstrap
 * @param {Object} props Component props
 * @param {string} props.variant Button variant: 'primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark', 'link', 'outline-primary', etc.
 * @param {string} props.text Button text (translation key)
 * @param {string} props.icon Bootstrap icon class name (without 'bi-' prefix)
 * @param {string} props.size Button size: 'sm', 'lg'
 * @param {Object} props.items mapping Dropdown.Menu
 * @param {number} props.items.id
 * @param {string} props.items.title
 * @param {string} props.items.icon
 * @param {boolean} props.disabled Whether the button is disabled
 * @param {string} props.className Additional CSS classes
 */
const ButtonDropdown = ({
  variant = 'primary',
  items,
  id,
  text,
  target,
  rel,
  icon,
  size,
  disabled = false,
  className = '',
  ...rest // Pass any other props down
}) => {
  const { t } = useTranslation();

  // console.debug('ddebug items', items);

  return (
    <Dropdown>
      <Dropdown.Toggle
        variant={variant}
        id={id}
        target={target}
        rel={rel}
        size={size}
        className={className}
        disabled={disabled}
        {...rest} // Spread remaining props
      >
        {icon && (
          <i className={`bi bi-${icon} ${text ? 'me-2' : ''}`}></i>
        )}
        {text && t(text)}
      </Dropdown.Toggle>

      <Dropdown.Menu>
      
        {items.map((item) => (
          <Dropdown.Item
            key={item.id}
            onClick={item?.onClick}
          >
            {item?.icon && (
              <i className={`bi bi-${item.icon} ${item?.title ? 'me-2' : ''}`}></i>
            )}
            {t(item.title)}
          </Dropdown.Item>
        ))}
        
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default ButtonDropdown;
