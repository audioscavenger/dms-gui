import React from 'react';
import { useTranslation } from 'react-i18next';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

// https://mui.com/material-ui/react-autocomplete/#multiple-values
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

import { plucks } from '../../../../common.mjs';
import Button from '../Button';
import FormField from '../FormField';
import SelectField from '../SelectField';

// highlight options by shades of yellow if they equal to login's mailbox or at least the domains are the same
const highlightOptionByDomain = (option, mailbox = undefined, className = "") => {
  let highlight = "";
  if (mailbox) {
    highlight = (mailbox == option) ? " bg-warning bg-opacity-25" : ((mailbox.match(option.split('@')[1])) ? " bg-warning bg-opacity-10" : "");
  }
  return className + highlight;
};

const NewLoginForm = ({
  formData,
  errors,
  submitDisabled,
  filteredAccountOptions,
  rolesAvailable,
  containerName,
  mailservers,
  onInputChange,
  onRolesChange,
  onSubmit,
}) => {
  const { t } = useTranslation();

  return (
    <>
    <Form onSubmit={onSubmit} className="form-wrapper">
      <FormField
        type="checkbox"
        id="isAdmin"
        name="isAdmin"
        label="logins.isAdmin"
        onChange={onInputChange}
        error={errors.isAdmin}
        isChecked={formData.isAdmin}
      />

      <FormField
        type="checkbox"
        id="isAccount"
        name="isAccount"
        label="logins.isAccountChoice"
        onChange={onInputChange}
        error={errors.isAccount}
        isChecked={formData.isAccount && !formData.isAdmin}
        disabled={formData.isAdmin}
      />

      <SelectField
        id="mailserver"
        name="mailserver"
        label="logins.mailserver"
        value={containerName}
        onChange={onInputChange}
        options={mailservers}
        placeholder="logins.mailserverRequired"
        error={errors.mailserver}
        helpText="logins.mailserverRequired"
        required
      />

      <div>
        <FormField
          type="text"
          id="username"
          name="username"
          label="logins.username"
          value={formData.username}
          onChange={onInputChange}
          maxLength={36}
          groupClass="mb-0" // Removed margin so the badge sits cleanly right under the input field
          placeholder="admin"
          error={errors.username}
          helpText="logins.usernameHelp"
          required
        />

        {/* The Live Character Counter Badge */}
        <div className="text-end small mb-2" style={{ marginTop: "-2px" }}>
          <span className={formData.username?.length >= 30 ? "text-danger fw-bold" : "text-muted"}>
            {formData.username?.length || 0}/36
          </span>
        </div>
      </div>

      {formData.isAccount && (
        <SelectField
          id="mailbox"
          name="mailbox"
          label="accounts.mailbox"
          value={plucks(filteredAccountOptions, 'value').has(formData.mailbox) ? formData.mailbox : ""}
          onChange={onInputChange}
          options={filteredAccountOptions}
          placeholder="accounts.mailboxRequired"
          error={(filteredAccountOptions.length) ? errors.mailbox : t('logins.mailboxNothingToPick')}
          helpText="accounts.mailboxHelp"
          required
        />
      ) || (
        <div>
          <FormField
            type="email"
            id="mailbox"
            name="mailbox"
            label="logins.mailbox"
            value={formData.mailbox}
            onChange={onInputChange}
            maxLength={254}
            groupClass="mb-0" // Removed margin so the badge sits cleanly right under the input field
            placeholder="user@domain.com"
            error={errors.mailbox}
            helpText="logins.mailboxHelp"
            required
          />

          {/* The Live Character Counter Badge */}
          <div className="text-end small mb-2" style={{ marginTop: "-2px" }}>
            <span className={formData.mailbox?.length >= 200 ? "text-danger fw-bold" : "text-muted"}>
              {formData.mailbox?.length || 0}/254
            </span>
          </div>
        </div>

      )}

      <Autocomplete
        multiple
        id="roles"
        options={rolesAvailable}
        groupBy={(mailbox) => mailbox.split('@')[1]}    // groupBy with an array of strings: so easy! create the group off the valuesdirectly!
        filterSelectedOptions
        disabled={formData.isAccount}

        value={formData.roles}
        onChange={(e, newValue) => onRolesChange(e, newValue)}
        renderOption={(props, option) => (
          <li
            {...props}
            className={highlightOptionByDomain(option, formData?.mailbox, props.className)}
            key={option}
          >
          {option}
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            sx={{ minWidth: 0 }}
            label={t('logins.roles')}
          />
        )}
      />

      <div>
        <FormField
          type="email"
          id="email"
          name="email"
          label="logins.email"
          value={formData.email}
          onChange={onInputChange}
          maxLength={254}
          groupClass="mb-0" // Removed margin so the badge sits cleanly right under the input field
          placeholder="user@domain.com"
          error={errors.email}
          helpText="logins.emailHelp"
          required
        />

        {/* The Live Character Counter Badge */}
        <div className="text-end small mb-2" style={{ marginTop: "-2px" }}>
          <span className={formData.email?.length >= 200 ? "text-danger fw-bold" : "text-muted"}>
            {formData.email?.length || 0}/254
          </span>
        </div>
      </div>

      <Row className="mb-3">
        <FormField
          as={Col}
          type="password"
          id="password"
          name="password"
          label="password.password"
          value={formData.password}
          onChange={onInputChange}
          error={errors.password}
          required
        />

        <FormField
          as={Col}
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          label="password.confirmPassword"
          value={formData.confirmPassword}
          onChange={onInputChange}
          error={errors.confirmPassword}
          required
        />
      </Row>

      <FormField
        type="checkbox"
        id="isActive"
        name="isActive"
        label="logins.isActive"
        onChange={onInputChange}
        error={errors.isActive}
        isChecked={formData.isActive}
      />

      <Button
        type="submit"
        variant="primary"
        text="logins.addLogin"
        disabled={submitDisabled}
      />
    </Form>
    </>
  );
};

export default NewLoginForm;