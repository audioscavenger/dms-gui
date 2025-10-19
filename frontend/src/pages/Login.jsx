// https://blog.logrocket.com/authentication-react-router-v6/

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
} = require('../../frontend.js');

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
  const { t } = useTranslation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);

  const { login } = useAuth();
  
  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Here you would usually send a request to your backend to authenticate the user
    // For the sake of this example, we're using a mock authentication
    // if (username === "admin" && password === "password") {
    const isLoggedin = await loginUser(username, password)
    console.debug('ddebug isLoggedin=',isLoggedin);
    if (isLoggedin) {
      
      await login({ username });
      setErrorMessage(null);
      
    } else {
      setErrorMessage('login.denied');
    }
  };
  
      // <h2 className="mb-4">{t('login.title')}</h2>
  return (
    <>
    <Row className="align-items-center justify-content-center vh-100">
      <Col md={6}>{' '}

        <Card title="login.title" icon="person-lock" collapsible="false">{' '}
          <form onSubmit={handleLogin}>

            <FormField
              type="text"
              id="username"
              name="username"
              label="accounts.email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <FormField
              type="password"
              id="password"
              name="password"
              label="accounts.password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              icon="box-arrow-in-right"
              text="login.login"
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
