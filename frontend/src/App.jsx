import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import LeftSidebar from './components/LeftSidebar';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Aliases from './pages/Aliases';
import Settings from './pages/Settings';
import Logins from './pages/Logins';
import Profile from './pages/Profile';
import Login from './pages/Login';

import Container from 'react-bootstrap/Container'; // Import Container
import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './hooks/useAuth';   // must include any elements that will interact with auth

// 1. Create a specialized layout wrapper strictly for Authenticated states
const ProtectedLayout = () => {
  return (
    <div>
      <Navbar />
      <Container fluid>
        <Row>
          <Col md={2} className="p-0 sidebar-col">
            <LeftSidebar />
          </Col>
          <Col md={10} className="main-content">
            {/* Outlet acts as a portal that swaps your sub-pages in dynamically */}
            <Outlet /> 
          </Col>
        </Row>
      </Container>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}

// function App() {
//   return (
//     <AuthProvider>
//     <div>
//       <Navbar />
//       <Container fluid>
//         <Row>
          
//           <Col md={2} className="p-0 sidebar-col">{' '}
//             <LeftSidebar />
//           </Col>
          
//           <Col md={10} className="main-content">{' '}
//               <Routes>
//                 <Route path="/"           element={<ProtectedRoute>        <Dashboard key="dashboard" /></ProtectedRoute>} />
//                 <Route path="/login"      element={                        <Login          />} />
//                 <Route path="/dashboard"  element={<ProtectedRoute        ><Dashboard key="dashboard" /></ProtectedRoute>} />
//                 <Route path="/logins"     element={<ProtectedRoute isAdmin><Logins    key="logins"    /></ProtectedRoute>} />
//                 <Route path="/accounts"   element={<ProtectedRoute        ><Accounts  key="accounts"  /></ProtectedRoute>} />
//                 <Route path="/aliases"    element={<ProtectedRoute        ><Aliases   key="aliases"   /></ProtectedRoute>} />
//                 <Route path="/settings"   element={<ProtectedRoute isAdmin><Settings  key="settings"  /></ProtectedRoute>} />
//                 <Route path="/profile"    element={<ProtectedRoute        ><Profile   key="profile"   /></ProtectedRoute>} />
//               </Routes>
//           </Col>{' '}
          
//         </Row>{' '}
        
//       </Container>{' '}
      
//     </div>
//     </AuthProvider>
//   );
// }

export default App;
