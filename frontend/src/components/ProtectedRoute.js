// https://blog.logrocket.com/authentication-react-router-v6/
// checks the current user’s state from the useAuth Hook and redirects them to the login screen if they are not authenticated:

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    // console.debug('ddebug ProtectedRoute useAuth not auth');
    // user is not authenticated
    return <Navigate to="/login" />;
  }
  // console.debug('ddebug ProtectedRoute useAuth return children');
  return children;
};

// export default ProtectedRoute;