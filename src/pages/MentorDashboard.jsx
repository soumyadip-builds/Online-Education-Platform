import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/mentorMetrics.css";

function safeJSONParse(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function normalize(str) {
  return (str || "").toString().trim().toLowerCase();
}

function getCurrentInstructor() {
  const raw = localStorage.getItem("edstream_current_user");
  const data = safeJSONParse(raw, null);

  if (data && data.role && normalize(data.role) === "instructor" && data.name) {
    return { name: (data.name || "").trim() };
  }
  return { name: "" };
}

/** ✅ Pull learners from localStorage (edstream_users) */
function getAllLearners() {
  const raw = localStorage.getItem("edstream_users");
  const users = safeJSONParse(raw, []);
  if (!Array.isArray(users)) return [];

  return users.filter(
    (u) => normalize(u?.role) === "learner" && u?.userId && u?.name
  );
}

/** ✅ Stable dummy progress (0–100) based on studentId + courseId/title */
function dummyProgress(seed) {
  let h = 0;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  // Keep it in a friendly range (e.g., 10–95)
  return 10 + (h % 86);
}

export default function MentorDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [courses, setCourses] = useState([]);

  const { name: instructorName } = getCurrentInstructor();
  const instructorNameNorm = normalize(instructorName);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await fetch("/data/courseDetails.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load courseDetails.json");
        const json = await res.json();

        if (!alive) return;
        setCourses(Array.isArray(json) ? json : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load mentor dashboard.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  /** ✅ Filter mentor’s published courses */
  const publishedMentorCourses = useMemo(() => {
    const all = Array.isArray(courses) ? courses : [];

    return all.filter((c) => {
      const status = normalize(c.status);
      const isPublished = !status || status === "published";
      const authorMatch =
        instructorNameNorm && normalize(c.author) === instructorNameNorm;
      return isPublished && authorMatch;
    });
  }, [courses, instructorNameNorm]);

  /** ✅ Load learners once (localStorage) */
  const allLearners = useMemo(() => getAllLearners(), []);

  /** ✅ Build enrolled students for each course (by title match in coursesEnrolled) */
  const enrolledByCourseId = useMemo(() => {
    const map = new Map();

    for (const c of publishedMentorCourses) {
      const courseTitleNorm = normalize(c?.title);
      const enrolled = allLearners.filter((stu) => {
        const list = Array.isArray(stu?.coursesEnrolled) ? stu.coursesEnrolled : [];
        // "contains course name" => normalized match
        return list.some((name) => normalize(name) === courseTitleNorm);
      });

      map.set(c.id, enrolled);
    }

    return map;
  }, [publishedMentorCourses, allLearners]);

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
          <Link className="mm-link" to="/InstructorHomePage">
            ← Back
          </Link>
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
            <div className="mm-subtitle">Published courses & enrolled students</div>
          </div>
          <Link className="mm-link" to="/">
            ← Back
          </Link>
        </div>

        {publishedMentorCourses.length === 0 ? (
          <div className="mm-empty">
            <p className="mm-muted">No published courses found for this instructor.</p>
            <p className="mm-muted">
              Tip: Check <b>edstream_current_user</b> in localStorage (must have{" "}
              <code>{`{ role: "instructor", name: "..." }`}</code>) and ensure your
              course JSON has the same <b>author</b> name.
            </p>
          </div>
        ) : (
          <div className="mm-courseList">
            {publishedMentorCourses.map((c) => {
              const rating = typeof c.rating === "number" ? c.rating : undefined;

              // ✅ enrolled students for this course
              const enrolled = enrolledByCourseId.get(c.id) || [];

              // ✅ dummy progress per student + overall average
              const progressList = enrolled.map((stu) => ({
                userId: stu.userId,
                name: stu.name,
                progress: dummyProgress(`${stu.userId}|${c.id}|${c.title}`),
              }));

              const overallProgress =
                progressList.length === 0
                  ? 0
                  : Math.round(
                      progressList.reduce((sum, x) => sum + x.progress, 0) /
                        progressList.length
                    );

              return (
                <section className="mm-course" key={c.id}>
                  <div className="mm-courseHead">
                    <div className="mm-courseLeft">
                      <div className="mm-courseTitleRow no-thumb">
                        <div className="mm-courseTitleBlock">
                          <div className="mm-courseTitle">{c.title}</div>

                          <div className="mm-courseMeta">
                            {c.author ? <span className="mm-pill">{c.author}</span> : null}
                            {c.level ? <span className="mm-pill">{c.level}</span> : null}
                            {c.duration ? <span className="mm-pill">{c.duration}</span> : null}

                            {/* ❌ Removed learners pill */}

                            {typeof rating === "number" ? (
                              <span className="mm-pill">⭐ {rating.toFixed(1)}</span>
                            ) : null}

                            {c.isBestseller ? (
                              <span className="mm-badge mm-badge--gold">Bestseller</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      {Array.isArray(c.tags) && c.tags.length > 0 ? (
                        <div className="mm-tags">
                          {c.tags.map((t) => (
                            <span className="mm-tag" key={t}>
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {/* Description */}
                      {c.description ? (
                        <div className="mm-courseDesc">
                          {c.description.length > 160
                            ? c.description.slice(0, 157) + "…"
                            : c.description}
                        </div>
                      ) : null}

                      {/* What you'll learn */}
                      {Array.isArray(c.whatYouWillLearn) && c.whatYouWillLearn.length > 0 ? (
                        <ul className="mm-learnList">
                          {c.whatYouWillLearn.slice(0, 2).map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      ) : null}

                      {/* ✅ Enrolled Students Dropdown */}
                      <details className="mm-dropdown">
                        <summary className="mm-dropdownSummary">
                          Enrolled Students ({progressList.length})
                          <span className="mm-overallProgress">
                            Overall Progress: <b>{overallProgress}%</b>
                          </span>
                        </summary>

                        <div className="mm-dropdownBody">
                          {progressList.length === 0 ? (
                            <div className="mm-muted">No enrolled students found.</div>
                          ) : (
                            progressList.map((s) => (
                              <div className="mm-studentRow" key={s.userId}>
                                <div className="mm-studentTop">
                                  <span className="mm-studentName">{s.name}</span>
                                  <span className="mm-studentPercent">{s.progress}%</span>
                                </div>

                                <div className="mm-progressTrack">
                                  <div
                                    className="mm-progressFill"
                                    style={{ width: `${s.progress}%` }}
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </details>
                    </div>

                    <div className="mm-courseRight">
                      <Link className="mm-openCourse" to={`/courses/${c.id}`}>
                        Open Course
                      </Link>
                    </div>
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
