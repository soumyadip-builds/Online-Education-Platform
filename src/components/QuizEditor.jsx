
import React, { useMemo } from "react";
import "../styles/assignmentCard.css";

export default function QuizEditor({ value, onChange }) {
  // Default quiz structure
  const quiz = value || {
    timeLimitMinutes: 30,
    shuffleQuestions: true,
    shuffleOptions: true,
    showAnswersAfterSubmit: true,
    questions: [],
  };

  // Utilities
  const update = (patch) => onChange?.({ ...quiz, ...patch });
  const uid = () => Math.random().toString(36).slice(2, 10);

  const totalPoints = useMemo(
    () => quiz.questions.reduce((s, q) => s + (Number(q.points) || 0), 0),
    [quiz.questions]
  );

  /* ----------------------- QUESTION CRUD ------------------------ */
  const addQ = () =>
    update({
      questions: [
        ...quiz.questions,
        {
          id: "q_" + uid(),
          title: "",
          type: "single",
          points: 1,
          options: [
            { id: "o_" + uid(), text: "", isCorrect: false },
            { id: "o_" + uid(), text: "", isCorrect: false },
          ],
          explanation: "",
        },
      ],
    });

  const rmQ = (id) =>
    update({ questions: quiz.questions.filter((q) => q.id !== id) });

  const patchQ = (id, p) =>
    update({
      questions: quiz.questions.map((q) => (q.id === id ? { ...q, ...p } : q)),
    });

  /* ------------------------ OPTION CRUD -------------------------- */
  const addOpt = (qid) => {
    const q = quiz.questions.find((x) => x.id === qid);
    if (!q) return;
    patchQ(qid, {
      options: [...q.options, { id: "o_" + uid(), text: "", isCorrect: false }],
    });
  };

  const rmOpt = (qid, oid) => {
    const q = quiz.questions.find((x) => x.id === qid);
    if (!q) return;
    patchQ(qid, { options: q.options.filter((o) => o.id !== oid) });
  };

  const patchOpt = (qid, oid, p) => {
    const q = quiz.questions.find((x) => x.id === qid);
    if (!q) return;
    patchQ(qid, {
      options: q.options.map((o) => (o.id === oid ? { ...o, ...p } : o)),
    });
  };

  const setCorrect = (qid, oid, checked) => {
    const q = quiz.questions.find((x) => x.id === qid);
    if (!q) return;

    if (q.type === "single") {
      // Only one correct for "single"
      patchQ(qid, {
        options: q.options.map((o) => ({
          ...o,
          isCorrect: o.id === oid ? checked : false,
        })),
      });
    } else {
      // Multiple allowed
      patchOpt(qid, oid, { isCorrect: checked });
    }
  };

  return (
    <div className="quiz-editor">
      {/* Header */}
      <div className="quiz-editor__header">
        <h2 className="quiz-editor__title">Quiz Settings</h2>
        <div className="quiz-editor__totals">
          <span className="quiz-editor__total-label">Total Points:</span>
          <span className="quiz-editor__total-value">{totalPoints}</span>
        </div>
      </div>

      {/* Settings (non-scrollable) */}
      <div className="quiz-editor__settings">
        <div className="quiz-editor__grid">
          <div className="quiz-editor__group">
            <label className="assignment-card__label">Time Limit (mins) *</label>
            <input
              type="number"
              min="1"
              value={quiz.timeLimitMinutes}
              onChange={(e) =>
                update({
                  timeLimitMinutes: Math.max(1, Number(e.target.value || 0)),
                })
              }
              className="assignment-card-input"
            />
          </div>

          <div className="quiz-editor__group">
            <span className="assignment-card__label">Options</span>
            <div className="quiz-editor__toggles">
              {[
                ["shuffleQuestions", "Shuffle questions"],
                ["shuffleOptions", "Shuffle options"],
                ["showAnswersAfterSubmit", "Show answers"],
              ].map(([key, label]) => (
                <label className="quiz-editor__toggle" key={key}>
                  <input
                    type="checkbox"
                    checked={!!quiz[key]}
                    onChange={(e) => update({ [key]: e.target.checked })}
                    className="quiz-editor__checkbox"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* QUESTIONS (scrollable) */}
      <div className="quiz-editor__questions">
        {/* Header */}
        <div className="quiz-editor__qheader">
          <h3 className="quiz-editor__subtitle">Questions</h3>
          <button
            type="button"
            className="assignment-card__btn-primary"
            onClick={addQ}
          >
            + Add Question
          </button>
        </div>

        {quiz.questions.length === 0 && (
          <p className="assignment-card__subtle">No questions added.</p>
        )}

        {quiz.questions.map((q, i) => (
          <div key={q.id} className="quiz-question">
            {/* Top */}
            <div className="quiz-question__top">
              <span className="quiz-question__index">Q{i + 1}</span>

              {/* Drag handle removed */}

              <button
                type="button"
                className="quiz-question__remove"
                onClick={() => rmQ(q.id)}
              >
                Remove
              </button>
            </div>

            {/* Fields */}
            <div className="quiz-question__grid">
              {/* Title */}
              <div className="quiz-editor__group">
                <label className="assignment-card__label">Question *</label>
                <input
                  type="text"
                  value={q.title}
                  onChange={(e) => patchQ(q.id, { title: e.target.value })}
                  className="assignment-card-input"
                />
              </div>

              {/* Type */}
              <div className="quiz-editor__group">
                <label className="assignment-card__label">Type *</label>
                <select
                  value={q.type}
                  onChange={(e) => patchQ(q.id, { type: e.target.value })}
                  className="assignment-card-select"
                >
                  <option value="single">Single correct</option>
                  <option value="multiple">Multiple correct</option>
                </select>
              </div>

              {/* Points */}
              <div className="quiz-editor__group">
                <label className="assignment-card__label">Points *</label>
                <input
                  type="number"
                  min="1"
                  value={q.points}
                  onChange={(e) =>
                    patchQ(q.id, {
                      points: Math.max(1, Number(e.target.value || 1)),
                    })
                  }
                  className="assignment-card-input"
                />
              </div>
            </div>

            {/* Options */}
            <div className="quiz-options">
              <div className="quiz-options__header">
                <span className="assignment-card__label">Options</span>
                <button
                  type="button"
                  className="assignment-card__btn-secondary"
                  onClick={() => addOpt(q.id)}
                >
                  + Add Option
                </button>
              </div>

              {q.options.map((o) => (
                <div key={o.id} className="quiz-option">
                  <input
                    type={q.type === "single" ? "radio" : "checkbox"}
                    name={`correct-${q.id}`}
                    checked={o.isCorrect}
                    onChange={(e) => setCorrect(q.id, o.id, e.target.checked)}
                    className="quiz-option__mark"
                  />
                  <input
                    type="text"
                    value={o.text}
                    onChange={(e) => patchOpt(q.id, o.id, { text: e.target.value })}
                    className="assignment-card-input quiz-option__text"
                    placeholder="Option text"
                  />
                  <button
                    type="button"
                    className="quiz-option__remove"
                    onClick={() => rmOpt(q.id, o.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Explanation (optional) */}
            <div className="quiz-editor__group">
              <label className="assignment-card__label">Explanation (optional)</label>
              <textarea
                rows="2"
                value={q.explanation}
                onChange={(e) => patchQ(q.id, { explanation: e.target.value })}
                className="assignment-card-textarea"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

