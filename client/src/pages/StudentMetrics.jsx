// StudentMetrics.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/studentMetrics.css";
import { getAuthHeader, requireAuth } from "../lib/authLocal"; // adjust path if needed

const API_BASE = "http://localhost:8000/edstream"; // adjust if your server runs elsewhere

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
    headers: { Accept: "application/json", "Content-Type": "application/json", ...getAuthHeader() },
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
  try { return iso ? new Date(iso).toLocaleString() : "—"; } catch { return "—"; }
}

export default function StudentMetrics() {
  const navigate = useNavigate();
  useEffect(() => { requireAuth(navigate, "/auth"); }, [navigate]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Full course docs here (not just ids)
  const [courses, setCourses] = useState([]);

  // courseId -> { quizzes:[], assignments:[] }
  const [workMap, setWorkMap] = useState({});

  // Submissions
  const [quizSubs, setQuizSubs] = useState({});
  const [assignSubs, setAssignSubs] = useState({});

  const [openCourse, setOpenCourse] = useState({});
  const toggleCourse = (cid) => setOpenCourse((p) => ({ ...p, [cid]: !p[cid] }));

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
    return () => { cancelled = true; };
  }, []);

  // Build view: we already have full course docs in `courses`
  const coursesForUI = useMemo(
    () => courses.map((c) => ({ id: String(c.id || c._id), title: c.title || `Course ${c.id || c._id}` })),
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
                      <div className="sm-courseMeta">Completed {done}/{total} (Quizzes + Assignments)</div>
                    </div>
                    <div className="sm-courseRight">
                      <div className="sm-progressNum">{pct}%</div>
                      <div className={`sm-chevron ${isOpen ? "open" : ""}`}>▾</div>
                    </div>
                  </button>

                  <div className="sm-progressBar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="sm-progressFill" style={{ width: `${pct}%` }} />
                  </div>

                  {isOpen && (
                    <div className="sm-courseBody">
                      {/* Assignments */}
                      {work.assignments.length > 0 && (
                        <div className="sm-block">
                          <div className="sm-blockTitle">Assignments</div>
                          <ul className="sm-items">
                            {work.assignments.map((a) => {
                              const sub = assignSubs[a.id] || null;
                              const completed = !!sub;
                              return (
                                <li key={a.id} className={`sm-item ${completed ? "done" : ""}`}>
                                  <div className="sm-itemMain">
                                    <div className="sm-itemTitle">
                                      <span className="sm-tag sm-tag--assignment">📘</span>{a.title}
                                    </div>
                                    <div className="sm-itemSub">
                                      Completion: <b>{completed ? fmt(sub.submittedAt) : "Not completed"}</b>
                                      {completed && sub.status ? <> • Status: <b>{sub.status}</b></> : null}
                                    </div>
                                  </div>
                                  <div className="sm-itemRight">
                                    <span className={`sm-status ${completed ? "ok" : "muted"}`}>{completed ? "Completed" : "Pending"}</span>
                                    <Link to={`/assignment/${a.id}`} className="sm-open" rel="noopener noreferrer">Open</Link>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {/* Quizzes */}
                      {work.quizzes.length > 0 && (
                        <div className="sm-block">
                          <div className="sm-blockTitle">Quizzes</div>
                          <ul className="sm-items">
                            {work.quizzes.map((q) => {
                              const sub = quizSubs[q.id] || null;
                              const completed = !!sub;
                              const max = sub?.maxScore ?? q.maxScore ?? "—";
                              return (
                                <li key={q.id} className={`sm-item ${completed ? "done" : ""}`}>
                                  <div className="sm-itemMain">
                                    <div className="sm-itemTitle">
                                      <span className="sm-tag sm-tag--quiz">📝</span>{q.title}
                                    </div>
                                    <div className="sm-itemSub">
                                      Score: <b>{completed ? `${sub.score ?? 0} / ${max}` : "—"}</b> • Completion:{" "}
                                      <b>{completed ? fmt(sub.submittedAt) : "Not completed"}</b>
                                    </div>
                                  </div>
                                  <div className="sm-itemRight">
                                    <span className={`sm-status ${completed ? "ok" : "muted"}`}>{completed ? "Completed" : "Pending"}</span>
                                    <Link to={`/quiz/${q.id}`} className="sm-open" rel="noopener noreferrer">Open</Link>
                                  </div>
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