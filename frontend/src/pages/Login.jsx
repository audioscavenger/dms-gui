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
//   regexFindEmailRegex,
//   regexFindEmailStrict,
//   regexFindEmailLax,
//   regexEmailRegex,
//   regexEmailStrict,
//   regexEmailLax,
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
  Card,
} from '../components/index.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';


// function Login() {
export const Login = () => {
  const { t } = useTranslation();

  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [firstRun, setFirstRun] = useState(false);
  const [isDEMO, setIsDEMO] = useLocalStorage("isDEMO");
  
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const { user, login, logout } = useAuth();
  
  const [setMailservers] = useLocalStorage("mailservers");
  
  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    isFirstRun();
  }, []);

  // redirect to /settings if no users in db
  const isFirstRun = async () => {

    // since we are redirected here from the api when dms-gui has restarted with fresh secret keys, we need to logout first
    if (user) logout();

    const result = await loginUser('admin', 'changeme', true);
    // debugLog('ddebug isFirstRun result', result);
    
    // if we can login with the default user, display first run welcome message
    
    if (result.success) {
      setFirstRun(true);

      if (result?.isDEMO || isDEMO) {
        setIsDEMO(true);
        setSuccessMessage('logins.isDEMO');
      } else {
        setIsDEMO(false);
        setSuccessMessage('logins.isFirstRun');
      }
    }
  };

    const fetchMailservers = async () => {
    
    try {
      const [mailserversData] = await Promise.all([
        getConfigs('mailserver'),
      ]);

      if (mailserversData.success) {
        // this will be all containers in db except dms-gui
        debugLog('Login fetchMailservers: mailserversData', mailserversData);   // [ {value:containerName', plugin:'mailserver', schema:'dms', scope:'dms-gui'}, ..]
  
        // update selector list
        setMailservers(mailserversData.message.map(mailserver => { return { ...mailserver, label:mailserver.value } }));   // duplicate value as label for the select field
        
      // } else setErrorMessage(mailserversData?.error);  // fails silently
      }

    // fails silently
    } catch (error) {
      // errorLog(t('api.errors.fetchConfigs'), error);
      // setErrorMessage('api.errors.fetchConfigs');
    }
  };
    
  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Here you would usually send a request to your backend to authenticate the user
    // For the sake of this example, we're using a mock authentication
    const result = await loginUser(credential, password)
    // console.debug('ddebug loginUser result=', result.message);
    // without JWT: {"mailbox":"eric@domain.com","username":"eric","email":"","isAdmin":0,"isActive":1,"isAccount":0,"roles":["eric@domain.com"]}
    // with    JWT: { accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx" }
    
    if (result.success) {
      // now we can pull and setState for available mailservers; await a little so the Settings page don't pull it twice
      await fetchMailservers();

      (firstRun) ? await login(result.message, "/settings") : await login(result.message);

    } else {
      setErrorMessage('logins.denied');
    }
  };
  
  
      // <h2 className="mb-4">{t('login.title')}</h2>
  return (
    <>
    <Row className="align-items-center justify-content-center vh-100">
      <Col md={6}>{' '}

        <Card title={isDEMO ? 'logins.welcomeDEMO' : 'logins.welcome'} icon="person-lock" collapsible="false">{' '}
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

          <a href="#" class="float-end">{t("logins.forgotPassword")}</a>

          <br />
          <AlertMessage type="danger" message={errorMessage} />
          
        </Card>
        
      </Col>
    </Row>
    </>
  );
};

export default Login;
