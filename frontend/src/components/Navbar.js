// https://react-bootstrap.netlify.app/docs/components/navbar/

import React from 'react';
import { Link } from 'react-router-dom';
// import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import RBNavbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Container from 'react-bootstrap/Container';
import { useAuth } from '../hooks/useAuth';

import {
  Button,
  Translate,
} from './';

const Navbar = ({
  translate = true,
  ...rest
}) => {
  // const { t } = useTranslation();
  
  const { logout } = useAuth();
  const { user } = useAuth();
  
  const handleLogout = () => {
    logout();
  };

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

            {(user) &&
              <Button
              variant="secondary"
              onClick={handleLogout}
              text="logins.logout"
              />
            }
            
            <Nav.Link
              href="https://docker-mailserver.github.io/docker-mailserver/latest/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {Translate('navbar.documentation')}
            </Nav.Link>
            
            {/* LanguageSwitcher might need adjustment depending on its implementation */}
            <div className="nav-item mx-2">
              <LanguageSwitcher />
            </div>
            
          </Nav>
        </RBNavbar.Collapse>
      </Container>
    </RBNavbar>
  );
};

export default Navbar;
