import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/mentorMetrics.css";

/**
 * MentorDashboard.jsx (updated)
 * - Displays mentor's courses loaded from /data/courseDetails.json
 * - Gracefully handles the provided structure (author, isBestseller, level, duration, tags, thumbnail)
 * - Filters by status if present; defaults to "published" when status is missing
 * - Matches mentor identity by author (name) or mentorId if present in localStorage
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
  // Expecting these to be set elsewhere in your app (optional)
  // localStorage.setItem("mentor:name", "365 Careers");
  // localStorage.setItem("mentor:id", "m_001");
  const mentorName = (localStorage.getItem("mentor:name") || "").trim();
  const mentorId = (localStorage.getItem("mentor:id") || "").trim();
  return { mentorName, mentorId };
}

function readEnrollments(courseId) {
  return safeJSONParse(localStorage.getItem(`courseEnrollments:${courseId}`), []);
}

function normalize(str) {
  return (str || "").toString().trim().toLowerCase();
}

export default function MentorDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [courses, setCourses] = useState([]);

  const { mentorName, mentorId } = getMentorIdentity();
  const mentorNameNorm = normalize(mentorName);
  const mentorIdNorm = normalize(mentorId);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // Keep your existing path. Ensure the file is located at /public/data/courseDetails.json
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

  const publishedMentorCourses = useMemo(() => {
    const all = Array.isArray(courses) ? courses : [];

    return all.filter((c) => {
      // Treat as published if c.status is missing or literally 'published'
      const status = normalize(c.status);
      const isPublished = !status || status === "published";

      // Author/mentor matching (optional). If not set, show all published.
      const byName =
        mentorNameNorm &&
        normalize(c.author) === mentorNameNorm;

      const byId =
        mentorIdNorm &&
        normalize(c.mentorId) === mentorIdNorm;

      return isPublished && (byName || byId || (!mentorNameNorm && !mentorIdNorm));
    });
  }, [courses, mentorNameNorm, mentorIdNorm]);

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
          <Link className="mm-link" to="/InstructorHomePage">← Back</Link>
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
            <div className="mm-subtitle">Published courses &amp; enrolled students</div>
          </div>
          <Link className="mm-link" to="/">← Back</Link>
        </div>

        {publishedMentorCourses.length === 0 ? (
          <div className="mm-empty">
            <p className="mm-muted">No published courses found for this mentor.</p>
            <p className="mm-muted">
              Tip: Ensure your course JSON has <b>status: "published"</b> (or omit status to treat as published) and an <b>author</b> or <b>mentorId</b> if you want to filter by identity.
            </p>
          </div>
        ) : (
          <div className="mm-courseList">
            {publishedMentorCourses.map((c) => {
              const enrollments = readEnrollments(c.id) || [];

              const learners = typeof c.learners === "number" ? c.learners : enrollments.length;
              const rating = typeof c.rating === "number" ? c.rating : undefined;

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

      {typeof learners === "number" ? (
        <span className="mm-pill">{learners.toLocaleString()} learners</span>
      ) : null}

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
                            <span className="mm-tag" key={t}>{t}</span>
                          ))}
                        </div>
                      ) : null}

                      {/* Description (short) */}
                      {c.description ? (
                        <div className="mm-courseDesc">
                          {c.description.length > 160 ? c.description.slice(0, 157) + "…" : c.description}
                        </div>
                      ) : null}

                      {/* What you'll learn (first 2 bullets) */}
                      {Array.isArray(c.whatYouWillLearn) && c.whatYouWillLearn.length > 0 ? (
                        <ul className="mm-learnList">
                          {c.whatYouWillLearn.slice(0, 2).map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      ) : null}
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
