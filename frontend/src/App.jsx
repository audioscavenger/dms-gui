import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import ToastProvider from './components/ToastProvider';
import LeftSidebar from './components/LeftSidebar';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Aliases from './pages/Aliases';
import Settings from './pages/Settings';
import Logins from './pages/Logins';
import Profile from './pages/Profile';
import Login from './pages/Login';

import Container from 'react-bootstrap/Container'; // Import Container
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './hooks/useAuth';   // must include any elements that will interact with auth

// 1. Create a specialized layout wrapper strictly for Authenticated states
const ProtectedLayout = () => {
  return (
    <div className="app-viewport-wrapper">
      <Navbar />
      {/* Container fluid holds our two side-by-side sections */}
      <Container fluid className="app-content-container p-0">
        <div className="app-layout-body">
          {/* Sidebar controls its own width now */}
          <div className="sidebar-col">
            <LeftSidebar />
          </div>
          {/* Main content expands to fill all remaining horizontal space */}
          <main className="main-content">
            <Outlet /> 
          </main>
        </div>
      </Container>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* Public Route: Wipes the screen completely clean of Navbars and Sidebars */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes: Nesting them inside the layout guards everything simultaneously */}
          <Route element={<ProtectedRoute><ProtectedLayout /></ProtectedRoute>}>
            <Route path="/"          element={<Dashboard key="dashboard" />} />
            <Route path="/dashboard" element={<Dashboard key="dashboard" />} />
            <Route path="/logins"    element={<ProtectedRoute isAdmin><Logins key="logins" /></ProtectedRoute>} />
            <Route path="/accounts"  element={<Accounts key="accounts" />} />
            <Route path="/aliases"   element={<Aliases key="aliases" />} />
            <Route path="/settings"  element={<ProtectedRoute isAdmin><Settings key="settings" /></ProtectedRoute>} />
            <Route path="/profile"   element={<Profile key="profile" />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
export default App;
