import { useMemo, useRef, useState, useEffect } from "react";
import "../styles/coursebuilder.css"; // unified theme

import CourseModulesBuilder from "./CourseModulesBuilder";
import { ICONS, emptyModule, formatDuration } from "./courseBuilderShared";
import { getCurrentUser } from "../utils/session";
import { recordCourseCreated } from "../utils/userStorage";
import { useNavigate } from "react-router-dom";

// LocalStorage keys
const LS_KEY_COURSES = "cb_courses_v1";

// JSON helpers
const loadJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const saveJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Courses store helpers
const loadCourses = () => loadJSON(LS_KEY_COURSES, []);
const saveCourses = (list) => saveJSON(LS_KEY_COURSES, list);

// Create a course record
const lsCreateCourse = (payload) => {
  const id = "c_" + Math.random().toString(36).slice(2, 10);
  const now = new Date().toISOString();
  const created = { id, createdAt: now, updatedAt: now, ...payload };

  const list = loadCourses();
  list.push(created);
  saveCourses(list);

  return created;
};

/* ===========================
   Small Floating Toast
   (auto hides; accessible)
=========================== */
function FloatingToast({ message, type = "success", onClose }) {
  if (!message) return null;

  const isError = type === "error";

  return (
    <div
      className={`cb-toast ${isError ? "cb-toast--error" : "cb-toast--success"}`}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <div className="cb-toast__icon">
        {isError ? "⚠️" : "✅"}
      </div>
      <div className="cb-toast__text">{message}</div>
      <button
        type="button"
        className="cb-toast__close"
        aria-label="Close"
        onClick={onClose}
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export default function CourseCreation() {
  const navigate = useNavigate();

  // 🔹 FORM REFS (uncontrolled inputs for course details)
  const formRef = useRef(null);
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const thumbLinkRef = useRef(null);

  // 🔹 Minimal UI state
  const [modules, setModules] = useState(() => [emptyModule()]);
  const [outcomeKeys, setOutcomeKeys] = useState([Date.now()]);
  const [saving, setSaving] = useState(false);

  // ✅ Floating toast state (replaces InlineAlert)
  const [toast, setToast] = useState({ msg: "", type: "success" });

  // ✅ Segmented toggle UI state (visual only; real value read from FormData)
  const [publishSelected, setPublishSelected] = useState("draft");

  const showToast = (msg, type = "success", duration = 1600) => {
    setToast({ msg, type });
    if (duration > 0) {
      window.clearTimeout(showToast._t);
      showToast._t = window.setTimeout(
        () => setToast({ msg: "", type: "success" }),
        duration
      );
    }
  };

  // Allow external components to notify via a global event
  useEffect(() => {
    const handler = (e) => {
      const { msg, type = "success", duration = 1600 } = e.detail || {};
      if (msg) showToast(msg, type, duration);
    };
    window.addEventListener("cb:notify", handler);
    return () => {
      window.removeEventListener("cb:notify", handler);
      window.clearTimeout(showToast._t);
    };
  }, []);

  const addOutcome = () => setOutcomeKeys((prev) => [...prev, Date.now()]);
  const rmOutcome = (idx) =>
    setOutcomeKeys((prev) => prev.filter((_, i) => i !== idx));

  // Derived: total duration
  const totalMinutes = useMemo(
    () =>
      modules.reduce(
        (sum, m) =>
          sum +
          m.items.reduce((s, it) => s + (Number(it.estimatedMinutes) || 0), 0),
        0
      ),
    [modules]
  );

  // Derived: counts by item type
  const grouped = useMemo(() => {
    const out = { Videos: [], Documentation: [], Assignments: [], Quizzes: [] };
    modules.forEach((m) =>
      m.items.forEach((it) => {
        if (it.type === "video") out.Videos.push(it);
        else if (it.type === "reading") out.Documentation.push(it);
        else if (it.type === "assignment") out.Assignments.push(it);
        else if (it.type === "quiz") out.Quizzes.push(it);
      })
    );
    return out;
  }, [modules]);

  // Validate course (reads from uncontrolled form inputs + modules)
  const validate = (fd) => {
    const errors = [];
    const title = (fd.get("title") || "").trim();
    if (!title) errors.push("Course title is required.");

    modules.forEach((m, mi) => {
      if (!m.title.trim()) errors.push(`Module ${mi + 1}: title is required.`);
      m.items.forEach((it, ii) => {
        if (!it.title.trim())
          errors.push(`Module ${mi + 1}, item ${ii + 1}: title is required.`);

        const mins = Number(it.estimatedMinutes);
        if (!Number.isFinite(mins) || mins <= 0)
          errors.push(
            `Module ${mi + 1}, item ${ii + 1}: duration must be > 0 minutes.`
          );

        if ((it.type === "video" || it.type === "reading") && !it.url?.trim())
          errors.push(
            `Module ${mi + 1}, item ${ii + 1}: URL is required for link items.`
          );
      });
    });

    return errors;
  };

  // Save course
  const handleSave = async (e) => {
    e.preventDefault();

    const fd = new FormData(formRef.current);
    const errors = validate(fd);
    if (errors.length) {
      showToast(errors[0], "error", 2400); // show just first error for brevity
      return;
    }

    const title = (fd.get("title") || "").trim();
    const description = (fd.get("description") || "").trim();
    const publishMode = fd.get("publishMode") || "draft";
    const thumbnailMode = "link"; // upload disabled per requirement
    const thumbnailLink = (fd.get("thumbnailLink") || "").trim();
    const learningOutcomes = (fd.getAll("outcomes[]") || [])
      .map((s) => (s || "").trim())
      .filter(Boolean);

    const status = publishMode === "publish" ? "published" : "draft";
    const me = getCurrentUser();

    const courseToSave = {
      title,
      author: (me?.name ?? "").trim(),
      description,
      learningOutcomes,
      thumbnail: {
        mode: thumbnailMode,
        link: thumbnailMode === "link" ? thumbnailLink : "",
      },
      modules: modules.map((m) => ({
        ...m,
        title: m.title.trim(),
        description: (m.description ?? "").trim(),
        items: m.items.map((it) => ({
          ...it,
          title: it.title.trim(),
          url: it.url?.trim() || "",
          estimatedMinutes: Number(it.estimatedMinutes) || 0,
          refId: it.refId ?? null,
        })),
      })),
      totalEstimatedMinutes: totalMinutes,
      counts: {
        videos: grouped.Videos.length,
        documentation: grouped.Documentation.length,
        assignments: grouped.Assignments.length,
        quizzes: grouped.Quizzes.length,
      },
      status,
    };

    setSaving(true);
    try {
      const created = lsCreateCourse(courseToSave);

      if (me?.email) {
        recordCourseCreated(me.email, created.id);
      }

      window.dispatchEvent(new Event("courses-changed"));

      showToast(status === "published" ? "Course published" : "Course saved", "success");
      navigate("/instructor-home");
    } catch (err) {
      console.error(err);
      const text = err?.message || "Failed to save course.";
      showToast(text, "error", 2600);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container my-4">
      {/* Wrap header + body in ONE form so radios are part of FormData */}
      <form ref={formRef} onSubmit={handleSave}>
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white d-flex align-items-center justify-content-between">
            <h1 className="h4 mb-0 d-flex align-items-center gap-2">
              <span className="text-secondary">{ICONS.book ?? "📘"}</span>
              <span>Create Course</span>
            </h1>

            {/* Segmented Toggle (radio-based, form-friendly) */}
            <div className="seg-toggle" role="radiogroup" aria-label="Publish mode">
              <input
                type="radio"
                id="mode-publish"
                name="publishMode"
                value="publish"
                className="seg-toggle__input"
                onChange={() => setPublishSelected("publish")}
              />
              <label
                htmlFor="mode-publish"
                className={
                  "seg-toggle__btn" + (publishSelected === "publish" ? " is-active" : "")
                }
                role="radio"
                aria-checked={publishSelected === "publish"}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setPublishSelected("publish");
                    const el = document.getElementById("mode-publish");
                    if (el) el.checked = true;
                  }
                }}
              >
                Publish
              </label>

              <input
                type="radio"
                id="mode-draft"
                name="publishMode"
                value="draft"
                className="seg-toggle__input"
                defaultChecked
                onChange={() => setPublishSelected("draft")}
              />
              <label
                htmlFor="mode-draft"
                className={
                  "seg-toggle__btn" + (publishSelected === "draft" ? " is-active" : "")
                }
                role="radio"
                aria-checked={publishSelected === "draft"}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setPublishSelected("draft");
                    const el = document.getElementById("mode-draft");
                    if (el) el.checked = true;
                  }
                }}
              >
                Save as Draft
              </label>
            </div>
          </div>

          <div className="card-body">
            {/* Course Title */}
            <div className="mb-3">
              <label htmlFor="title" className="form-label">Course Title</label>
              <input
                ref={titleRef}
                type="text"
                id="title"
                name="title"
                className="form-control"
                placeholder="New Course"
                required
              />
            </div>

            {/* Description */}
            <div className="mb-3">
              <label htmlFor="description" className="form-label">Course Description</label>
              <textarea
                ref={descRef}
                id="description"
                name="description"
                className="form-control"
                placeholder="Describe what this course covers..."
                rows={4}
                defaultValue=""
              />
              <div className="form-text">Tip: Be clear and concise.</div>
            </div>

            {/* What you'll learn */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="h6 mb-0">What you’ll learn</h3>
                  <small className="text-muted">
                    Add bullet points that will be shown to students.
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => {
                    addOutcome();
                    showToast("Added learning outcome");
                  }}
                >
                  {ICONS.plus} Add bullet
                </button>
              </div>
              <div className="card-body">
                {outcomeKeys.length === 0 && (
                  <div className="text-muted mb-2">No outcomes yet.</div>
                )}
                <ul className="list-group">
                  {outcomeKeys.map((key, idx) => (
                    <li key={key} className="list-group-item d-flex align-items-center gap-2">
                      <span className="text-muted">•</span>
                      <input
                        type="text"
                        className="form-control"
                        name="outcomes[]"
                        placeholder={`Outcome ${idx + 1}`}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => {
                          rmOutcome(idx);
                          showToast("Removed learning outcome");
                        }}
                        disabled={outcomeKeys.length === 1}
                        title="Remove"
                      >
                        {ICONS.delete}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="form-text mt-2">Tip: Press Enter to quickly add a new bullet.</div>
              </div>
            </div>

            {/* Thumbnail */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white">
                <h3 className="h6 mb-0">Course Thumbnail</h3>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="thumbnailLink" className="form-label">
                    Thumbnail Link
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">URL</span>
                    <input
                      ref={thumbLinkRef}
                      type="url"
                      id="thumbnailLink"
                      name="thumbnailLink"
                      className="form-control"
                      placeholder="https://example.com/thumbnail.jpg"
                    />
                  </div>
                  <div className="form-text">Paste an image URL to preview it.</div>
                </div>

                {!!thumbLinkRef?.current?.value && (
                  <div className="border rounded p-2 cc-thumb-preview">
                    <img
                      src={thumbLinkRef.current.value}
                      alt="Thumbnail preview"
                      className="img-fluid rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div className="form-text mt-2">Preview (if the link is valid)</div>
                  </div>
                )}
              </div>
            </div>

            {/* Modules Builder */}
            <div className="mb-4 course-modules-scope">
              <CourseModulesBuilder
                modules={modules}
                setModules={setModules}
                showToast={showToast}  // 🔔 still used, now shows floating toast
              />
            </div>

            {/* Total Time */}
            <div className="d-flex align-items-center justify-content-between p-3 cc-total-bar mb-3">
              <div>
                <div className="text-muted small">Total Course Time</div>
                <div className="fw-semibold">{formatDuration(totalMinutes)}</div>
              </div>
              <div className="text-muted small">Based on item durations</div>
            </div>

            {/* Actions */}
            <div className="d-flex justify-content-end gap-2">
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving
                  ? publishSelected === "publish"
                    ? "Publishing..."
                    : "Saving..."
                  : publishSelected === "publish"
                  ? "Publish Course"
                  : "Save as Draft"}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Floating toast (global, non-blocking) */}
      <FloatingToast
        message={toast.msg}
        type={toast.type}
        onClose={() => setToast({ msg: "", type: "success" })}
      />
    </div>
  );
}