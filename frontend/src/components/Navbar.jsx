// https://react-bootstrap.netlify.app/docs/components/navbar/

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import RBNavbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Container from 'react-bootstrap/Container';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  ButtonDropdown,
  ButtonLanguage,
  Button,
  Translate,
} from './index.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';

const Navbar = ({
  translate = true,
  ...rest
}) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();                                             // { id: 1, mailbox: "admin@dms-gui.com", email: "admin@dms-gui.com", username: "admin", isAdmin: 1, isActive: 1, isAccount: 0, roles: "[]" }
  const [isDEMO] = useLocalStorage("isDEMO", false);
  const [containerName, setContainerName] = useLocalStorage("containerName", ''); // "dms"
  const [mailservers] = useLocalStorage("mailservers", []);                       // [{ value: "dms", plugin: "mailserver", schema: "dms", scope: "dms-gui"}, ..]

  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000 * 60); // Refresh every minute

    // Initial calculation
    setTimeLeft(calculateTimeLeft());
    return () => clearInterval(timer); // Cleanup on unmount
  }, []);

  
  const formatTime = (time) => String(time).padStart(2, '0');
  const calculateTimeLeft = () => {
    const now = new Date();
    const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 6, 7, 0); // Next full hour:6m:7s
    const difference = nextHour.getTime() - now.getTime();

    let remainingTime = {};

    if (difference > 0) {
      remainingTime = {
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    } else {
      remainingTime = { minutes: 0, seconds: 0 };
    }
    return remainingTime;
  };


  const handleLogout = () => {
    logout();
  };


  const profileItems = [
    { id: 1, title: "logins.profileLink", icon: "person-bounding-box",  onClick: () => navigate("/profile") },
    { id: 2, title: "logins.logout",      icon: "box-arrow-right",      onClick: () => handleLogout() },
  ];

              // size="sm"
  return (
    <RBNavbar bg="dark" variant="dark" expand="lg">
      <Container fluid>
        {mailservers.length > 1 ? (
          <div className="d-flex align-items-center me-3">
            <i className="bi bi-envelope-fill text-white me-2"></i>
            <ButtonDropdown
              variant="dark"
              text={containerName}
              items={mailservers.map((mailserver, index) => ({
                id: index,
                title: mailserver.value,
                onClick: () => setContainerName(mailserver.value)
              }))}
            />
          </div>
        ) : (
          <RBNavbar.Brand as={Link} to="/">
            <i className="bi bi-envelope-fill me-2"></i>
            {Translate( isDEMO ? 'navbar.titleDemo' : 'navbar.titleMailserver', true, {mailserver:containerName} )}{' '}
          </RBNavbar.Brand>
        )}
        {isDEMO && 
          <Button
            variant="primary"
            icon="download"
            text="navbar.downloadMe"
            href={t('common.DMS_GUIrepo')}
            target="_blank"
            rel="noopener noreferrer"
          />
        }
        <RBNavbar.Toggle aria-controls="navbarNav" />
        <RBNavbar.Collapse id="navbarNav">
          <Nav className="ms-auto align-items-center">

            {isDEMO && (
              <Nav.Link>
                {t('navbar.rebootIn')} {formatTime(timeLeft.minutes)} mn
              </Nav.Link>
            )}

            {user && 
            <ButtonDropdown
              variant="secondary"
              icon={user?.isAdmin ? "person-circle": "person-fill"}
              text={user?.username}
              items={profileItems}
              size="sm"
              className="me-2"
            />
            }
            
            <Nav.Link
              href={t('common.dmsUrl')}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('navbar.documentation')}
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
