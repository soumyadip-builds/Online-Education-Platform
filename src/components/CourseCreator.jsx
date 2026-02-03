import { useMemo, useState, useRef } from "react";
import "../styles/assignmentCard.css";
import "../styles/courseBuilder.css";

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

// Toast UI
function Toast({ message, type }) {
  return (
    <div
      className={`cb-toast cb-toast--${type}`}
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        background: type === "success" ? "#28a745" : "#d9534f",
        color: "#fff",
        padding: "10px 16px",
        borderRadius: 6,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 10000,
      }}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}

export default function CourseCreation() {
  // Course meta state
  const [title, setTitle] = useState("New Course");
  const [description, setDescription] = useState("");
  const [editingCourseTitle, setEditingCourseTitle] = useState(false);

  // Editable refs
  const courseTitleRef = useRef(null);
  const courseDescRef = useRef(null);
  
  const navigate = useNavigate();
  // Modules state
  const [modules, setModules] = useState(() => [emptyModule()]);

  // Learning outcomes state
  const [learningOutcomes, setLearningOutcomes] = useState([""]);
  const addOutcome = () => setLearningOutcomes((prev) => [...prev, ""]);
  const rmOutcome = (idx) =>
    setLearningOutcomes((prev) => prev.filter((_, i) => i !== idx));
  const patchOutcome = (idx, value) =>
    setLearningOutcomes((prev) => prev.map((v, i) => (i === idx ? value : v)));

  // Thumbnail state
  const [thumbnailMode, setThumbnailMode] = useState("link");
  const [thumbnailLink, setThumbnailLink] = useState("");

  // Toast state
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 1500);
  };

  // Save state
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [publishMode, setPublishMode] = useState("draft");

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

  // Validate course
  const validate = () => {
    const errors = [];
    if (!title.trim()) errors.push("Course title is required.");

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
  const handleSave = () => {
    setMsg({ type: "", text: "" });

    const errors = validate();
    if (errors.length) {
      setMsg({ type: "error", text: errors.join(" ") });
      return;
    }

    const cleanOutcomes = learningOutcomes
      .map((s) => (s || "").trim())
      .filter(Boolean);

    const status = publishMode === "publish" ? "published" : "draft";

    const me = getCurrentUser();
    const courseToSave = {
      title: title.trim(),
      author: (me?.name ?? "").trim(),
      description: description.trim(),
      learningOutcomes: cleanOutcomes,
      thumbnail: {
        mode: thumbnailMode,
        link: thumbnailMode === "link" ? thumbnailLink.trim() : "",
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

      setMsg({ type: "success", text: "Course saved successfully." });
      showToast(status === "published" ? "Course published" : "Course saved");
      navigate("/instructor-home");
    } catch (err) {
      console.error(err);
      const text = err?.message || "Failed to save course.";
      setMsg({ type: "error", text });
      showToast(text, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="assignment-card-page">
      <div className="assignment-card">
        <div className="assignment-card__stripe" />

        <div
          className="assignment-card__header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h1
            className="assignment-card__title"
            style={{ display: "flex", alignItems: "center", gap: 10, margin: 0 }}
          >
            <span
              ref={courseTitleRef}
              contentEditable={editingCourseTitle}
              suppressContentEditableWarning
              role="textbox"
              aria-label="Course title"
              className="cb-title-edit"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setEditingCourseTitle(false);
                  setTitle(e.currentTarget.textContent || "");
                  showToast("Course name saved");
                }
              }}
              onBlur={(e) => {
                const val = e.currentTarget.textContent || "";
                setTitle(val);
                if (editingCourseTitle) {
                  setEditingCourseTitle(false);
                  showToast("Course name saved");
                }
              }}
            >
              {title}
            </span>

            <button
              type="button"
              className="icon-btn"
              aria-label={editingCourseTitle ? "Save title" : "Edit title"}
              title={editingCourseTitle ? "Save" : "Edit"}
              onClick={() => {
                if (editingCourseTitle) {
                  const val = (courseTitleRef.current?.textContent || "").trim();
                  setTitle(val);
                  setEditingCourseTitle(false);
                  showToast("Course name saved");
                } else {
                  setEditingCourseTitle(true);
                  requestAnimationFrame(() => courseTitleRef.current?.focus());
                }
              }}
            >
              {editingCourseTitle ? ICONS.save : ICONS.edit}
            </button>
          </h1>

          <div className="cb-toggle">
            <button
              className={`cb-toggle-btn ${publishMode === "publish" ? "active" : ""}`}
              onClick={() => setPublishMode("publish")}
              type="button"
            >
              Publish
            </button>
            <button
              className={`cb-toggle-btn ${publishMode === "draft" ? "active" : ""}`}
              onClick={() => setPublishMode("draft")}
              type="button"
            >
              Save as Draft
            </button>
          </div>
        </div>

        <div className="assignment-card__group assignment-card__group--full">
          <label className="assignment-card__label">Course Description</label>
          <div
            className="cb-desc-edit"
            contentEditable
            role="textbox"
            aria-label="Course description"
            suppressContentEditableWarning
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
                setDescription(e.currentTarget.textContent || "");
                showToast("Course description saved");
              }
            }}
            onBlur={(e) => {
              const val = e.currentTarget.textContent || "";
              setDescription(val);
              showToast("Course description saved");
            }}
          >
           <div
  ref={courseDescRef}
  className="cb-desc-edit"
  contentEditable
  suppressContentEditableWarning
  onBlur={(e) => {
    const val = e.currentTarget.textContent.trim();
    setDescription(val);
    showToast("Course description saved");
  }}
>
  {description}
</div>
          </div>
        </div>

        <div className="cb-meta-card">
          <div className="cb-meta-header">
            <div>
              <h3 className="cb-meta-title">What you’ll learn</h3>
              <p className="cb-meta-subtitle">
                Add bullet points that will be shown to students.
              </p>
            </div>

            <button
              type="button"
              className="cb-link"
              onClick={() => {
                addOutcome();
                showToast("Added learning outcome");
                requestAnimationFrame(() => {
                  const el = document.getElementById("cb-outcomes-scroll");
                  if (el) el.scrollLeft = el.scrollWidth;
                });
              }}
            >
              {ICONS.plus} Add bullet
            </button>
          </div>

          <div
            className="cb-outcomes-scroll"
            id="cb-outcomes-scroll"
            role="list"
            aria-label="Learning outcomes"
          >
            {learningOutcomes.map((val, idx) => (
              <div className="cb-outcome-pill" role="listitem" key={`outcome-${idx}`}>
                <span className="cb-outcome-dot" aria-hidden="true">
                  •
                </span>

                <input
                  className="assignment-card-input cb-outcome-input"
                  value={val}
                  placeholder={`Outcome ${idx + 1}`}
                  onChange={(e) => patchOutcome(idx, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOutcome();
                      showToast("Added learning outcome");
                    }
                  }}
                />

                <button
                  type="button"
                  className="icon-btn danger"
                  title="Remove"
                  onClick={() => {
                    rmOutcome(idx);
                    showToast("Removed learning outcome");
                  }}
                  disabled={learningOutcomes.length === 1}
                >
                  {ICONS.delete}
                </button>
              </div>
            ))}
          </div>

          <div className="cb-meta-hint">
            Tip: Press <b>Enter</b> to add a new bullet quickly.
          </div>
        </div>

        <div className="cb-meta-card">
          <div className="cb-meta-header">
            <div>
              <h3 className="cb-meta-title">Course Thumbnail</h3>
              <p className="cb-meta-subtitle">
                For now, only the link option works. Upload will be enabled later.
              </p>
            </div>
          </div>

          <div className="cb-radio-row" role="radiogroup" aria-label="Thumbnail mode">
            <label className={`cb-radio ${thumbnailMode === "link" ? "is-active" : ""}`}>
              <input
                type="radio"
                name="thumbnailMode"
                value="link"
                checked={thumbnailMode === "link"}
                onChange={() => setThumbnailMode("link")}
              />
              <span>Link</span>
            </label>

            <label
              className={`cb-radio is-disabled ${thumbnailMode === "upload" ? "is-active" : ""}`}
            >
              <input
                type="radio"
                name="thumbnailMode"
                value="upload"
                checked={thumbnailMode === "upload"}
                onChange={() => setThumbnailMode("upload")}
              />
              <span>Upload (coming soon)</span>
            </label>
          </div>

          {thumbnailMode === "link" ? (
            <div className="cb-thumb-link">
              <input
                className="assignment-card-input cb-thumb-input"
                placeholder="https://example.com/thumbnail.jpg"
                value={thumbnailLink}
                onChange={(e) => setThumbnailLink(e.target.value)}
              />

              {thumbnailLink.trim() ? (
                <div className="cb-thumb-preview">
                  <img
                    src={thumbnailLink}
                    alt="Thumbnail preview"
                    className="cb-thumb-img"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="cb-meta-hint">Preview (if the link is valid)</div>
                </div>
              ) : (
                <div className="cb-meta-hint">Paste an image URL to preview it.</div>
              )}
            </div>
          ) : (
            <div className="cb-thumb-upload">
              <input type="file" accept="image/*" disabled />
              <div className="cb-meta-hint" style={{ marginTop: 8 }}>
                Upload is disabled for now. Please use a link.
              </div>
            </div>
          )}
        </div>

        <CourseModulesBuilder
          modules={modules}
          setModules={setModules}
          showToast={showToast}
        />

        {msg.text && (
          <div
            className={
              msg.type === "error"
                ? "assignment-card__msg-error"
                : "assignment-card__msg-success"
            }
            role={msg.type === "error" ? "alert" : "status"}
            style={{ marginTop: 12 }}
          >
            {msg.text}
          </div>
        )}

        <div className="cb-total-bar">
          <div>
            <div className="cb-total-bar__label">Total Course Time</div>
            <div className="cb-total-bar__value">{formatDuration(totalMinutes)}</div>
          </div>
          <div className="cb-total-bar__hint">Based on item durations</div>
        </div>

        <div className="assignment-card__actions">
          <button
            type="button"
            disabled={saving}
            className="assignment-card__btn-primary"
            onClick={handleSave}
          >
            {saving
              ? publishMode === "publish"
                ? "Publishing..."
                : "Saving..."
              : publishMode === "publish"
              ? "Publish Course"
              : "Save as Draft"}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}

