// src/pages/StudentMetrics.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/studentMetrics.css";
import { getCurrentUser, getUserByEmail } from "../utils/session";

/**
 * StudentMetrics.jsx
 * - Progress bar per enrolled course
 * - Module-wise tracking of quizzes & assignments
 *
 * Data sources:
 *   /data/courseDetails.json
 *   /data/assignmentData.json
 *   /data/quizData.json
 *
 * Completion sources (localStorage) — ✅ per-user quizzes:
 *   quizAttempt:<email>:<quizId> = full payload (includes questions review)
 *   quizResult:<email>:<quizId>  = lightweight summary
 *
 * Assignments (global):
 *   assignmentSubmission:<assignmentId>
 */

function safeJSONParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getWho(email) {
  return email || "anonymous";
}

// ✅ Per-user attempt read
function readQuizAttempt(quizId, email) {
  const who = getWho(email);
  const key = `quizAttempt:${who}:${quizId}`;
  const attempt = safeJSONParse(localStorage.getItem(key));
  if (attempt) return attempt;

  // Optional legacy fallback (if ever stored differently)
  return safeJSONParse(localStorage.getItem(`quizAttempt:${quizId}`));
}

// ✅ Per-user result read (falls back to legacy global result if needed)
function readQuizResult(quizId, email) {
  const attempt = readQuizAttempt(quizId, email);
  if (attempt) {
    return {
      score: attempt.score,
      maxScore: attempt.maxScore,
      submittedAt: attempt.submittedAt,
      passed: attempt.passed,
      questions: attempt.questions,
    };
  }

  const who = getWho(email);
  return (
    safeJSONParse(localStorage.getItem(`quizResult:${who}:${quizId}`)) ||
    safeJSONParse(localStorage.getItem(`quizResult:${quizId}`)) // legacy fallback
  );
}

function readAssignmentSubmission(assignmentId) {
  return safeJSONParse(localStorage.getItem(`assignmentSubmission:${assignmentId}`));
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

export default function StudentMetrics() {
  // ✅ Fix broken fallback
  const meEmail = getCurrentUser()?.email || "anonymous";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  // Expand/collapse per course
  const [openCourse, setOpenCourse] = useState({}); // { [courseId]: boolean }
  const [openQuizDetails, setOpenQuizDetails] = useState({}); // { [quizId]: boolean }

  // Recompute metrics on storage events
  const [metricsVersion, setMetricsVersion] = useState(0);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const [cRes, aRes, qRes] = await Promise.all([
          fetch("/data/courseDetails.json"),
          fetch("/data/assignmentData.json"),
          fetch("/data/quizData.json"),
        ]);

        if (!cRes.ok) throw new Error("Failed to load courseDetails.json");
        if (!aRes.ok) throw new Error("Failed to load assignmentData.json");
        if (!qRes.ok) throw new Error("Failed to load quizData.json");

        const [cJson, aJson, qJson] = await Promise.all([
          cRes.json(),
          aRes.json(),
          qRes.json(),
        ]);

        if (!alive) return;

        setCourses(Array.isArray(cJson) ? cJson : []);
        setAssignments(Array.isArray(aJson) ? aJson : []);
        setQuizzes(Array.isArray(qJson) ? qJson : []);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Failed to load metrics.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Enrolled courseIds for the signed-in student (from user profile)
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);

  useEffect(() => {
    const refreshEnrollments = () => {
      const me = getCurrentUser();
      if (!me?.email) {
        setEnrolledCourseIds([]);
        return;
      }

      const full = getUserByEmail(me.email) || me;
      const ids = Array.isArray(full.coursesEnrolled) ? full.coursesEnrolled : [];
      setEnrolledCourseIds(ids);
    };

    refreshEnrollments();
    window.addEventListener("session-changed", refreshEnrollments);
    window.addEventListener("users-changed", refreshEnrollments);

    return () => {
      window.removeEventListener("session-changed", refreshEnrollments);
      window.removeEventListener("users-changed", refreshEnrollments);
    };
  }, []);

  // Refresh dashboard when quizzes/assignments update
  useEffect(() => {
    const bump = () => setMetricsVersion((v) => v + 1);

    window.addEventListener("metrics-changed", bump);

    const onStorage = (e) => {
      if (!e?.key) return;
      if (
        e.key.startsWith("quizAttempt:") ||
        e.key.startsWith("quizResult:") ||
        e.key.startsWith("assignmentSubmission:")
      ) {
        bump();
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("metrics-changed", bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const enrolledCourses = useMemo(() => {
    return courses.filter((c) => enrolledCourseIds.includes(c.id));
  }, [courses, enrolledCourseIds]);

  // Build metrics per course
  const courseMetrics = useMemo(() => {
    return enrolledCourses.map((c) => {
      const aFor = assignments.filter((a) => a.courseId === c.id);
      const qFor = quizzes.filter((q) => q.courseId === c.id);

      // Completed = assignment submission exists OR quiz result exists
      const aDone = aFor.filter((a) => !!readAssignmentSubmission(a.id));
      const qDone = qFor.filter((q) => !!readQuizResult(q.id, meEmail));

      const totalTrackable = aFor.length + qFor.length;
      const completedTrackable = aDone.length + qDone.length;
      const progressPct =
        totalTrackable === 0
          ? 0
          : Math.round((completedTrackable / totalTrackable) * 100);

      // Group into modules (by moduleTitle if present, else "General")
      const moduleMap = new Map();

      function ensureModule(name) {
        const key = name || "General";
        if (!moduleMap.has(key))
          moduleMap.set(key, { moduleTitle: key, quizzes: [], assignments: [] });
        return moduleMap.get(key);
      }

      qFor.forEach((q) => {
        const mod = ensureModule(q.moduleTitle || q.module || q.sectionTitle || "General");
        const result = readQuizResult(q.id, meEmail);
        mod.quizzes.push({
          ...q,
          completed: !!result,
          score: result?.score ?? null,
          maxScore: result?.maxScore ?? q.maxScore ?? null,
          completedAt: result?.submittedAt ?? null,
        });
      });

      aFor.forEach((a) => {
        const mod = ensureModule(a.moduleTitle || a.module || a.sectionTitle || "General");
        const sub = readAssignmentSubmission(a.id);
        mod.assignments.push({
          ...a,
          completed: !!sub,
          completedAt: sub?.submittedAt ?? null,
          score: sub?.score ?? null,
        });
      });

      const modules = Array.from(moduleMap.values()).map((m) => {
        const quizzesSorted = [...m.quizzes].sort(
          (x, y) => Number(y.completed) - Number(x.completed)
        );
        const assignmentsSorted = [...m.assignments].sort(
          (x, y) => Number(y.completed) - Number(x.completed)
        );
        return { ...m, quizzes: quizzesSorted, assignments: assignmentsSorted };
      });

      // Optional: stable module ordering (General last)
      modules.sort((a, b) => {
        if (a.moduleTitle === "General") return 1;
        if (b.moduleTitle === "General") return -1;
        return a.moduleTitle.localeCompare(b.moduleTitle);
      });

      return {
        course: c,
        progressPct,
        completedTrackable,
        totalTrackable,
        modules,
      };
    });
  }, [enrolledCourses, assignments, quizzes, metricsVersion, meEmail]);

  const toggleCourse = (courseId) => {
    setOpenCourse((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  if (loading) {
    return (
      <div className="sm-page">
        <div className="sm-card">
          <h2 className="sm-title">My Dashboard</h2>
          <p className="sm-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="sm-page">
        <div className="sm-card">
          <h2 className="sm-title">My Dashboard</h2>
          <p className="sm-alert sm-alert--err">{err}</p>
          <Link to="/" className="sm-link">
            ← Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sm-page">
      <div className="sm-card">
        <div className="sm-header">
          <h2 className="sm-title">My Dashboard</h2>
          <Link to="/" className="sm-link">
            ← Back
          </Link>
        </div>

        {courseMetrics.length === 0 ? (
          <div className="sm-empty">
            <p className="sm-muted">No enrolled courses found.</p>
            <p className="sm-muted">Enroll in a course first to see progress and tracking.</p>
          </div>
        ) : (
          <div className="sm-list">
            {courseMetrics.map((cm) => {
              const c = cm.course;
              const isOpen = !!openCourse[c.id];

              return (
                <section key={c.id} className="sm-course">
                  <button
                    type="button"
                    className="sm-courseHead"
                    onClick={() => toggleCourse(c.id)}
                    aria-expanded={isOpen}
                  >
                    <div className="sm-courseLeft">
                      <div className="sm-courseTitle">{c.title}</div>
                      <div className="sm-courseMeta">
                        Completed {cm.completedTrackable}/{cm.totalTrackable} (Quizzes + Assignments)
                      </div>
                    </div>

                    <div className="sm-courseRight">
                      <div className="sm-progressNum">{cm.progressPct}%</div>
                      <div className={`sm-chevron ${isOpen ? "open" : ""}`}>▾</div>
                    </div>
                  </button>

                  <div
                    className="sm-progressBar"
                    role="progressbar"
                    aria-valuenow={cm.progressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="sm-progressFill" style={{ width: `${cm.progressPct}%` }} />
                  </div>

                  {isOpen && (
                    <div className="sm-courseBody">
                      {cm.modules.map((m) => (
                        <div key={m.moduleTitle} className="sm-module">
                          <div className="sm-moduleHead">
                            <div className="sm-moduleTitle">{m.moduleTitle}</div>
                            <div className="sm-moduleCounts">
                              {m.assignments.length} assignments • {m.quizzes.length} quizzes
                            </div>
                          </div>

                          {/* Assignments */}
                          {m.assignments.length > 0 && (
                            <div className="sm-block">
                              <div className="sm-blockTitle">Assignments</div>
                              <ul className="sm-items">
                                {m.assignments.map((a) => (
                                  <li
                                    key={a.id}
                                    className={`sm-item ${a.completed ? "done" : ""}`}
                                  >
                                    <div className="sm-itemMain">
                                      <div className="sm-itemTitle">
                                        <span className="sm-tag sm-tag--assignment">📘</span>
                                        {a.title}
                                      </div>
                                      <div className="sm-itemSub">
                                        Completion:{" "}
                                        <b>
                                          {a.completed
                                            ? fmtDateTime(a.completedAt)
                                            : "Not completed"}
                                        </b>
                                      </div>
                                    </div>

                                    <div className="sm-itemRight">
                                      <span
                                        className={`sm-status ${
                                          a.completed ? "ok" : "muted"
                                        }`}
                                      >
                                        {a.completed ? "Completed" : "Pending"}
                                      </span>

                                      <Link
                                        to={`/assignment/${a.id}`}
                                        className="sm-open"
                                        rel="noopener noreferrer"
                                      >
                                        Open
                                      </Link>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Quizzes */}
                          {m.quizzes.length > 0 && (
                            <div className="sm-block">
                              <div className="sm-blockTitle">Quizzes</div>
                              <ul className="sm-items">
                                {m.quizzes.map((q) => (
                                  <li
                                    key={q.id}
                                    className={`sm-item ${q.completed ? "done" : ""}`}
                                  >
                                    <div className="sm-itemMain">
                                      <div className="sm-itemTitle">
                                        <span className="sm-tag sm-tag--quiz">📝</span>
                                        {q.title}
                                      </div>
                                      <div className="sm-itemSub">
                                        Score:{" "}
                                        <b>
                                          {q.completed
                                            ? `${q.score ?? 0} / ${q.maxScore ?? "—"}`
                                            : "—"}
                                        </b>{" "}
                                        • Completion:{" "}
                                        <b>
                                          {q.completed
                                            ? fmtDateTime(q.completedAt)
                                            : "Not completed"}
                                        </b>
                                      </div>
                                    </div>

                                    <div className="sm-itemRight">
                                      <span
                                        className={`sm-status ${
                                          q.completed ? "ok" : "muted"
                                        }`}
                                      >
                                        {q.completed ? "Completed" : "Pending"}
                                      </span>

                                      {q.completed && (
                                        <button
                                          type="button"
                                          className="sm-open"
                                          style={{ border: "none", cursor: "pointer" }}
                                          onClick={() =>
                                            setOpenQuizDetails((prev) => ({
                                              ...prev,
                                              [q.id]: !prev[q.id],
                                            }))
                                          }
                                        >
                                          {openQuizDetails[q.id]
                                            ? "Hide Details"
                                            : "View Details"}
                                        </button>
                                      )}

                                      <Link
                                        to={`/quiz/${q.id}`}
                                        className="sm-open"
                                        rel="noopener noreferrer"
                                      >
                                        Open
                                      </Link>
                                    </div>

                                    {/* ✅ Detailed attempt view */}
                                    {q.completed && openQuizDetails[q.id] && (
                                      <div
                                        className="sm-quizDetails"
                                        style={{
                                          marginTop: 10,
                                          padding: 10,
                                          border: "1px solid #e5e7eb",
                                          borderRadius: 10,
                                          background: "#fafafa",
                                          width: "100%",
                                        }}
                                      >
                                        {(() => {
                                          const attempt = readQuizAttempt(q.id, meEmail);

                                          if (!attempt?.questions?.length) {
                                            return (
                                              <div className="sm-muted">
                                                No detailed attempt data found.
                                              </div>
                                            );
                                          }

                                          return (
                                            <div>
                                              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                                                Quiz Attempt Review
                                              </div>
                                              <div style={{ fontSize: 13, marginBottom: 8 }}>
                                                Score: <b>{attempt.score}</b> /{" "}
                                                <b>{attempt.maxScore}</b> • Status:{" "}
                                                <b>{attempt.passed ? "Passed" : "Not Passed"}</b>
                                              </div>

                                              <ol style={{ margin: 0, paddingLeft: 18 }}>
                                                {attempt.questions.map((qq) => {
                                                  const optMap = new Map(
                                                    (qq.options || []).map((o) => [o.oid, o.text])
                                                  );

                                                  const chosen = (qq.selectedOptionIds || []).map(
                                                    (oid) =>
                                                      `${oid}. ${optMap.get(oid) || ""}`.trim()
                                                  );

                                                  const correct = (qq.correctOptionIds || []).map(
                                                    (oid) =>
                                                      `${oid}. ${optMap.get(oid) || ""}`.trim()
                                                  );

                                                  const isCorrect =
                                                    JSON.stringify(
                                                      [...(qq.selectedOptionIds || [])].sort()
                                                    ) ===
                                                    JSON.stringify(
                                                      [...(qq.correctOptionIds || [])].sort()
                                                    );

                                                  return (
                                                    <li key={qq.qid} style={{ marginBottom: 10 }}>
                                                      <div style={{ fontWeight: 600 }}>
                                                        {qq.text}
                                                      </div>
                                                      <div style={{ fontSize: 13, marginTop: 4 }}>
                                                        <div>
                                                          <b>Your Answer:</b>{" "}
                                                          {chosen.length ? chosen.join(", ") : "—"}
                                                        </div>
                                                        <div>
                                                          <b>Correct Answer:</b>{" "}
                                                          {correct.length ? correct.join(", ") : "—"}
                                                        </div>
                                                        <div>
                                                          <b>Result:</b>{" "}
                                                          <span
                                                            style={{
                                                              color: isCorrect
                                                                ? "#065f46"
                                                                : "#9b1c1c",
                                                            }}
                                                          >
                                                            {isCorrect ? "Correct" : "Incorrect"}
                                                          </span>
                                                        </div>
                                                      </div>
                                                    </li>
                                                  );
                                                })}
                                              </ol>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
