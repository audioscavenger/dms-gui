// https://blog.logrocket.com/authentication-react-router-v6/
// checks the current user’s state from the useAuth Hook and redirects them to the login screen if they are not authenticated:

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

  // component: Component,
export const ProtectedRoute = ({ 
  children,
  isAdmin = false,
  ...rest // Pass any other props
}) => {
  // console.debug('ddebug ProtectedRoute children', children);
  // { "$$typeof": Symbol("react.transitional.element"), type: Dashboard(), key: "dashboard", props: {}, _owner: {…}, _store: {…}, … }

  const { user } = useAuth();
  // console.debug('ddebug ProtectedRoute user', user);
  
  // user is not authenticated, no access
  if (!user) return <Navigate to="/login" {...rest} />;
  
  // Control admin access to admin pges
  if (isAdmin && !user.isAdmin) {
    return <Navigate to="/profile" {...rest} />;
  }
  
  // console.debug('ddebug ProtectedRoute useAuth return children');
  return children;
  // return Component;
};

export default ProtectedRoute;