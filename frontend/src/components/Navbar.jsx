// https://react-bootstrap.netlify.app/docs/components/navbar/

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import RBNavbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Container from 'react-bootstrap/Container';
// import { useTranslation } from 'react-i18next';

import {
  ButtonDropdown,
  ButtonLanguage,
  Translate,
} from './index.jsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navbar = ({
  translate = true,
  ...rest
}) => {
  // const { t } = useTranslation();
  const { logout } = useAuth();
  const { user } = useAuth();
  
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
  };

  // console.debug('ddebug user', user);
  // { email: "admin@dms-gui.com", username: "admin", isAdmin: 1, isActive: 1, isAccount: 0, roles: "[]" }

  const profileItems = [
    { id: 1, title: "logins.profileLink", icon: "person-bounding-box",  onClick: () => navigate("/profile") },
    { id: 2, title: "logins.logout",      icon: "box-arrow-right",      onClick: () => handleLogout() },
  ];

  return (
    <RBNavbar bg="dark" variant="dark" expand="lg">
      <Container fluid>
        <RBNavbar.Brand as={Link} to="/">
          <i className="bi bi-envelope-fill me-2"></i>
          {Translate('app.title')}
        </RBNavbar.Brand>
        <RBNavbar.Toggle aria-controls="navbarNav" />
        <RBNavbar.Collapse id="navbarNav">
          <Nav className="ms-auto align-items-center">

          {user && 
            <ButtonDropdown
              variant="secondary"
              icon={user?.isAdmin ? "person-circle": "person-fill"}
              text={user?.username}
              items={profileItems}
              size="sm"
            />
          }
            
            <Nav.Link
              href="https://docker-mailserver.github.io/docker-mailserver/latest/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {Translate('navbar.documentation')}
            </Nav.Link>
            
            <div className="nav-item mx-2">
              <ButtonLanguage />
            </div>
            
          </Nav>
        </RBNavbar.Collapse>
      </Container>
    </RBNavbar>
  );
};

export default Navbar;
