import React from 'react';
// import { useTranslation } from 'react-i18next';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import InputGroup from 'react-bootstrap/InputGroup';

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
 * @param {boolean} [props.required] Whether the field is required
 * @param {boolean} [props.isChecked] Whether the box isChecked
 * @param {boolean} [props.translate] Whether the fields need translation
 * @param {string} [props.groupClass] Whether to replace the default className of the group
 * @param {React.ReactNode} props.children children of Group like extra buttons etc
 */
const FormField = ({
  type = 'text',
  as = Row,
  id,
  name,
  label,
  value,
  labelColor,
  onChange,
  placeholder,
  error,
  helpText,
  groupClass="mb-3",
  required = false,
  isChecked = false,
  translate = true,
  children,
  ...rest // Pass any other props down to Form.Control
}) => {
  // const { t } = useTranslation();
  const require       = required     == true ? true : false;
  const checked       = isChecked    == true ? true : false;

  return (
    <Form.Group className={groupClass} controlId={id} as={as}>
      {!['checkbox', 'radio'].includes(type) && label && (
      <Form.Label className={labelColor}>
        {Translate(label, translate)}
        {require && <span className="text-danger ms-1">*</span>}
      </Form.Label>
      )}
      
      <InputGroup>
        {['checkbox', 'radio'].includes(type) && (
          <Form.Check
            type={type}
            name={name}
            label={Translate(label, translate)}
            onChange={onChange}
            placeholder={placeholder}
            isInvalid={!!error} // Set isInvalid based on error presence
            checked={checked}
            {...rest} // Spread remaining props
          />
          ) || (
          <Form.Control
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            isInvalid={!!error} // Set isInvalid based on error presence
            required={require} // Pass required prop
            {...rest} // Spread remaining props
          />
        )}
        {children}
      </InputGroup>
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
