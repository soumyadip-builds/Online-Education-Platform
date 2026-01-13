
// src/pages/RegisterPage.jsx
import React, { useMemo, useState } from 'react';

const RegisterPage = ({ data, setData, errors, status, onSubmit, onSwitchToLogin }) => {
  const [showPasswords, setShowPasswords] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  // ---- Skills (Instructor) ----
  const addSkill = () => {
    const skill = (data.currentSkill || '').trim();
    if (skill) {
      setData((prev) => ({
        ...prev,
        skills: [...prev.skills, skill],
        currentSkill: '',
      }));
    }
  };

  const removeSkill = (idx) => {
    setData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== idx),
    }));
  };

  // ---- Domain Interests (Learner) ----
  const addInterest = () => {
    const interest = (data.currentInterest || '').trim();
    if (interest) {
      setData((prev) => ({
        ...prev,
        domainInterests: [...prev.domainInterests, interest],
        currentInterest: '',
      }));
    }
  };

  const removeInterest = (idx) => {
    setData((prev) => ({
      ...prev,
      domainInterests: prev.domainInterests.filter((_, i) => i !== idx),
    }));
  };

  // ---- Password Strength Calculation ----
  const strength = useMemo(() => {
    const pwd = data.password || '';
    let score = 0;

    const lengthScore = pwd.length >= 12 ? 2 : pwd.length >= 8 ? 1 : 0;
    score += lengthScore;

    const sets =
      (/[a-z]/.test(pwd) ? 1 : 0) +
      (/[A-Z]/.test(pwd) ? 1 : 0) +
      (/\d/.test(pwd) ? 1 : 0) +
      (/[^A-Za-z0-9]/.test(pwd) ? 1 : 0);
    score += sets;

    let level = 1;
    if (score <= 1) level = 1;
    else if (score === 2) level = 2;
    else if (score === 3) level = 3;
    else if (score === 4 || score === 5) level = 4;
    else level = 5;

    const percent = [20, 40, 60, 80, 100][level - 1];
    const label = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][level - 1];
    const cls = `strength-${level}`;
    return { percent, label, cls };
  }, [data.password]);

  return (
    <form className="needs-validation" noValidate onSubmit={onSubmit}>
      <h2 className="section-title mb-3">Create Your Account</h2>
      <p className="mb-3 login-page-text">
        Join EdStream as an <strong>Instructor</strong> or a <strong>Learner</strong>.
      </p>

      {/* Status message */}
      {status && (
        <div className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-danger'} fade show mb-3`}>
          {status.message}
        </div>
      )}

      {/* Role */}
      <div className="mb-3">
        <label className="form-label d-block">Role</label>
        <div className="role-toggle">
          <button
            type="button"
            className={`role-btn ${data.role === 'instructor' ? 'active' : ''}`}
            onClick={() => setData((prev) => ({ ...prev, role: 'instructor' }))}
          >
            Instructor
          </button>
          <button
            type="button"
            className={`role-btn ${data.role === 'learner' ? 'active' : ''}`}
            onClick={() => setData((prev) => ({ ...prev, role: 'learner' }))}
          >
            Learner
          </button>
        </div>
        {errors.role && <div className="invalid-feedback d-block">{errors.role}</div>}
      </div>

      {/* Name */}
      <div className="mb-3">
        <label className="form-label">Name</label>
        <input
          type="text"
          className={`form-control soft-input ${errors.name ? 'is-invalid' : ''}`}
          name="name"
          value={data.name}
          onChange={handleChange}
        />
        {errors.name && <div className="invalid-feedback">{errors.name}</div>}
      </div>

      {/* Email */}
      <div className="mb-3">
        <label className="form-label">Email</label>
        <input
          type="email"
          className={`form-control soft-input ${errors.email ? 'is-invalid' : ''}`}
          name="email"
          value={data.email}
          onChange={handleChange}
        />
        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
      </div>

      {/* Password */}
      <div className="mb-3">
        <div className="d-flex justify-content-between">
          <label className="form-label">Password</label>

          {/* Show Password Toggle */}
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="regShowPasswords"
              checked={showPasswords}
              onChange={() => setShowPasswords((s) => !s)}
            />
            <label className="form-check-label" htmlFor="regShowPasswords">
              Show
            </label>
          </div>
        </div>

        <input
          type={showPasswords ? 'text' : 'password'}
          className={`form-control soft-input ${errors.password ? 'is-invalid' : ''}`}
          name="password"
          value={data.password}
          onChange={handleChange}
        />
        {errors.password && <div className="invalid-feedback">{errors.password}</div>}

        {/* Strength Meter */}
        <div className="progress password-progress mt-2">
          <div
            className={`progress-bar ${strength.cls}`}
            style={{ width: `${strength.percent}%` }}
          />
        </div>
        <small className="login-page-text"><strong>{strength.label}</strong></small>
      </div>

      {/* Confirm Password */}
      <div className="mb-3">
        <label className="form-label">Confirm Password</label>
        <input
          type={showPasswords ? 'text' : 'password'}
          className={`form-control soft-input ${errors.confirmPassword ? 'is-invalid' : ''}`}
          name="confirmPassword"
          value={data.confirmPassword}
          onChange={handleChange}
        />
        {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
      </div>

      {/* DOB */}
      <div className="mb-3">
        <label className="form-label">Date of Birth (optional)</label>
        <input
          type="date"
          className="form-control soft-input"
          name="dob"
          value={data.dob}
          onChange={handleChange}
        />
      </div>

      {/* Gender */}
      <div className="mb-3">
        <label className="form-label">Gender</label>
        <select
          className={`form-select soft-input ${errors.gender ? 'is-invalid' : ''}`}
          name="gender"
          value={data.gender}
          onChange={handleChange}
        >
          <option value="">Select...</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Prefer not to say</option>
        </select>
        {errors.gender && <div className="invalid-feedback">{errors.gender}</div>}
      </div>

      {/* Instructor Section */}
      {data.role === 'instructor' && (
        <>
          <div className="divider-label mt-3 mb-2">Instructor Details</div>

          {/* Experience */}
          <div className="mb-3">
            <label className="form-label">Experience (years)</label>
            <input
              type="number"
              className={`form-control soft-input ${errors.experience ? 'is-invalid' : ''}`}
              name="experience"
              value={data.experience}
              onChange={handleChange}
            />
            {errors.experience && <div className="invalid-feedback">{errors.experience}</div>}
          </div>

          {/* Skills */}
          <div className="mb-3">
            <label className="form-label">Skills (optional)</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control soft-input"
                name="currentSkill"
                value={data.currentSkill}
                onChange={handleChange}
              />
              <button className="btn gradient-btn" type="button" onClick={addSkill}>
                + Add
              </button>
            </div>

            {data.skills.length > 0 && (
              <div className="chips mt-2">
                {data.skills.map((s, idx) => (
                  <span className="chip" key={idx}>
                    {s}
                    <button className="chip-close" onClick={() => removeSkill(idx)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Learner Section */}
      {data.role === 'learner' && (
        <>
          <div className="divider-label mt-3 mb-2">Learner Details</div>

          
            
            
            {/* Occupation */}
            <div className="mb-3">
            <label className="form-label d-block">Occupation</label>

            {/* Left-right row */}
            <div className="occ-row">
                {/* Left: Student */}
                <label className="occ-option" htmlFor="occ-student">
                <input
                    type="radio"
                    id="occ-student"
                    name="occupation"
                    value="student"
                    checked={data.occupation === 'student'}
                    onChange={handleChange}
                />
                <span className="occ-label">Student</span>
                </label>

                {/* Right: Working Professional */}
                <label className="occ-option" htmlFor="occ-working">
                <input
                    type="radio"
                    id="occ-working"
                    name="occupation"
                    value="working"
                    checked={data.occupation === 'working'}
                    onChange={handleChange}
                />
                <span className="occ-label">Working Professional</span>
                </label>
            </div>

            {errors.occupation && (
                <div className="invalid-feedback d-block occ-error">{errors.occupation}</div>
            )}
            </div>


          {/* Domain Interests */}
          <div className="mb-3">
            <label className="form-label">Domain Interests</label>
            <div className="input-group">
              <input
                type="text"
                className={`form-control soft-input ${errors.domainInterests ? 'is-invalid' : ''}`}
                name="currentInterest"
                value={data.currentInterest}
                onChange={handleChange}
              />
              <button className="btn gradient-btn" type="button" onClick={addInterest}>
                + Add
              </button>
            </div>
            {errors.domainInterests && (
              <div className="invalid-feedback d-block">{errors.domainInterests}</div>
            )}

            {data.domainInterests.length > 0 && (
              <div className="chips mt-2">
                {data.domainInterests.map((s, idx) => (
                  <span className="chip" key={idx}>
                    {s}
                    <button className="chip-close" onClick={() => removeInterest(idx)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Buttons */}
      <div className="d-flex justify-content-between mt-3">
        <button
          type="button"
          className="btn btn-link link-muted"
          onClick={onSwitchToLogin}
        >
          Already have an account? Login
        </button>
        <button type="submit" className="btn gradient-btn">
          Register
        </button>
      </div>
    </form>
  );
};

export default RegisterPage;
