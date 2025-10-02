import React from 'react';
import { useTranslation } from 'react-i18next';
import Form from 'react-bootstrap/Form'; // Import react-bootstrap Form components

/**
 * Reusable select field component using react-bootstrap
 * @param {Object} props Component props
 * @param {string} props.id Input ID (used for controlId)
 * @param {string} props.name Input name
 * @param {string} props.label Label text (translation key)
 * @param {string} props.value Selected value
 * @param {function} props.onChange Handle change event
 * @param {Array} props.options Array of options with value and label
 * @param {string} [props.placeholder] Placeholder text/option (translation key)
 * @param {string} [props.error] Error message (translation key)
 * @param {string} [props.helpText] Help text (translation key)
 * @param {boolean} [props.required] Whether the field is required
 */
const SelectField = ({
  id,
  name,
  label,
  value,
  onChange,
  options = [],
  placeholder,
  error,
  helpText,
  required = false,
  ...rest // Pass any other props down to Form.Select
}) => {
  const { t } = useTranslation();

  return (
    <Form.Group className="mb-3" controlId={id}>
      <Form.Label>
        {t(label)}
        {required && <span className="text-danger ms-1">*</span>}
      </Form.Label>
      <Form.Select
        name={name}
        value={value}
        onChange={onChange}
        isInvalid={!!error}
        required={required}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled={required}>
            {' '}
            {/* Disable placeholder if required */}
            {t(placeholder)}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Form.Select>
      {error && (
        <Form.Control.Feedback type="invalid">{t(error)}</Form.Control.Feedback>
      )}
      {helpText && <Form.Text muted>{t(helpText)}</Form.Text>}
    </Form.Group>
  );
};

export default SelectField;
