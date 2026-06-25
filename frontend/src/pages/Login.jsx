// https://blog.logrocket.com/authentication-react-router-v6/

import React, { useState, useEffect } from 'react';
// import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

import {
  debugLog,
} from '../../frontend.mjs';
// import {
//   regexColors,
//   regexPrintOnly,
//   regexFindEmailStrict,
//   regexEmailStrict,
//   regexMatchPostfix,
//   regexUsername,
//   funcName,
//   fixStringType,
//   arrayOfStringToDict,
//   obj2ArrayOfObj,
//   reduxArrayOfObjByKey,
//   reduxArrayOfObjByValue,
//   reduxPropertiesOfObj,
//   mergeArrayOfObj,
//   getValueFromArrayOfObj,
//   getValuesFromArrayOfObj,
//   pluck,
//   byteSize2HumanSize,
//   humanSize2ByteSize,
//   moveKeyToLast,
// } from '../../../common.mjs';

import {
  getConfigs,
  loginUser,
} from '../services/api.mjs';

import { 
  AlertMessage,
  Button,
  FormField,
  Toast,
  Card,
} from '../components/index.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';


// function Login() {
export const Login = () => {
  const { t } = useTranslation();

  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [firstRun, setFirstRun] = useLocalStorage("firstRun", false); // this is obviously used in Login, Profile and Settings
  const [isDEMO, setIsDEMO] = useLocalStorage("isDEMO", false);
  
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const { user, login, logout } = useAuth();
  
  // const [containerName, setContainerName] = useLocalStorage("containerName", '');
  const [mailservers, setMailservers] = useLocalStorage("mailservers", []);
  
  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    isFirstRun();
  }, []);

  // redirect to /settings if no users in db
  const isFirstRun = async () => {

    // /login will act as /logout
    if (user) logout();

    setFirstRun(false);
    const result = await loginUser('admin', 'changeme', true);
    // debugLog('ddebug isFirstRun result', result);
    
    // DEMO mode is always happy
    if (result?.isDEMO || isDEMO) {
      setIsDEMO(true);
      setFirstRun(true);
      setSuccessMessage('logins.isDEMO');

    } else {
      setIsDEMO(false);

      // if we can login with the default user, display first run welcome message
      if (result.success) {
        setFirstRun(true);
        setSuccessMessage('logins.isFirstRun');
      }
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
        setMailservers(mailserversData.message.map(mailserver => { return { ...mailserver, label:mailserver.value } }));   // duplicate value as label for the select field
        
      } // else setErrorMessage(mailserversData?.error);

    } catch (error) {
      // errorLog(t('api.errors.fetchConfigs'), error);
      // setErrorMessage('api.errors.fetchConfigs');
      setErrorMessage({key: 'api.errors.fetchConfigs', values: { error: error.message }});
    }
  };
    
  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      // Here you would usually send a request to your backend to authenticate the user
      // For the sake of this example, we're using a mock authentication
      const result = await loginUser(credential, password);
      // without JWT: {"mailbox":"eric@domain.com","username":"eric","email":"","isAdmin":0,"isActive":1,"isAccount":0,"roles":["eric@domain.com"]}
      // with    JWT: { accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx" }
      
      if (result.success) {
        // now we can pull and setState for available mailservers; await a little so the Settings page don't pull it twice
        await fetchMailservers();

        // until the admin changes its name or password, we redirect to /settings or /profile
        if (firstRun) {
          // no default mailserver? /settings
          //    default mailserver but default password? /profile
          (!result.message.mailserver) ? await login(result.message, "/settings") : await login(result.message, "/profile");

        } else {
          await login(result.message);
        }

      // this will never happen with a 401 login denied unless the backend returns 200, which it won't. HTTP error codes exist for a reason and we will use them.
      } else {
        setErrorMessage(result.message || 'logins.denied');
        // setErrorMessage('logins.denied');
      }

    // react refuses to handle 401 login denied and will actually fall here
    } catch (error) {
      setErrorMessage('logins.denied');
      debugLog('error:', error.message);
    }
  };
  
  
      // <h2 className="mb-4">{t('login.title')}</h2>
  return (
    <>
    <Row className="align-items-center justify-content-center vh-100">
      <Col md={6}>{' '}

        <Card 
          title={isDEMO ? 'logins.welcomeDEMO' : 'logins.welcome'} 
          icon="person-lock" 
          collapsible={false}
          iconExtra={isDEMO ? 'common.dmsIcon' : 'common.dmsIcon'} 
          titleExtra={
            <a href={t('common.dmsUrl')} target="_blank">
              {t('common.dmsName')}
            </a>
          } 
          >{' '}
          <AlertMessage type="success" message={successMessage} />

          <form onSubmit={handleLogin}>

            <FormField
              type="text"
              id="credential"
              name="credential"
              label="logins.credential"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              required
            />

            <FormField
              type="password"
              id="password"
              name="password"
              label="logins.password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              icon="box-arrow-in-right"
              text="logins.login"
            />
            
          </form>

          <a href="#" className="float-end">{t("logins.forgotPassword")}</a>
          
        </Card>
        
      </Col>
    </Row>

    {errorMessage && (
      <Toast 
        type="danger" 
        message={errorMessage} 
        position="bottom-right"
        onClose={() => setErrorMessage(null)} // Clears the state when closed or when it fades out
      />
    )}
    </>
  );
};

export default Login;

          // <br />
          // <AlertMessage type="danger" message={errorMessage} />
