import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
// import { useTranslation } from 'react-i18next';
import { Nav } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import { useLocalStorage } from '../hooks/useLocalStorage';

import Button from './Button';
import Translate from './Translate';

// https://getbootstrap.com/docs/5.0/examples/sidebars/
// https://stackoverflow.com/questions/60482018/make-a-sidebar-from-react-bootstrap
// https://coreui.io/react/docs/components/sidebar/bootstrap/

const LeftSidebar = () => {
  // const { t } = useTranslation();
  const { user } = useAuth();
  const [containerName] = useLocalStorage("containerName", '');
  
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  // const [isDropdownActive, setDropdownActive] = useState("false");  // we don't use it yet
  const showMailMenus = Boolean(containerName);
  
  const getNavLinkStyle = ({ isActive }) => ({
    color: isActive ? '#fff' : '#ced4da',
    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
  });


  // https://arkumari2000.medium.com/responsive-partially-opened-sidebar-in-ractjs-using-bootstrap-7b1ef5c7ea60

  return (
    <div className={isSidebarCollapsed ? "sidebar-flex-wrapper is-collapsed-wrapper" : "sidebar-flex-wrapper"}>
      <Nav id="leftsidebar" className="flex-column leftsidebar">
        {user && (<>
          {(showMailMenus) && (<>
            <Nav.Link as={NavLink} to="/dashboard" style={getNavLinkStyle}>
              <i className="bi bi-speedometer2 me-2"></i>
              <span> {Translate('dashboard.sidebar')}</span>
            </Nav.Link>

            {(user.isAccount == 0) && (<>
              <Nav.Link as={NavLink} to="/accounts" style={getNavLinkStyle}>
                <i className="bi bi-inboxes-fill me-2"></i>
                <span> {Translate('accounts.sidebar')}</span>
              </Nav.Link>
            </>)}
        
            <Nav.Link as={NavLink} to="/aliases" style={getNavLinkStyle}>
              <i className="bi bi-arrow-left-right me-2"></i>
              <span> {Translate('aliases.sidebar')}</span>
            </Nav.Link>
          </>)}

          {(user.isAdmin == 1) && (<>
            <Nav.Link as={NavLink} to="/logins" style={getNavLinkStyle}>
              <i className="bi bi-person-lock me-2"></i>
              <span> {Translate('logins.sidebar')}</span>
            </Nav.Link>

            <Nav.Link as={NavLink} to="/settings" style={getNavLinkStyle}>
              <i className="bi bi-gear-fill me-2"></i>
              <span> {Translate('settings.sidebar')}</span>
            </Nav.Link>
          </>)}
        </>)}
      </Nav>

      <div className="leftsidebar-collapse-footer">
        <Button
          id="leftsidebar-collapse-btn"
          variant="secondary"
          size="lg"
          icon={(isSidebarCollapsed) ? "chevron-bar-right" : "chevron-bar-left"}
          title={"common.collapse"}
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          className="leftsidebar-collapse-btn rounded-0"
        />
      </div>

    </div>
  );
};

export default LeftSidebar;

  // return (
  //   <div className="sidebar-flex-wrapper">
  //     <Nav id="leftsidebar" className={isSidebarCollapsed ? "flex-column leftsidebar collapsed" : "flex-column leftsidebar"}>
  //       {user && (<>
  //         {(showMailMenus) && (<>
  //           <Nav.Link as={NavLink} to="/dashboard" style={getNavLinkStyle}>
  //             <i className="bi bi-speedometer2 me-2"></i>
  //             <span> {Translate('dashboard.sidebar')}</span>
  //           </Nav.Link>

  //           {(user.isAccount == 0) && (<>
  //             <Nav.Link as={NavLink} to="/accounts" style={getNavLinkStyle}>
  //               <i className="bi bi-inboxes-fill me-2"></i>
  //               <span> {Translate('accounts.sidebar')}</span>
  //             </Nav.Link>
  //           </>)}
        
  //           <Nav.Link as={NavLink} to="/aliases" style={getNavLinkStyle}>
  //             <i className="bi bi-arrow-left-right me-2"></i>
  //             <span> {Translate('aliases.sidebar')}</span>
  //           </Nav.Link>
  //         </>)}

  //         {(user.isAdmin == 1) && (<>
  //           <Nav.Link as={NavLink} to="/logins" style={getNavLinkStyle}>
  //             <i className="bi bi-person-lock me-2"></i>
  //             <span> {Translate('logins.sidebar')}</span>
  //           </Nav.Link>

  //           <Nav.Link as={NavLink} to="/settings" style={getNavLinkStyle}>
  //             <i className="bi bi-gear-fill me-2"></i>
  //             <span> {Translate('settings.sidebar')}</span>
  //           </Nav.Link>
  //         </>)}
  //       </>)}
  //     </Nav>

  //     <div className="leftsidebar-collapse-footer">
  //       <Button
  //         id="leftsidebar-collapse-btn"
  //         variant="secondary w-100"
  //         size="lg"
  //         icon={(isSidebarCollapsed) ? "chevron-bar-right" : "chevron-bar-right"}
  //         title={"common.collapse"}
  //         onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
  //         className="leftsidebar-collapse-btn"
  //       />
  //     </div>
  // 
  //   </div>
  // );
