// StudentMetrics.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/studentMetrics.css";
import { getAuthHeader, requireAuth } from "../lib/authLocal"; // keep as-is

// ✅ Do NOT change base/URLs as requested
const API_BASE = "http://localhost:8000/edstream";

function readAuthUser() {
  try {
    const raw = localStorage.getItem("auth_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} ${url}${text ? ` — ${text}` : ""}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function fmt(iso) {
  try {
    return iso ? new Date(iso).toLocaleString() : "—";
  } catch {
    return "—";
  }
}

export default function StudentMetrics() {
  const navigate = useNavigate();
  useEffect(() => {
    requireAuth(navigate, "/auth");
  }, [navigate]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Full course docs (not just ids)
  const [courses, setCourses] = useState([]);

  // courseId -> { quizzes:[], assignments:[] }
  const [workMap, setWorkMap] = useState({});

  // Submissions (latest per user)
  const [quizSubs, setQuizSubs] = useState({});     // { [quizId]: {score,maxScore,passingScore,passed,submittedAt,answers?} | null }
  const [assignSubs, setAssignSubs] = useState({}); // { [assnId]: {submittedAt,status,link,fileName,fileUrl,score,feedback} | null }

  // Expanders
  const [openCourse, setOpenCourse] = useState({});
  const toggleCourse = (cid) => setOpenCourse((p) => ({ ...p, [cid]: !p[cid] }));

  // ---------- Detail toggles & caches ----------
  const [openQuizDetails, setOpenQuizDetails] = useState({}); // { [quizId]: boolean }
  const [openAssignmentDetails, setOpenAssignmentDetails] = useState({}); // { [assnId]: boolean }

  const [quizDetailsCache, setQuizDetailsCache] = useState({});   // { [quizId]: { quiz, submission } }
  const [quizDetailsLoading, setQuizDetailsLoading] = useState({}); // { [quizId]: boolean }
  const [quizDetailsError, setQuizDetailsError] = useState({});     // { [quizId]: string }

  const [assignmentDetailsCache, setAssignmentDetailsCache] = useState({}); // { [id]: AssignmentDoc }
  const [assignmentDetailsLoading, setAssignmentDetailsLoading] = useState({});
  const [assignmentDetailsError, setAssignmentDetailsError] = useState({});

  // -------- Fetchers for details --------

  // Quiz details + latest submission (answers)
  const ensureQuizDetailsLoaded = async (quizId) => {
    if (quizDetailsCache[quizId]) return;

    setQuizDetailsLoading((p) => ({ ...p, [quizId]: true }));
    setQuizDetailsError((p) => ({ ...p, [quizId]: "" }));

    try {
      // 1) Quiz document (questions, options)
      const quizJson = await fetchJSON(`${API_BASE}/quizzes/${quizId}`);
      const quizDoc = quizJson?.data ?? quizJson;

      // 2) Latest submission (answers with picked & correct indexes)
      const subJson = await fetchJSON(`${API_BASE}/quizzes/${quizId}/my-latest-submission`);
      const submission = subJson?.data ?? subJson;

      setQuizDetailsCache((prev) => ({
        ...prev,
        [quizId]: { quiz: quizDoc, submission },
      }));
    } catch (e) {
      setQuizDetailsError((p) => ({
        ...p,
        [quizId]: e?.message || "Failed to load quiz details",
      }));
    } finally {
      setQuizDetailsLoading((p) => ({ ...p, [quizId]: false }));
    }
  };

  // Assignment details (Assignment doc)
  const ensureAssignmentDetailsLoaded = async (assignmentId) => {
    if (assignmentDetailsCache[assignmentId]) return;

    setAssignmentDetailsLoading((p) => ({ ...p, [assignmentId]: true }));
    setAssignmentDetailsError((p) => ({ ...p, [assignmentId]: "" }));

    try {
      const json = await fetchJSON(`${API_BASE}/assignments/${assignmentId}`);
      const doc = json?.data ?? json;
      setAssignmentDetailsCache((p) => ({ ...p, [assignmentId]: doc }));
    } catch (e) {
      setAssignmentDetailsError((p) => ({
        ...p,
        [assignmentId]: e?.message || "Failed to load assignment details",
      }));
    } finally {
      setAssignmentDetailsLoading((p) => ({ ...p, [assignmentId]: false }));
    }
  };

  // ⚠️ NEW: On-demand fetch of the user's assignment submission if needed
  const ensureMyAssignmentSubmissionLoaded = async (assignmentId) => {
    if (assignSubs[assignmentId]) return; // already have it
    try {
      const subJson = await fetchJSON(`${API_BASE}/assignments/${assignmentId}/my-submission`);
      const submission = subJson?.data ?? subJson;
      setAssignSubs((prev) => ({ ...prev, [assignmentId]: submission || null }));
    } catch {
      // leave as is if not found
    }
  };

  // Load learner → courses → work → submissions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // 1) read auth_user._id
        const me = readAuthUser();
        const userId = me?._id;
        if (!userId) throw new Error("No authenticated user session found.");

        // 2) fetch learner + full courses
        const learnerJson = await fetchJSON(`${API_BASE}/learners/by-user/${userId}`);
        const learner = learnerJson?.data ?? learnerJson;
        const fullCourses = Array.isArray(learner?.courses) ? learner.courses : [];
        if (cancelled) return;
        setCourses(fullCourses);

        // 3) for each course, load work (quizzes+assignments)
        const workResults = await Promise.all(
          fullCourses.map((c) =>
            fetchJSON(`${API_BASE}/coursework/${c.id || c._id}/work`)
              .then((j) => ({ id: c.id || c._id, ok: true, data: j?.data ?? j }))
              .catch((e) => ({ id: c.id || c._id, ok: false, error: e?.message || "Failed" }))
          )
        );

        const nextWorkMap = {};
        for (const r of workResults) {
          nextWorkMap[String(r.id)] = r.ok
            ? {
                quizzes: Array.isArray(r.data?.quizzes) ? r.data.quizzes : [],
                assignments: Array.isArray(r.data?.assignments) ? r.data.assignments : [],
              }
            : { quizzes: [], assignments: [], error: r.error };
        }
        if (cancelled) return;
        setWorkMap(nextWorkMap);

        // 4) submissions for all items
        const allQuizIds = Object.values(nextWorkMap).flatMap((w) => w.quizzes.map((q) => q.id));
        const allAssignIds = Object.values(nextWorkMap).flatMap((w) => w.assignments.map((a) => a.id));

        const qFetches = allQuizIds.map((qid) =>
          fetchJSON(`${API_BASE}/quizzes/${qid}/my-latest-submission`)
            .then((j) => ({ id: qid, ok: true, data: j?.data ?? j }))
            .catch(() => ({ id: qid, ok: false, data: null }))
        );
        const aFetches = allAssignIds.map((aid) =>
          fetchJSON(`${API_BASE}/assignments/${aid}/my-submission`)
            .then((j) => ({ id: aid, ok: true, data: j?.data ?? j }))
            .catch(() => ({ id: aid, ok: false, data: null }))
        );

        const [qSubs, aSubs] = await Promise.all([Promise.all(qFetches), Promise.all(aFetches)]);

        const nextQuizSubs = {};
        qSubs.forEach((r) => (nextQuizSubs[r.id] = r.ok ? r.data : null));
        const nextAssignSubs = {};
        aSubs.forEach((r) => (nextAssignSubs[r.id] = r.ok ? r.data : null));

        if (cancelled) return;
        setQuizSubs(nextQuizSubs);
        setAssignSubs(nextAssignSubs);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build view: we already have full course docs in `courses`
  const coursesForUI = useMemo(
    () =>
      courses.map((c) => ({
        id: String(c.id || c._id),
        title: c.title || `Course ${c.id || c._id}`,
      })),
    [courses]
  );

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
          <Link to="/" className="sm-link">← Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sm-page">
      <div className="sm-card">
        <div className="sm-header">
          <h2 className="sm-title">My Dashboard</h2>
          <Link to="/" className="sm-link">← Back</Link>
        </div>

        {coursesForUI.length === 0 ? (
          <div className="sm-empty"><p className="sm-muted">No enrolled courses found.</p></div>
        ) : (
          <div className="sm-list">
            {coursesForUI.map((c) => {
              const cid = c.id;
              const isOpen = !!openCourse[cid];
              const work = workMap[cid] || { quizzes: [], assignments: [] };

              const aDone = work.assignments.filter((a) => !!assignSubs[a.id]);
              const qDone = work.quizzes.filter((q) => !!quizSubs[q.id]);
              const total = work.assignments.length + work.quizzes.length;
              const done = aDone.length + qDone.length;
              const pct = total === 0 ? 0 : Math.round((done / total) * 100);

              return (
                <section key={cid} className="sm-course">
                  <button
                    type="button"
                    className="sm-courseHead"
                    onClick={() => toggleCourse(cid)}
                    aria-expanded={isOpen}
                  >
                    <div className="sm-courseLeft">
                      <div className="sm-courseTitle">{c.title}</div>
                      <div className="sm-courseMeta">
                        Completed {done}/{total} (Quizzes + Assignments)
                      </div>
                    </div>
                    <div className="sm-courseRight">
                      <div className="sm-progressNum">{pct}%</div>
                      <div className={`sm-chevron ${isOpen ? "open" : ""}`}>▾</div>
                    </div>
                  </button>

                  <div
                    className="sm-progressBar"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="sm-progressFill" style={{ width: `${pct}%` }} />
                  </div>

                  {isOpen && (
                    <div className="sm-courseBody">
                      {/* ---------------- ASSIGNMENTS ---------------- */}
                      {work.assignments.length > 0 && (
                        <div className="sm-block">
                          <div className="sm-blockTitle">Assignments</div>
                          <ul className="sm-items">
                            {work.assignments.map((a) => {
                              const sub = assignSubs[a.id] || null;
                              const completed = !!sub;
                              const detailsOpen = !!openAssignmentDetails[a.id];
                              return (
                                <li key={a.id} className={`sm-item ${completed ? "done" : ""}`}>
                                  <div className="sm-itemMain">
                                    <div className="sm-itemTitle">
                                      <span className="sm-tag sm-tag--assignment">📘</span>
                                      {a.title}
                                    </div>
                                    <div className="sm-itemSub">
                                      Completion: <b>{completed ? fmt(sub.submittedAt) : "Not completed"}</b>
                                      {completed && sub?.status ? <> • Status: <b>{sub.status}</b></> : null}
                                    </div>
                                  </div>

                                  <div className="sm-itemRight">
                                    <span className={`sm-status ${completed ? "ok" : "muted"}`}>
                                      {completed ? "Completed" : "Pending"}
                                    </span>

                                    {/* Completed -> View Details; else -> Open */}
                                    {completed ? (
                                      <button
                                        type="button"
                                        className="sm-open"
                                        style={{ border: "none", cursor: "pointer" }}
                                        onClick={async () => {
                                          const next = !detailsOpen;
                                          setOpenAssignmentDetails((p) => ({ ...p, [a.id]: next }));
                                          if (next) {
                                            // ensure both assignment doc & my-submission are available
                                            await Promise.all([
                                              ensureAssignmentDetailsLoaded(a.id),
                                              ensureMyAssignmentSubmissionLoaded(a.id),
                                            ]);
                                          }
                                        }}
                                      >
                                        {detailsOpen ? "Hide Details" : "View Details"}
                                      </button>
                                    ) : (
                                      <Link to={`/assignment/${a.id}`} className="sm-open" rel="noopener noreferrer">
                                        Open
                                      </Link>
                                    )}
                                  </div>

                                  {/* Inline details panel for Assignments (now includes submission info) */}
                                  {completed && detailsOpen && (
                                    <div
                                      className="sm-assignmentDetails"
                                      style={{
                                        marginTop: 10,
                                        padding: 10,
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 10,
                                        background: "#fafafa",
                                        width: "100%",
                                      }}
                                    >
                                      {assignmentDetailsLoading[a.id] ? (
                                        <div className="sm-muted">Loading assignment details…</div>
                                      ) : assignmentDetailsError[a.id] ? (
                                        <div className="sm-muted">{assignmentDetailsError[a.id]}</div>
                                      ) : (() => {
                                        const doc = assignmentDetailsCache[a.id] || null;
                                        const mySub = assignSubs[a.id] || null;

                                        return (
                                          <div>
                                            <div style={{ fontWeight: 700, marginBottom: 8 }}>Assignment</div>
                                            <div style={{ fontSize: 13, marginBottom: 8 }}>
                                              <div><b>Title:</b> {doc?.title || "—"}</div>
                                              <div><b>Estimated Time:</b> {doc?.estimatedMinutes ?? "—"} mins</div>
                                              <div><b>Max Score:</b> {doc?.maxScore ?? "—"}</div>
                                              <div><b>Passing Score:</b> {doc?.passingScore ?? "—"}</div>
                                              {doc?.attachmentName ? <div><b>Attachment:</b> {doc.attachmentName}</div> : null}
                                            </div>

                                            {doc?.description ? (
                                              <div style={{ marginTop: 10 }}>
                                                <div style={{ fontWeight: 700 }}>Instructions</div>
                                                <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
                                                  {doc.description}
                                                </div>
                                              </div>
                                            ) : null}

                                            {/* --- NEW: My Submission section (fileName, fileUrl, status, etc.) --- */}
                                            <div style={{ marginTop: 14 }}>
                                              <div style={{ fontWeight: 700, marginBottom: 6 }}>My Submission</div>
                                              {!mySub ? (
                                                <div className="sm-muted">No submission found.</div>
                                              ) : (
                                                <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                                                  <div><b>Submitted At:</b> {fmt(mySub.submittedAt)}</div>
                                                  <div><b>Status:</b> {mySub.status ?? "—"}</div>
                                                  {mySub.link ? (
                                                    <div>
                                                      <b>Link:</b>{" "}
                                                      <a href={mySub.link} target="_blank" rel="noreferrer">
                                                        {mySub.link}
                                                      </a>
                                                    </div>
                                                  ) : null}
                                                  {mySub.fileName ? <div><b>File Name:</b> {mySub.fileName}</div> : null}
                                                  {mySub.fileUrl ? (
                                                    <div>
                                                      <b>File URL:</b>{" "}
                                                      <a href={mySub.fileUrl} target="_blank" rel="noreferrer">
                                                        {mySub.fileUrl}
                                                      </a>
                                                    </div>
                                                  ) : null}
                                                  {mySub.score != null ? <div><b>Score:</b> {mySub.score}</div> : null}
                                                  {mySub.feedback ? <div><b>Feedback:</b> {mySub.feedback}</div> : null}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {/* ---------------- QUIZZES ---------------- */}
                      {work.quizzes.length > 0 && (
                        <div className="sm-block">
                          <div className="sm-blockTitle">Quizzes</div>
                          <ul className="sm-items">
                            {work.quizzes.map((q) => {
                              const sub = quizSubs[q.id] || null;
                              const completed = !!sub;
                              const detailsOpen = !!openQuizDetails[q.id];
                              const max = sub?.maxScore ?? q.maxScore ?? "—";
                              return (
                                <li key={q.id} className={`sm-item ${completed ? "done" : ""}`}>
                                  <div className="sm-itemMain">
                                    <div className="sm-itemTitle">
                                      <span className="sm-tag sm-tag--quiz">📝</span>
                                      {q.title}
                                    </div>
                                    <div className="sm-itemSub">
                                      Score: <b>{completed ? `${sub.score ?? 0} / ${max}` : "—"}</b> • Completion:{" "}
                                      <b>{completed ? fmt(sub.submittedAt) : "Not completed"}</b>
                                    </div>
                                  </div>

                                  <div className="sm-itemRight">
                                    <span className={`sm-status ${completed ? "ok" : "muted"}`}>
                                      {completed ? "Completed" : "Pending"}
                                    </span>

                                    {/* Completed -> View Details; else -> Open */}
                                    {completed ? (
                                      <button
                                        type="button"
                                        className="sm-open"
                                        style={{ border: "none", cursor: "pointer" }}
                                        onClick={async () => {
                                          const next = !detailsOpen;
                                          setOpenQuizDetails((prev) => ({ ...prev, [q.id]: next }));
                                          if (next) await ensureQuizDetailsLoaded(q.id);
                                        }}
                                      >
                                        {detailsOpen ? "Hide Details" : "View Details"}
                                      </button>
                                    ) : (
                                      <Link to={`/quiz/${q.id}`} className="sm-open" rel="noopener noreferrer">
                                        Open
                                      </Link>
                                    )}
                                  </div>

                                  {/* Inline details panel for Quizzes (with answers) */}
                                  {completed && detailsOpen && (
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
                                      {quizDetailsLoading[q.id] ? (
                                        <div className="sm-muted">Loading quiz details…</div>
                                      ) : quizDetailsError[q.id] ? (
                                        <div className="sm-muted">{quizDetailsError[q.id]}</div>
                                      ) : (() => {
                                        const data = quizDetailsCache[q.id];
                                        if (!data) return <div className="sm-muted">No detailed quiz data found.</div>;

                                        const quizDoc = data.quiz;
                                        const submission = data.submission;

                                        const questions = Array.isArray(quizDoc?.quiz?.questions)
                                          ? quizDoc.quiz.questions
                                          : [];
                                        const answers = Array.isArray(submission?.answers)
                                          ? submission.answers
                                          : [];

                                        // Compute total points (prefer doc.maxScore if present)
                                        const totalPts =
                                          Number.isFinite(Number(quizDoc?.maxScore))
                                            ? Number(quizDoc.maxScore)
                                            : questions.reduce((s, qq) => s + (Number(qq.points) || 0), 0);

                                        return (
                                          <div>
                                            <div style={{ fontWeight: 700, marginBottom: 8 }}>Quiz</div>
                                            <div style={{ fontSize: 13, marginBottom: 8 }}>
                                              <div><b>Title:</b> {quizDoc.title || "—"}</div>
                                              <div><b>Estimated Time:</b> {quizDoc.estimatedMinutes ?? "—"} mins</div>
                                              <div><b>Max Score:</b> {totalPts}</div>
                                              <div><b>Passing Score:</b> {quizDoc.passingScore ?? "—"}</div>
                                              <div><b>Shuffle Questions:</b> {quizDoc?.quiz?.shuffleQuestions ? "Yes" : "No"}</div>
                                              <div style={{ marginTop: 6 }}>
                                                <b>Your Score:</b> {submission?.score ?? 0} / {submission?.maxScore ?? totalPts} •{" "}
                                                <b>Status:</b> {submission?.passed ? "Passed" : "Not Passed"}
                                              </div>
                                            </div>

                                            <div style={{ marginTop: 12 }}>
                                              <div style={{ fontWeight: 700, marginBottom: 6 }}>Questions & Answers</div>
                                              <ol style={{ margin: 0, paddingLeft: 18 }}>
                                                {questions.map((qq, index) => {
                                                  const subAns = answers.find((a) => a.qIndex === index);

                                                  const pickedIndexes = Array.isArray(subAns?.pickedSourceIndexes)
                                                    ? subAns.pickedSourceIndexes
                                                    : [];
                                                  const correctIndexes = Array.isArray(subAns?.correctSourceIndexes)
                                                    ? subAns.correctSourceIndexes
                                                    : [];

                                                  const pickedTexts = pickedIndexes.map(
                                                    (i) => qq?.options?.[i]?.text ?? "(unknown option)"
                                                  );
                                                  const correctTexts = correctIndexes.map(
                                                    (i) => qq?.options?.[i]?.text ?? "(unknown option)"
                                                  );

                                                  const awarded = Number.isFinite(Number(subAns?.awarded))
                                                    ? subAns.awarded
                                                    : 0;
                                                  const qPts = Number.isFinite(Number(subAns?.points))
                                                    ? subAns.points
                                                    : Number(qq?.points) || 0;

                                                  const isExact =
                                                    pickedIndexes.length === correctIndexes.length &&
                                                    pickedIndexes.every((p) => correctIndexes.includes(p));

                                                  return (
                                                    <li key={index} style={{ marginBottom: 14 }}>
                                                      <div style={{ fontWeight: 600 }}>{qq?.title ?? `Question ${index + 1}`}</div>
                                                      <div style={{ marginTop: 4, fontSize: 13 }}>
                                                        <div>
                                                          <b>Your Answer:</b>{" "}
                                                          {pickedTexts.length ? pickedTexts.join(", ") : "—"}
                                                        </div>
                                                        <div>
                                                          <b>Correct Answer:</b>{" "}
                                                          {correctTexts.length ? correctTexts.join(", ") : "—"}
                                                        </div>
                                                        <div>
                                                          <b>Result:</b>{" "}
                                                          <span style={{ color: isExact ? "#065f46" : "#9b1c1c" }}>
                                                            {isExact ? "Correct" : "Incorrect"}
                                                          </span>{" "}
                                                          • <b>Points Awarded:</b> {awarded} / {qPts}
                                                        </div>
                                                      </div>
                                                    </li>
                                                  );
                                                })}
                                              </ol>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
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