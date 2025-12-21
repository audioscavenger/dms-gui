import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

import {
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
  const [containerName, setContainerName] = useLocalStorage("containerName", undefined);
  const [mailservers, setMailservers] = useLocalStorage("mailservers", []);

  const [isLoading, setLoading] = useState(true);
  const [submissionSettings, setSubmissionSettings] = useState(null); // 'idle', 'submitting', 'success', 'error'

  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [formValidated, setFormValidated] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [settings, setSettings] = useState([]);
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

  // const [dnsProviders, setDnsProviders] = useState([
  //   {value: 'cloudflare', label: 'Cloudflare'},
  // ]);

  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    fetchSettings(containerName);  // [ {name:name, value: value}, ..]
  }, [containerName]);

  useEffect(() => {
    handleMailservers();
  }, [mailservers]);


  const fetchAll = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    debugLog('ddebug 1 fetchAll');

    if (!mailservers || !mailservers.length) await fetchMailservers();

    setLoading(false);

  };

  const fetchMailservers = async () => {
    
    debugLog('ddebug 2 fetchMailservers');
    try {
      const [mailserversData] = await Promise.all([
        getConfigs('mailserver'),
      ]);

      if (mailserversData.success) {
        // this will be all containers in db except dms-gui
        debugLog('fetchMailservers: mailserversData', mailserversData);   // [ {value:containerName', plugin:'mailserver', schema:'dms', scope:'dms-gui'}, ..]
 
        // update selector list
        setMailservers(mailserversData.message.map(mailserver => { return { ...mailserver, label:mailserver.value } }));   // duplicate value as label for the select field
        
      } else setErrorMessage(mailserversData?.error);

    } catch (error) {
      errorLog(t('api.errors.fetchConfigs'), error);
      setErrorMessage('api.errors.fetchConfigs');
    }

    return false;
  };


  const fetchSettings = async (container) => {
    if (container && mailservers.length) {
      setLoading(true);
      setErrorMessage(null);
      
      debugLog(`fetchSettings call getSettings('mailserver', ${container})`);
      try {
          
          const [settingsData] = await Promise.all([
          getSettings(
            'mailserver',
            container,
          ),
        ]);
        // debugLog(`fetchAll mergeArrayOfObj settingsData`,settingsData);

        if (settingsData.success) {
          // this will be settings for that container only
          console.debug(`fetchAll: got ${settingsData.message.length} settingsData for ${container}:`, settingsData.message);
  
          setSettings(mergeArrayOfObj(settings, settingsData.message, 'name'));

        } else setErrorMessage(settingsData?.error);

      } catch (error) {
        errorLog(t('api.errors.fetchSettings'), error);
        setErrorMessage('api.errors.fetchSettings');
      }
      setLoading(false);
    }
  };


  const handleMailservers = async () => {
    if (mailservers.length) {
      if (!containerName) {
        // user does not have a favorite, pick the first in the list
        debugLog(`ddebug setContainerName(getValueFromArrayOfObj(${mailservers}, 'value')`, getValueFromArrayOfObj(mailservers, 'value'));
        setContainerName(getValueFromArrayOfObj(mailservers, 'value'));

      } else {
        fetchSettings(containerName);
      }

    } else {
      // if no container exist yet, we also preset the schema and protocol values, as the values would never be set until the user change them
      setSettings([{name: 'schema', value:schemas[0].value}, {name: 'protocol', value:protocols[0].value}]);
    }
  }


  const handlePingTest = async (e) => {
    // e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      
      // const result = await getServerStatus('mailserver', getValueFromArrayOfObj(settings, 'schema'), getValueFromArrayOfObj(settings, 'containerName'), 'ping');
      const result = await getServerStatus('mailserver', getValueFromArrayOfObj(settings, 'containerName'), 'ping');

      if (result.success) {
        if (result.message.status.status === 'missing') setErrorMessage(t('dashboard.status.missing') +": "+ result.message.status.error);
        if (result.message.status.status === 'stopped') setErrorMessage(t('dashboard.status.stopped') +": "+ result.message.status.error);
        if (result.message.status.status === 'alive') setSuccessMessage(t('dashboard.status.alive'));

      } else setErrorMessage(result?.error);
      
    } catch (error) {
      errorLog(t('api.errors.ping'), error.message);
      setErrorMessage('api.errors.ping', error.message);
    }
  };


  const handleAPITest = async (e) => {
    // e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFormValidated(false);

    try {
      
      // we should not retest the form here as the button will be disabled until it is valid
      // if (!validateFormContainerAdd(false)) {
        // return;
      // }

      // the backend does not have this new dms in db yet, so we must send also the settings to help getTargetDict
      // const result = await getServerStatus('mailserver', getValueFromArrayOfObj(settings, 'schema'), getValueFromArrayOfObj(settings, 'containerName'), 'execSetup', settings);
      const result = await getServerStatus('mailserver', getValueFromArrayOfObj(settings, 'containerName'), 'execSetup', settings);
      debugLog('getServerStatus:', result);

      if (result.success) {
        if (result.message.status.status === 'missing') setErrorMessage(t('dashboard.status.missing') +": "+ result.message.status.error);
        if (result.message.status.status === 'stopped') setErrorMessage(t('dashboard.status.stopped') +": "+ result.message.status.error);
        if (result.message.status.status === 'alive') setSuccessMessage(t('dashboard.status.alive') +": however, API test was not performed");
        if (result.message.status.status === 'running') setSuccessMessage( t('settings.running', {
                                                          containerName: getValueFromArrayOfObj(settings, 'containerName'), 
                                                          DMS_API_PORT: getValueFromArrayOfObj(settings, 'DMS_API_PORT')}) 
                                                        );
        if (result.message.status.status === 'api_gen') setErrorMessage(t('dashboard.status.api_gen') +": "+ result.message.status.error);
        if (result.message.status.status === 'api_miss') setErrorMessage(t('dashboard.status.api_miss') +": "+ result.message.status.error);
        if (result.message.status.status === 'api_error') setErrorMessage(t('dashboard.status.api_error') +": "+ result.message.status.error);
        if (result.message.status.status === 'api_unset') setErrorMessage(t('dashboard.status.api_unset') +": "+ result.message.status.error);

        setFormValidated(true);

      } else setErrorMessage(result?.error);
      
    } catch (error) {
      errorLog(t('api.errors.fetchServerStatus'), error.message);
      setErrorMessage('api.errors.fetchServerStatus', error.message);
    }
  };


  const handleDMS_API_KEYregen = async (e) => {
    // e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      
      debugLog('regen API key for containerName=', getValueFromArrayOfObj(settings, 'containerName'))
      const result = await initAPI('mailserver', getValueFromArrayOfObj(settings, 'schema'), getValueFromArrayOfObj(settings, 'containerName'), 'regen');

      if (result.success) {
        const DMS_API_KEY = result.message;
        
        // debugLog('settings',settings)
        // debugLog('initAPI', result)
        // debugLog('DMS_API_KEY', DMS_API_KEY)

        // the 2 below should only be set on save
        // if (!containerName) setContainerName(getValueFromArrayOfObj(settings, 'containerName'));
        // if (!schema)        setSchema(getValueFromArrayOfObj(settings, 'schema'));
        setSettings(mergeArrayOfObj(settings, [{name: 'DMS_API_KEY', value: DMS_API_KEY}], 'name'));
        
        setSuccessMessage(t('settings.DMS_API_KEYregened', {DMS_API_KEY: DMS_API_KEY}));
        
      } else setErrorMessage(result?.error);
      
    } catch (error) {
      errorLog(t('api.errors.DMS_API_KEYregen'), error.message);
      setErrorMessage('api.errors.DMS_API_KEYregen', error.message);
    }
  };


  const handleChangeSettings = (e) => {
    const { name, value, type } = e.target;
    setErrorMessage(null);
    setSuccessMessage(null);

    // merge array of settings objects by their name
    // WARNING: When handling input fields of type="number" in React-Bootstrap forms, the onChange event event.target.value will always provide a string, even if the user enters a number.
    // SOLUTION: type === 'number' ? Number(value) : value
    // HOWEVER, we won't do that because settings values are stored as TEXT in the db
    setSettings(mergeArrayOfObj(settings, [{name: name, value:value}], 'name'));

    debugLog(`handleChangeSettings settings:`, mergeArrayOfObj(settings, [{name: name, value:value}], 'name'));

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
      
      const result = await updateLogin(
        user.id,
        {mailserver:containerName},
      );
      if (result.success) {
        login({
          ...user,
          mailserver:containerName
        }); // reset new values for that user in frontend state
        
      } // fails silently
      
    } catch (error) {
      errorLog(error.message);
      setErrorMessage('api.errors.updateLogin', error.message);
    }
  };


  const validateFormContainerAdd = (setErrors=false) => {
    const errors = {};

    // if (settings.containerName.length == 0) {
    if (!settings.find(item => item['name'] == 'containerName') || !settings.find(item => item['name'] == 'containerName').value.length) {
      errors.containerName = 'settings.containerNameRequired';
    }

    // if (settings.schema.length == 0) {
    if (!settings.find(item => item['name'] == 'schema') || !settings.find(item => item['name'] == 'schema').value.length) {
      errors.schema = 'settings.schemaRequired';
    }

    // if (settings.protocol.length == 0) {
    if (!settings.find(item => item['name'] == 'protocol') || !settings.find(item => item['name'] == 'protocol').value.length) {
      errors.protocol = 'settings.protocolRequired';
    }

    // if (settings.DMS_API_PORT.length == 0) {
    if (!settings.find(item => item['name'] == 'DMS_API_PORT') 
        || !Number(settings.find(item => item['name'] == 'DMS_API_PORT').value)
        || (Number(settings.find(item => item['name'] == 'DMS_API_PORT').value) < 1)
        || (Number(settings.find(item => item['name'] == 'DMS_API_PORT').value) > 65535)
      ) {
      errors.DMS_API_PORT = 'settings.DMS_API_PORTRequired';
    }

    // if (settings.DMS_API_KEY.length == 0) {
    if (!settings.find(item => item['name'] == 'DMS_API_KEY') || !settings.find(item => item['name'] == 'DMS_API_KEY').value.length) {
      errors.DMS_API_KEY = 'settings.DMS_API_KEYRequired';
    }

    // if (settings.setupPath.length == 0) {
    if (!settings.find(item => item['name'] == 'setupPath') || !settings.find(item => item['name'] == 'setupPath').value.length) {
      errors.setupPath = 'settings.setupPathRequired';
    }

    // if (settings.timeout.length == 0) {
    if (!settings.find(item => item['name'] == 'timeout') 
        || !Number(settings.find(item => item['name'] == 'timeout').value)
        || (Number(settings.find(item => item['name'] == 'timeout').value) < 1)
        || (Number(settings.find(item => item['name'] == 'timeout').value) > 60)
      ) {
      errors.timeout = 'settings.timeoutRequired';
    }

    // once the checkbox is rendered...
    if (makeFavoriteRef.current) {
      // pre-check the container as favorite when user has none, also pre-check if current container is already the favorite
      if (!user?.mailserver || user?.mailserver == containerName) makeFavoriteRef.current.checked = true;
    }

    if (setErrors) setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitSettings = async (e) => {
    e.preventDefault();
    debugLog('Form settings Submitted:', settings);
    
    setSubmissionSettings('submitting');
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateFormContainerAdd(true)) {
      return;
    }

    try {

      debugLog(`saveSettings( mailserver, ${getValueFromArrayOfObj(settings, 'schema')}, dms-gui, ${getValueFromArrayOfObj(settings, 'containerName')})`, settings);
      const result = await saveSettings(
        'mailserver',
        getValueFromArrayOfObj(settings, 'schema'),
        'dms-gui',
        getValueFromArrayOfObj(settings, 'containerName'),
        settings,
      );
      if (result.success) {
        setSubmissionSettings('success');

        // pull mailservers again to refresh the select field list and branding selector
        await fetchMailservers();

        if (makeFavoriteRef.current.checked) {
          await handleLoginSave(getValueFromArrayOfObj(settings, 'containerName'));
          await setContainerName(getValueFromArrayOfObj(settings, 'containerName'));
        }

        // switch to this new container to trigger fetchSettings and confirm all was saved properly
        // UNLESS containerName is already set, indeed
        // containerName shall always be set, even if user doesn't want it as a favorite
        if (!containerName) {
          await setContainerName(getValueFromArrayOfObj(settings, 'containerName'));

        // containerName was already set, so reset the settings immediately with same settings to validate all is indeed saved in the db
        } else {
          await fetchSettings(getValueFromArrayOfObj(settings, 'containerName'));
        }

        // reminder to setup DMS compose
        setSuccessMessage(t('settings.DMS_API_KEYregened', {
          containerName:getValueFromArrayOfObj(settings, 'containerName'),
          DMS_API_KEY:getValueFromArrayOfObj(settings, 'DMS_API_KEY'),
          DMS_API_PORT:getValueFromArrayOfObj(settings, 'DMS_API_PORT'),
        }));
        
      } else setErrorMessage(result?.error);
      
    } catch (error) {
      setSubmissionSettings('error');
      errorLog(t('api.errors.saveSettings'), error);
      setErrorMessage('api.errors.saveSettings');
    }
  };


  const handleChangeDMS = async (e) => {
    // e.preventDefault();
    const { name, value, type } = e.target;
    debugLog(`Switching to ${name}=${value}`);
    
    try {
      
      if (value) {

        setContainerName(value);
        // fetchSettings(value); // Refresh the settings is done by useEffect on containerName change
        // setSchema(getValueFromArrayOfObj(settings, 'schema'));  // that should be done during fetchSettings and also dependent on useEffect

        // only reset errors, we still want to see the successful saved settings message as this change will be triggered when saving a new container
        setErrorMessage(null);
          
      } else setErrorMessage(result?.error);
      
    } catch (error) {
      errorLog(t('api.errors.saveSettings'), error);
      setErrorMessage('api.errors.saveSettings');
    }
  };


  // if (isLoading && !settings && !Object.keys(settings).length) {
  if (isLoading || !user.isAdmin) {
    return <LoadingSpinner />;
  }
  
            //   <Button
            //   variant="info"
            //   icon="hdd-network"
            //   title={t('settings.apiTest')}
            //   onClick={() => handleAPITest()}
            //   disabled={!getValueFromArrayOfObj(settings, 'setupPath')}
            // />

  return (
    <>
      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="success" message={successMessage} />
      
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
            value={getValueFromArrayOfObj(settings, 'schema') || schemas[0].value}
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
            value={getValueFromArrayOfObj(settings, 'containerName')}
            onChange={handleChangeSettings}
            placeholder="dms"
            error={formErrors.containerName}
            helpText="settings.containerNameHelp"
            required
          >
            <Button
              variant="info"
              icon="send"
              title={t('common.ping')}
              onClick={() => handlePingTest()}
              disabled={!getValueFromArrayOfObj(settings, 'containerName')}
            />
          </FormField>

          <SelectField
            id="protocol"
            name="protocol"
            label="settings.protocol"
            value={getValueFromArrayOfObj(settings, 'protocol') || protocols[0].value}
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
            value={getValueFromArrayOfObj(settings, 'DMS_API_PORT')}
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
            value={getValueFromArrayOfObj(settings, 'DMS_API_KEY')}
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
              title={t('settings.DMS_API_KEYregenedHelp')}
              onClick={() => setSuccessMessage(t('settings.DMS_API_KEYregened', {
                containerName:getValueFromArrayOfObj(settings, 'containerName'),
                DMS_API_KEY:getValueFromArrayOfObj(settings, 'DMS_API_KEY'),
                DMS_API_PORT:getValueFromArrayOfObj(settings, 'DMS_API_PORT'),
              })) }
            />
            <Button
              variant="outline-secondary"
              icon="clipboard-plus"
              title={t('common.copy')}
              onClick={() => navigator.clipboard.writeText(getValueFromArrayOfObj(settings, 'DMS_API_KEY')) }
            />
          </FormField>
        
          <FormField
            type="number"
            id="timeout"
            name="timeout"
            label="settings.timeout"
            value={getValueFromArrayOfObj(settings, 'timeout')}
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
            value={getValueFromArrayOfObj(settings, 'setupPath')}
            onChange={handleChangeSettings}
            placeholder="/usr/local/bin/setup"
            error={formErrors.setupPath}
            helpText="settings.setupPathHelp"
            required
          >
          </FormField>
        
          <div className="d-flex align-items-center">
            <Button
              variant="info"
              icon="hdd-network"
              text="settings.apiTest"
              className="me-2"
              onClick={() => handleAPITest()}
              disabled={!validateFormContainerAdd()}
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
    </>
  );

}

export default FormContainerAdd;

