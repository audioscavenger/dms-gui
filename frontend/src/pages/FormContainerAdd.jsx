import React, { useRef, useState, useEffect } from 'react';
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
  mergeArrayOfObj,
} from '../../../common.mjs';

import {
  getAccounts,
  getServerEnvs,
  getAliases,
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
  SelectField,
} from '../components/index.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';

function FormContainerAdd() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const [containerName, setContainerName] = useLocalStorage("containerName", '');
  const [mailservers, setMailservers] = useLocalStorage("mailservers", []);
  // const [containerName, setContainerName] = useState(useLocalStorage("containerName", ''););   // best of both worlds, deprecated
  // const [mailservers, setMailservers] = useState(useLocalStorage("mailservers", []));                // best of both worlds, deprecated

  const [isLoading, setLoading] = useState(true);
  const [formValuesSubmitted, setFormValuesSubmitted] = useState(false); // 'idle', 'submitting', 'success', 'error'

  const [successMessage, setSuccessMessage] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [pingResult, setPingResult] = useState(false);
  const [APIInjected, setAPIInjected] = useState(false);
  const [APIValidated, setAPIValidated] = useState(false);
  const [formValidated, setFormValidated] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const makeFavoriteRef = useRef(null);

  // selector fields
  const [protocols, setProtocols] = useState([
    {value: 'http', label: 'http'},
    {value: 'https', label: 'https'},
  ]);

  const [schemas, setSchemas] = useState([
    {value: 'dms', label: 'DMS'},
    {value: 'poste', label: 'Poste.io'},
  ]);

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

  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    fetchContainerSettings(containerName);  // [ {name:name, value: value}, ..]
  }, [containerName]);

  // 
  useEffect(() => {
    if (formValuesSubmitted) {
      // pull mailservers to refresh the select field list and branding selector and show the API reminder
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

      // pull all data if API is working
      debugLog('FormContainerAdd APIInjected:', APIInjected);
      if (APIInjected) {
        debugLog('FormContainerAdd APIValidated:', APIValidated);
        if (!APIValidated) {
          setSuccessMessage(t('settings.DMS_API_KEYinit', {
            containerName:getValueFromArrayOfObj(formValues, 'containerName'),
            DMS_API_KEY:getValueFromArrayOfObj(formValues, 'DMS_API_KEY'),
            DMS_API_PORT:getValueFromArrayOfObj(formValues, 'DMS_API_PORT'),
          }));
        }
      }
    }
  }, [formValuesSubmitted]);


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


  const fetchAll = () => {
    setLoading(true);
    setErrorMessage(null);
    setWarningMessage(null);
    setSuccessMessage(null);

    debugLog('FormContainerAdd 1 fetchAll');

    // this normally is pulled after successful login, may also call initFormValues
    if (!mailservers || !mailservers.length) fetchMailservers();
    // this preloads container settings
    if (containerName) fetchContainerSettings(containerName);

    setLoading(false);

  };

  const fetchMailservers = async () => {
    
    debugLog('FormContainerAdd 2 fetchMailservers mailservers:', mailservers);
    try {
      const [mailserversData] = await Promise.all([
        getConfigs('mailserver'),
      ]);

      debugLog('FormContainerAdd 3 mailserversData:', mailserversData);   // [ {value:containerName', plugin:'mailserver', schema:'dms', scope:'dms-gui'}, ..]
      if (mailserversData.success) {

        if (mailserversData.message.length) {
          // update selector list
          debugLog(`FormContainerAdd 4 setMailservers:`, mailserversData.message.map(mailserver => { return { ...mailserver, label:mailserver.value } }));
          setMailservers(mailserversData.message.map(mailserver => { return { ...mailserver, label:mailserver.value } }));   // duplicate value as label for the select field

          // reminder to setup DMS compose after a submit
          if (formValuesSubmitted) {
            if (APIValidated) {
              setSuccessMessage(t('settings.DMS_API_KEYSaved', {
                DMS_API_KEY:getValueFromArrayOfObj(formValues, 'DMS_API_KEY'),
              }));
              
            } else {
              debugLog(`FormContainerAdd 5 fetchMailservers failed: show setup reminder`);
              setSuccessMessage(t('settings.DMS_API_KEYinit', {
                containerName:getValueFromArrayOfObj(formValues, 'containerName'),
                DMS_API_KEY:getValueFromArrayOfObj(formValues, 'DMS_API_KEY'),
                DMS_API_PORT:getValueFromArrayOfObj(formValues, 'DMS_API_PORT'),
              }));
            }
          }

        // nothing yet in database, preset form defaults: done by useState()
        // } else {
          // if no container exist yet, we also preset the schema and protocol values, as the values would never be set until the user change them
          // numbers are stored as text because they would transform into floats otherwise
          // initFormValues();
        }

      } else {
        setErrorMessage(mailserversData?.error);
        setMailservers([]);
      }

    } catch (error) {
      errorLog(t('api.errors.fetchConfigs'), error);
      setErrorMessage('api.errors.fetchConfigs');
    }

    return false;
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

        if (settingsData.success) {
          // this will be formValues for that container only
          debugLog(`FormContainerAdd: got ${settingsData.message.length} settingsData for ${container}:`, settingsData.message);
  
          setFormValues(mergeArrayOfObj(formValues, settingsData.message, 'name'));

          // applying values to the form will not trigger the container ping test so we force that here
          handlePingTest(false, container);

        } else setErrorMessage(settingsData?.error);

      } catch (error) {
        errorLog(t('api.errors.fetchSettings'), error);
        setErrorMessage('api.errors.fetchSettings');
      }
      setLoading(false);
    }
  };


  const handlePingTest = async (showMessages=true, container=null) => {
    setWarningMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!container) container = getValueFromArrayOfObj(formValues, 'containerName');
    if (container.length) {
      try {
        
        const result = await getServerStatus('mailserver', container, 'ping');

        if (result.success) {
          if (result.message.status.status === 'unknown' && showMessages) setErrorMessage(t('dashboard.status.unknown') +": "+ result.message.status.error);
          if (result.message.status.status === 'missing' && showMessages) setErrorMessage(t('dashboard.status.missing') +": "+ result.message.status.error);
          if (result.message.status.status === 'stopped' && showMessages) setWarningMessage(t('dashboard.status.stopped') +": "+ result.message.status.error);
          if (result.message.status.status === 'alive') {
            if (showMessages) setSuccessMessage(t('dashboard.status.alive'));
            setPingResult(true);
          }

        } else setErrorMessage(result?.error);  // super unknown error
        return result;

      } catch (error) {
        errorLog(t('api.errors.ping'), error.message);
        setErrorMessage('api.errors.ping', error.message);
      }
    }
  };


  const handleInjectAPI = async (showMessages=true, container=null) => {

    if (!container) container = getValueFromArrayOfObj(formValues, 'containerName');
    if (container.length) {
      try {
        
        debugLog('FormContainerAdd inject API files to containerName=', container);
        const result = await initAPI('mailserver', getValueFromArrayOfObj(formValues, 'schema'), container, 'inject');
        
        if (result.success) {
          setAPIInjected(true);
          if (showMessages) setSuccessMessage(t('settings.DMS_API_injectSuccess'));

        } else {
          if (showMessages) {
            setErrorMessage(t('settings.DMS_API_injectFailed') +": "+ result?.error);
            setWarningMessage(t('settings.DMS_API_injectFailedHelp'));
          }
        }
        validateFormContainerAdd(true);
        return result;

      } catch (error) {
        setErrorMessage(t('api.errors.DMS_API_injectFailed') +": "+ result?.error);
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
    let result;

    try {
      
      // we should not retest the form here as the button will be disabled until it is valid
      // if (!validateFormContainerAdd(false)) {
        // return;
      // }

      // First we need to retry inject the API files
      // User must fix the issue before they can proceed, as it is likely an incorrect mount of the API cron file in Mailserver or write permissions to dms-gui config folder
      // Even if we save the current settings, user would have to redo the API test again after restarting and this could lead to confusion as they may want to skip the test
      if (!APIInjected) {
        result = await handleInjectAPI();

      } else result = {success: true};
      
      // We will NOT proceed if the API injection fails again.
      if (result.success) {

        // the backend does not have this new dms in db yet, so we must send also the formValues to help getTargetDict
        // result = getServerStatus('mailserver', getValueFromArrayOfObj(formValues, 'schema'), getValueFromArrayOfObj(formValues, 'containerName'), 'execSetup', formValues);
        result = await getServerStatus('mailserver', getValueFromArrayOfObj(formValues, 'containerName'), 'execSetup', formValues);
        debugLog('FormContainerAdd getServerStatus:', result);

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
            setWarningMessage(t(`dashboard.errors.${result.message.status.status}`) +": "+ result.message.status.error +"<br />" + t(`settings.saveAdvice`));
            setSuccessMessage(t('settings.DMS_API_KEYinit', {
              containerName:getValueFromArrayOfObj(formValues, 'containerName'),
              DMS_API_KEY:getValueFromArrayOfObj(formValues, 'DMS_API_KEY'),
              DMS_API_PORT:getValueFromArrayOfObj(formValues, 'DMS_API_PORT'),
            }));
          }

          if (['api_match'].includes(result.message.status.status)) {
            setWarningMessage(t(`dashboard.errors.${result.message.status.status}`) +": "+ result.message.status.error);
            setSuccessMessage(t('settings.DMS_API_KEYmatch', {
              containerName:getValueFromArrayOfObj(formValues, 'containerName'),
              DMS_API_KEY:getValueFromArrayOfObj(formValues, 'DMS_API_KEY'),
              DMS_API_PORT:getValueFromArrayOfObj(formValues, 'DMS_API_PORT'),
            }));
          }

          // ERRORS: unrecoverable errors because DMS is down, wrong name, etc. Should never happen since 
          if (result.message.status.status === 'port_timeout') setErrorMessage(t('dashboard.errors.port_timeout') +": "+ result.message.status.error);
          if (result.message.status.status === 'api_error') setErrorMessage(t('dashboard.errors.api_error') +": "+ result.message.status.error);
          if (result.message.status.status === 'port_unknown') setErrorMessage(t('dashboard.errors.port_unknown') +": "+ result.message.status.error);
          if (result.message.status.status === 'missing') setErrorMessage(t('dashboard.errors.missing') +": "+ result.message.status.error);
          if (result.message.status.status === 'unknown') setErrorMessage(t('dashboard.errors.unknown') +": "+ result.message.status.error);

          // HACKERS: errors below should never happen since we prevent user from testing with incomplete values
          if (result.message.status.status === 'stopped') setErrorMessage(t('dashboard.status.stopped') +": "+ result.message.status.error);
          if (result.message.status.status === 'api_gen') setErrorMessage(t('dashboard.status.api_gen') +": "+ result.message.status.error);
          if (result.message.status.status === 'api_miss') setErrorMessage(t('dashboard.status.api_miss') +": "+ result.message.status.error);

        } else setErrorMessage(result?.error);
      }

    } catch (error) {
      setErrorMessage(t('api.errors.fetchServerStatus') +": "+ error.message);
    }
  };


  const handleDMS_API_KEYregen = async (e) => {
    // e.preventDefault();
    setWarningMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      
      debugLog('FormContainerAdd regen API key for containerName=', getValueFromArrayOfObj(formValues, 'containerName'))
      const result = await initAPI('mailserver', getValueFromArrayOfObj(formValues, 'schema'), getValueFromArrayOfObj(formValues, 'containerName'), 'regen');

      if (result.success) {
        const DMS_API_KEY = result.message;
        
        // debugLog('FormContainerAdd formValues',formValues)
        // debugLog('FormContainerAdd initAPI', result)
        // debugLog('FormContainerAdd DMS_API_KEY', DMS_API_KEY)

        // the 2 below should only be set on save
        // if (!containerName) setContainerName(getValueFromArrayOfObj(formValues, 'containerName'));
        // if (!schema)        setSchema(getValueFromArrayOfObj(formValues, 'schema'));
        setFormValues(mergeArrayOfObj(formValues, [{name: 'DMS_API_KEY', value: DMS_API_KEY}], 'name'));
        
        setSuccessMessage(t('settings.DMS_API_KEYinit', {DMS_API_KEY: DMS_API_KEY}));
        
      } else setErrorMessage(result?.error);
      
    } catch (error) {
      setErrorMessage(t('api.errors.DMS_API_KEYregen') +": "+ error.message);
    }
  };


  const handleChangeSettings = (e) => {
    const { name, value, type } = e.target;
    setWarningMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    // merge array of formValues objects by their name
    // WARNING: When handling input fields of type="number" in React-Bootstrap forms, the onChange event event.target.value will always provide a string, even if the user enters a number.
    // SOLUTION: type === 'number' ? Number(value) : value
    // HOWEVER, we won't do that because formValues values are stored as TEXT in the db
    setFormValues(mergeArrayOfObj(formValues, [{name: name, value:value}], 'name'));

    debugLog(`FormContainerAdd handleChangeSettings formValues:`, mergeArrayOfObj(formValues, [{name: name, value:value}], 'name'));

    if (name == 'containerName' && value.length) {
      handlePingTest(false, value);  // autoping with actual form value because all is async, there is a delay in content of formValues
    }

    // Clear the error for this field while typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null,
      });
    }

  };

  const handleLoginSave = async (containerName) => {

    try {
      debugLog(`FormContainerAdd handleLoginSave mailservers:`, mailservers); // mailservers should be set at this point
      const result = await updateLogin(
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
      errorLog(error.message);
      setErrorMessage('api.errors.updateLogin', error.message);
    }
  };


  const validateFormContainerAdd = (setErrors=false) => {
    const errors = {};
    setFormValidated(false);

    // if (formValues.containerName.length == 0) {
    if (!formValues.find(item => item['name'] == 'containerName') || !formValues.find(item => item['name'] == 'containerName').value.length) {
      errors.containerName = 'settings.containerNameRequired';
    }

    // if (formValues.schema.length == 0) {
    if (!formValues.find(item => item['name'] == 'schema') || !formValues.find(item => item['name'] == 'schema').value.length) {
      errors.schema = 'settings.schemaRequired';
    }

    // if (formValues.protocol.length == 0) {
    if (!formValues.find(item => item['name'] == 'protocol') || !formValues.find(item => item['name'] == 'protocol').value.length) {
      errors.protocol = 'settings.protocolRequired';
    }

    // if (formValues.DMS_API_PORT.length == 0) {
    if (!formValues.find(item => item['name'] == 'DMS_API_PORT') 
        || !Number(formValues.find(item => item['name'] == 'DMS_API_PORT').value)
        || (Number(formValues.find(item => item['name'] == 'DMS_API_PORT').value) < 1)
        || (Number(formValues.find(item => item['name'] == 'DMS_API_PORT').value) > 65535)
      ) {
      errors.DMS_API_PORT = 'settings.DMS_API_PORTRequired';
    }

    // if (formValues.DMS_API_KEY.length == 0) {
    if (!formValues.find(item => item['name'] == 'DMS_API_KEY') || !formValues.find(item => item['name'] == 'DMS_API_KEY').value.length) {
      errors.DMS_API_KEY = 'settings.DMS_API_KEYRequired';
    }

    // if (formValues.setupPath.length == 0) {
    if (!formValues.find(item => item['name'] == 'setupPath') || !formValues.find(item => item['name'] == 'setupPath').value.length) {
      errors.setupPath = 'settings.setupPathRequired';
    }

    // if (formValues.timeout.length == 0) {
    if (!formValues.find(item => item['name'] == 'timeout') 
        || !Number(formValues.find(item => item['name'] == 'timeout').value)
        || (Number(formValues.find(item => item['name'] == 'timeout').value) < 1)
        || (Number(formValues.find(item => item['name'] == 'timeout').value) > 60)
      ) {
      errors.timeout = 'settings.timeoutRequired';
    }

    // once the checkbox is rendered...
    if (makeFavoriteRef.current) {
      // pre-check the container as favorite when user has none, also pre-check if current container is already the favorite
      if (!user?.mailserver || user?.mailserver == containerName) makeFavoriteRef.current.checked = true;
    }

    if (setErrors) setFormErrors(errors);
    debugLog('ddebug Object.keys(errors).length === 0 =', Object.keys(errors).length === 0);
    setFormValidated(Object.keys(errors).length === 0);
    return Object.keys(errors).length === 0;
  };


  const handleSubmitSettings = async (e) => {
    e.preventDefault();
    debugLog('FormContainerAdd formValues Submitted:', formValues);
    
    setErrorMessage(null);
    setWarningMessage(null);
    setSuccessMessage(null);
    setFormValuesSubmitted(false);

    if (!validateFormContainerAdd(true)) {
      return;
    }

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
      setErrorMessage('api.errors.saveSettings');
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


  // if (isLoading && !formValues && !Object.keys(formValues).length) {
  if (isLoading || !user.isAdmin) {
    return <LoadingSpinner />;
  } else debugLog('formValues:', formValues);
  
            //   <Button
            //   variant="info"
            //   icon="hdd-network"
            //   title={t('settings.apiTest')}
            //   onClick={() => handleAPITest()}
            //   disabled={!getValueFromArrayOfObj(formValues, 'setupPath')}
            // />

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
            onChange={handleChangeSettings}
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
            onChange={handleChangeSettings}
            placeholder="dms"
            error={formErrors.containerName}
            helpText="settings.containerNameHelp"
            required
          >
            <Button
              variant={pingResult && "success" || "danger"}
              icon={pingResult && "check" || "x"}
              title={pingResult && t('common.pingUp') || t('common.pingDown')}
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
            onChange={handleChangeSettings}
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
            onChange={handleChangeSettings}
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
            onChange={handleChangeSettings}
            placeholder="DMS_API_KEY"
            error={formErrors.DMS_API_KEY}
            helpText="settings.DMS_API_KEYHelp"
            required
          >
            <Button
              variant="warning"
              icon="recycle"
              title={t('settings.DMS_API_KEYregen')}
              onClick={() => handleDMS_API_KEYregen()}
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
            onChange={handleChangeSettings}
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
            onChange={handleChangeSettings}
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
              disabled={!pingResult}
            />
            <Button
              variant="info"
              icon="hdd-network"
              text="settings.apiTest"
              className="me-2"
              onClick={() => handleAPITest()}
              disabled={!pingResult || !APIInjected || !formValidated}
            />
            <Button
              type="submit"
              variant="primary"
              text="settings.saveButtonSettings"
              className="me-2"
              disabled={!formValidated}
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
      
    </>
  );

}

export default FormContainerAdd;

