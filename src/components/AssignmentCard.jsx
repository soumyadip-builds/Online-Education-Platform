
import React, { useState, useEffect } from 'react';
import '../styles/assignmentCard.css';
import QuizEditor from './QuizEditor';

/**
 * AssignmentCard.jsx
 * Reusable page for Assignment or Quiz creation.
 *
 * Props:
 * - assignmentService: { create: (payload) => Promise<any> }
 * - onCreated?: (createdItem) => void
 */
const AssignmentCard = ({ assignmentService, onCreated }) => {
  // ----- Core form state -----
  const [workType, setWorkType] = useState('assignment'); // 'assignment' | 'quiz'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');     // assignments only
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [maxScore, setMaxScore] = useState(100);
  const [passingScore, setPassingScore] = useState(40);
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [status, setStatus] = useState('published');
  const [attachment, setAttachment] = useState(null);     // assignments only

  // ----- Quiz state (only in quiz mode) -----
  const [quizData, setQuizData] = useState({
    timeLimitMinutes: 30,
    shuffleQuestions: true,
    shuffleOptions: true,
    showAnswersAfterSubmit: true,
    questions: [],
  });

  // ----- UI/Request state -----
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ----- Derived: total quiz points -----
  const totalQuizPoints =
    workType === 'quiz'
      ? (quizData.questions || []).reduce((sum, q) => sum + (Number(q.points) || 0), 0)
      : 0;

  // Auto-sync maxScore to total quiz points when in quiz mode
  useEffect(() => {
    if (workType === 'quiz') {
      setMaxScore(totalQuizPoints);
      if (totalQuizPoints > 0 && passingScore > totalQuizPoints) {
        setPassingScore(totalQuizPoints);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workType, totalQuizPoints]);

  // ----- Validation -----
  const validate = () => {
    const errors = [];

    if (!title.trim()) errors.push('Title is required.');
    if (!dueDate) errors.push('Due date & time is required.');
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) errors.push('Due date is invalid.');
    else if (due <= new Date()) errors.push('Due date must be in the future.');

    const score = Number(maxScore);
    if (!Number.isFinite(score) || score <= 0) errors.push('Max score must be a positive number.');

    const pass = Number(passingScore);
    if (!Number.isFinite(pass) || pass <= 0) {
      errors.push('Passing score must be a positive number.');
    } else if (pass > score) {
      errors.push('Passing score cannot be greater than Max score.');
    }

    const est = Number(estimatedMinutes);
    if (!Number.isFinite(est) || est <= 0) errors.push('Estimated time must be a positive number (minutes).');

    // ✅ Assignments only: require description
    if (workType === 'assignment') {
      if (!description.trim()) errors.push('Description is required for assignments.');
    }

    // ✅ Quiz-only validation
    if (workType === 'quiz') {
      const q = quizData.questions || [];
      if (q.length === 0) errors.push('Add at least one quiz question.');
      q.forEach((qi, idx) => {
        if (!qi.title?.trim()) errors.push(`Question ${idx + 1}: title is required.`);
        const opts = qi.options || [];
        if (opts.length < 2) errors.push(`Question ${idx + 1}: needs at least 2 options.`);
        const hasCorrect = opts.some(o => o.isCorrect);
        if (!hasCorrect) errors.push(`Question ${idx + 1}: mark at least one correct option.`);
        const pts = Number(qi.points);
        if (!Number.isFinite(pts) || pts <= 0) errors.push(`Question ${idx + 1}: points must be > 0.`);
      });
      const tl = Number(quizData.timeLimitMinutes);
      if (!Number.isFinite(tl) || tl <= 0) errors.push('Quiz time limit must be a positive number of minutes.');
    }

    return errors;
  };

  // ----- Custom radio chip (no black) -----
  const Radio = ({ label, name, value, checked, onChange }) => (
    <label className="assignment-card__radio-label">
      <span
        className="assignment-card__radio-visual"
        aria-hidden="true"
        style={{ boxShadow: checked ? 'inset 0 0 0 6px var(--accent)' : 'none' }}
      />
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

    const base = {
      type: workType, // 'assignment' | 'quiz'
      title: title.trim(),
      dueAt: new Date(dueDate).toISOString(),
      maxScore: Number(maxScore),
      passingScore: Number(passingScore),
      estimatedMinutes: Number(estimatedMinutes),
      status,
    };

    // ✅ Build payload conditionally
    const payload =
      workType === 'quiz'
        ? { ...base, quiz: { ...quizData } } // no description/attachment
        : { ...base, description: description.trim() };

    setSubmitting(true);
    try {
      // Pass attachment name only when it's an assignment AND there is a file
      const created = await assignmentService.create(
        workType === 'assignment' && attachment
          ? { ...payload, attachmentName: attachment.name }
          : payload
      );

      setSuccessMsg(`${workType === 'quiz' ? 'Quiz' : 'Assignment'} created successfully.`);

      // Reset
      setWorkType('assignment');
      setTitle('');
      setDescription('');
      setDueDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
      setMaxScore(100);
      setPassingScore(40);
      setEstimatedMinutes(60);
      setStatus('published');
      setAttachment(null);
      setQuizData({
        timeLimitMinutes: 30,
        shuffleQuestions: true,
        shuffleOptions: true,
        showAnswersAfterSubmit: true,
        questions: [],
      });

      onCreated?.(created);
      console.log('[AssignmentCard] Created:', created);
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to create item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Reset -----
  const handleReset = () => {
    setWorkType('assignment');
    setTitle('');
    setDescription('');
    setDueDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
    setMaxScore(100);
    setPassingScore(40);
    setEstimatedMinutes(60);
    setStatus('published');
    setAttachment(null);
    setErrorMsg('');
    setSuccessMsg('');
    setQuizData({
      timeLimitMinutes: 30,
      shuffleQuestions: true,
      shuffleOptions: true,
      showAnswersAfterSubmit: true,
      questions: [],
    });
  };

  return (
    <div className="assignment-card-page">
      <div className="assignment-card">
        <div className="assignment-card__stripe" />

        <div className="assignment-card__header">
          <h1 className="assignment-card__title">Add {workType === 'quiz' ? 'Quiz' : 'Assignment'}</h1>
          <span className="assignment-card__subtle">
            {dueDate ? `Default due: ${new Date(dueDate).toLocaleString()}` : ''}
          </span>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="assignment-card__grid">
            {/* Work Type */}
            <div className="assignment-card__group">
              <span className="assignment-card__label">Work Type *</span>
              <div className="assignment-card__radio-row">
                <Radio
                  label="Assignment"
                  name="workType"
                  value="assignment"
                  checked={workType === 'assignment'}
                  onChange={(e) => setWorkType(e.target.value)}
                />
                <Radio
                  label="Quiz"
                  name="workType"
                  value="quiz"
                  checked={workType === 'quiz'}
                  onChange={(e) => setWorkType(e.target.value)}
                />
              </div>
            </div>

            {/* Title */}
            <div className="assignment-card__group">
              <label htmlFor="title" className="assignment-card__label">Title *</label>
              <input
                id="title"
                type="text"
                placeholder={workType === 'quiz' ? 'e.g., JavaScript Basics Quiz' : 'e.g., Arrays & Loops Practice'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="assignment-card-input"
                required
              />
            </div>

            {/* Due date */}
            <div className="assignment-card__group">
              <label htmlFor="dueDate" className="assignment-card__label">Due (date & time) *</label>
              <input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="assignment-card-input"
                required
              />
            </div>

            {/* Max score */}
            <div className="assignment-card__group">
              <label htmlFor="maxScore" className="assignment-card__label">
                Max Score * {workType === 'quiz' && <span className="assignment-card__subtle">(auto)</span>}
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
                readOnly={workType === 'quiz'}
                aria-readonly={workType === 'quiz'}
                title={workType === 'quiz' ? 'Auto-calculated from total quiz points' : 'Max possible score'}
              />
            </div>

            {/* Passing Score */}
            <div className="assignment-card__group">
              <label htmlFor="passingScore" className="assignment-card__label">Passing Score *</label>
              <input
                id="passingScore"
                type="number"
                min="1"
                step="1"
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
                className="assignment-card-input"
                required
              />
            </div>

            {/* Estimated time */}
            <div className="assignment-card__group">
              <label htmlFor="estimatedMinutes" className="assignment-card__label">Estimated Time (mins) *</label>
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

            {/* Status */}
            <div className="assignment-card__group">
              <span className="assignment-card__label">Status *</span>
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

            {/* ✅ Assignments-only fields */}
            {workType === 'assignment' && (
              <>
                {/* Description (full width) */}
                <div className="assignment-card__group assignment-card__group--full">
                  <label htmlFor="description" className="assignment-card__label">Description *</label>
                  <textarea
                    id="description"
                    placeholder="Describe the assignment, instructions, and rubric…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    className="assignment-card-textarea"
                    required={workType === 'assignment'}
                  />
                </div>

                {/* Attachment (full width) */}
                <div className="assignment-card__group assignment-card__group--full">
                  <label htmlFor="attachment" className="assignment-card__label">Attachment (optional)</label>
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
              </>
            )}
          </div>

          {/* Quiz editor renders below when type is quiz */}
          {workType === 'quiz' && (
            <QuizEditor value={quizData} onChange={setQuizData} />
          )}

          {/* Messages */}
          {errorMsg && <div role="alert" className="assignment-card__msg-error">{errorMsg}</div>}
          {successMsg && <div role="status" className="assignment-card__msg-success">{successMsg}</div>}

          {/* Actions */}
          <div className="assignment-card__actions">
            <button type="submit" disabled={submitting} className="assignment-card__btn-primary">
              {submitting
                ? 'Submitting...'
                : (status === 'draft'
                    ? 'Save Draft'
                    : `Publish ${workType === 'quiz' ? 'Quiz' : 'Assignment'}`)}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleReset}
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
