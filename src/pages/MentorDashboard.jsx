import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/mentorMetrics.css";

/**
 * MentorDashboard.jsx
 * - Shows mentor's published courses
 * - Shows enrolled students per course
 * - Button to view each student's progress for that course
 *
 * Assumptions:
 * - courseDetails.json includes:
 *    - author OR mentorId (use whichever you have)
 *    - status: "published"
 */

function safeJSONParse(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function getMentorIdentity() {
  // ✅ Use what you actually store (change if needed)
  // Example:
  // localStorage.setItem("mentor:name", "John Doe");
  // localStorage.setItem("mentor:id", "m_001");

  const mentorName = localStorage.getItem("mentor:name") || "";
  const mentorId = localStorage.getItem("mentor:id") || "";
  return { mentorName, mentorId };
}

function readEnrollments(courseId) {
  return safeJSONParse(localStorage.getItem(`courseEnrollments:${courseId}`), []);
}

export default function MentorDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [courses, setCourses] = useState([]);

  const { mentorName, mentorId } = getMentorIdentity();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await fetch("/data/courseDetails.json");
        if (!res.ok) throw new Error("Failed to load courseDetails.json");
        const json = await res.json();

        if (!alive) return;
        setCourses(Array.isArray(json) ? json : []);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Failed to load mentor dashboard.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const publishedMentorCourses = useMemo(() => {
    const all = courses || [];
    return all.filter((c) => {
      const isPublished = (c.status || "").toLowerCase() === "published";
      const byName = mentorName && c.author === mentorName;
      const byId = mentorId && c.mentorId === mentorId;
      return isPublished && (byName || byId || (!mentorName && !mentorId)); // if not set, show all published
    });
  }, [courses, mentorName, mentorId]);

  if (loading) {
    return (
      <div className="mm-page">
        <div className="mm-card">
          <h2 className="mm-title">Mentor Dashboard</h2>
          <p className="mm-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="mm-page">
        <div className="mm-card">
          <h2 className="mm-title">Mentor Dashboard</h2>
          <div className="mm-alert mm-alert--err">{err}</div>
          <Link className="mm-link" to="/">← Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mm-page">
      <div className="mm-card">
        <div className="mm-header">
          <div>
            <h2 className="mm-title">Mentor Dashboard</h2>
            <div className="mm-subtitle">
              Published courses & enrolled students
            </div>
          </div>
          <Link className="mm-link" to="/">← Back</Link>
        </div>

        {publishedMentorCourses.length === 0 ? (
          <div className="mm-empty">
            <p className="mm-muted">No published courses found for this mentor.</p>
            <p className="mm-muted">Tip: Ensure your course JSON has <b>status: "published"</b> and mentor identity.</p>
          </div>
        ) : (
          <div className="mm-courseList">
            {publishedMentorCourses.map((c) => {
              const enrollments = readEnrollments(c.id);

              return (
                <section className="mm-course" key={c.id}>
                  <div className="mm-courseHead">
                    <div className="mm-courseLeft">
                      <div className="mm-courseTitle">{c.title}</div>
                      <div className="mm-courseMeta">
                        {enrollments.length} student{enrollments.length === 1 ? "" : "s"} enrolled
                      </div>
                    </div>

                    <div className="mm-courseRight">
                      <Link className="mm-openCourse" to={`/course/${c.id}`} target="_blank" rel="noreferrer">
                        Open Course
                      </Link>
                    </div>
                  </div>

                  <div className="mm-studentsWrap">
                    {enrollments.length === 0 ? (
                      <div className="mm-muted mm-small">No enrollments yet.</div>
                    ) : (
                      <ul className="mm-studentList">
                        {enrollments.map((s) => (
                          <li key={s.studentId} className="mm-student">
                            <div className="mm-studentLeft">
                              <div className="mm-studentName">{s.studentName || s.studentId}</div>
                              <div className="mm-studentMeta">
                                Enrolled: {s.enrolledAt ? new Date(s.enrolledAt).toLocaleString() : "—"}
                              </div>
                            </div>

                            <div className="mm-studentRight">
                              <Link
                                className="mm-btn"
                                to={`/mentor/course/${c.id}/student/${s.studentId}`}
                              >
                                View Progress
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
