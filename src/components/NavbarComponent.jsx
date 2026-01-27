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

  // --- NEW: central role→home resolver
  const getHomePath = useCallback((user) => {
    if (!user) return '/'; // fallback for guests
    switch (user.role) {
      case 'instructor':
        return '/mentor-home';
      case 'learner':
        return '/student-home';
      default:
        return '/';
    }
  }, []);

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

  // --- NEW: logo click handler
  const goToRoleHome = useCallback(() => {
    const user = getCurrentUser();
    navigate(getHomePath(user), { replace: true });
  }, [getHomePath, navigate]);

  return (
    <>
      {/* Left Section: Logo + App Name */}
      <Navbar bg="light" expand="lg" className="px-3">
        <Navbar.Brand
          onClick={goToRoleHome}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goToRoleHome()}
          className="d-flex align-items-center gap-2"
          aria-label="Go to your homepage"
        >
          <Image src={edLogo} alt="EdStream logo" height={32} />
          <span className="fw-semibold">EdStream</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          {/* Explore Dropdown */}
          <Nav className="me-auto">
            <NavDropdown title="Explore" id="explore-dropdown">
              <NavDropdown.Item onClick={() => navigate('/explore/science')}>Science</NavDropdown.Item>
              <NavDropdown.Item onClick={() => navigate('/explore/technology')}>Technology</NavDropdown.Item>
              <NavDropdown.Item onClick={() => navigate('/explore/engineering')}>Engineering</NavDropdown.Item>
              <NavDropdown.Item onClick={() => navigate('/explore/mathematics')}>Mathematics</NavDropdown.Item>
            </NavDropdown>

            {/* My Learning Dropdown */}
            <NavDropdown title="My Learning" id="mylearning-dropdown">
              <NavDropdown.Item onClick={() => navigate('/courses/react-basics')}>React Basics</NavDropdown.Item>
              <NavDropdown.Item onClick={() => navigate('/courses/data-structures')}>Data Structures</NavDropdown.Item>
              <NavDropdown.Item onClick={() => navigate('/courses/ai-fundamentals')}>AI Fundamentals</NavDropdown.Item>
            </NavDropdown>
          </Nav>

          {/* Search Box */}
          <Form className="d-flex me-3" role="search" onSubmit={(e) => e.preventDefault()}>
            <FormControl type="search" placeholder="Search" aria-label="Search" />
            <Button variant="outline-primary" className="ms-2">Search</Button>
          </Form>

          {/* Right Section: Auth-dependent */}
          {auth.isAuthed ? (
            <Nav>
              <NavDropdown
                align="end"
                title={
                  <span className="d-inline-flex align-items-center gap-2">
                    <Image src={userLogo} alt="" height={24} />
                    {auth.user?.name ?? 'Profile'}
                  </span>
                }
                id="profile-dropdown"
              >
                <NavDropdown.Item onClick={() => navigate('/settings')}>⚙️ Settings</NavDropdown.Item>
                <NavDropdown.Item onClick={() => navigate('/help')}>❓ Help</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={editProfile}>✏️ Edit Profile</NavDropdown.Item>
                <NavDropdown.Item onClick={handleLogout}>🚪 Logout</NavDropdown.Item>
              </NavDropdown>
            </Nav>
          ) : (
            <Button variant="primary" onClick={goToAuth}>Login/Register</Button>
          )}
        </Navbar.Collapse>
      </Navbar>
    </>
  );
};

export default NavbarComponent;