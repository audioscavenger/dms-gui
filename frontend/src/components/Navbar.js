import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import RBNavbar from 'react-bootstrap/Navbar'; // Import react-bootstrap Navbar
import Nav from 'react-bootstrap/Nav'; // Import react-bootstrap Nav
import Container from 'react-bootstrap/Container'; // Import react-bootstrap Container

const Navbar = () => {
  const { t } = useTranslation();

  return (
    <RBNavbar bg="dark" variant="dark" expand="lg">
      <Container fluid>
        <RBNavbar.Brand as={Link} to="/">
          <i className="bi bi-envelope-fill me-2"></i>
          {t('app.title')}
        </RBNavbar.Brand>
        <RBNavbar.Toggle aria-controls="navbarNav" />
        <RBNavbar.Collapse id="navbarNav">
          <Nav className="ms-auto align-items-center">
            <Nav.Link
              href="https://docker-mailserver.github.io/docker-mailserver/latest/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('navbar.documentation')}
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
