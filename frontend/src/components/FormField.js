import React from 'react';
// import { useTranslation } from 'react-i18next';
import Form from 'react-bootstrap/Form'; // Import react-bootstrap Form components

import {
  Translate,
} from './';

/**
 * Reusable form field component using react-bootstrap
 * @param {Object} props Component props
 * @param {string} props.type Input type: 'text', 'email', 'password', etc.
 * @param {string} props.id Input ID (used for controlId)
 * @param {string} props.name Input name
 * @param {string} props.label Label text (translation key)
 * @param {string} props.value Input value
 * @param {function} props.onChange Handle change event
 * @param {string} [props.placeholder] Placeholder text
 * @param {string} [props.error] Error message (translation key)
 * @param {string} [props.helpText] Help text (translation key)
 * @param {boolean} [props.translate] Whether the fields need translation
 * @param {boolean} [props.required] Whether the field is required
 */
const FormField = ({
  type = 'text',
  id,
  name,
  label,
  value,
  labelColor,
  onChange,
  placeholder,
  error,
  helpText,
  required = false,
  translate = true,
  ...rest // Pass any other props down to Form.Control
}) => {
  // const { t } = useTranslation();

  return (
    <Form.Group className="mb-3" controlId={id}>
      <Form.Label className={labelColor}>
        {Translate(label, translate)}
        {required && <span className="text-danger ms-1">*</span>}
      </Form.Label>
      <Form.Control
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        isInvalid={!!error} // Set isInvalid based on error presence
        required={required} // Pass required prop
        {...rest} // Spread remaining props
      />
      {error && (
        <Form.Control.Feedback type="invalid">
        {Translate(error, translate)}
        </Form.Control.Feedback>
      )}
      {helpText && (
        <Form.Text muted>
        {Translate(helpText, translate)}
        </Form.Text>
      )}
    </Form.Group>
  );
};

export default FormField;
