import React, { useState, useEffect, useCallback, useMemo } from 'react';
import '../styles/assignmentCard.css';
import QuizEditor from './QuizEditor';

// ---------- LocalStorage helper ----------
const LS_KEY = 'cb_assignments_v1';

function lsLoad() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}
function lsSave(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}
function lsCreate(payload) {
  const list = lsLoad();
  const id = 'a_' + Math.random().toString(36).slice(2, 10);
  const now = new Date().toISOString();
  const created = { id, createdAt: now, updatedAt: now, ...payload };
  list.push(created);
  lsSave(list);
  return created;
}

// ---------- Initial data ----------
const INITIAL_QUIZ = Object.freeze({
  timeLimitMinutes: 30,
  shuffleQuestions: true,
  shuffleOptions: true,
  showAnswersAfterSubmit: true,
  questions: [],
});

const INITIAL_FORM = () => ({
  workType: 'assignment', // 'assignment' | 'quiz'
  title: '',
  description: '',
  maxScore: 100,
  passingScore: 40,
  estimatedMinutes: 60,
  attachment: null,
});

const AssignmentCard = ({ onCreated }) => {
  // ----- Form state -----
  const [form, setForm] = useState(INITIAL_FORM);
  const [quizData, setQuizData] = useState(INITIAL_QUIZ);

  const {
    workType,
    title,
    description,
    maxScore,
    passingScore,
    estimatedMinutes,
    attachment,
  } = form;

  // ----- UI/Request state -----
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ----- Derived: total quiz points -----
  const totalQuizPoints = useMemo(
    () =>
      workType === 'quiz'
        ? (quizData.questions || []).reduce(
            (sum, q) => sum + (Number(q.points) || 0),
            0
          )
        : 0,
    [workType, quizData.questions]
  );

  // Auto-sync maxScore to total quiz points when in quiz mode
  useEffect(() => {
    if (workType !== 'quiz') return;
    setForm((prev) => {
      const syncedMax = totalQuizPoints;
      const syncedPass = Math.min(prev.passingScore, Math.max(syncedMax, 0));
      return { ...prev, maxScore: syncedMax, passingScore: syncedPass };
    });
  }, [workType, totalQuizPoints]);

  // ----- Helpers -----
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setNum = (key) => (e) => setField(key, e.target.value); // keep as string; cast on submit

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM());
    setQuizData(INITIAL_QUIZ);
    setErrorMsg('');
    setSuccessMsg('');
  }, []);

  // ----- Validation -----
  const validate = () => {
    const errors = [];

    if (!title.trim()) errors.push('Title is required.');

    const score = Number(maxScore);
    if (!Number.isFinite(score) || score <= 0)
      errors.push('Max score must be a positive number.');

    const pass = Number(passingScore);
    if (!Number.isFinite(pass) || pass <= 0) {
      errors.push('Passing score must be a positive number.');
    } else if (pass > score) {
      errors.push('Passing score cannot be greater than Max score.');
    }

    const est = Number(estimatedMinutes);
    if (!Number.isFinite(est) || est <= 0)
      errors.push('Estimated time must be a positive number (minutes).');

    if (workType === 'assignment') {
      if (!description.trim())
        errors.push('Description is required for assignments.');
    }

    if (workType === 'quiz') {
      const q = quizData.questions || [];
      if (q.length === 0) errors.push('Add at least one quiz question.');
      q.forEach((qi, idx) => {
        if (!qi.title?.trim())
          errors.push(`Question ${idx + 1}: title is required.`);
        const opts = qi.options || [];
        if (opts.length < 2)
          errors.push(`Question ${idx + 1}: needs at least 2 options.`);
        const hasCorrect = opts.some((o) => o.isCorrect);
        if (!hasCorrect)
          errors.push(`Question ${idx + 1}: mark at least one correct option.`);
        const pts = Number(qi.points);
        if (!Number.isFinite(pts) || pts <= 0)
          errors.push(`Question ${idx + 1}: points must be > 0.`);
      });
      const tl = Number(quizData.timeLimitMinutes);
      if (!Number.isFinite(tl) || tl <= 0)
        errors.push('Quiz time limit must be a positive number of minutes.');
    }

    return errors;
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

    // Self-paced structure
    const base = {
      type: workType, // 'assignment' | 'quiz'
      title: title.trim(),
      maxScore: Number(maxScore),
      passingScore: Number(passingScore),
      estimatedMinutes: Number(estimatedMinutes), // For course builder aggregation
    };

    const payload =
      workType === 'quiz'
        ? { ...base, quiz: { ...quizData } }
        : { ...base, description: description.trim() };

    // Optional attachment name
    const finalPayload =
      workType === 'assignment' && attachment
        ? { ...payload, attachmentName: attachment.name }
        : payload;

    setSubmitting(true);
    try {
      //LocalStorage
      const created = lsCreate(finalPayload);

      // Return a lightweight object to the parent
      const lightweight = {
        id: created.id,
        type: created.type,
        title: created.title,
        estimatedMinutes: Number(created.estimatedMinutes),
      };

      setSuccessMsg(`${workType === 'quiz' ? 'Quiz' : 'Assignment'} saved.`);
      onCreated?.(lightweight);
      console.log('[AssignmentCard] Created (LocalStorage):', created);

      resetForm();
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="assignment-card-page">
      <div className="assignment-card">
        <div className="assignment-card__stripe" />

        <div className="assignment-card__header">
          <h1 className="assignment-card__title">
            Add {workType === 'quiz' ? 'Quiz' : 'Assignment'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="assignment-card__grid">
            {/* Work Type -> Segmented control (one line) */}
            <div className="assignment-card__group assignment-card__group--full assignment-card__worktype-row">
              <span className="assignment-card__label">Work Type *</span>
              <div className="ac-segment" role="radiogroup" aria-label="Work Type">
                <label className="ac-segment__option">
                  <input
                    type="radio"
                    name="workType"
                    value="assignment"
                    checked={workType === 'assignment'}
                    onChange={(e) => setField('workType', e.target.value)}
                    className="ac-segment__input"
                  />
                  <span className="ac-segment__text">Assignment</span>
                </label>

                <label className="ac-segment__option">
                  <input
                    type="radio"
                    name="workType"
                    value="quiz"
                    checked={workType === 'quiz'}
                    onChange={(e) => setField('workType', e.target.value)}
                    className="ac-segment__input"
                  />
                  <span className="ac-segment__text">Quiz</span>
                </label>
              </div>
            </div>

            {/* Title */}
            <div className="assignment-card__group">
              <label htmlFor="title" className="assignment-card__label">
                Title *
              </label>
              <input
                id="title"
                type="text"
                placeholder={
                  workType === 'quiz'
                    ? 'e.g., JavaScript Basics Quiz'
                    : 'e.g., Arrays & Loops Practice'
                }
                value={title}
                onChange={(e) => setField('title', e.target.value)}
                className="assignment-card-input"
                required
              />
            </div>

            {/* Max score */}
            <div className="assignment-card__group">
              <label htmlFor="maxScore" className="assignment-card__label">
                Max Score{''}
                {workType === 'quiz' && (
                  <span className="assignment-card__subtle">(auto)</span>
                )}
              </label>
              <input
                id="maxScore"
                type="number"
                min="1"
                step="1"
                value={maxScore}
                onChange={setNum('maxScore')}
                className="assignment-card-input"
                required
                default="100"
                readOnly={workType === 'quiz'}
                aria-readonly={workType === 'quiz'}
                title={
                  workType === 'quiz'
                    ? 'Auto-calculated from total quiz points'
                    : 'Max possible score'
                }
              />
            </div>

            {/* Passing Score */}
            <div className="assignment-card__group">
              <label htmlFor="passingScore" className="assignment-card__label">
                Passing Score *
              </label>
              <input
                id="passingScore"
                type="number"
                min="1"
                step="1"
                default="40"
                value={passingScore}
                onChange={setNum('passingScore')}
                className="assignment-card-input"
                required
              />
            </div>

            {/* Estimated time (minutes) */}
            <div className="assignment-card__group">
              <label htmlFor="estimatedMinutes" className="assignment-card__label">
                Estimated Time (mins) *
              </label>
              <input
                id="estimatedMinutes"
                type="number"
                min="1"
                step="1"
                value={estimatedMinutes}
                onChange={setNum('estimatedMinutes')}
                className="assignment-card-input"
                required
              />
            </div>

            {/* Assignments-only fields */}
            {workType === 'assignment' && (
              <>
                {/* Description*/}
                <div className="assignment-card__group assignment-card__group--full">
                  <label htmlFor="description" className="assignment-card__label">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    placeholder="Describe the assignment, instructions, and rubric…"
                    value={description}
                    onChange={(e) => setField('description', e.target.value)}
                    rows={6}
                    className="assignment-card-textarea"
                    required={workType === 'assignment'}
                  />
                </div>

                {/* Attachment*/}
                <div className="assignment-card__group assignment-card__group--full">
                  <label htmlFor="attachment" className="assignment-card__label">
                    Attachment (optional)
                  </label>
                  <input
                    id="attachment"
                    type="file"
                    onChange={(e) =>
                      setField('attachment', e.target.files?.[0] || null)
                    }
                    className="assignment-card-file"
                  />
                  {attachment && (
                    <span className="assignment-card__subtle">
                      Selected: {attachment.name}
                    </span>
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
          {errorMsg && (
            <div role="alert" className="assignment-card__msg-error">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div role="status" className="assignment-card__msg-success">
              {successMsg}
            </div>
          )}

          {/* Actions */}
          <div className="assignment-card__actions">
            <button
              type="submit"
              disabled={submitting}
              className="assignment-card__btn-primary"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={resetForm}
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