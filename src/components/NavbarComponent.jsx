
// src/components/NavbarComponent.jsx
import React, { useCallback, useEffect, useState } from 'react';
import edLogo from '../assets/edLogo.png';
import userLogo from '../assets/userLogo.png';
import {
  Navbar,
  Nav,
  NavDropdown,
  Form,
  FormControl,
  Button,
  Image,
} from 'react-bootstrap';
import '../styles/EdNavbar.css';
import { destroySession, getCurrentUser, isAuthenticated } from '../utils/session';
import { useNavigate } from 'react-router-dom';

const NavbarComponent = () => {
  const [auth, setAuth] = useState({ isAuthed: false, user: null });
  const navigate = useNavigate();

  // Initialize auth state from session.js
  useEffect(() => {
    setAuth({ isAuthed: isAuthenticated(), user: getCurrentUser() });
  }, []);

  // Keep multiple tabs/windows in sync (e.g., logout in one tab)
  // Also respond instantly in the same tab via 'session-changed'
  useEffect(() => {
    const onStorage = () => {
      setAuth({ isAuthed: isAuthenticated(), user: getCurrentUser() });
    };
    const onSessionChanged = () => {
      setAuth({ isAuthed: isAuthenticated(), user: getCurrentUser() });
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('session-changed', onSessionChanged);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('session-changed', onSessionChanged);
    };
  }, []);

  // Single place to handle logout
  const handleLogout = useCallback(() => {
    // 1) clear session (both sessionStorage & localStorage via destroySession)
    destroySession();
    // 2) update UI state
    setAuth({ isAuthed: false, user: null });
    // 3) navigate to home (change to '/' if that's your home route)
    navigate('/home', { replace: true });
  }, [navigate]);

  const editProfile = useCallback(() => navigate('/edit-profile'), [navigate]);
  const goToAuth = useCallback(() => navigate('/auth'), [navigate]);

  return (
    <Navbar expand="lg" className="ed-navbar">
      {/* Left Section: Logo + App Name */}
      <Navbar.Brand href="/" className="d-flex align-items-center">
        <Image src={edLogo} alt="EdStream" className="navbar-logo" />
        <span className="navbar-title">EdStream</span>
      </Navbar.Brand>

      <Navbar.Toggle aria-controls="ed-navbar-nav" />
      <Navbar.Collapse id="ed-navbar-nav">
        {/* Explore Dropdown */}
        <Nav className="me-auto">
          <NavDropdown title="Explore" id="explore-dropdown">
            <NavDropdown.Item>Science</NavDropdown.Item>
            <NavDropdown.Item>Technology</NavDropdown.Item>
            <NavDropdown.Item>Engineering</NavDropdown.Item>
            <NavDropdown.Item>Mathematics</NavDropdown.Item>
          </NavDropdown>

          {/* My Learning Dropdown */}
          <NavDropdown title="My Learning" id="learning-dropdown">
            <NavDropdown.Item>React Basics</NavDropdown.Item>
            <NavDropdown.Item>Data Structures</NavDropdown.Item>
            <NavDropdown.Item>AI Fundamentals</NavDropdown.Item>
          </NavDropdown>
        </Nav>

        {/* Search Box */}
        <Form className="d-flex nav-search">
          <FormControl type="search" placeholder="Search" className="me-2" aria-label="Search" />
          <Button variant="outline-success">Search</Button>
        </Form>

        {/* Right Section: Auth-dependent */}
        <Nav className="ms-3">
          {auth.isAuthed ? (
            <NavDropdown
              id="profile-dropdown"
              align="end"
              className="profile-dropdown"
              title={
                <span className="d-inline-flex align-items-center">
                  <Image
                    src={userLogo}
                    roundedCircle
                    className="profile-avatar"
                    alt="Profile"
                  />
                  <span className="ms-2 d-none d-sm-inline">
                    {auth.user?.name || 'Profile'}
                  </span>
                </span>
              }
            >
              <NavDropdown.Item onClick={() => navigate('/settings')}>
                ⚙️ Settings
              </NavDropdown.Item>
              <NavDropdown.Item onClick={() => navigate('/help')}>
                ❓ Help
              </NavDropdown.Item>
              <NavDropdown.Item onClick={editProfile}>
                ✏️ Edit Profile
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>
                🚪 Logout
              </NavDropdown.Item>
            </NavDropdown>
          ) : (
            <Button variant="primary" onClick={goToAuth}>
              Login/Register
            </Button>
          )}
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default NavbarComponent;
