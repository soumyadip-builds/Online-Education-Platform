// src/pages/InstructorDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/instructorMetrics.css";
import { getCurrentUser } from "../utils/session"; // session-based per-user instructor identity

const LS_USERS_KEY = "edstream_users";      // used in session.js internally [1](https://cognizantonline-my.sharepoint.com/personal/2463364_cognizant_com/Documents/Microsoft%20Copilot%20Chat%20Files/InstructorDashboard.jsx)
const LS_CREATED_COURSES_KEY = "cb_courses_v1"; // used elsewhere for created courses [2](https://cognizantonline-my.sharepoint.com/personal/2463364_cognizant_com/Documents/Microsoft%20Copilot%20Chat%20Files/StudentMetrics.jsx)

function safeJSONParse(raw, fallback = null) {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function normalize(str) {
  return (str || "").toString().trim().toLowerCase();
}

function loadCreatedCourses() {
  const raw = localStorage.getItem(LS_CREATED_COURSES_KEY) || "[]";
  const list = safeJSONParse(raw, []);
  return Array.isArray(list) ? list : [];
}

function mergeCourses(seedCourses, createdCourses) {
  const map = new Map();
  [...(seedCourses || []), ...(createdCourses || [])].forEach((c) => {
    if (c && c.id) map.set(c.id, c);
  });
  return Array.from(map.values());
}

function getAllUsers() {
  const raw = localStorage.getItem(LS_USERS_KEY) || "[]";
  const users = safeJSONParse(raw, []);
  return Array.isArray(users) ? users : [];
}

// ---------- Per-user progress readers (aligned with StudentMetrics approach) ----------
function readQuizResultFor(quizId, learnerEmail) {
  const who = learnerEmail || "anonymous";
  // Prefer result key; fallback to attempt key if present (some flows may only store attempt)
  return (
    safeJSONParse(localStorage.getItem(`quizResult:${who}:${quizId}`), null) ||
    safeJSONParse(localStorage.getItem(`quizAttempt:${who}:${quizId}`), null)
  );
}

function readAssignmentResultFor(assignmentId, learnerEmail) {
  const who = learnerEmail || "anonymous";
  return (
    safeJSONParse(localStorage.getItem(`assignmentResult:${who}:${assignmentId}`), null) ||
    safeJSONParse(localStorage.getItem(`assignmentAttempt:${who}:${assignmentId}`), null)
  );
}

/**
 * InstructorDashboard
 * - Shows instructor's courses (authored/created) per logged-in instructor
 * - On selecting a course, lists enrolled students + their progress
 */
export default function InstructorDashboard() {
  const me = getCurrentUser(); // current session user [1](https://cognizantonline-my.sharepoint.com/personal/2463364_cognizant_com/Documents/Microsoft%20Copilot%20Chat%20Files/InstructorDashboard.jsx)
  const isInstructor = normalize(me?.role) === "instructor";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [allCourses, setAllCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [version, setVersion] = useState(0); // bump to recompute progress on updates

  const currentUser = getCurrentUser();
  const backPath = currentUser?.role === "instructor" ? "/instructor-home" : "/";

  // Fetch seed courses + assignment + quiz data; merge with created courses from LS
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const [cRes, aRes, qRes] = await Promise.all([
          fetch("/data/courseDetails.json", { cache: "no-store" }),
          fetch("/data/assignmentData.json", { cache: "no-store" }),
          fetch("/data/quizData.json", { cache: "no-store" }),
        ]);

        if (!cRes.ok) throw new Error("Failed to load courseDetails.json");
        if (!aRes.ok) throw new Error("Failed to load assignmentData.json");
        if (!qRes.ok) throw new Error("Failed to load quizData.json");

        const [cJson, aJson, qJson] = await Promise.all([cRes.json(), aRes.json(), qRes.json()]);

        const seedCourses = Array.isArray(cJson) ? cJson : [];
        const createdCourses = loadCreatedCourses(); // includes instructor-created courses
        const merged = mergeCourses(seedCourses, createdCourses);

        if (!alive) return;
        setAllCourses(merged);
        setAssignments(Array.isArray(aJson) ? aJson : []);
        setQuizzes(Array.isArray(qJson) ? qJson : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load instructor dashboard.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Sync dashboard with updates (same-tab + cross-tab)
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);

    window.addEventListener("metrics-changed", bump);   // quizzes/assignments submissions trigger this [2](https://cognizantonline-my.sharepoint.com/personal/2463364_cognizant_com/Documents/Microsoft%20Copilot%20Chat%20Files/StudentMetrics.jsx)
    window.addEventListener("users-changed", bump);     // enrollment changes
    window.addEventListener("session-changed", bump);   // login/logout changes

    const onStorage = (e) => {
      if (!e?.key) return;
      if (
        e.key.startsWith("quizAttempt:") ||
        e.key.startsWith("quizResult:") ||
        e.key.startsWith("assignmentAttempt:") ||
        e.key.startsWith("assignmentResult:") ||
        e.key === LS_USERS_KEY ||
        e.key === LS_CREATED_COURSES_KEY
      ) {
        bump();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("metrics-changed", bump);
      window.removeEventListener("users-changed", bump);
      window.removeEventListener("session-changed", bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Filter instructor's own courses (authored/created) based on instructor identity (per-user)
  const instructorCourses = useMemo(() => {
    const all = Array.isArray(allCourses) ? allCourses : [];

    const myEmail = normalize(me?.email);
    const myName = normalize(me?.name);

    return all.filter((c) => {
      // published OR missing status considered ok (similar to your previous logic) [1](https://cognizantonline-my.sharepoint.com/personal/2463364_cognizant_com/Documents/Microsoft%20Copilot%20Chat%20Files/InstructorDashboard.jsx)
      const status = normalize(c.status);
      const isPublished = !status || status === "published";

      // Match by authorEmail / createdByEmail if your course objects have it,
      // else fallback to author name match (your previous dashboard used author name) [1](https://cognizantonline-my.sharepoint.com/personal/2463364_cognizant_com/Documents/Microsoft%20Copilot%20Chat%20Files/InstructorDashboard.jsx)
      const authorEmail = normalize(c.authorEmail || c.createdByEmail);
      const authorName = normalize(c.author);

      const matchesInstructor =
        (myEmail && authorEmail && authorEmail === myEmail) ||
        (myName && authorName && authorName === myName);

      return isPublished && matchesInstructor;
    });
  }, [allCourses, me?.email, me?.name, version]);

  // Auto-select first course when list changes
  useEffect(() => {
    if (!selectedCourseId && instructorCourses.length > 0) {
      setSelectedCourseId(instructorCourses[0].id);
    }
    // If selected course disappears, reset
    if (selectedCourseId && instructorCourses.length > 0) {
      const exists = instructorCourses.some((c) => c.id === selectedCourseId);
      if (!exists) setSelectedCourseId(instructorCourses[0].id);
    }
  }, [instructorCourses, selectedCourseId]);

  const selectedCourse = useMemo(() => {
    return instructorCourses.find((c) => c.id === selectedCourseId) || null;
  }, [instructorCourses, selectedCourseId]);

  // Students enrolled in selected course
  const enrolledStudents = useMemo(() => {
    if (!selectedCourseId) return [];
    const users = getAllUsers();

    return users
      .filter((u) => normalize(u.role) === "learner")
      .filter((u) => Array.isArray(u.coursesEnrolled) && u.coursesEnrolled.includes(selectedCourseId))
      .map((u) => ({
        name: u.name || "(Unnamed)",
        email: u.email || "",
        userId: u.userId,
      }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [selectedCourseId, version]);

  // Assignments/quizzes for selected course
  const courseAssignments = useMemo(() => {
    return (assignments || []).filter((a) => a.courseId === selectedCourseId);
  }, [assignments, selectedCourseId]);

  const courseQuizzes = useMemo(() => {
    return (quizzes || []).filter((q) => q.courseId === selectedCourseId);
  }, [quizzes, selectedCourseId]);

  // Compute progress for each student for selected course
  const studentProgressRows = useMemo(() => {
    const totalAssignments = courseAssignments.length;
    const totalQuizzes = courseQuizzes.length;
    const totalTrackable = totalAssignments + totalQuizzes;

    return enrolledStudents.map((s) => {
      const completedAssignments = courseAssignments.reduce((acc, a) => {
        return acc + (readAssignmentResultFor(a.id, s.email) ? 1 : 0);
      }, 0);

      const completedQuizzes = courseQuizzes.reduce((acc, q) => {
        return acc + (readQuizResultFor(q.id, s.email) ? 1 : 0);
      }, 0);

      const completedTrackable = completedAssignments + completedQuizzes;
      const pct = totalTrackable === 0 ? 0 : Math.round((completedTrackable / totalTrackable) * 100);

      return {
        ...s,
        completedAssignments,
        totalAssignments,
        completedQuizzes,
        totalQuizzes,
        completedTrackable,
        totalTrackable,
        pct,
      };
    });
  }, [enrolledStudents, courseAssignments, courseQuizzes, version]);

  // ---------------- UI ----------------
  if (!me) {
    return (
      <div className="im-page">
        <div className="im-card">
          <h2 className="im-title">Instructor Dashboard</h2>
          <p className="im-muted">Please log in to view your dashboard.</p>
          <Link className="im-link" to="/login">Go to Login</Link>
        </div>
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="im-page">
        <div className="im-card">
          <h2 className="im-title">Instructor Dashboard</h2>
          <p className="im-muted">You do not have access to this page.</p>
          <Link className="im-link" to={backPath}>← Back</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="im-page">
        <div className="im-card">
          <h2 className="im-title">Instructor Dashboard</h2>
          <p className="im-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="im-page">
        <div className="im-card">
          <h2 className="im-title">Instructor Dashboard</h2>
          <p className="im-alert im-alert--err">{err}</p>
          <Link className="im-link" to={backPath}>← Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="im-page">
      <div className="im-card">
        <div className="im-header">
          <div>
            <h2 className="im-title">Instructor Dashboard</h2>
            <div className="im-muted" style={{ marginTop: 4 }}>
              Signed in as <b>{me.name}</b> ({me.email})
            </div>
          </div>
          <Link className="im-link" to={backPath}>← Back</Link>
        </div>

        {/* Instructor’s Courses */}
        <div style={{ marginTop: 16 }}>
          <div className="im-sectionTitle">My Courses</div>

          {instructorCourses.length === 0 ? (
            <div className="im-empty">
              <p className="im-muted">No published courses found for you.</p>
              <p className="im-muted">
                Ensure the course <b>author</b> / <b>authorEmail</b> matches your profile.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              <label className="im-muted" style={{ fontWeight: 600 }}>Select Course:</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                style={{
                  height: 40,
                  borderRadius: 10,
                  padding: "0 12px",
                  border: "1px solid #e5e7eb",
                  minWidth: 280
                }}
              >
                {instructorCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>

              {selectedCourse ? (
                <div className="im-muted">
                  Trackables: <b>{courseAssignments.length}</b> assignments +{" "}
                  <b>{courseQuizzes.length}</b> quizzes
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Enrolled Students + Progress */}
        {selectedCourseId && (
          <div style={{ marginTop: 20 }}>
            <div className="im-sectionTitle">Enrolled Students & Progress</div>

            {enrolledStudents.length === 0 ? (
              <div className="im-empty">
                <p className="im-muted">No students enrolled in this course yet.</p>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: "10px 8px" }}>Student</th>
                        <th style={{ padding: "10px 8px" }}>Email</th>
                        <th style={{ padding: "10px 8px", width: 160 }}>Progress</th>
                        <th style={{ padding: "10px 8px" }}>Completed</th>
                        <th style={{ padding: "10px 8px" }}>Quizzes</th>
                        <th style={{ padding: "10px 8px" }}>Assignments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentProgressRows.map((row) => (
                        <tr key={row.email} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 8px", fontWeight: 600 }}>{row.name}</td>
                          <td style={{ padding: "10px 8px" }}>{row.email}</td>

                          <td style={{ padding: "10px 8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div
                                style={{
                                  height: 10,
                                  width: 120,
                                  background: "#eef2ff",
                                  borderRadius: 999,
                                  overflow: "hidden",
                                  border: "1px solid #e5e7eb"
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${row.pct}%`,
                                    background: "linear-gradient(90deg, #6C4BF4, #22D3EE)"
                                  }}
                                />
                              </div>
                              <div style={{ fontWeight: 700 }}>{row.pct}%</div>
                            </div>
                          </td>

                          <td style={{ padding: "10px 8px" }}>
                            {row.completedTrackable}/{row.totalTrackable}
                          </td>

                          <td style={{ padding: "10px 8px" }}>
                            {row.completedQuizzes}/{row.totalQuizzes}
                          </td>

                          <td style={{ padding: "10px 8px" }}>
                            {row.completedAssignments}/{row.totalAssignments}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* <div className="im-muted" style={{ marginTop: 10 }}>
                  Progress is computed from per-student completion keys (quizResult/assignmentResult) to match StudentMetrics behavior. [2](https://cognizantonline-my.sharepoint.com/personal/2463364_cognizant_com/Documents/Microsoft%20Copilot%20Chat%20Files/StudentMetrics.jsx)
                </div> */}
                <br></br>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}