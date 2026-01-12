
// src/components/AssignmentCard.jsx
import React, { useState, useMemo } from 'react';
import '../styles/assignmentCard.css';

/**
 * AssignmentCard.jsx
 * Add assignments manually.
 *
 * Props:
 * - assignmentService: { create: (payload: AssignmentPayload) => Promise<CreatedAssignment> }
 * - onCreated?: (assignment) => void
 * - courses?: Array<{ id: string|number, title: string }>
 */
const AssignmentCard = ({ assignmentService, onCreated, courses: coursesProp }) => {
  // ----- Palette (used by custom radio visual inline) -----
  const palette = {
    spaceIndigo: '#22223b',
    dustyGrape:  '#4a4e69',
    lilacAsh:    '#9a8c98',
    almondSilk:  '#c9ada7',
    parchment:   '#f2e9e4',
  };

  const courses = useMemo(
    () =>
      coursesProp ||
      [
        // Fallback sample courses for isolated testing:
        { id: 'c101', title: 'Intro to JS' },
        { id: 'c102', title: 'React Basics' },
        { id: 'c103', title: 'Data Structures' },
      ],
    [coursesProp]
  );

  // ----- Form State -----
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  ); // default +1 day (yyyy-MM-ddTHH:mm)
  const [maxScore, setMaxScore] = useState(100);
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [referenceLink, setReferenceLink] = useState('');
  const [status, setStatus] = useState('published'); // 'draft' | 'published'
  const [attachment, setAttachment] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ----- Validation -----
  const validate = () => {
    const errors = [];
    if (!title.trim()) errors.push('Title is required.');
    if (!description.trim()) errors.push('Description is required.');
    if (!courseId) errors.push('Please select a course.');
    if (!dueDate) errors.push('Due date & time is required.');

    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) errors.push('Due date is invalid.');
    else if (due <= new Date()) errors.push('Due date must be in the future.');

    const score = Number(maxScore);
    if (!Number.isFinite(score) || score <= 0) errors.push('Max score must be a positive number.');

    const est = Number(estimatedMinutes);
    if (!Number.isFinite(est) || est <= 0) errors.push('Estimated time must be a positive number (minutes).');

    if (referenceLink && !/^https?:\/\/.+/i.test(referenceLink)) {
      errors.push('Reference link must start with http:// or https://');
    }

    return errors;
  };

  // ----- Custom radio (no black unselected) -----
  const Radio = ({ label, name, value, checked, onChange }) => {
    return (
      <label className="assignment-card__radio-label">
        <span
          className="assignment-card__radio-visual"
          aria-hidden="true"
          style={{
            borderColor: palette.dustyGrape,
            boxShadow: checked ? `inset 0 0 0 6px ${palette.dustyGrape}` : 'none',
          }}
        />
        {/* Native input kept for accessibility, visually hidden */}
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          className="assignment-card__radio-input-native"
        />
        <span>{label}</span>
      </label>
    );
  };

  // ----- Submit -----
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const errors = validate();
    if (errors.length) {
      setErrorMsg(errors.join(' '));
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      courseId,
      dueAt: new Date(dueDate).toISOString(),
      maxScore: Number(maxScore),
      estimatedMinutes: Number(estimatedMinutes),
      referenceLink: referenceLink.trim() || null,
      status, // 'draft' or 'published'
      // If you later support attachments, switch to FormData in the service adapter
    };

    setSubmitting(true);
    try {
      const created = await assignmentService.create(
        attachment ? { ...payload, attachmentName: attachment.name } : payload
      );

      setSuccessMsg('Assignment created successfully.');
      // reset
      setTitle('');
      setDescription('');
      setCourseId('');
      setDueDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
      setMaxScore(100);
      setEstimatedMinutes(60);
      setReferenceLink('');
      setStatus('published');
      setAttachment(null);

      if (typeof onCreated === 'function') onCreated(created);
      console.log('[AssignmentCard] Created:', created);
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to create assignment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="assignment-card-page">
      <div className="assignment-card">
        <div className="assignment-card__stripe" />

        <div className="assignment-card__header">
          <h1 className="assignment-card__title">Add Assignment</h1>
          <span className="assignment-card__subtle">
            {dueDate ? `Default due: ${new Date(dueDate).toLocaleString()}` : ''}
          </span>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* 1 column by default; 2 columns from 900px */}
          <div className="assignment-card__grid">
            <div className="assignment-card__group">
              <label htmlFor="title" className="assignment-card__label">
                Title <span aria-hidden="true">*</span>
              </label>
              <input
                id="title"
                type="text"
                placeholder="e.g., Arrays & Loops Practice"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="assignment-card-input"
                required
              />
            </div>

            <div className="assignment-card__group">
              <label htmlFor="courseId" className="assignment-card__label">
                Course <span aria-hidden="true">*</span>
              </label>
              <select
                id="courseId"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="assignment-card-select"
                required
              >
                <option value="">Select a course</option>
                {Array.isArray(courses) && courses.map((c) => (
                  <option key={c.id ?? c._id ?? c.code} value={c.id ?? c._id ?? c.code}>
                    {c.title ?? c.name ?? `Course ${c.id ?? c._id ?? ''}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="assignment-card__group">
              <label htmlFor="dueDate" className="assignment-card__label">
                Due (date & time) <span aria-hidden="true">*</span>
              </label>
              <input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="assignment-card-input"
                required
              />
            </div>

            <div className="assignment-card__group">
              <label htmlFor="maxScore" className="assignment-card__label">
                Max Score <span aria-hidden="true">*</span>
              </label>
              <input
                id="maxScore"
                type="number"
                min="1"
                step="1"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="assignment-card-input"
                required
              />
            </div>

            <div className="assignment-card__group">
              <label htmlFor="estimatedMinutes" className="assignment-card__label">
                Estimated Time (mins) <span aria-hidden="true">*</span>
              </label>
              <input
                id="estimatedMinutes"
                type="number"
                min="1"
                step="1"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                className="assignment-card-input"
                required
              />
            </div>

            <div className="assignment-card__group">
              <span className="assignment-card__label">
                Status <span aria-hidden="true">*</span>
              </span>
              <div className="assignment-card__radio-row">
                <Radio
                  label="Publish"
                  name="status"
                  value="published"
                  checked={status === 'published'}
                  onChange={(e) => setStatus(e.target.value)}
                />
                <Radio
                  label="Save as Draft"
                  name="status"
                  value="draft"
                  checked={status === 'draft'}
                  onChange={(e) => setStatus(e.target.value)}
                />
              </div>
            </div>

            <div className="assignment-card__group">
              <label htmlFor="referenceLink" className="assignment-card__label">
                Reference Link (optional)
              </label>
              <input
                id="referenceLink"
                type="url"
                placeholder="https://docs.example.com/arrays"
                value={referenceLink}
                onChange={(e) => setReferenceLink(e.target.value)}
                className="assignment-card-input"
              />
            </div>

            <div className="assignment-card__group">
              <label htmlFor="attachment" className="assignment-card__label">
                Attachment (optional)
              </label>
              <input
                id="attachment"
                type="file"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                className="assignment-card-file"
              />
              {attachment && (
                <span className="assignment-card__subtle">Selected: {attachment.name}</span>
              )}
            </div>

            <div className="assignment-card__group assignment-card__group--full">
              <label htmlFor="description" className="assignment-card__label">
                Description <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="description"
                placeholder="Describe the assignment, instructions, rubrics, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="assignment-card-textarea"
                required
              />
            </div>
          </div>

          {errorMsg && <div role="alert" className="assignment-card__msg-error">{errorMsg}</div>}
          {successMsg && <div role="status" className="assignment-card__msg-success">{successMsg}</div>}

          <div className="assignment-card__actions">
            <button type="submit" disabled={submitting} className="assignment-card__btn-primary">
              {submitting ? 'Submitting...' : (status === 'draft' ? 'Save Draft' : 'Publish Assignment')}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setTitle(''); setDescription(''); setCourseId('');
                setDueDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
                setMaxScore(100); setEstimatedMinutes(60); setReferenceLink('');
                setStatus('published'); setAttachment(null); setErrorMsg(''); setSuccessMsg('');
              }}
              className="assignment-card__btn-secondary"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentCard;
