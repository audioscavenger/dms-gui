import React from 'react';
import { useTranslation } from 'react-i18next';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Button from '../Button';
import DataTable from '../DataTable';
import FormField from '../FormField';

// highlight options by shades of yellow if they equal to login's mailbox or at least the domains are the same
const highlightOptionByDomain = (option, mailbox = undefined, className = "") => {
  let highlight = "";
  if (mailbox) {
    highlight = (mailbox == option) ? " bg-warning bg-opacity-25" : ((mailbox.match(option.split('@')[1])) ? " bg-warning bg-opacity-10" : "");
  }
  return className + highlight;
};

const LoginsTable = ({
  logins,
  rolesAvailable,
  isLoading,
  getFieldValue,
  isRowChanged,
  onLoginChange,
  onLoginFlipBit,
  onLoginSave,
  onChangePassword,
  onConfirmDelete,
}) => {
  const { t } = useTranslation();

  // Column definitions for existing logins table
  // adding hidden data in the span before the FormField let us sort also this column
  const columns = [
    {
      key: 'mailbox',
      label: 'logins.mailbox',
      render: (login) => (
        <>
        <span className="d-none">{login.mailbox}</span>
        <FormField
          type="email"
          id="mailbox"
          name="mailbox"
          value={getFieldValue(login.id, 'mailbox')}
          onChange={(e) => onLoginChange(e, login, "mailbox", e.target.value)}
          maxLength={254}
          groupClass=""
          className="form-control-sm"
          required
        />
        </>
      ),
    },
    {
      key: 'username',
      label: 'logins.username',
      render: (login) => (
        <>
        <span className="d-none">{login.username}</span>
        <FormField
          type="username"
          id="username"
          name="username"
          value={getFieldValue(login.id, 'username')}
          onChange={(e) => onLoginChange(e, login, "username", e.target.value)}
          maxLength={36}
          groupClass=""
          className="form-control-sm"
          required
        />
        </>
      ),
    },
    {
      key: 'isAdmin',
      label: 'logins.isAdmin',
      noFilter: true,
      render: (login) => (
        <>
        <span>{(login.isAdmin) ? t('common.yes') : t('common.no')}</span>
        <Button
          variant={(login.isAdmin) ? "info" : "warning"}
          size="xs"
          icon={(login.isAdmin) ? "chevron-double-down" : "chevron-double-up"}
          title={(login.isAdmin) ? t('logins.demote', { username: login.username}) : t('logins.promote', { username: login.username})}
          onClick={() => onLoginFlipBit(login, 'isAdmin')}
          className="me-2 float-end"
        />
        </>
      ),
    },
    {
      key: 'isAccount',
      label: 'logins.isAccount',
      noFilter: true,
      render: (login) => (
      /* only render linkAccount button when isAccount=0 if rolesAvailable.includes(login.mailbox) */
      /* always render unlinkAccount button when isAccount=1 */
      ( login.isAccount || (rolesAvailable && rolesAvailable.includes(login.mailbox)) ) &&
        <>
        <span>{(login.isAccount) ? t('common.yes') : t('common.no')}</span>
        <Button
          variant={(login.isAccount) ? "warning" : "info"}
          size="xs"
          icon={(login.isAccount) ? "heartbreak" : "link-45deg"}
          title={(login.isAccount) ? t('logins.unlinkAccount', { username: login.username}) : t('logins.linkAccount', { username: login.username})}
          onClick={() => onLoginFlipBit(login, 'isAccount')}
          className="me-2 float-end"
        />
        </>
      ),
    },
    {
      key: 'roles',
      label: 'logins.roles',
      noSort: true,
      render: (login) => (
        <>
        <Autocomplete
          multiple
          id="roles"
          size="small"
          options={rolesAvailable}
          groupBy={(mailbox) => mailbox.split('@')[1]}    // groupBy with an array of strings: so easy! create the group off the valuesdirectly!
          filterSelectedOptions
          disabled={login.isAccount}

          value={getFieldValue(login.id, 'roles')}
          onChange={(e, newValue) => onLoginChange(e, login, "roles", newValue)}
          renderOption={(props, option) => (
            <li
              {...props}
              className={highlightOptionByDomain(option, login?.mailbox, props.className)}
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
        </>
      ),
    },
    {
      key: 'actions',
      label: 'common.actions',
      noSort: true,
      noFilter: true,
      render: (login) => (
        <div className="d-flex">
          <Button
            variant="primary"
            size="sm"
            icon="key"
            title={(login.isAdmin) ? t('password.changeLocalPassword') : t('password.changeMailboxPassword') }
            onClick={() => onChangePassword(login)}
            className="me-2"
          />
          <Button
            variant="danger"
            size="sm"
            icon="trash"
            title={t('logins.confirmDelete', { username: login.mailbox })}
            onClick={() => onConfirmDelete(login)}
            className="me-2"
          />
          <Button
            variant="secondary"
            size="sm"
            icon={(login.isActive) ? "toggle-on" : "toggle-off"}
            title={(login.isActive) ? t('logins.deactivate', { username: login.mailbox }) : t('logins.activate', { username: login.mailbox })}
            onClick={() => onLoginFlipBit(login, 'isActive')}
            className="me-2"
          />
          <Button
            variant="primary"
            size="sm"
            icon="floppy2-fill"
            title={t('logins.save')}
            onClick={() => onLoginSave(login)}
            className="me-2"
            disabled={!isRowChanged(login.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={logins}
        keyExtractor={(login) => login.mailbox}
        isLoading={isLoading}
        emptyMessage="logins.noLogins"
      />
    </>
  );
};

export default LoginsTable;