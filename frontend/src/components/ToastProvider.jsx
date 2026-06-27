import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';               // needed to post Toasts at the bottom of the viewport, not the container
// import { ToastContainer } from 'react-bootstrap';
import ToastContainer from 'react-bootstrap/ToastContainer';
// import {
//   Toast,
// } from './index.jsx';
// import { Toast } from './Toast';
import Toast from './Toast';                        // DIRECT DEFAULT IMPORT
import { ToastContext } from './ToastContext';      // DIRECT NAMED IMPORT

// Create the Context
// const ToastContext = createContext();            // ToastContext

// Create the Provider component
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Accept a configuration object instead of a string
  const triggerToast = useCallback((options) => {
    setToasts((prev) => [
      ...prev, 
      { 
        id: Date.now(), // Unique tracker for the loop
        ...options      // Passes type, title, message, translate, delay, etc.
      }
    ]);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Determine container position based on the first active toast, or default to bottom-right
  // const activePosition = toasts[0]?.position || 'bottom-right';
  // Determine alignment position based on the newest toast, default to bottom-right
  const activePosition = toasts[toasts.length - 1]?.position || 'bottom-right';

  // Map your custom position strings to official react-bootstrap positions
  const bootstrapPositions = {
    'top-right': 'top-end',
    'top-left': 'top-start',
    'bottom-right': 'bottom-end'
  };

  // Calculate dynamic layout constraints based on activePosition, so the Toasts are in the viewport, not the bottom of the container
  const getPositionStyles = (position) => {
    const baseStyles = { zIndex: 9999, position: 'fixed' };
    
    switch(position) {
      case 'top-right':
        return { ...baseStyles, top: '20px', right: '20px', bottom: 'auto', left: 'auto' };
      case 'top-left':
        return { ...baseStyles, top: '20px', left: '20px', bottom: 'auto', right: 'auto' };
      case 'bottom-right':
      default:
        return { ...baseStyles, bottom: '20px', right: '20px', top: 'auto', left: 'auto' };
    }
  };


        // style={{ zIndex: 1 }}
        // style={{ zIndex: 1, position: 'fixed' }}

  return (
    <ToastContext.Provider value={triggerToast}>
      {/* Render the rest of the jsx */}
      {children}

      {/* Wrap the container in a portal to display it relative to the viewport, bypassing parent styling traps */}
      {createPortal(
        <ToastContainer 
          position={bootstrapPositions[activePosition] || 'bottom-end'} 
          className="p-3" 
          // style={{ zIndex: 9999, position: 'fixed' }}
          // Inject the dynamic positioning style here to override Bootstrap defaults
          style={getPositionStyles(activePosition)}
        >
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              {...toast}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </ToastContainer>,
        document.body // Teleports the HTML cleanly directly into the <body> tag
      )}
    </ToastContext.Provider>
  );
}

export default ToastProvider;
