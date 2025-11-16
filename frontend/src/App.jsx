import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LeftSidebar from './components/LeftSidebar';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Aliases from './pages/Aliases';
import Settings from './pages/Settings';
import Logins from './pages/Logins';
import Profile from './pages/Profile';

import Container from 'react-bootstrap/Container'; // Import Container
import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

import Login from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './hooks/useAuth';   // must include any elements that will interact with auth

                // <Route path="/"           element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                // <Route path="/login"      element={<Login />} />
                // <Route path="/dashboard"  element={<ProtectedRoute        ><Dashboard /></ProtectedRoute>} />
                // <Route path="/logins"     element={<ProtectedRoute isAdmin><Logins /></ProtectedRoute>} />
                // <Route path="/accounts"   element={<ProtectedRoute isAdmin><Accounts /></ProtectedRoute>} />
                // <Route path="/aliases"    element={<ProtectedRoute        ><Aliases /></ProtectedRoute>} />
                // <Route path="/settings"   element={<ProtectedRoute isAdmin><Settings /></ProtectedRoute>} />
                // <Route path="/profile"    element={<ProtectedRoute        ><Profile /></ProtectedRoute>} />

                // <Route path="/"           element={<ProtectedRoute>        <Dashboard key="dashboard" /></ProtectedRoute>} />
                // <Route path="/login"      element={                        <Login          />} />
                // <Route path="/dashboard"  element={<ProtectedRoute        ><Dashboard key="dashboard" /></ProtectedRoute>} />
                // <Route path="/logins"     element={<ProtectedRoute isAdmin><Logins    key="logins"    /></ProtectedRoute>} />
                // <Route path="/accounts"   element={<ProtectedRoute isAdmin><Accounts  key="accounts"  /></ProtectedRoute>} />
                // <Route path="/aliases"    element={<ProtectedRoute        ><Aliases   key="aliases"   /></ProtectedRoute>} />
                // <Route path="/settings"   element={<ProtectedRoute isAdmin><Settings  key="settings"  /></ProtectedRoute>} />
                // <Route path="/profile"    element={<ProtectedRoute        ><Profile   key="profile"   /></ProtectedRoute>} />

function App() {
  return (
    <AuthProvider>
    <div>
      <Navbar />
      <Container fluid>
        <Row>
          
          <Col md={2} className="p-0 sidebar-col">{' '}
            <LeftSidebar />
          </Col>
          
          <Col md={10} className="main-content">{' '}
              <Routes>
                <Route path="/"           element={<ProtectedRoute>        <Dashboard key="dashboard" /></ProtectedRoute>} />
                <Route path="/login"      element={                        <Login          />} />
                <Route path="/dashboard"  element={<ProtectedRoute        ><Dashboard key="dashboard" /></ProtectedRoute>} />
                <Route path="/logins"     element={<ProtectedRoute isAdmin><Logins    key="logins"    /></ProtectedRoute>} />
                <Route path="/accounts"   element={<ProtectedRoute        ><Accounts  key="accounts"  /></ProtectedRoute>} />
                <Route path="/aliases"    element={<ProtectedRoute        ><Aliases   key="aliases"   /></ProtectedRoute>} />
                <Route path="/settings"   element={<ProtectedRoute isAdmin><Settings  key="settings"  /></ProtectedRoute>} />
                <Route path="/profile"    element={<ProtectedRoute        ><Profile   key="profile"   /></ProtectedRoute>} />
              </Routes>
          </Col>{' '}
          
        </Row>{' '}
        
      </Container>{' '}
      
    </div>
    </AuthProvider>
  );
}

export default App;
