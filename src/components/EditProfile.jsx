import { useEffect, useMemo, useState } from 'react';
import '../styles/editProfile.css';

import {
  getCurrentUser,
  getUserByEmail,
  updateUserByEmail,
  createSession,
} from '../utils/session';

/** Small reusable TagInput */
function TagInput({
  label,
  value = [],
  placeholder = 'Type and press Enter',
  onChange,
}) {
  const [input, setInput] = useState('');

  function addTag(e) {
    if (e.key === 'Enter' && input.trim()) {
      const next = Array.from(new Set([...(value || []), input.trim()]));
      onChange?.(next);
      setInput('');
    }
  }

  function removeTag(tag) {
    const next = (value || []).filter(t => t !== tag);
    onChange?.(next);
  }

  return (
    <div className="form-group">
      <label className="label">{label}</label>

      <div className="chip-input">
        {(value || []).map(tag => (
          <span key={tag} className="chip" onClick={() => removeTag(tag)}>
            {tag}
            <button type="button">&times;</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={addTag}
          placeholder={placeholder}
        />
      </div>

      <small className="hint">Press Enter to add. Click a chip to remove.</small>
    </div>
  );
}

/** Repeater for Education entries */
function EducationRepeater({ value = [], onChange }) {
  const [items, setItems] = useState(value);

  useEffect(() => setItems(value || []), [value]);

  function update(idx, field, val) {
    const next = items.map((it, i) =>
      i === idx ? { ...it, [field]: val } : it
    );
    setItems(next);
    onChange?.(next);
  }

  function add() {
    const next = [...items, { degree: '', institution: '', year: '' }];
    setItems(next);
    onChange?.(next);
  }

  function remove(idx) {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    onChange?.(next);
  }

  return (
    <div className="form-group">
      <label className="label">Educational Qualifications</label>

      <div className="edu-list">
        {items.length === 0 && (
          <div className="muted">No entries yet (optional).</div>
        )}

        {items.map((row, idx) => (
          <div className="edu-row" key={idx}>
            <input
              type="text"
              placeholder="Degree / Program"
              value={row.degree || ''}
              onChange={(e) => update(idx, 'degree', e.target.value)}
            />
            <input
              type="text"
              placeholder="Institution"
              value={row.institution || ''}
              onChange={(e) => update(idx, 'institution', e.target.value)}
            />
            <input
              type="text"
              placeholder="Year (e.g., 2024)"
              value={row.year || ''}
              onChange={(e) => update(idx, 'year', e.target.value)}
            />
            <button
              type="button"
              className="btn ghost danger"
              onClick={() => remove(idx)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="btn ghost" onClick={add}>
        + Add Qualification
      </button>
    </div>
  );
}

export default function EditProfile() {
  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState(null);

  const [form, setForm] = useState({
    name: '',
    dob: '',
    skills: [],
    occupation: '',
    experience: '',
    education: [],
    domainInterests: [],
  });

  useEffect(() => {
    const sessionUser = getCurrentUser();
    if (!sessionUser) {
      setLoading(false);
      setInitial(null);
      return;
    }

    const full = getUserByEmail(sessionUser.email) || sessionUser;

    const start = {
      role: full.role,
      email: full.email,
      name: full.name || '',
      dob: full.dob || '',
      skills: Array.isArray(full.skills) ? full.skills : [],
      occupation: full.occupation || '',
      experience: full.experience ?? '',
      education: Array.isArray(full.education) ? full.education : [],
      domainInterests: Array.isArray(full.domainInterests)
        ? full.domainInterests
        : [],
    };

    setInitial(start);
    setForm(start);
    setLoading(false);
  }, []);

  const role = useMemo(() => initial?.role || 'learner', [initial]);

  function patch(field, val) {
    setForm(prev => ({ ...prev, [field]: val }));
  }

  function diff(original, current) {
    const out = {};
    Object.keys(current).forEach(k => {
      if (k === 'role' || k === 'email') return;
      const a = original?.[k];
      const b = current?.[k];
      const changed =
        typeof b === 'object'
          ? JSON.stringify(a || null) !== JSON.stringify(b || null)
          : a !== b;
      if (changed) out[k] = b;
    });
    return out;
  }

  function save(e) {
    e.preventDefault();
    if (!initial?.email) return;

    const changes = diff(initial, form);
    if (Object.keys(changes).length === 0) {
      alert('Nothing to update.');
      return;
    }

    const res = updateUserByEmail(initial.email, changes);
    if (!res.ok) {
      alert(res.error || 'Failed to update profile.');
      return;
    }

    const updatedUser = { ...initial, ...changes };
    createSession(updatedUser);

    setInitial(updatedUser);
    alert('Profile updated!');
  }

  if (loading) {
    return (
      <div className="edit-profile-layout">
        <div className="editcard loading">Loading...</div>
      </div>
    );
  }

  if (!initial) {
    return (
      <div className="edit-profile-layout">
        <div className="editcard">
          <h2 className="title">Edit Profile</h2>
          <p className="muted">
            You’re not signed in. Please sign in to edit your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-profile-layout">
      <div className="aurora-bg" />

      <form className="editcard" onSubmit={save}>
        <h2 className="title">
          Edit Profile <span className="role-pill">{role}</span>
        </h2>

        {/* Common fields */}
        <div className="form-group">
          <label className="label">Name (optional)</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => patch('name', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">Date of Birth (optional)</label>
          <input
            type="date"
            value={form.dob || ''}
            onChange={(e) => patch('dob', e.target.value)}
          />
        </div>

        {/* Learner */}
        {role === 'learner' && (
          <>
            <TagInput
              label="Skills (optional)"
              value={form.skills}
              onChange={(v) => patch('skills', v)}
            />
            <div className="form-group">
              <label className="label">Occupation (optional)</label>
              <input
                type="text"
                value={form.occupation}
                onChange={(e) => patch('occupation', e.target.value)}
              />
            </div>
          </>
        )}

        {/* Instructor */}
        {role === 'instructor' && (
          <>
            <div className="form-group">
              <label className="label">
                Experience (years, optional)
              </label>
              <input
                type="number"
                value={form.experience}
                onChange={(e) => patch('experience', e.target.value)}
              />
            </div>

            <EducationRepeater
              value={form.education}
              onChange={(v) => patch('education', v)}
            />

            <TagInput
              label="Domain Interests (optional)"
              value={form.domainInterests}
              onChange={(v) => patch('domainInterests', v)}
            />
          </>
        )}

        <div className="actions">
          <button type="submit" className="btn primary">
            Save Changes
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setForm(initial)}
          >
            Reset
          </button>
        </div>

        <p className="footnote muted">
          All fields are optional — update only what you want.
        </p>
      </form>
    </div>
  );
}
