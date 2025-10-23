import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
// import { useTranslation } from 'react-i18next';
import { Nav } from 'react-bootstrap';

import {
  Button,
  Translate,
} from './';

// https://getbootstrap.com/docs/5.0/examples/sidebars/
// https://stackoverflow.com/questions/60482018/make-a-sidebar-from-react-bootstrap
// https://coreui.io/react/docs/components/sidebar/bootstrap/

const LeftSidebar = () => {
  // const { t } = useTranslation();
  
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  // const [isDropdownActive, setDropdownActive] = useState("false");  // we don't use it yet
  
  
  // Style function to apply styles directly based on isActive, a reserved word for bootstrap active links
  // const getNavLinkStyle = ({ isActive }) => ({
    // color: isActive ? '#fff' : '#ced4da',
    // backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    // textDecoration: 'none',
    // display: 'block',
    // padding: '10px 15px',
    // transition: 'all 0.3s',
  // });
  const getNavLinkStyle = ({ isActive }) => ({
    color: isActive ? '#fff' : '#ced4da',
    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
  });


  // https://arkumari2000.medium.com/responsive-partially-opened-sidebar-in-ractjs-using-bootstrap-7b1ef5c7ea60

  return (
    <>
    <Nav id="leftsidebar" className={isSidebarCollapsed ? "flex-column leftsidebar collapsed" : "flex-column leftsidebar"}>
      <Nav.Link as={NavLink} to="/dashboard" style={getNavLinkStyle}>
        <i className="bi bi-speedometer2 me-2"></i>
        <span> {Translate('sidebar.dashboard')}</span>
      </Nav.Link>
      
      <Nav.Link as={NavLink} to="/accounts" style={getNavLinkStyle}>
        <i className="bi bi-person-circle me-2"></i>
        <span> {Translate('sidebar.emailAccounts')}</span>
      </Nav.Link>
      
      <Nav.Link as={NavLink} to="/aliases" style={getNavLinkStyle}>
        <i className="bi bi-arrow-left-right me-2"></i>
        <span> {Translate('sidebar.aliases')}</span>
      </Nav.Link>
      
      <Nav.Link as={NavLink} to="/settings" style={getNavLinkStyle}>
        <i className="bi bi-gear-fill me-2"></i>
        <span> {Translate('sidebar.settings')}</span>
      </Nav.Link>
    </Nav>

    <div className="leftsidebar-collapse-footer">
      <Button
        id="leftsidebar-collapse-btn"
        variant="outline-secondary"
        size="lg"
        icon="list"
        title={"common.collapse"}
        onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
        className="leftsidebar-collapse-btn"
      />
    </div>
    </>

  );
};

export default LeftSidebar;

            // <Nav.Link as={NavLink} to="/" style={getNavLinkStyle} end>
              // <i className="bi bi-speedometer2 me-2"></i> {t('sidebar.dashboard')}
            // </Nav.Link>


// https://arkumari2000.medium.com/responsive-partially-opened-sidebar-in-ractjs-using-bootstrap-7b1ef5c7ea60
          // <div className="leftsidebar-header">
            // <img
              // src={image}
              // className="rounded-circle usr-image"
              // height={isNotActive ? "20" : "70"}
              // width={isNotActive ? "20" : "70"}
            // ></img>
            // <h3>User Name</h3>
          // </div>
          
          // <ul className="list-unstyled components">
            // <li className="list-item">
              // <i className="fas fa-sitemap icon-color"></i>
              // <Link to="/organization-profile">Organization</Link>
            // </li>

              // <ul
                // className={
                  // isDropdownActive ? "list-unstyled  dropdown-collapsed" : "list-unstyled"
                // }
                // id="homeSubmenu"
              // >
                // <li className="dropdown-item">
                  // <Link to="/portfolio">Portfolio</Link>
                  // <a href="#">Portfolio</a>
                // </li>
                // <li className="dropdown-item">
                  // <Link to="/personal-details">Personal Details</Link>
                // </li>
                // <li className="dropdown-item">
                  // <Link to="/additional-info">Additional Info</Link>
                // </li>
                // <li className="dropdown-item">
                  // <Link to="/personal-background">Personal Background</Link>
                // </li>
              // </ul>