// https://react-bootstrap.netlify.app/docs/components/navbar/

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import RBNavbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Container from 'react-bootstrap/Container';
import { useNavigate } from 'react-router-dom';
// import { useTranslation } from 'react-i18next';

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
  // const { t } = useTranslation();
  const { logout } = useAuth();
  const { user } = useAuth();
  const [isDEMO] = useLocalStorage("isDEMO");
  
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
          {Translate(isDEMO ? 'app.titleDemo' : 'app.title')}{' '}
        </RBNavbar.Brand>
        {isDEMO && 
          <Button
            variant="primary"
            icon="download"
            text="navbar.downloadMe"
            href="https://hub.docker.com/repository/docker/audioscavenger/dms-gui/general"
            target="_blank"
            rel="noopener noreferrer"
          />
        }
        <RBNavbar.Toggle aria-controls="navbarNav" />
        <RBNavbar.Collapse id="navbarNav">
          <Nav className="ms-auto align-items-center">

            {isDEMO && (
              <Nav.Link>
                {Translate('navbar.rebootIn')} {formatTime(timeLeft.minutes)} mn
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
