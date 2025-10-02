import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
// Removed bootstrap.bundle.min.js import as react-bootstrap replaces it
import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.css';
import App from './App';

// Import i18n configuration
import './i18n';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
