/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, useMemo } from "react";
import "../styles/assignmentCard.css";
import QuizEditor from "./QuizEditor";

// LocalStorage keys
const LS_ASSIGNMENTS = "cb_assignments";
const LS_QUIZZES = "cb_quiz";

// Safe JSON parse helper
function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw ?? "");
  } catch {
    return fallback;
  }
}

// Load list from LocalStorage
function lsLoad(key) {
  return safeJsonParse(localStorage.getItem(key), []);
}

// Save list to LocalStorage
function lsSave(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

// Generate lightweight id
function uid(prefix = "a_") {
  return prefix + Math.random().toString(36).slice(2, 10);
}

// Create record in a specific store
function lsCreate(key, payload) {
  const list = lsLoad(key);
  const id = uid("w_");
  const now = new Date().toISOString();
  const created = { id, createdAt: now, updatedAt: now, ...payload };
  list.push(created);
  lsSave(key, list);
  return created;
}

// Update record by id
export function lsUpdate(key, id, patch) {
  const list = lsLoad(key);
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return null;

  const updated = {
    ...list[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  list[idx] = updated;
  lsSave(key, list);
  return updated;
}

// Delete record by id
export function lsDelete(key, id) {
  const list = lsLoad(key);
  const next = list.filter((x) => x.id !== id);
  lsSave(key, next);
  return next.length !== list.length;
}

// Convenience loaders
export const lsLoadAssignments = () => lsLoad(LS_ASSIGNMENTS);
export const lsLoadQuizzes = () => lsLoad(LS_QUIZZES);

// Convenience creators
export const lsCreateAssignment = (payload) => lsCreate(LS_ASSIGNMENTS, payload);
export const lsCreateQuiz = (payload) => lsCreate(LS_QUIZZES, payload);

// Lookup by id across both stores
export function lsGetById(refId) {
  const a = lsLoadAssignments().find((x) => x.id === refId);
  if (a) return a;
  const q = lsLoadQuizzes().find((x) => x.id === refId);
  return q || null;
}

// Default quiz structure
const INITIAL_QUIZ = Object.freeze({
  shuffleQuestions: true,
  questions: [],
});

// Default form structure
const INITIAL_FORM = () => ({
  workType: "assignment",
  title: "",
  description: "",
  maxScore: 100,
  passingScore: 0,
  estimatedMinutes: 60,
  attachment: null,
});

const AssignmentCard = ({ onCreated }) => {
  // Form state
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

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Total points for quiz mode
  const totalQuizPoints = useMemo(() => {
    if (workType !== "quiz") return 0;
    return (quizData.questions || []).reduce(
      (sum, q) => sum + (Number(q.points) || 0),
      0
    );
  }, [workType, quizData.questions]);

  // Sync quiz maxScore with total points
  useEffect(() => {
    if (workType !== "quiz") return;

    setForm((prev) => {
      const syncedMax = totalQuizPoints;
      const prevPass = Number(prev.passingScore) || 0;
      const syncedPass = syncedMax > 0 ? Math.min(prevPass, syncedMax) : prevPass;
      return { ...prev, maxScore: syncedMax, passingScore: syncedPass };
    });
  }, [workType, totalQuizPoints]);

  // Generic field setter
  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Numeric field setter (keep string until submit)
  const setNum = (key) => (e) => setField(key, e.target.value);

  // Reset form + messages
  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM());
    setQuizData(INITIAL_QUIZ);
    setErrorMsg("");
    setSuccessMsg("");
  }, []);

  // Validate inputs
  const validate = () => {
    const errors = [];

    if (!title.trim()) errors.push("Title is required.");

    const score = Number(maxScore);
    if (!Number.isFinite(score) || score <= 0)
      errors.push("Max score must be a positive number.");

    const pass = Number(passingScore);
    if (!Number.isFinite(pass) || pass <= 0) {
      errors.push("Passing score must be a positive number.");
    } else if (pass > score) {
      errors.push("Passing score cannot be greater than Max score.");
    }

    const est = Number(estimatedMinutes);
    if (!Number.isFinite(est) || est <= 0)
      errors.push("Estimated time must be a positive number (minutes).");

    if (workType === "assignment") {
      if (!description.trim())
        errors.push("Description is required for assignments.");
    }

    if (workType === "quiz") {
      const q = quizData.questions || [];
      if (q.length === 0) errors.push("Add at least one quiz question.");

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
    }

    return errors;
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const errors = validate();
    if (errors.length) {
      setErrorMsg(errors.join(" "));
      return;
    }

    const base = {
      type: workType,
      title: title.trim(),
      maxScore: Number(maxScore),
      passingScore: Number(passingScore),
      estimatedMinutes: Number(estimatedMinutes),
    };

    const payload =
      workType === "quiz"
        ? { ...base, quiz: { ...quizData } }
        : { ...base, description: description.trim() };

    const finalPayload =
      workType === "assignment" && attachment
        ? { ...payload, attachmentName: attachment.name }
        : payload;

    setSubmitting(true);
    try {
      const created =
        workType === "quiz"
          ? lsCreateQuiz(finalPayload)
          : lsCreateAssignment(finalPayload);

      const lightweight = {
        id: created.id,
        type: created.type,
        title: created.title,
        estimatedMinutes: Number(created.estimatedMinutes),
      };

      setSuccessMsg(`${workType === "quiz" ? "Quiz" : "Assignment"} saved.`);
      onCreated?.(lightweight);

      console.log("[AssignmentCard] Created (LocalStorage):", created);
      resetForm();
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    //<div className="assignment-card-page container my-4">
      <div className="assignment-card card shadow-sm">
        <div className="assignment-card__stripe" />

        <div className="assignment-card__header card-header bg-white">
          <h1 className="assignment-card__title h4 mb-0">
            Add {workType === "quiz" ? "Quiz" : "Assignment"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-3 p-md-4">
          <div className="assignment-card__grid row g-3">
            <div className="assignment-card__group assignment-card__group--full assignment-card__worktype-row col-12">
              <span className="assignment-card__label d-block mb-2 fw-semibold">
                Work Type *
              </span>

              {/* KEEP TOGGLE DESIGN INTACT — no Bootstrap classes here */}
              <div className="ac-segment" role="radiogroup" aria-label="Work Type">
                <label className="ac-segment__option">
                  <input
                    type="radio"
                    name="workType"
                    value="assignment"
                    checked={workType === "assignment"}
                    onChange={(e) => setField("workType", e.target.value)}
                    className="ac-segment__input"
                  />
                  <span className="ac-segment__text">Assignment</span>
                </label>

                <label className="ac-segment__option">
                  <input
                    type="radio"
                    name="workType"
                    value="quiz"
                    checked={workType === "quiz"}
                    onChange={(e) => setField("workType", e.target.value)}
                    className="ac-segment__input"
                  />
                  <span className="ac-segment__text">Quiz</span>
                </label>
              </div>
              {/* END TOGGLE BLOCK */}
            </div>

            <div className="assignment-card__group col-12 col-md-6">
              <label htmlFor="title" className="assignment-card__label form-label">
                Title *
              </label>
              <input
                id="title"
                type="text"
                placeholder={
                  workType === "quiz"
                    ? "e.g., JavaScript Basics Quiz"
                    : "e.g., Arrays & Loops Practice"
                }
                value={title}
                onChange={(e) => setField("title", e.target.value)}
                className="assignment-card-input form-control"
                required
              />
            </div>

            <div className="assignment-card__group col-12 col-md-4 col-lg-3">
              <label htmlFor="maxScore" className="assignment-card__label form-label">
                Max Score{" "}
                {workType === "quiz" && (
                  <span className="assignment-card__subtle text-muted">(auto)</span>
                )}
              </label>
              <input
                id="maxScore"
                type="number"
                min="1"
                step="1"
                value={maxScore}
                onChange={setNum("maxScore")}
                className="assignment-card-input form-control"
                required
                readOnly={workType === "quiz"}
                aria-readonly={workType === "quiz"}
                title={
                  workType === "quiz"
                    ? "Auto-calculated from total quiz points"
                    : "Max possible score"
                }
              />
            </div>

            <div className="assignment-card__group col-12 col-md-4 col-lg-3">
              <label htmlFor="passingScore" className="assignment-card__label form-label">
                Passing Score *
              </label>
              <input
                id="passingScore"
                type="number"
                min="1"
                step="1"
                value={passingScore}
                onChange={setNum("passingScore")}
                className="assignment-card-input form-control"
                required
              />
            </div>

            <div className="assignment-card__group col-12 col-md-4 col-lg-3">
              <label
                htmlFor="estimatedMinutes"
                className="assignment-card__label form-label"
              >
                Estimated Time (mins) *
              </label>
              <input
                id="estimatedMinutes"
                type="number"
                min="1"
                step="1"
                value={estimatedMinutes}
                onChange={setNum("estimatedMinutes")}
                className="assignment-card-input form-control"
                required
              />
            </div>

            {workType === "assignment" && (
              <>
                <div className="assignment-card__group assignment-card__group--full col-12">
                  <label htmlFor="description" className="assignment-card__label form-label">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    placeholder="Describe the assignment, instructions, and rubric…"
                    value={description}
                    onChange={(e) => setField("description", e.target.value)}
                    rows={6}
                    className="assignment-card-textarea form-control"
                    required
                  />
                </div>

                <div className="assignment-card__group assignment-card__group--full col-12">
                  <label htmlFor="attachment" className="assignment-card__label form-label">
                    Attachment (optional)
                  </label>
                  <input
                    id="attachment"
                    type="file"
                    onChange={(e) =>
                      setField("attachment", e.target.files?.[0] || null)
                    }
                    className="assignment-card-file form-control"
                  />
                  {attachment && (
                    <span className="assignment-card__subtle text-muted d-inline-block mt-1">
                      Selected: {attachment.name}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {workType === "quiz" && (
            <div className="mt-3">
              <QuizEditor value={quizData} onChange={setQuizData} />
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="assignment-card__msg-error alert alert-danger mt-3">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div role="status" className="assignment-card__msg-success alert alert-success mt-3">
              {successMsg}
            </div>
          )}

          <div className="assignment-card__actions d-flex gap-2 mt-3">
            <button
              type="submit"
              disabled={submitting}
              className="assignment-card__btn-primary btn btn-primary"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={resetForm}
              className="assignment-card__btn-secondary btn btn-outline-secondary"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    //</div>
  );
};

export default AssignmentCard;