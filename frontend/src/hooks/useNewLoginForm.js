import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  debugLog,
  errorLog,
} from '../frontend.mjs';
import {
  plucks,
  regexUsername,
  isNonEmptyDict,
  regexEmailStrict,
} from '../../../common.mjs';
import {
  addLogin,
} from '../services/api.mjs';

/**
 * Handles all state + logic for the "New Login" form.
 *
 * @param {object}   opts
 * @param {Array}    opts.accountOptions  - full account list from useLoginsData
 * @param {Array}    opts.logins         - current logins (to filter used mailboxes)
 * @param {string}   opts.containerName  - current mailserver container
 * @param {function} opts.refetch        - callback to refresh all data after a successful add
 */
export default function useNewLoginForm({ accountOptions, logins, containerName, refetch }) {
  const { t } = useTranslation();

  // State for new login inputs ----------------------------------
  const newLoginformDataINIT = {
    mailbox: '',
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    isAdmin: 0,
    isAccount: 0,
    isActive: 1,
    mailserver: containerName, // Leave empty here, we will populate it dynamically
    roles: [],
  };
  const [newLoginformData, setNewLoginFormData] = useState(newLoginformDataINIT);

  // errors must be initialized unfortunately, otherwise the save login button is never disabled
  const [newLoginFormErrors, setNewLoginFormErrors] = useState({
    mailserver: 'logins.mailserverRequired',
    username: 'logins.usernameRequired',
    mailbox: 'logins.emailRequired',
    email: 'logins.emailRequired',
    password: 'password.passwordRequired',
  });

  // State for save login button ----------------------------------
  const [submitDisabled, setSubmitDisabled] = useState(true);


  // filter out the mailbox dropdown entries that are already used in logins
  const filteredAccountOptions = useMemo(() => {
    return accountOptions.filter(option => 
      !logins.some(login => login.mailbox === option.value)
    );
  }, [logins, accountOptions]);


  const handleNewLoginInputChange = (e) => {
    const { name, value, type, checked } = e.target;    // { name: "isAccount", value: "on", type: "checkbox", checked: true }
    debugLog('{ name, value, type, checked }',{ name, value, type, checked });

    // special cases ------------------------------
    let jsonDict, inputValue;
    // Determine the actual value based on the element type
    // BUG FOUND:
    // type === 'checkbox' ? ((checked === true) ? 1 : 0) : value   ===> evaluates to "on"
    // This should evaluate to 1 when type is 'checkbox' and checked is true. 
    // The string "on" should be entirely bypassed.
    // If this function is still spitting out "on", it means the event triggering the function isn't what I think it is.
    // If the checkbox looks like <Checkbox /> or <Form.Check /> (which it is) instead of a raw HTML <input type="checkbox" />, 
    // these libraries don't pass a real HTML event to onChange.
    // Instead, they pass a custom synthetic event where:
      // e.target.type is often undefined or 'text' rather than 'checkbox'
      // e.target.value is overridden to pass the value string directly.

    if (type === 'checkbox') {
      inputValue = checked ? 1 : 0; // Directly assigns 1 or 0
    } else {
      inputValue = type === 'number' ? Number(value) : value; // Assigns the typed text string or resolve as a number
    }

    // selecting various checkboxes will alter other options and we also need to construct the roles array, so we will use a temporary dict
    jsonDict = {[name]: inputValue};

    // checkboxes will resolve to 0 or 1 and 1 is == true
    if (name == 'isAdmin' && checked) {
      debugLog('isAdmin ==> 1: disabling isAccount');
      // disable isAccount checkbox and SelectField
      jsonDict.isAccount = 0;
    }

    if (name == 'isAccount' && checked) {
      // test if the mailbox entered manually prior / chosen from the list is in the list, and select it as a role, otherwise start from scratch
      if (plucks(accountOptions).has(newLoginformData.mailbox)) {
        debugLog(`isAccount ==> 1: adding ${newLoginformData.mailbox} to the roles`);
        jsonDict.roles = [newLoginformData.mailbox]

      } else {
        debugLog(`isAccount ==> 1: removing ${newLoginformData.mailbox} as it is NOT defined in available mailboxes`);
        // we MUST reset mailbox since it is not in the official list
        jsonDict.mailbox = '';
        jsonDict.roles = [];
      }
    }

    if (name == 'mailbox') {
      if (newLoginformData.isAccount) {
        // we are attached to a mailbox and user just chose it from the SelectField
        debugLog(`roles ==> [${inputValue}]`);
        jsonDict.roles = [inputValue];
      }
    }

    // Calculate the exact next state
    const updatedFormData = {
      ...newLoginformData,
      ...jsonDict
    };
    setNewLoginFormData(updatedFormData);
    debugLog('newLoginformData:', updatedFormData);

    // Clear the error for this field while typing // now done by validateNewLoginForm
    // if (newLoginFormErrors[name]) {
    //   setNewLoginFormErrors({
    //     ...newLoginFormErrors,
    //     [name]: null,
    //   });
    // }
    // validateNewLoginForm();  // this is delayed
    // Validate using the fresh data directly:

    // Update the button instantly using the fresh error object
    const freshErrors = validateNewLoginForm(updatedFormData);
    const hasErrors = !!isNonEmptyDict(freshErrors);
    setSubmitDisabled(hasErrors);

  };

  const handleNewLoginRolesChange = (e, newValue) => {  // newValue is an arrey with all the options selected

    debugLog('newValue', newValue);
    debugLog('newLoginformData', newLoginformData);

    setNewLoginFormData({
      ...newLoginformData,
      roles: newValue
    });

  };

  const validateNewLoginForm = (currentFormData) => {
    let errors = {};

    if (!currentFormData.mailserver) {
      errors.mailserver = 'logins.mailserverRequired';
    }

    if (!currentFormData.username.trim()) {
      errors.username = 'logins.usernameRequired';

    } else if (!regexUsername.test(currentFormData.username.trim())) {
      errors.username = 'logins.usernameInvalid';
    }

    // this is done by react somehow but we need to also do it to release the save login button
    if (!currentFormData.mailbox.trim()) {
      errors.mailbox = 'logins.mailboxRequired';

    } else if (!regexEmailStrict.test(currentFormData.mailbox.trim())) {
      errors.mailbox = 'logins.mailboxInvalid';
    }

    // this is done by react somehow but we need to also do it to release the save login button
    if (!currentFormData.email.trim()) {
      errors.email = 'logins.emailRequired';

    } else if (!regexEmailStrict.test(currentFormData.email.trim())) {
      errors.email = 'logins.emailInvalid';
    }

    if (!currentFormData.password) {
      errors.password = 'password.passwordRequired';

    } else if (currentFormData.password.length < 8) {
      errors.password = 'password.passwordLength';

    } else if (currentFormData.password !== currentFormData.confirmPassword) {
      errors.confirmPassword = 'logins.passwordsNotMatch';
    }

    setNewLoginFormErrors(errors);
    debugLog('ddebug setNewLoginFormErrors errors:', errors)
    return errors;
  };


  const handleSubmitNewLogin = async (e) => {
    e.preventDefault();

    // no need anymore since validateNewLoginForm is done after each change
    // if (!validateNewLoginForm()) {
    //   return;
    // }

    try {
      const result = await addLogin(
        newLoginformData.mailbox,
        newLoginformData.username,
        newLoginformData.password,
        newLoginformData.email,
        newLoginformData.isAdmin,
        newLoginformData.isAccount,
        newLoginformData.isActive,
        newLoginformData.mailserver,
        newLoginformData.roles,
        [],
      );
      if (result.success) {
        reset();   // Local Agent FIX: full reset clears errors + re-disables submit (was only setNewLoginFormData)
        refetch(); // Refresh the logins list

      }

    } catch (error) {
      errorLog(t('api.errors.addLogin'), error.message);
      // setErrorMessage('api.errors.addLogin', error.message);
    }
  };

  // ── reset (called by the page on full refresh) ─────────────
  const reset = () => {
    setNewLoginFormData(newLoginformDataINIT);
    setNewLoginFormErrors({});
    setSubmitDisabled(true);
  };

  // ── public API ──────────────────────────────────────────────
  return {
    newLoginformData,
    newLoginFormErrors,
    submitDisabled,
    filteredAccountOptions,
    handleNewLoginInputChange,
    handleNewLoginRolesChange,
    handleSubmitNewLogin,
    reset,
  };
}
