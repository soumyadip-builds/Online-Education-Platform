// src/components/Navbar.jsx
import React from 'react';
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
const NavbarComponent = () => {
  return (
    <Navbar expand="lg" className="ed-navbar">
      {/* Left Section: Logo + App Name */}
      <Navbar.Brand href="/" className="d-flex align-items-center">
        <img
          src={edLogo} // Replace with actual logo path
          alt="EdStream Logo"
          className="navbar-logo"
        />
        <span className="navbar-title">EdStream</span>
      </Navbar.Brand>
      {/* Explore Dropdown */}
      <Nav className="mx-3">
        <NavDropdown
          title="Explore"
          id="explore-dropdown"
          className="explore-dropdown"
        >
          <NavDropdown.Item href="/courses/domain/science">
            Science
          </NavDropdown.Item>
          <NavDropdown.Item href="/courses/domain/technology">
            Technology
          </NavDropdown.Item>
          <NavDropdown.Item href="/courses/domain/engineering">
            Engineering
          </NavDropdown.Item>
          <NavDropdown.Item href="/courses/domain/mathematics">
            Mathematics
          </NavDropdown.Item>
        </NavDropdown>
      </Nav>
      {/* Search Box */}
      <Form className="d-flex mx-auto navbar-search">
        <FormControl
          type="search"
          placeholder="Search courses, assignments..."
          className="search-input"
        />
        <Button variant="dark" className="search-btn">
          <i className="fas fa-search"></i>
        </Button>
      </Form>

      {/* My Learning Dropdown */}
      <Nav className="mx-3">
        <NavDropdown
          title="My Learning"
          id="mylearning-dropdown"
          className="mylearning-dropdown"
        >
          <NavDropdown.Item href="/courses/enrolled/1">
            React Basics
          </NavDropdown.Item>
          <NavDropdown.Item href="/courses/enrolled/2">
            Data Structures
          </NavDropdown.Item>
          <NavDropdown.Item href="/courses/enrolled/3">
            AI Fundamentals
          </NavDropdown.Item>
        </NavDropdown>
      </Nav>
      {/* Profile Avatar Dropdown */}
      <Nav>
        <NavDropdown
          title={
            <Image src={userLogo} roundedCircle className="profile-avatar" />
          }
          id="profile-dropdown"
          align="end"
          className="profile-dropdown"
        >
          <NavDropdown.Item href="/settings">⚙️ Settings</NavDropdown.Item>
          <NavDropdown.Item href="/help">❓ Help</NavDropdown.Item>
          <NavDropdown.Divider />
          <NavDropdown.Item href="/logout">🚪 Logout</NavDropdown.Item>
        </NavDropdown>
      </Nav>
    </Navbar>
  );
};

export default NavbarComponent;