import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../styles/instructorMetrics.css";

function safeJSONParse(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return "—"; }
}

function readEnrollments(courseId) {
  return safeJSONParse(localStorage.getItem(`courseEnrollments:${courseId}`), []);
}

function readQuizResult(studentId, quizId) {
  // new per-student format
  const v = safeJSONParse(localStorage.getItem(`quizResult:${studentId}:${quizId}`), null);
  // fallback: older global key (if you used it before)
  const fallback = safeJSONParse(localStorage.getItem(`quizResult:${quizId}`), null);
  return v || fallback;
}

function readAssignmentSubmission(studentId, assignmentId) {
  const v = safeJSONParse(localStorage.getItem(`assignmentSubmission:${studentId}:${assignmentId}`), null);
  const fallback = safeJSONParse(localStorage.getItem(`assignmentSubmission:${assignmentId}`), null);
  return v || fallback;
}

export default function InstructorStudentCourseProgress() {
  const { courseId, studentId } = useParams();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

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
          cRes.json(), aRes.json(), qRes.json()
        ]);

        if (!alive) return;
        setCourses(Array.isArray(cJson) ? cJson : []);
        setAssignments(Array.isArray(aJson) ? aJson : []);
        setQuizzes(Array.isArray(qJson) ? qJson : []);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Failed to load student progress.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  const course = useMemo(() => courses.find(c => c.id === courseId) || null, [courses, courseId]);

  const studentName = useMemo(() => {
    const roster = readEnrollments(courseId);
    const s = roster.find(x => x.studentId === studentId);
    return s?.studentName || studentId;
  }, [courseId, studentId]);

  const metrics = useMemo(() => {
    const aFor = assignments.filter(a => a.courseId === courseId);
    const qFor = quizzes.filter(q => q.courseId === courseId);

    const totalTrackable = aFor.length + qFor.length;

    const aDone = aFor.filter(a => !!readAssignmentSubmission(studentId, a.id));
    const qDone = qFor.filter(q => !!readQuizResult(studentId, q.id));

    const completedTrackable = aDone.length + qDone.length;

    const progressPct = totalTrackable === 0
      ? 0
      : Math.round((completedTrackable / totalTrackable) * 100);

    // Group module-wise
    const moduleMap = new Map();

    function ensureModule(name) {
      const key = name || "General";
      if (!moduleMap.has(key)) moduleMap.set(key, { moduleTitle: key, quizzes: [], assignments: [] });
      return moduleMap.get(key);
    }

    qFor.forEach((q) => {
      const mod = ensureModule(q.moduleTitle || q.module || q.sectionTitle || "General");
      const r = readQuizResult(studentId, q.id);
      mod.quizzes.push({
        id: q.id,
        title: q.title,
        completed: !!r,
        score: r?.score ?? null,
        maxScore: r?.maxScore ?? q.maxScore ?? null,
        completedAt: r?.submittedAt ?? null,
      });
    });

    aFor.forEach((a) => {
      const mod = ensureModule(a.moduleTitle || a.module || a.sectionTitle || "General");
      const s = readAssignmentSubmission(studentId, a.id);
      mod.assignments.push({
        id: a.id,
        title: a.title,
        completed: !!s,
        completedAt: s?.submittedAt ?? null,
      });
    });

    const modules = Array.from(moduleMap.values()).sort((x, y) => x.moduleTitle.localeCompare(y.moduleTitle));

    return {
      progressPct,
      completedTrackable,
      totalTrackable,
      modules,
    };
  }, [assignments, quizzes, courseId, studentId]);

  if (loading) {
    return (
      <div className="mm-page">
        <div className="mm-card">
          <h2 className="mm-title">Student Progress</h2>
          <p className="mm-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (err || !course) {
    return (
      <div className="mm-page">
        <div className="mm-card">
          <h2 className="mm-title">Student Progress</h2>
          <div className="mm-alert mm-alert--err">{err || "Course not found"}</div>
          <Link className="mm-link" to="/instructor-dashboard">← Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mm-page">
      <div className="mm-card">
        <div className="mm-header">
          <div>
            <h2 className="mm-title">Student Progress</h2>
            <div className="mm-subtitle">
              <b>{studentName}</b> • {course.title}
            </div>
          </div>

          <div className="mm-headerActions">
            <Link className="mm-link" to="/instructor-dashboard">← Dashboard</Link>
            <Link className="mm-openCourse" to={`/course/${course.id}`} target="_blank" rel="noreferrer">
              Open Course
            </Link>
          </div>
        </div>

        <div className="mm-progressCard">
          <div className="mm-progressTop">
            <div className="mm-progressLabel">
              Overall Progress
              <span className="mm-small mm-muted">
                • Completed {metrics.completedTrackable}/{metrics.totalTrackable}
              </span>
            </div>
            <div className="mm-progressNum">{metrics.progressPct}%</div>
          </div>

          <div className="mm-progressBar" role="progressbar" aria-valuenow={metrics.progressPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="mm-progressFill" style={{ width: `${metrics.progressPct}%` }} />
          </div>
        </div>

        <div className="mm-modules">
          {metrics.modules.map((m) => (
            <section key={m.moduleTitle} className="mm-module">
              <div className="mm-moduleHead">
                <div className="mm-moduleTitle">{m.moduleTitle}</div>
                <div className="mm-moduleMeta">
                  {m.assignments.length} assignments • {m.quizzes.length} quizzes
                </div>
              </div>

              {m.assignments.length > 0 && (
                <div className="mm-block">
                  <div className="mm-blockTitle">Assignments</div>
                  <ul className="mm-items">
                    {m.assignments.map((a) => (
                      <li key={a.id} className={`mm-item ${a.completed ? "done" : ""}`}>
                        <div className="mm-itemMain">
                          <div className="mm-itemTitle">
                            <span className="mm-tag mm-tag--assignment">📘</span>
                            {a.title}
                          </div>
                          <div className="mm-itemSub">
                            Completion: <b>{a.completed ? fmtDateTime(a.completedAt) : "Not completed"}</b>
                          </div>
                        </div>
                        <div className="mm-itemRight">
                          <span className={`mm-status ${a.completed ? "ok" : "muted"}`}>
                            {a.completed ? "Completed" : "Pending"}
                          </span>
                          <Link className="mm-btn" to={`/assignment/${a.id}`} target="_blank" rel="noreferrer">
                            Open
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {m.quizzes.length > 0 && (
                <div className="mm-block">
                  <div className="mm-blockTitle">Quizzes</div>
                  <ul className="mm-items">
                    {m.quizzes.map((q) => (
                      <li key={q.id} className={`mm-item ${q.completed ? "done" : ""}`}>
                        <div className="mm-itemMain">
                          <div className="mm-itemTitle">
                            <span className="mm-tag mm-tag--quiz">📝</span>
                            {q.title}
                          </div>
                          <div className="mm-itemSub">
                            Score: <b>{q.completed ? `${q.score ?? 0} / ${q.maxScore ?? "—"}` : "—"}</b>
                            {" • "}
                            Completion: <b>{q.completed ? fmtDateTime(q.completedAt) : "Not completed"}</b>
                          </div>
                        </div>
                        <div className="mm-itemRight">
                          <span className={`mm-status ${q.completed ? "ok" : "muted"}`}>
                            {q.completed ? "Completed" : "Pending"}
                          </span>
                          <Link className="mm-btn" to={`/quiz/${q.id}`} target="_blank" rel="noreferrer">
                            Open
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}