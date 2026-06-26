import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

import {
  debug,
  debugLog,
  errorLog,
} from '../../frontend.mjs';
import {
  getValueFromArrayOfObj, 
  isNonEmptyDict,
  mergeArrayOfObj,
} from '../../../common.mjs';

import {
  // getAccounts,
  // getServerEnvs,
  // getAliases,
  getServerStatus,
  getConfigs,
  getSettings,
  saveSettings,
  updateLogin,
  initAPI,
} from '../services/api.mjs';

import { 
  AlertMessage,
  Button,
  Card,
  FormField,
  LoadingSpinner,
  Toast,
  SelectField,
} from '../components';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';

function FormContainerAdd() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [containerName, setContainerName] = useLocalStorage("containerName", '');
  const [mailservers, setMailservers] = useLocalStorage("mailservers", []);
  const [firstRun, setFirstRun] = useLocalStorage("firstRun", false); // this is obviously used in Login, Profile and Settings
  // const [containerName, setContainerName] = useState(useLocalStorage("containerName", ''););   // best of both worlds, deprecated
  // const [mailservers, setMailservers] = useState(useLocalStorage("mailservers", []));                // best of both worlds, deprecated
  
  // moved to dashboard
  // const [envs, setServerEnvs] = useState([]);
  // const [aliases, setAliases] = useLocalStorage("aliases", []);
  // const [accounts, setAccounts] = useLocalStorage("accounts", []);
  // const [DOVECOT_FTS, setDOVECOT_FTS] = useState(0);

  const [isLoading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  
  const [pingResult, setPingResult] = useState(false);        // enables API gen, and all 3 buttons
  const [APIInjected, setAPIInjected] = useState(false);      // also enables the Test API button
  const [APIValidated, setAPIValidated] = useState(false);    // only used to make the Test API button green, you can save the settings regardless
  const [formValidated, setFormValidated] = useState(false);  // enables all 3 buttons
  const [formErrors, setFormErrors] = useState({});
  const [formValuesSubmitted, setFormValuesSubmitted] = useState(false); // 'idle', 'submitting', 'success', 'error'
  const makeFavoriteRef = useRef(null);

  // selector fields
  // TODO: no actual data or names should ever be there, those should be in emv..mjs and pulled by an API call
  const [protocols, setProtocols] = useState([
    {value: 'http', label: 'http'},
    {value: 'https', label: 'https'},
  ]);

  // TODO: no actual data or names should ever be there, those should be in emv..mjs and pulled by an API call
  const [schemas, setSchemas] = useState([
    {value: 'dms', label: 'DMS'},
    {value: 'poste', label: 'Poste.io'},
  ]);

  // TODO: no actual data or names should ever be there, those should be in emv..mjs and pulled by an API call
  const [formValues, setFormValues] = useState([
        {name: 'schema', value: schemas[0].value},
        {name: 'containerName', value: containerName},
        {name: 'protocol', value: protocols[0].value},
        {name: 'DMS_API_PORT', value: '8888'},
        {name: 'DMS_API_KEY', value: ''},
        {name: 'timeout', value: '4'},
        {name: 'setupPath', value: '/usr/local/bin/setup'},
      ]);

  // const [dnsProviders, setDnsProviders] = useState([
  //   {value: 'cloudflare', label: 'Cloudflare'},
  // ]);

  // const initFormValues = () => {
  //   setFormValues([
  //       {name: 'schema', value: schemas[0].value},
  //       {name: 'containerName', value: containerName},
  //       {name: 'protocol', value: protocols[0].value},
  //       {name: 'DMS_API_PORT', value: '8888'},
  //       {name: 'DMS_API_KEY', value: ''},
  //       {name: 'timeout', value: '4'},
  //       {name: 'setupPath', value: '/usr/local/bin/setup'},
  //     ]);

  // };


  /////////////////////////////////////////////////////////////////////////////////////////////////// stopped using async
  /////////////////////////////////////////////////////////////////////////////////////////////////// stopped using async
  /////////////////////////////////////////////////////////////////////////////////////////////////// stopped using async
  /////////////////////////////////////////////////////////////////////////////////////////////////// stopped using async


  const fetchAll = async () => {

    try {
      setLoading(true);
      setErrorMessage(null);
      setWarningMessage(null);
      setSuccessMessage(null);
      
      // this normally is pulled after successful login, may also call initFormValues
      // if (!mailservers.length) await fetchMailservers();
      // this preloads container settings
      if (containerName) await fetchContainerSettings(containerName);

    } catch (error) {
      // each fetch has its own error handling

    } finally {
      setLoading(false);
    }
  };

  const fetchMailservers = async () => {
    
    try {
      const [mailserversData] = await Promise.all([
        getConfigs('mailserver'),
      ]);

      if (mailserversData?.success) {
        // this will be all containers in db except dms-gui
        debugLog('fetchMailservers: mailserversData', mailserversData); // [ {value:containerName', plugin:'mailserver', schema:'dms', scope:'dms-gui'}, ..]

        // update selector list
        debugLog(`FormContainerAdd 4 setMailservers:`, mailserversData.message.map(mailserver => { return { ...mailserver, label:mailserver.value } }));
        setMailservers(mailserversData.message.map(mailserver => { return { ...mailserver, label:mailserver.value } }));   // duplicate value as label for the select field

      } else setErrorMessage(mailserversData?.error);

    } catch (error) {
      errorLog(t('api.errors.fetchConfigs'), error);
      // setErrorMessage('api.errors.fetchConfigs');
      setErrorMessage({key: 'api.errors.fetchConfigs', values: { error: error.message }});
    }
  };


  const fetchContainerSettings = async (container) => {
    if (container && mailservers.length) {
      setLoading(true);
      // setWarningMessage(null);   // if API KEY is not ready yet on DMS side, we want to keep the warning
      setErrorMessage(null);
      
      try {
          const [settingsData] = await Promise.all([
          getSettings(
            'mailserver',
            container,
          ),
        ]);
        // debugLog(`FormContainerAdd mergeArrayOfObj settingsData`,settingsData);

        if (settingsData?.success) {
          // this will be formValues for that container only
          debugLog(`FormContainerAdd: got ${settingsData.message.length} settingsData for ${container}:`, settingsData.message);
  
          setFormValues(mergeArrayOfObj(formValues, settingsData.message, 'name'));

          // applying values to the form will not trigger the container ping test so we force that here
          handlePingTest(false, container);

        } else setErrorMessage(settingsData?.error);

      } catch (error) {
        errorLog(t('api.errors.fetchSettings'), error);
        // setErrorMessage('api.errors.fetchSettings');
        setErrorMessage({key: 'api.errors.fetchSettings', values: { error: error.message }});
      }
      setLoading(false);
    }
  };


  const handlePingTest = async (showMessages=true, container=null) => {
    setWarningMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPingResult(false);

    if (!container) container = getValueFromArrayOfObj(formValues, 'containerName');
    if (container.length) {
      try {
        
        const result = await getServerStatus('mailserver', container, 'ping');

        if (result.success) {
          if (result.message.status.status === 'unknown' && showMessages) setErrorMessage(t('dashboard.status.unknown') +": "+ result.message.status.error);
          if (result.message.status.status === 'missing' && showMessages) setErrorMessage(t('dashboard.status.missing') +": "+ result.message.status.error);
          if (result.message.status.status === 'stopped' && showMessages) setWarningMessage(t('dashboard.status.stopped') +": "+ result.message.status.error);
          if (result.message.status.status === 'alive') {
            // if (showMessages) setSuccessMessage(t('dashboard.status.alive'));
            setToastMessage({
              type: 'success',
              message: t('dashboard.status.alive'),
            });
            setPingResult(true);
          }

        } else setErrorMessage(result?.error);  // super unknown error
        return result;

      } catch (error) {
        errorLog(t('api.errors.ping'), error.message);
        // setErrorMessage('api.errors.ping', error.message);
        setErrorMessage({key: 'api.errors.ping', values: { error: error.message }});
      }
    }
  };


  const handleInjectAPI = async (showMessages=true, container=null) => {

    if (!container) container = getValueFromArrayOfObj(formValues, 'containerName');
    if (container.length) {
      try {
        
        // saveSettings saves the DMS_API_KEY but initAPI+inject also since we need it in the local db to perform the handleAPITest
        debugLog('FormContainerAdd inject API files to containerName=', container);
        const result = await initAPI('mailserver', getValueFromArrayOfObj(formValues, 'schema'), container, 'inject', getValueFromArrayOfObj(formValues, 'schema'));
        
        if (result.success) {
          setAPIInjected(true);
          // if (showMessages) setSuccessMessage(t('settings.DMS_API_injectSuccess'));
          if (showMessages) setToastMessage({
            type: 'success',
            message: t('settings.DMS_API_injectSuccess'),
          });

        } else {
          if (showMessages) {
            setErrorMessage(t('settings.DMS_API_injectFailed') +": "+ result?.error);
            setWarningMessage(t('settings.DMS_API_injectFailedHelp'));
          }
        }

        return result;

      } catch (error) {
        // setErrorMessage(t('api.errors.DMS_API_injectFailed') +": "+ result?.error);
        setErrorMessage({key: 'api.errors.DMS_API_injectFailed', values: { error: error.message }});
        return {success: false, error: error.message};
      }
    }
  };


  const handleAPITest = async (e) => {
    // e.preventDefault();
    setWarningMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setAPIValidated(false);

    if (APIInjected) {
      try {
      
        // the backend does not have this new dms in db yet, so we must send also the formValues to help getTargetDict
        // const result = await getServerStatus('mailserver', getValueFromArrayOfObj(formValues, 'containerName'), 'execDMS', formValues);
        
        // initAPI will call getServerStatus by itself internally instead of passing formValue directly to the getServerStatus api, only admins can do that now
        debugLog('initAPI:', 'mailserver', getValueFromArrayOfObj(formValues, 'schema'), getValueFromArrayOfObj(formValues, 'containerName'), 'test', formValues)
        const result = await initAPI('mailserver', getValueFromArrayOfObj(formValues, 'schema'), getValueFromArrayOfObj(formValues, 'containerName'), 'test', formValues);
        debugLog('initAPI result:', result)

        debugLog('FormContainerAdd getServerStatus:', result);
          // { success: true,
          //   message: {
          //     db: { logins: 0, accounts: 0, aliases: 0, … }
          //     resources: { cpuUsage: 0, memoryUsage: 0, diskUsage: 0, … }
          //     status: { status: "api_match", error: "Invalid api_key: api_match: xxx-2f43-40c6-8104-yyy" }
          //       error: "Invalid api_key: api_match: xxx-2f43-40c6-8104-yyy"
          //       status: "api_match"
          //     }
          //   }
          // }

        if (result.success) {

          // SUCCESS
          if (result.message.status.status === 'running') {
            setAPIValidated(true);
            setSuccessMessage( t('settings.running', {
              containerName: getValueFromArrayOfObj(formValues, 'containerName'), 
              DMS_API_PORT: getValueFromArrayOfObj(formValues, 'DMS_API_PORT')}),
            );
          }

          // WARNING: more setup needed to finish the linking but let user save settings nonetheless
          if (['port_closed','api_unset'].includes(result.message.status.status)) {
            // setErrorMessage(t(result.message.status.error));  // not sure we want to show that
            errorLog(t(result.message.status.error));
            setWarningMessage(t(`dashboard.errors.${result.message.status.status}`) +"<br />" + t(`settings.saveAdvice`));
            setSuccessMessage(t('settings.DMS_API_KEYinit', {
              containerName:getValueFromArrayOfObj(formValues, 'containerName'),
              DMS_API_KEY:getValueFromArrayOfObj(formValues, 'DMS_API_KEY'),
              DMS_API_PORT:getValueFromArrayOfObj(formValues, 'DMS_API_PORT'),
            }));
          }

          if (['api_match'].includes(result.message.status.status)) {
            // setErrorMessage(t(result.message.status.error));  // not sure we want to show that
            errorLog(t(result.message.status.error));
            setWarningMessage(t(`dashboard.errors.${result.message.status.status}`));
            setSuccessMessage(t('settings.DMS_API_KEYmatch', {
              containerName:getValueFromArrayOfObj(formValues, 'containerName'),
              DMS_API_KEY:getValueFromArrayOfObj(formValues, 'DMS_API_KEY'),
              DMS_API_PORT:getValueFromArrayOfObj(formValues, 'DMS_API_PORT'),
            }));
          }

          // ERRORS: unrecoverable errors because DMS is down, wrong name, etc. Should never happen since 
          if (result.message.status.status === 'port_timeout')  setErrorMessage(t('dashboard.errors.port_timeout')  +": "+ t(result.message.status.error));
          if (result.message.status.status === 'api_error')     setErrorMessage(t('dashboard.errors.api_error')     +": "+ t(result.message.status.error));
          if (result.message.status.status === 'port_unknown')  setErrorMessage(t('dashboard.errors.port_unknown')  +": "+ t(result.message.status.error));
          if (result.message.status.status === 'missing')       setErrorMessage(t('dashboard.errors.missing')       +": "+ t(result.message.status.error));
          if (result.message.status.status === 'unknown')       setErrorMessage(t('dashboard.errors.unknown')       +": "+ t(result.message.status.error));

          // HACKERS: errors below should never happen since we prevent user from testing with incomplete values
          if (result.message.status.status === 'stopped')       setErrorMessage(t('dashboard.status.stopped')       +": "+ t(result.message.status.error));
          if (result.message.status.status === 'api_gen')       setErrorMessage(t('dashboard.status.api_gen')       +": "+ t(result.message.status.error));
          if (result.message.status.status === 'api_miss')      setErrorMessage(t('dashboard.status.api_miss')      +": "+ t(result.message.status.error));

        } else setErrorMessage(result?.error);

      } catch (error) {
        // setErrorMessage(t('api.errors.fetchServerStatus') +": "+ error.message);
        setErrorMessage({key: 'api.errors.fetchServerStatus', values: { error: error.message }});
      }
    }
  };


  const handleDMS_API_KEYgen = async (e) => {
    // e.preventDefault();
    setWarningMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setAPIInjected(false);    // user must inject API again

    const DMS_API_KEY = crypto.randomUUID();
    
    // 1. Calculate the exact new array snapshot instantly
    const updatedFormValues = mergeArrayOfObj(formValues, [{ name: 'DMS_API_KEY', value: DMS_API_KEY }], 'name');

    // 2. Set the state for rendering in the background
    setFormValues(updatedFormValues);

    // 3. Immediately re-validate using the raw, updated array to unlock the button instantly
    // (We modify validateFormContainerAdd slightly below to accept a custom array if provided)
    const freshErrors = validateFormContainerAdd(updatedFormValues);
    const hasErrors = !!isNonEmptyDict(freshErrors);
    setFormValidated(!hasErrors);

    // try {
      
      // debugLog('FormContainerAdd gen API key for containerName=', getValueFromArrayOfObj(formValues, 'containerName'))
      // const result = await initAPI('mailserver', getValueFromArrayOfObj(formValues, 'schema'), getValueFromArrayOfObj(formValues, 'containerName'), 'gen');

      // if (result.success) {
      //   const DMS_API_KEY = result.message;
      //   setFormValues(mergeArrayOfObj(formValues, [{name: 'DMS_API_KEY', value: DMS_API_KEY}], 'name'));
        
      // } else setErrorMessage(result?.error);
      
    // } catch (error) {
    //   setErrorMessage(t('api.errors.DMS_API_KEYgen') +": "+ error.message);
    // }

  };


  const handleInputChange = async (e) => {
    const { name, value, type, checked } = e.target;
    setWarningMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setAPIValidated(false);

    // merge array of formValues objects by their name
    // WARNING: When handling input fields of type="number" in React-Bootstrap forms, the onChange event event.target.value will always provide a string, even if the user enters a number.
    // SOLUTION: type === 'number' ? Number(value) : value
    // HOWEVER, we won't do that because formValues values are stored as TEXT in the db
    // setFormValues(mergeArrayOfObj(formValues, [{name: name, value:value}], 'name'));
    // debugLog(`handleInputChange formValues:`, mergeArrayOfObj(formValues, [{name: name, value:value}], 'name'));

    // Calculate the exact next state
    const updatedFormData = mergeArrayOfObj(formValues, [{name: name, value:value}], 'name');
    setFormValues(updatedFormData);
    debugLog('handleInputChange formValues:', updatedFormData);

    if (name === 'containerName' && value.length) {
      handlePingTest(false, value);  // autoping with actual form value because all is async, there is a delay in content of formValues
    }
    if (type !== 'checkbox') {
      setAPIInjected(false);
    }

    // Clear the error for this field while typing
    // if (formErrors[name]) {
    //   setFormErrors({
    //     ...formErrors,
    //     [name]: null,
    //   });
    // }
    // await validateFormContainerAdd(false);   // this is always delayed

    // Update the button instantly using the fresh error object
    const freshErrors = validateFormContainerAdd(updatedFormData);
    const hasErrors = !!isNonEmptyDict(freshErrors);
    setFormValidated(!hasErrors);

  };

  const validateFormContainerAdd = (currentFormData, setErrors=false) => {
    const errors = {};
    // setFormValidated(false);

    if (!currentFormData.find(item => item['name'] == 'containerName') || !currentFormData.find(item => item['name'] == 'containerName').value.length) {
      errors.containerName = 'settings.containerNameRequired';
    }

    if (!currentFormData.find(item => item['name'] == 'schema') || !currentFormData.find(item => item['name'] == 'schema').value.length) {
      errors.schema = 'settings.schemaRequired';
    }

    if (!currentFormData.find(item => item['name'] == 'protocol') || !currentFormData.find(item => item['name'] == 'protocol').value.length) {
      errors.protocol = 'settings.protocolRequired';
    }

    if (!currentFormData.find(item => item['name'] == 'DMS_API_PORT') 
        || !Number(currentFormData.find(item => item['name'] == 'DMS_API_PORT').value)
        || (Number(currentFormData.find(item => item['name'] == 'DMS_API_PORT').value) < 1)
        || (Number(currentFormData.find(item => item['name'] == 'DMS_API_PORT').value) > 65535)
      ) {
      errors.DMS_API_PORT = 'settings.DMS_API_PORTRequired';
    }

    if (!currentFormData.find(item => item['name'] == 'DMS_API_KEY') || !currentFormData.find(item => item['name'] == 'DMS_API_KEY').value.length) {
      errors.DMS_API_KEY = 'settings.DMS_API_KEYRequired';
    }

    if (!currentFormData.find(item => item['name'] == 'setupPath') || !currentFormData.find(item => item['name'] == 'setupPath').value.length) {
      errors.setupPath = 'settings.setupPathRequired';
    }

    if (!currentFormData.find(item => item['name'] == 'timeout') 
        || !Number(currentFormData.find(item => item['name'] == 'timeout').value)
        || (Number(currentFormData.find(item => item['name'] == 'timeout').value) < 1)
        || (Number(currentFormData.find(item => item['name'] == 'timeout').value) > 60)
      ) {
      errors.timeout = 'settings.timeoutRequired';
    }

    // once the checkbox is rendered...
    if (makeFavoriteRef.current) {
      // pre-check the container as favorite when user has none, also pre-check if current container is already the favorite
      if (!user?.mailserver || user?.mailserver == containerName) makeFavoriteRef.current.checked = true;
    }

    if (setErrors) setFormErrors(errors);   // we don't show alerts as the user types
    debugLog('ddebug setFormErrors errors', errors);

    return errors;
  };


  const handleSubmitSettings = async (e) => {
    e.preventDefault();
    debugLog('FormContainerAdd formValues Submitted:', formValues);
    
    setErrorMessage(null);
    setWarningMessage(null);
    setSuccessMessage(null);
    setFormValuesSubmitted(false);

    // no need anymore since validateFormContainerAdd is done after each change
    // if (!validateFormContainerAdd(true)) {
      // return;
    // }

    try {

      debugLog(`FormContainerAdd saveSettings( mailserver, ${getValueFromArrayOfObj(formValues, 'schema')}, dms-gui, ${getValueFromArrayOfObj(formValues, 'containerName')})`, formValues);
      const result = await saveSettings(
        'mailserver',
        getValueFromArrayOfObj(formValues, 'schema'),
        'dms-gui',
        getValueFromArrayOfObj(formValues, 'containerName'),
        formValues,
      );
      debugLog('ddebug result:', result);
      if (result.success) {
        setFormValuesSubmitted(true); // this will trigger all sorts of fetches

      } else setErrorMessage(result?.error);
      
    } catch (error) {
      setFormValuesSubmitted(false);
      errorLog(t('api.errors.saveSettings'), error);
      // setErrorMessage('api.errors.saveSettings');
      setErrorMessage({key: 'api.errors.saveSettings', values: { error: error.message }});
    }
  };


  const handleLoginSave = (containerName) => {

    try {
      debugLog(`FormContainerAdd handleLoginSave mailservers:`, mailservers); // mailservers should be set at this point
      const result = updateLogin(
        user.id,
        {mailserver:containerName},
      );
      if (result.success) {
        login({
          ...user,
          mailserver:containerName
        }, null); // reset new values for that user in frontend state and stay here; login is only updated when user makes container their favorite
        // }, APIValidated && '/dashboard' || null); // reset new values for that user in frontend state and move to dashboard or not
        
      } // fails silently
      
    } catch (error) {
      errorLog(error.message || error);
      // setErrorMessage('api.errors.updateLogin', error.message);
      setErrorMessage({key: 'api.errors.updateLogin', values: { error: error.message }});
    }
  };


  const handleChangeDMS = (e) => {
    // e.preventDefault();
    const { name, value, type } = e.target;
    setWarningMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    debugLog(`FormContainerAdd Switching to ${name}=${value}`);
    
    if (value) {

      setContainerName(value);
      // fetchContainerSettings(value); // Refresh the formValues is done by useEffect on containerName change
      // setSchema(getValueFromArrayOfObj(formValues, 'schema'));  // that should be done during fetchContainerSettings and also dependent on useEffect

      // only reset errors, we still want to see the successful saved formValues message as this change will be triggered when saving a new container
      setErrorMessage(null);
        
    }
  };


  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAll();
    if (firstRun) setSuccessMessage('settings.isFirstRun');
  }, []);

  useEffect(() => {
    fetchContainerSettings(containerName);  // [ {name:name, value: value}, ..]
  }, [containerName]);


  useEffect(() => {
    if (formValuesSubmitted) {
      // pull mailservers to refresh the select field list and branding selector and maybe show the API reminder
      debugLog('FormContainerAdd call fetchMailservers()');
      fetchMailservers();

      // switch to this new container to trigger fetchContainerSettings and confirm all was saved properly
      // UNLESS containerName is already set, indeed
      // containerName shall always be set, even if user doesn't want it as a favorite
      if (!containerName) {
        // this will trigger a form refresh with this container's data 
        debugLog('FormContainerAdd call setContainerName:', getValueFromArrayOfObj(formValues, 'containerName'));
        setContainerName(getValueFromArrayOfObj(formValues, 'containerName'));

      // containerName was already set, do nothing
      // } else {
        // fetchContainerSettings(getValueFromArrayOfObj(formValues, 'containerName'));
      }

      if (makeFavoriteRef.current.checked) {
        debugLog('FormContainerAdd call handleLoginSave:', getValueFromArrayOfObj(formValues, 'containerName'));
        handleLoginSave(getValueFromArrayOfObj(formValues, 'containerName'));
      }

      // Normally you should not be here if APIInjected is false as the button is disabled
      if (APIInjected) {

        debugLog('FormContainerAdd APIValidated:', APIValidated);
        // API installed and valid, success!
        if (APIValidated) {

          setSuccessMessage(t('settings.DMS_API_KEYSaved', {
            DMS_API_KEY:getValueFromArrayOfObj(formValues, 'DMS_API_KEY'),
          }));

          // pull all data since API is working
          // this causes a problem the first time as the containerName is still unset or in queue. Also those fetches shall be done in sequence not in parallel
          // try {
          //   setLoading(true);
          //   fetchServerEnvs(true);
          //   fetchAccounts(true);
          //   fetchAliases(true);

          // } finally {
          //   setLoading(false);
          // }
          debugLog(`Success! navigate to /dashboard`);
          setTimeout(() => {
            navigate("/dashboard");
          }, 2000);

        } else {
          // reminder to setup DMS compose after a submit
          debugLog(`FormContainerAdd 5 fetchMailservers failed: show setup reminder`);
          setSuccessMessage(t('settings.DMS_API_KEYinit', {
            containerName:getValueFromArrayOfObj(formValues, 'containerName'),
            DMS_API_KEY:getValueFromArrayOfObj(formValues, 'DMS_API_KEY'),
            DMS_API_PORT:getValueFromArrayOfObj(formValues, 'DMS_API_PORT'),
          }));
        }
      }

    }
  }, [formValuesSubmitted]);


  if (isLoading || !user.isAdmin) {
    return <LoadingSpinner />;
  } else debugLog('formValues:', formValues);
  
  return (
    <>
      <Row className="align-items-center justify-content-center">
        <Col md={6}>{' '}
          <Card title="settings.containerNameSwitch" icon="house-heart-fill">{' '}
            <SelectField
              id="DMS_CONTAINER"
              name="DMS_CONTAINER"
              value={containerName}
              onChange={handleChangeDMS}
              options={mailservers}
              placeholder="common.container"
              helpText="settings.DMSHelp"
              required
            />
          </Card>
        </Col>
      </Row>

      <Row>
        <form onSubmit={handleSubmitSettings} className="form-wrapper">
          <SelectField
            id="schema"
            name="schema"
            label="settings.schema"
            value={getValueFromArrayOfObj(formValues, 'schema') || schemas[0].value}
            onChange={handleInputChange}
            options={schemas}
            placeholder="settings.schema"
            helpText="settings.schemaHelp"
            required
          />

          <FormField
            type="text"
            id="containerName"
            name="containerName"
            label="settings.containerName"
            value={getValueFromArrayOfObj(formValues, 'containerName')}
            onChange={handleInputChange}
            placeholder="dms"
            error={formErrors.containerName}
            helpText="settings.containerNameHelp"
            required
          >
            <Button
              variant={pingResult && "success" || "danger"}
              icon={pingResult && "check" || "x"}
              title={pingResult && t('common.pingUp') || t('common.pingDown')}
              className='btn-feedback'
              disabled
            />
            <Button
              variant="info"
              icon="send"
              title={t('common.ping')}
              onClick={() => handlePingTest()}
              disabled={!getValueFromArrayOfObj(formValues, 'containerName')}
            />
          </FormField>

          <SelectField
            id="protocol"
            name="protocol"
            label="settings.protocol"
            value={getValueFromArrayOfObj(formValues, 'protocol') || protocols[0].value}
            onChange={handleInputChange}
            options={protocols}
            placeholder="common.protocol"
            helpText="settings.protocolHelp"
            required
          />

          <FormField
            type="number"
            id="DMS_API_PORT"
            name="DMS_API_PORT"
            label="settings.DMS_API_PORT"
            value={getValueFromArrayOfObj(formValues, 'DMS_API_PORT')}
            onChange={handleInputChange}
            placeholder="settings.DMS_API_PORTdefault"
            error={formErrors.DMS_API_PORT}
            helpText="settings.DMS_API_PORTHelp"
            required
          />
        
          <FormField
            type="text"
            id="DMS_API_KEY"
            name="DMS_API_KEY"
            label="settings.DMS_API_KEY"
            value={getValueFromArrayOfObj(formValues, 'DMS_API_KEY')}
            onChange={handleInputChange}
            placeholder="DMS_API_KEY"
            error={formErrors.DMS_API_KEY}
            helpText="settings.DMS_API_KEYHelp"
            required
          >
            <Button
              variant="warning"
              icon="recycle"
              title={t('settings.DMS_API_KEYgen')}
              onClick={() => handleDMS_API_KEYgen()}
              disabled={!pingResult}
            />
            <Button
              variant="outline-secondary"
              icon="question-circle"
              title={t('settings.DMS_API_KEYinitHelp')}
              onClick={() => setSuccessMessage(t('settings.DMS_API_KEYinit', {
                containerName:getValueFromArrayOfObj(formValues, 'containerName'),
                DMS_API_KEY:getValueFromArrayOfObj(formValues, 'DMS_API_KEY'),
                DMS_API_PORT:getValueFromArrayOfObj(formValues, 'DMS_API_PORT'),
              })) }
            />
            <Button
              variant="outline-secondary"
              icon="clipboard-plus"
              title={t('common.copy')}
              onClick={() => navigator.clipboard.writeText(getValueFromArrayOfObj(formValues, 'DMS_API_KEY')) }
            />
          </FormField>
        
          <FormField
            type="number"
            id="timeout"
            name="timeout"
            label="settings.timeout"
            value={getValueFromArrayOfObj(formValues, 'timeout')}
            onChange={handleInputChange}
            placeholder="settings.timeoutdefault"
            error={formErrors.timeout}
            helpText="settings.timeoutHelp"
            required
          />
        
          <FormField
            type="text"
            id="setupPath"
            name="setupPath"
            label="settings.setupPath"
            value={getValueFromArrayOfObj(formValues, 'setupPath')}
            onChange={handleInputChange}
            placeholder="/usr/local/bin/setup"
            error={formErrors.setupPath}
            helpText="settings.setupPathHelp"
            required
          >
          </FormField>
        
          <div className="d-flex align-items-center">
            <Button
              variant={APIInjected && "success" || "info"}
              icon="box-arrow-in-up-right"
              text="settings.DMS_API_inject"
              title={APIInjected && t('settings.DMS_API_injectSuccess') || t('settings.DMS_API_injectFailed')}
              className="me-2"
              onClick={() => handleInjectAPI()}
              disabled={!(pingResult && formValidated)}
            />
            <Button
              variant={APIValidated && "success" || "info"}
              icon="hdd-network"
              text="settings.apiTest"
              title={APIValidated && t('settings.DMS_API_ValidatedSuccess') || t('settings.DMS_API_ValidatedFailed')}
              className="me-2"
              onClick={() => handleAPITest()}
              disabled={!pingResult || !APIInjected || !formValidated}
            />
            <Button
              type="submit"
              variant="primary"
              text="settings.saveButtonSettings"
              className="me-2"
              disabled={!(pingResult && formValidated)}
            />
            <FormField
              type="checkbox"
              id="makeFavorite"
              name="makeFavorite"
              label="settings.makeFavorite"
              ref={makeFavoriteRef}
              disabled={!formValidated}
            />
          </div>
        </form>
      </Row>

      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="warning" message={warningMessage} />
      <AlertMessage type="success" message={successMessage} />
      
      {toastMessage && (
        <Toast 
          type={toastMessage?.type}
          message={toastMessage?.message} 
          position={toastMessage?.position || "bottom-right"}
          onClose={() => setToastMessage(null)} // Clears the state when closed or when it fades out
          delay={toastMessage?.delay || 9000} // Clears the state when closed or when it fades out
        />
      )}
    </>
  );

}

export default FormContainerAdd;

