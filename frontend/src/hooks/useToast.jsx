import { useContext } from 'react';
// import { ToastContext } from '../components/ToastProvider';
import { ToastContext } from '../components/ToastContext';      // DIRECT NAMED IMPORT

export function useToast() {
  const context = useContext(ToastContext);
  
  // Debug safety check to catch configuration issues gracefully
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
}

// this creates a circular dependency infinite loop ----------
// import { ToastContext } from '../components';
// export function useToast() {
//   return useContext(ToastContext);
// }
// -----------------------------------------------------------

