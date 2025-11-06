// https://blog.logrocket.com/authentication-react-router-v6/

import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
// import { useTranslation } from 'react-i18next';
import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
} = require('../../frontend');

import {
  loginUser,
} from '../services/api';

import { 
  AlertMessage,
  Button,
  FormField,
  Card,
} from '../components';


// function Login() {
export const Login = () => {
  // const { t } = useTranslation();

  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [firstRun, setFirstRun] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const { login } = useAuth();
  
  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    isFirstRun();
  }, []);

  // redirect to /settings if no users in db
  const isFirstRun = async () => {
    
    const user = await loginUser('admin', 'changeme');
    // if we can login with the default user, display first run welcome message
    if (user) {
      setFirstRun(true);
      setSuccessMessage('logins.isFirstRun');
    }

  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Here you would usually send a request to your backend to authenticate the user
    // For the sake of this example, we're using a mock authentication
    // if (credential === "admin" && password === "password") {
    // const user = await loginUser(credential, password)
    const user = await loginUser(credential, password)
    // console.debug('ddebug user=', user);
    if (user) {
      
      debugLog('ddebug user logged in:', user);
      
      setSuccessMessage(null);
      setErrorMessage(null);
      // (firstRun) ? await login({credential}, "/settings") : await login({credential});
      (firstRun) ? await login(user, "/settings") : await login(user);
      
    } else {
      setErrorMessage('logins.denied');
    }
  };
  
  
      // <h2 className="mb-4">{t('login.title')}</h2>
  return (
    <>
    <Row className="align-items-center justify-content-center vh-100">
      <Col md={6}>{' '}

        <Card title="logins.welcome" icon="person-lock" collapsible="false">{' '}
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
          <br />
          <AlertMessage type="danger" message={errorMessage} />
          
        </Card>
        
      </Col>
    </Row>
    </>
  );
};

export default Login;
