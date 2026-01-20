
// src/components/Footer.jsx
import React, { useEffect, useState } from 'react';
import '../styles/EdFooter.css';
import edLogo from '../assets/edLogo.png';

const Footer = () => {
  const [showToTop, setShowToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowToTop(window.scrollY > 280);
    window.addEventListener('scroll', onScroll);

    // Initialize Bootstrap tooltips if the bundle is present
    if (window.bootstrap?.Tooltip) {
      const tooltipTriggerList = Array.from(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
      );
      tooltipTriggerList.forEach((el) => new window.bootstrap.Tooltip(el));
    }

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSubscribe = (e) => {
    e.preventDefault();
    const email = e.target.elements['newsletter-email']?.value;
    if (email) {
      // Hook this up to communicationService later
      alert(`Thanks for subscribing, ${email}! 🎉`);
      e.target.reset();
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="footer position-relative text-light pt-0">
      {/* Decorative wave divider */}
      {/* <div className="footer-wave" aria-hidden="true">
        <svg
          className="w-100 d-block"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          focusable="false"
        >
          <path
            d="M0,64L60,69.3C120,75,240,85,360,96C480,107,600,117,720,112C840,107,960,85,1080,80C1200,75,1320,85,1380,90L1440,96L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
            className="footer-wave-path"
          />
        </svg>
      </div> */}

      <div className="bg-accent-2">
        <div className="container py-5 py-md-6">
          <div className="row g-4 align-items-start">
            {/* Brand + tagline */}
            <div className="col-12 col-md-6 col-lg-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="logo-blob" aria-hidden="true">
                  {/* <span className="logo-dot" /> */}
                  <a href='/'>
                    <img
                      src={edLogo} // Replace with actual logo path
                      alt="EdStream Logo"
                      className="footer-logo"
                    />
                  </a>
                </div>
                <h5 className="m-0 fw-bold">EdStream</h5>
              </div>
              <p className="opacity-75 mb-4">
                A focused learning flow—courses, assignments, quizzes, and community—all in one stream.
              </p>

              {/* Socials */}
              <div className="d-flex gap-3">
                <a
                  href="https://twitter.com/"
                  className="social-icon-fo"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="EdStream on X (Twitter)"
                >
                  {/* X (Twitter) */}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M18.244 3H21l-6.545 7.49L22 21h-6.778l-4.35-5.256L5.9 21H3.143l6.97-7.978L2 3h6.889l3.997 4.831L18.244 3Zm-1.188 16.2h1.873L7.036 4.798H5.08L17.056 19.2Z"
                      fill="currentColor"
                    />
                  </svg>
                </a>

                <a
                  href="https://www.linkedin.com/"
                  className="social-icon-fo"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="EdStream on LinkedIn"
                >
                  {/* LinkedIn */}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.5 8h4V23h-4V8Zm7.5 0h3.84v2.05h.05c.54-1.03 1.86-2.12 3.83-2.12C20.42 7.93 23 10.3 23 15v8h-4v-7.1c0-1.69-.03-3.86-2.35-3.86-2.35 0-2.71 1.83-2.71 3.73V23h-4V8Z"
                      fill="currentColor"
                    />
                  </svg>
                </a>

                <a
                  href="https://github.com/"
                  className="social-icon-fo"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="EdStream on GitHub"
                >
                  {/* GitHub */}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.61-4.04-1.61-.55-1.4-1.34-1.77-1.34-1.77-1.1-.76.09-.74.09-.74 1.22.09 1.86 1.25 1.86 1.25 1.08 1.85 2.84 1.31 3.53 1 .11-.78.42-1.32.76-1.62-2.67-.31-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.25-3.22-.13-.31-.54-1.56.12-3.26 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4 1.02 0 2.04.13 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.7.25 2.95.12 3.26.78.84 1.25 1.91 1.25 3.22 0 4.61-2.8 5.61-5.47 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.69.82.58A12 12 0 0 0 12 .5Z"
                      fill="currentColor"
                    />
                  </svg>
                </a>

                <a
                  href="https://www.youtube.com/"
                  className="social-icon-fo"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="EdStream on YouTube"
                >
                  {/* YouTube */}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M23.5 6.2s-.23-1.6-.9-2.3c-.86-.9-1.83-.9-2.27-.95C17.3 2.6 12 2.6 12 2.6s-5.3 0-8.33.35c-.44.05-1.41.05-2.27.96-.67.7-.9 2.28-.9 2.28S0 8.1 0 10v2c0 1.9.2 3.8.2 3.8s.22 1.58.9 2.28c.86.9 1.99.87 2.5.97 1.8.18 7.9.35 8.4.35.5 0 6.6-.02 8.4-.35.5-.1 1.63-.07 2.5-.97.67-.7.9-2.28.9-2.28S24 13.9 24 12V10c0-1.9-.5-3.8-.5-3.8ZM9.6 14.9V7.1l6.4 3.9-6.4 3.9Z"
                      fill="currentColor"
                    />
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick links */}
            <div className="col-6 col-md-3 col-lg-2">
              <h6 className="fw-semibold text-uppercase mb-3 letter-1">Explore</h6>
              <ul className="list-unstyled m-0 footer-links">
                <li><a className="link-smooth" href="/courses">Courses</a></li>
                <li><a className="link-smooth" href="/assignments">Assignments</a></li>
                <li><a className="link-smooth" href="/quizzes">Quizzes</a></li>
                <li><a className="link-smooth" href="/forum">Forum</a></li>
              </ul>
            </div>

            <div className="col-6 col-md-3 col-lg-2">
              <h6 className="fw-semibold text-uppercase mb-3 letter-1">Resources</h6>
              <ul className="list-unstyled m-0 footer-links">
                <li><a className="link-smooth" href="/help">Help Center</a></li>
                <li><a className="link-smooth" href="/guides">Guides</a></li>
                <li><a className="link-smooth" href="/status">Status</a></li>
                <li><a className="link-smooth" href="/privacy">Privacy</a></li>
              </ul>
            </div>

            {/* Contact + Newsletter */}
            <div className="col-12 col-md-12 col-lg-4">
              <h6 className="fw-semibold text-uppercase mb-3 letter-1">Stay in the loop</h6>
              <p className="opacity-75">
                Subscribe for course drops, challenge reminders, and product updates.
              </p>

              {/* Smaller email + button per your request */}
              <form className="newsletter row g-2" onSubmit={handleSubscribe} noValidate>
                <div className="col-sm-8">
                  <div className="form-floating">
                    <input
                      type="email"
                      id="newsletter-email"
                      name="newsletter-email"
                      className="form-control form-control-sm newsletter-input newsletter-input-small"
                      placeholder="name@example.com"
                      required
                    />
                    <label htmlFor="newsletter-email">Email address</label>
                  </div>
                </div>
                <div className="col-sm-4 d-grid">
                  
<button
  type="submit"
  className="btn btn-dark btn-sm newsletter-btn-small"
>
  Subscribe
</button>

                </div>
              </form>

              <div className="mt-3 small">
                <span className="me-3 d-inline-flex align-items-center gap-1">
                  <span className="bullet" />
                  <a className="link-smooth" href="mailto:support@edstream.app">
                    support@edstream.app
                  </a>
                </span>
                <span className="d-inline-flex align-items-center gap-1">
                  <span className="bullet" />
                  <a className="link-smooth" href="tel:+11234567890">
                    +1 (123) 456‑7890
                  </a>
                </span>
              </div>
            </div>
          </div>

          <hr className="footer-hr my-4" />

          <div className="d-flex flex-column flex-md-row gap-2 justify-content-between align-items-center">
            <div className="small opacity-75">
              © {new Date().getFullYear()} EdStream. All rights reserved.
            </div>

            {/* Legal nav — white default, black on hover */}
            <ul className="nav small">
              <li className="nav-item">
                <a className="nav-link px-2 link-smooth" href="/terms">Terms</a>
              </li>
              <li className="nav-item">
                <a className="nav-link px-2 link-smooth" href="/privacy">Privacy</a>
              </li>
              <li className="nav-item">
                <a className="nav-link px-2 link-smooth" href="/cookies">Cookies</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Back to top floating button */}
      <button
        type="button"
        className={`to-top btn btn-dark shadow-lg ${showToTop ? 'show' : ''}`}
        aria-label="Back to top"
        onClick={scrollToTop}
      >
        ↑
      </button>
    </footer>
  );
};

export default Footer;
``
