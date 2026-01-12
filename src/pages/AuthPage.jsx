
// src/pages/AuthPage.jsx
import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/auth.css';

import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import { addUser, findUser } from '../utils/userStorage';

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'

  // ---- LOGIN STATE ----
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [loginErrors, setLoginErrors] = useState({});
  const [loginStatus, setLoginStatus] = useState(null); // { type: 'success' | 'error', message: string }

  // ---- REGISTER STATE ----
  const [registerData, setRegisterData] = useState({
    role: '', // 'instructor' | 'learner'
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    dob: '',
    gender: '', // 'male' | 'female' | 'other'
    // instructor-only
    experience: '',
    skills: [],
    currentSkill: '',
    // learner-only
    domainInterests: [],
    currentInterest: '',
    occupation: '', // 'student' | 'working'
  });
  const [registerErrors, setRegisterErrors] = useState({});
  const [registerStatus, setRegisterStatus] = useState(null); // { type: 'success' | 'error', message: string }

  // ---- VALIDATION HELPERS ----
  const isEmailValid = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

  const isStrongPassword = (password) =>
    /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(String(password || ''));

  const validateLogin = (data) => {
    const errs = {};
    if (!data.email.trim()) errs.email = 'Email is required.';
    else if (!isEmailValid(data.email)) errs.email = 'Enter a valid email.';
    if (!data.password.trim()) errs.password = 'Password is required.';
    return errs;
  };

  const validateRegister = (data) => {
    const errs = {};
    if (!data.role) errs.role = 'Please select a role.';
    if (!data.name.trim()) errs.name = 'Name is required.';
    if (!data.email.trim()) errs.email = 'Email is required.';
    else if (!isEmailValid(data.email)) errs.email = 'Enter a valid email.';
    if (!data.password) errs.password = 'Password is required.';
    else if (!isStrongPassword(data.password))
      errs.password = 'Password must be at least 8 chars, include an uppercase and a number.';
    if (!data.confirmPassword) errs.confirmPassword = 'Confirm your password.';
    else if (data.password !== data.confirmPassword)
      errs.confirmPassword = 'Passwords do not match.';
    if (!data.gender) errs.gender = 'Please select gender.';
    if (data.role === 'instructor') {
      if (data.experience === '' || data.experience === null)
        errs.experience = 'Experience is required.';
      else if (isNaN(Number(data.experience)) || Number(data.experience) < 0)
        errs.experience = 'Experience must be a non-negative number.';
    }
    if (data.role === 'learner') {
      if (!data.occupation) errs.occupation = 'Choose student or working professional.';
      if (!data.domainInterests || data.domainInterests.length === 0)
        errs.domainInterests = 'Please add at least one domain interest.';
    }
    return errs;
  };

  // ---- SUBMIT HANDLERS ----
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const errs = validateLogin(loginData);
    setLoginErrors(errs);
    setLoginStatus(null); // reset

    if (Object.keys(errs).length === 0) {
      const user = findUser(loginData.email);
      if (!user) {
        setLoginStatus({ type: 'error', message: 'No account found with this email.' });
        setActiveTab('login');
        return;
      }
      if (user.password !== loginData.password) {
        setLoginStatus({ type: 'error', message: 'Invalid password. Please try again.' });
        setActiveTab('login');
        return;
      }
      setLoginStatus({ type: 'success', message: 'Login successful! Welcome back to EdStream.' });
      setActiveTab('login'); // keep on login panel to show success
    } else {
      setActiveTab('login');
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    const errs = validateRegister(registerData);
    setRegisterErrors(errs);
    setRegisterStatus(null); // reset

    if (Object.keys(errs).length === 0) {
      const { ok, error } = addUser(registerData);
      if (!ok) {
        setRegisterStatus({ type: 'error', message: error || 'Registration failed. Try again.' });
        setActiveTab('register');
        return;
      }
      setRegisterStatus({ type: 'success', message: 'Registration successful! You can now log in.' });
      // Optional: clear sensitive fields minimally
      setRegisterData((prev) => ({
        ...prev,
        password: '',
        confirmPassword: '',
        currentSkill: '',
        currentInterest: '',
      }));
      setActiveTab('register'); // keep on register panel to show success
    } else {
      setActiveTab('register');
    }
  };

  return (
    <div className="auth-wrapper d-flex align-items-center justify-content-center">
      <div className="auth-card container">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10">
            <div className="glass-panel p-4 p-md-5 shadow-lg">

              {/* Toggle Header */}
              <div className="toggle-header d-flex justify-content-center mb-4">
                <div className="toggle-pill">
                  <button
                    className={`pill-btn ${activeTab === 'login' ? 'active' : ''}`}
                    onClick={() => setActiveTab('login')}
                    type="button"
                    aria-label="Show Login"
                  >
                    Login
                  </button>
                  <button
                    className={`pill-btn ${activeTab === 'register' ? 'active' : ''}`}
                    onClick={() => setActiveTab('register')}
                    type="button"
                    aria-label="Show Register"
                  >
                    Register
                  </button>
                </div>
              </div>

              {/* Panels */}
              <div className="position-relative overflow-hidden">
                {/* LOGIN */}
                <div className={`auth-panel ${activeTab === 'login' ? 'show' : 'hide'}`}>
                  <LoginPage
                    data={loginData}
                    setData={setLoginData}
                    errors={loginErrors}
                    status={loginStatus}
                    onSubmit={handleLoginSubmit}
                    onSwitchToRegister={() => setActiveTab('register')}
                  />
                </div>

                {/* REGISTER */}
                <div className={`auth-panel ${activeTab === 'register' ? 'show' : 'hide'}`}>
                  <RegisterPage
                    data={registerData}
                    setData={setRegisterData}
                    errors={registerErrors}
                    status={registerStatus}
                    onSubmit={handleRegisterSubmit}
                    onSwitchToLogin={() => setActiveTab('login')}
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="mt-4 text-center small text-muted">
          © {new Date().getFullYear()} EdStream • Learn. Teach. Grow.
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
