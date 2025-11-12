import React, { useState, useEffect } from 'react';
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
  getServerStatus,
  getScopes,
  getSettings,
  saveSettings,
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

function FormContainerAdd() {
  const { t } = useTranslation();
  const [containerName, setContainerName] = useLocalStorage("containerName");
  const [isLoading, setLoading] = useState(true);
  const [submissionSettings, setSubmissionSettings] = useState(null); // 'idle', 'submitting', 'success', 'error'
  const [readyForTest, setReadyForTest] = useState(false);

  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [formErrors, setFormErrors] = useState({});
  const [settings, setSettings] = useState([]);

  // selector fields
  const [DMSs, setDMSs] = useState([]);
  const [protocols, setProtocols] = useState([
    {value: 'http', label: 'http'},
    {value: 'https', label: 'https'},
  ]);

  const [dnsProviders, setDnsProviders] = useState([
    {value: 'cloudflare', label: 'Cloudflare'},
  ]);

  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAll();
  }, []);


  const fetchAll = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // const settingsData  = await fetchSettings();  // [ {name:name, value: value}, ..]
    await fetchScopes();                    // [ {scope:name}, ..]
    await fetchSettings(containerName);  // [ {name:name, value: value}, ..]

    setLoading(false);

  };

  const fetchScopes = async () => {
    
    debugLog(`fetchScopes call getScopes()`);
    try {
      const [scopesData] = await Promise.all([
        getScopes(),
      ]);

      if (scopesData.success) {
        // this will be all containers in db except dms-gui
        console.debug('fetchScopes: scopesData', scopesData);   // [ {value:'containerName'}, .. ]
 
        // update selector list
        setDMSs(scopesData.message.map(scope => { return { ...scope, label:scope.value } }));   // duplicate value as label for the select field

        // set the current DMS containerName to the first value in the list if not already set
        // this action will (re)fetch form settings for that container scope
        if (!containerName) setContainerName(scopesData.message[0]?.value);
        
      } else setErrorMessage(scopesData.message);

    } catch (error) {
      errorLog(t('api.errors.fetchSettings'), error);
      setErrorMessage('api.errors.fetchSettings');
    }
  };


  const fetchSettings = async (container) => {
    
    debugLog(`fetchSettings call getSettings(${container})`);
    try {
      const [settingsData] = await Promise.all([
        getSettings(container),
      ]);
      // setSettings({
        // ...settings,
        // ...settingsData,
      // });
      // debugLog(`fetchAll mergeArrayOfObj settingsData`,settingsData);

      if (settingsData.success) {
        // this will be settings for that container only
        console.debug(`fetchAll: settingsData for ${container}`, settingsData);
 
        setSettings(settingsData.message);  // reset settings to what's coming from the db

      } else setErrorMessage(settingsData.message);

    } catch (error) {
      errorLog(t('api.errors.fetchSettings'), error);
      setErrorMessage('api.errors.fetchSettings');
    }
  };


  const handlePingTest = async (e) => {
    // e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      
      const result = await getServerStatus(getValueFromArrayOfObj(settings, 'containerName'), 'ping');

      if (result.success) {
        if (result.message.status.status === 'missing') setErrorMessage(t('dashboard.status.missing') +": "+ result.message.status.error);
        if (result.message.status.status === 'stopped') setErrorMessage(t('dashboard.status.stopped') +": "+ result.message.status.error);
        if (result.message.status.status === 'alive') setSuccessMessage(t('dashboard.status.alive'));

      } else setErrorMessage(result.message);
      
    } catch (error) {
      errorLog(t('api.errors.ping'), error.message);
      setErrorMessage('api.errors.ping', error.message);
    }
  };


  const handleAPITest = async (e) => {
    // e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      
      if (!validateFormContainerAdd()) {
        return;
      }

      const result = await getServerStatus(getValueFromArrayOfObj(settings, 'containerName'), 'execSetup');

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

      } else setErrorMessage(result.message);
      
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
      const result = await initAPI(getValueFromArrayOfObj(settings, 'containerName'), 'regen');

      if (result.success) {
        const DMS_API_KEY = result.message;
        
        // debugLog('settings',settings)
        // debugLog('initAPI', result)
        // debugLog('DMS_API_KEY', DMS_API_KEY)

        if (!containerName) setContainerName(getValueFromArrayOfObj(settings, 'containerName'));
        setSettings(mergeArrayOfObj(settings, [{name: 'DMS_API_KEY', value: DMS_API_KEY}], 'name'));
        
        setSuccessMessage(t('settings.DMS_API_KEYregened', {DMS_API_KEY: DMS_API_KEY}));
        
      } else setErrorMessage(result.message);
      
    } catch (error) {
      errorLog(t('api.errors.DMS_API_KEYregen'), error.message);
      setErrorMessage('api.errors.DMS_API_KEYregen', error.message);
    }
  };


  const handleChangeSettings = (e) => {
    const { name, value } = e.target;
    setErrorMessage(null);
    setSuccessMessage(null);

    // merge array of settings objects by their name
    debugLog(`handleChangeSettings mergeArrayOfObj settings`,settings);
    debugLog(`handleChangeSettings mergeArrayOfObj [{name: name, value:value}]`, [{name: name, value:value}]);
    setSettings(mergeArrayOfObj(settings, [{name: name, value:value}], 'name'));

    // Clear the error for this field while typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null,
      });
    }

    readyForTest
  };

  const validateFormContainerAdd = () => {
    const errors = {};

    // if (settings.containerName.length == 0) {
    if (!settings.find(item => item['name'] == 'containerName') || !settings.find(item => item['name'] == 'containerName').value.length) {
      errors.containerName = 'settings.containerNameRequired';
    }

    // if (settings.protocol.length == 0) {
    if (!settings.find(item => item['name'] == 'protocol') || !settings.find(item => item['name'] == 'protocol').value.length) {
      errors.protocol = 'settings.protocolRequired';
    }

    // if (settings.DMS_API_PORT.length == 0) {
    if (!settings.find(item => item['name'] == 'DMS_API_PORT') 
        || !settings.find(item => item['name'] == 'DMS_API_PORT').value.length
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

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitSettings = async (e) => {
    e.preventDefault();
    debugLog('Form settings Submitted:', settings);
    
    setSubmissionSettings('submitting');
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateFormContainerAdd()) {
      return;
    }

    try {

      debugLog('ddebug --------------------------saveSettings ---------------------------')
      const result = await saveSettings(
        getValueFromArrayOfObj(settings, 'containerName'),
        settings,
      );
      if (result.success) {
        setSubmissionSettings('success');

        // switch to this new container to trigger fetchSettings and confirm all was saved properly
        // UNLESS containerName is already set, indeed
        if (!containerName) setContainerName(getValueFromArrayOfObj(settings, 'containerName'));

        // however, we do pull scopes again to refresh the select field list
        fetchScopes();

        // reminder to setup DMS compose
        setSuccessMessage(t('settings.DMS_API_KEYregened', {
          containerName:getValueFromArrayOfObj(settings, 'containerName'),
          DMS_API_KEY:getValueFromArrayOfObj(settings, 'DMS_API_KEY'),
          DMS_API_PORT:getValueFromArrayOfObj(settings, 'DMS_API_PORT'),
        }));
        
      } else setErrorMessage(result.message);
      
    } catch (error) {
      setSubmissionSettings('error');
      errorLog(t('api.errors.saveSettings'), error);
      setErrorMessage('api.errors.saveSettings');
    }
  };


  const handleChangeDMS = async (e) => {
    // e.preventDefault();
    const { name, value } = e.target;
    debugLog(`Switching to ${name}=${value}`);
    
    try {
      
      if (value) {
        if (result.success) {
          setContainerName(value);
          fetchSettings(value); // Refresh the settings

          // only reset errors, we still wantto see the successful saved settings message as this change will be triggered when saving a new container
          setErrorMessage(null);
          
        } else setErrorMessage(result.message);
      }
      
    } catch (error) {
      errorLog(t('api.errors.saveSettings'), error);
      setErrorMessage('api.errors.saveSettings');
    }
  };


  // if (isLoading && !settings && !Object.keys(settings).length) {
  if (isLoading && !settings.length) {
    return <LoadingSpinner />;
  }
  
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
              options={DMSs}
              placeholder="common.container"
              helpText="settings.DMSHelp"
              required
            />
          </Card>
        </Col>
      </Row>

      <Row>
        <form onSubmit={handleSubmitSettings} className="form-wrapper">
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
            value={getValueFromArrayOfObj(settings, 'protocol')}
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
            <Button
              variant="info"
              icon="hdd-network"
              title={t('settings.apiTest')}
              onClick={() => handleAPITest()}
              disabled={!getValueFromArrayOfObj(settings, 'setupPath')}
            />
          </FormField>
        
          <SelectField
            id="dnsProvider"
            name="dnsProvider"
            label="settings.dnsProvider"
            value={getValueFromArrayOfObj(settings, 'dnsProvider')}
            onChange={handleChangeSettings}
            options={dnsProviders}
            helpText="settings.dnsProviderHelp"
          />
        
          <Button type="submit" variant="primary" text="settings.saveButtonSettings" />
        </form>
      </Row>
    </>
  );

}

export default FormContainerAdd;

