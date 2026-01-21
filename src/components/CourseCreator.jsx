
import React, { useMemo, useState, useCallback, useRef } from "react";
import "../styles/assignmentCard.css";
import "../styles/courseBuilder.css";
import AssignmentCard from "./AssignmentCard";

const LS_KEY_COURSES = "cb_courses_v1";
const loadCourses = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_COURSES) || "[]");
  } catch {
    return [];
  }
};
const saveCourses = (list) => localStorage.setItem(LS_KEY_COURSES, JSON.stringify(list));
const lsCreateCourse = (payload) => {
  const id = "c_" + Math.random().toString(36).slice(2, 10);
  const now = new Date().toISOString();
  const created = { id, createdAt: now, updatedAt: now, ...payload };
  const list = loadCourses();
  list.push(created);
  saveCourses(list);
  return created;
};

const toMinutes = (hours = 0, minutes = 0) => {
  const h = Number(hours) || 0;
  const m = Number(minutes) || 0;
  return Math.max(0, h * 60 + m);
};
const minutesToParts = (total = 0) => {
  const mins = Math.max(0, Number(total) || 0);
  return { hours: Math.floor(mins / 60), minutes: mins % 60 };
};
const formatDuration = (total = 0) => {
  const { hours, minutes } = minutesToParts(total);
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
};

const DurationField = ({
  id,
  valueMinutes = 0,
  onChangeMinutes,
  minuteStep = 5,
  maxHours = 24,
}) => {
  const { hours, minutes } = minutesToParts(valueMinutes);
  const mins = [];
  for (let i = 0; i < 60; i += minuteStep) mins.push(i);

  return (
    <div
      className="duration-field cb-duration"
      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      <label className="sr-only" htmlFor={`${id}-h`}>Hours</label>
      <input
        id={`${id}-h`}
        type="number"
        min={0}
        max={maxHours}
        step={1}
        value={hours}
        onChange={(e) =>
          onChangeMinutes?.(toMinutes(Math.max(0, +e.target.value || 0), minutes))
        }
        className="assignment-card-input"
        style={{ width: 56, textAlign: "right" }}
        aria-label="Hours"
      />
      <span className="duration-field__suffix">h</span>

      <label className="sr-only" htmlFor={`${id}-m`}>Minutes</label>
      <select
        id={`${id}-m`}
        value={Math.min(59, minutes)}
        onChange={(e) =>
          onChangeMinutes?.(toMinutes(hours, Math.max(0, +e.target.value || 0)))
        }
        className="assignment-card-select"
        aria-label="Minutes"
        style={{ width: 64 }}
      >
        {mins.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <span className="duration-field__suffix">m</span>
    </div>
  );
};

const uid = () => Math.random().toString(36).slice(2, 10);
const emptyModule = () => ({
  id: "m_" + uid(),
  title: "",
  description: "",
  items: [],
  collapsed: false,
  editingTitle: false,
  editingDesc: false,
});
const emptyItem = (type = "video") => ({
  id: "i_" + uid(),
  type, // 'video' | 'reading' | 'assignment' | 'quiz'
  title: "",
  url: "",
  estimatedMinutes: 5,
  refId: null,
  editing: true,
});

const ICONS = {
  chevronDown: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M7 10l5 5 5-5z" />
    </svg>
  ),
  chevronRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M10 7l5 5-5 5z" />
    </svg>
  ),
  edit: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm2.92 2.83H5v-.92L14.06 9.03l.92.92L5.92 20.08ZM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"
      />
    </svg>
  ),
  save: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17 3H5a2 2 0 0 0-2 2v14l4-4h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"
      />
    </svg>
  ),
  delete: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M6 7h12v14H6z" opacity=".2" />
      <path
        fill="currentColor"
        d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-1 6h2v10H8V9Zm4 0h2v10h-2V9Zm4 0h2v10h-2V9Z"
      />
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
    </svg>
  ),
  link: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.9 12a5 5 0 0 1 5-5h3v2h-3a3 3 0 0 0 0 6h3v2h-3a5 5 0 0 1-5-5Zm7.2-1h1.8v2h-1.8v-2Zm3-4h3a5 5 0 0 1 0 10h-3v-2h3a3 3 0 0 0 0-6h-3V7Z"
      />
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 1a11 11 0 1 0 11 11A11.012 11.012 0 0 0 12 1Zm1 11.414V6h-2v8h6v-2h-4Z"
      />
    </svg>
  ),
};

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

export default function CourseCreation({ courseService, assignmentService, onCreated }) {
  const [title, setTitle] = useState("New Course");
  const [description, setDescription] = useState("");
  const [editingCourseTitle, setEditingCourseTitle] = useState(false);
  const courseTitleRef = useRef(null);
  const courseDescRef = useRef(null);

  const [modules, setModules] = useState([emptyModule()]);
  const [aqModal, setAqModal] = useState({ open: false, moduleId: null });
  const openAQ = (mid) => setAqModal({ open: true, moduleId: mid });
  const closeAQ = () => setAqModal({ open: false, moduleId: null });

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 1500);
  };

  const addModule = () => setModules((prev) => [...prev, emptyModule()]);
  const rmModule = (mid) => setModules((prev) => prev.filter((m) => m.id !== mid));
  const patchModule = (mid, patch) =>
    setModules((prev) => prev.map((m) => (m.id === mid ? { ...m, ...patch } : m)));

  const addItem = (mid, type) =>
    setModules((prev) =>
      prev.map((m) => (m.id === mid ? { ...m, items: [...m.items, emptyItem(type)] } : m))
    );
  const rmItem = (mid, iid) =>
    setModules((prev) =>
      prev.map((m) =>
        m.id === mid ? { ...m, items: m.items.filter((it) => it.id !== iid) } : m
      )
    );
  const patchItem = (mid, iid, patch) =>
    setModules((prev) =>
      prev.map((m) =>
        m.id === mid
          ? { ...m, items: m.items.map((it) => (it.id === iid ? { ...it, ...patch } : it)) }
          : m
      )
    );

  const handleAQCreated = useCallback(
    (created) => {
      const mid = aqModal.moduleId;
      const newItem = {
        id: "i_" + uid(),
        type: created?.type === "quiz" ? "quiz" : "assignment",
        title:
          created?.title || (created?.type === "quiz" ? "New Quiz" : "New Assignment"),
        url: "",
        estimatedMinutes: Number(created?.estimatedMinutes) || 30,
        refId: created?.id ?? null,
        editing: false,
      };
      setModules((prev) =>
        prev.map((m) => (m.id === mid ? { ...m, items: [...m.items, newItem] } : m))
      );
      closeAQ();
      showToast(`${newItem.type === "quiz" ? "Quiz" : "Assignment"} added`);
    },
    [aqModal.moduleId]
  );

  const totalMinutes = useMemo(
    () =>
      modules.reduce(
        (sum, m) =>
          sum + m.items.reduce((s, it) => s + (Number(it.estimatedMinutes) || 0), 0),
        0
      ),
    [modules]
  );

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

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // 'draft' | 'publish'
  const [publishMode, setPublishMode] = useState("draft");

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
        if ((it.type === "video" || it.type === "reading") && !it.url.trim())
          errors.push(
            `Module ${mi + 1}, item ${ii + 1}: URL is required for link items.`
          );
      });
    });
    return errors;
  };

  const handleSave = async () => {
    setMsg({ type: "", text: "" });
    const errors = validate();
    if (errors.length) {
      setMsg({ type: "error", text: errors.join(" ") });
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      totalEstimatedMinutes: totalMinutes,
      modules: modules.map((m) => ({
        id: m.id,
        title: m.title.trim(),
        description: m.description.trim(),
        items: m.items.map((it) => ({
          id: it.id,
          type: it.type,
          title: it.title.trim(),
          url: it.url?.trim() || "",
          estimatedMinutes: Number(it.estimatedMinutes) || 0,
          refId: it.refId || null,
        })),
      })),
      counts: {
        videos: grouped.Videos.length,
        documentation: grouped.Documentation.length,
        assignments: grouped.Assignments.length,
        quizzes: grouped.Quizzes.length,
      },
      status: publishMode === "publish" ? "published" : "draft",
    };

    setSaving(true);
    try {
      let created;
      if (courseService && typeof courseService.create === "function") {
        created = await courseService.create(payload);
      } else {
        created = lsCreateCourse(payload);
        await new Promise((r) => setTimeout(r, 150));
      }
      setMsg({ type: "success", text: "Course saved successfully." });
      showToast(publishMode === "publish" ? "Course published" : "Course saved");
      onCreated?.(created);
    } catch (err) {
      console.error(err);
      const text = err?.message || "Failed to save course.";
      setMsg({ type: "error", text });
      showToast(text, "error");
    } finally {
      setSaving(false);
    }
  };

  const setAllCollapsed = (collapsed) =>
    setModules((prev) => prev.map((m) => ({ ...m, collapsed })));

  const focusById = (id) => {
    const el = document.getElementById(id);
    if (el) el.focus();
  };

  return (
    <div className="assignment-card-page">
      <div className="assignment-card">
        <div className="assignment-card__stripe" />

        {/* Header (title + inline toggle). Top Total removed */}
        <div
          className="assignment-card__header"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
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
                  const val = e.currentTarget.textContent || "";
                  setTitle(val);
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
                  const el = courseTitleRef.current;
                  const val = (el?.textContent || "").trim();
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

          {/* Publish / Draft Toggle */}
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

        {/* Description */}
        <div className="assignment-card__group assignment-card__group--full">
          <label className="assignment-card__label">Course Description</label>
          <div
            ref={courseDescRef}
            className="cb-desc-edit"
            contentEditable
            role="textbox"
            aria-label="Course description"
            suppressContentEditableWarning
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
                const val = e.currentTarget.textContent || "";
                setDescription(val);
                showToast("Course description saved");
              }
            }}
            onBlur={(e) => {
              const val = e.currentTarget.textContent || "";
              setDescription(val);
              if (val !== description) showToast("Course description saved");
            }}
          >
            {description || "Add a short description for learners…"}
          </div>
        </div>

        {/* Toolbar */}
        <div className="cb-toolbar">
          <button type="button" className="cb-link" onClick={() => setAllCollapsed(true)}>
            {ICONS.chevronRight} Collapse all
          </button>
          <span className="cb-divider">•</span>
          <button type="button" className="cb-link" onClick={() => setAllCollapsed(false)}>
            {ICONS.chevronDown} Expand all
          </button>
        </div>

        {/* Builder + Preview */}
        <div className="cb-layout">
          <div className="cb-modules">
            {modules.map((m, mIdx) => {
              const moduleMinutes = m.items.reduce(
                (s, it) => s + (Number(it.estimatedMinutes) || 0),
                0
              );
              return (
                <section key={m.id} className="cb-module">
                  <header className="cb-module__header">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => patchModule(m.id, { collapsed: !m.collapsed })}
                      aria-label={m.collapsed ? "Expand module" : "Collapse module"}
                      title={m.collapsed ? "Expand" : "Collapse"}
                    >
                      {m.collapsed ? ICONS.chevronRight : ICONS.chevronDown}
                    </button>

                    <span className="cb-module__index">{mIdx + 1}</span>

                    <div
                      className="cb-module__title"
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        contentEditable={m.editingTitle}
                        suppressContentEditableWarning
                        role="textbox"
                        aria-label="Module title"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const text = e.currentTarget.textContent || "";
                            patchModule(m.id, { title: text, editingTitle: false });
                            showToast("Module title saved");
                          }
                        }}
                        onBlur={(e) => {
                          const text = e.currentTarget.textContent || "";
                          if (m.editingTitle) {
                            patchModule(m.id, { title: text, editingTitle: false });
                            showToast("Module title saved");
                          } else {
                            patchModule(m.id, { title: text });
                          }
                        }}
                        placeholder="Module title"
                      >
                        {m.title || "Untitled module"}
                      </span>

                      <button
                        type="button"
                        className="icon-btn"
                        title={m.editingTitle ? "Save" : "Edit title"}
                        aria-label={m.editingTitle ? "Save title" : "Edit title"}
                        onClick={() => {
                          if (m.editingTitle) {
                            const parent = document.activeElement?.closest?.(".cb-module__title");
                            const span = parent?.querySelector?.('span[role="textbox"]');
                            const text = (span?.textContent || "").trim();
                            patchModule(m.id, { title: text, editingTitle: false });
                            showToast("Module title saved");
                          } else {
                            patchModule(m.id, { editingTitle: true });
                            requestAnimationFrame(() => {
                              const span = document.querySelector(
                                `.cb-module__title span[role="textbox"]`
                              );
                              span?.focus();
                            });
                          }
                        }}
                      >
                        {m.editingTitle ? ICONS.save : ICONS.edit}
                      </button>
                    </div>

                    <div className="cb-module__meta">
                      {ICONS.clock} <span>{formatDuration(moduleMinutes)}</span>
                    </div>

                    <div className="cb-module__actions">
                      <button
                        type="button"
                        className="icon-btn"
                        title={m.editingDesc ? "Save description" : "Edit description"}
                        aria-label={m.editingDesc ? "Save description" : "Edit description"}
                        onClick={() => {
                          if (m.editingDesc) {
                            const el = document.getElementById(`mod-desc-${m.id}`);
                            const text = (el?.textContent || "").trim();
                            patchModule(m.id, { description: text, editingDesc: false });
                            showToast("Module description saved");
                          } else {
                            patchModule(m.id, { editingDesc: true });
                            requestAnimationFrame(() => focusById(`mod-desc-${m.id}`));
                          }
                        }}
                      >
                        {m.editingDesc ? ICONS.save : ICONS.edit}
                      </button>

                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Delete module"
                        aria-label="Delete module"
                        onClick={() => rmModule(m.id)}
                      >
                        {ICONS.delete}
                      </button>
                    </div>
                  </header>

                  {!m.collapsed && (
                    <div
                      id={`mod-desc-${m.id}`}
                      className="cb-module__desc"
                      contentEditable={m.editingDesc}
                      role="textbox"
                      aria-label="Module description"
                      suppressContentEditableWarning
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && m.editingDesc) {
                          e.preventDefault();
                          e.currentTarget.blur();
                          const text = e.currentTarget.textContent || "";
                          patchModule(m.id, { description: text, editingDesc: false });
                          showToast("Module description saved");
                        }
                      }}
                      onBlur={(e) => {
                        const text = e.currentTarget.textContent || "";
                        if (m.editingDesc) {
                          patchModule(m.id, { description: text, editingDesc: false });
                          showToast("Module description saved");
                        } else {
                          patchModule(m.id, { description: text });
                        }
                      }}
                    >
                      {m.description || "Describe this module…"}
                    </div>
                  )}

                  {!m.collapsed && (
                    <div className="cb-items">
                      {m.items.map((it) => {
                        const isLinkType = it.type === "video" || it.type === "reading";
                        return (
                          <div key={it.id} className="cb-item">
                            <div className="cb-item__left">
                              <span className={`cb-badge cb-badge--${it.type}`}>
                                {it.type === "video"
                                  ? "Video"
                                  : it.type === "reading"
                                  ? "Document"
                                  : it.type === "quiz"
                                  ? "Quiz"
                                  : "Assignment"}
                              </span>
                            </div>

                            <div className="cb-item__title">
                              {it.editing ? (
                                <input
                                  type="text"
                                  className="assignment-card-input cb-item__title-input"
                                  value={it.title}
                                  placeholder="Item title"
                                  onChange={(e) =>
                                    patchItem(m.id, it.id, { title: e.target.value })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      patchItem(m.id, it.id, { editing: false });
                                      showToast("Item saved");
                                    }
                                  }}
                                />
                              ) : (
                                <span className="cb-item__title-text">
                                  {it.title || "(untitled)"}
                                </span>
                              )}
                            </div>

                            <div className="cb-item__time">
                              {ICONS.clock}
                              <DurationField
                                id={`dur-${it.id}`}
                                valueMinutes={it.estimatedMinutes}
                                onChangeMinutes={(mins) =>
                                  patchItem(m.id, it.id, { estimatedMinutes: mins })
                                }
                                minuteStep={5}
                              />
                            </div>

                            {isLinkType ? (
                              <div className="cb-item__url">
                                {ICONS.link}
                                {it.editing ? (
                                  <input
                                    type="url"
                                    className="assignment-card-input cb-url-input"
                                    placeholder={
                                      it.type === "video"
                                        ? "https://video.example"
                                        : "https://article.example"
                                    }
                                    value={it.url}
                                    onChange={(e) =>
                                      patchItem(m.id, it.id, { url: e.target.value })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        patchItem(m.id, it.id, { editing: false });
                                        showToast("Item saved");
                                      }
                                    }}
                                  />
                                ) : (
                                  <a
                                    href={it.url || "#"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="cb-url-link"
                                    title={it.url ? "Open link" : "No link"}
                                  >
                                    {it.url || "—"}
                                  </a>
                                )}
                              </div>
                            ) : (
                              <div className="cb-item__url" />
                            )}

                            <div className="cb-item__actions">
                              <button
                                type="button"
                                className="icon-btn"
                                title={it.editing ? "Save item" : "Edit item"}
                                aria-label={it.editing ? "Save item" : "Edit item"}
                                onClick={() => {
                                  if (it.editing) {
                                    patchItem(m.id, it.id, { editing: false });
                                    showToast("Item saved");
                                  } else {
                                    patchItem(m.id, it.id, { editing: true });
                                  }
                                }}
                              >
                                {it.editing ? ICONS.save : ICONS.edit}
                              </button>
                              <button
                                type="button"
                                className="icon-btn danger"
                                title="Delete item"
                                aria-label="Delete item"
                                onClick={() => rmItem(m.id, it.id)}
                              >
                                {ICONS.delete}
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="cb-add-row">
                        <button type="button" className="cb-link" onClick={() => addItem(m.id, "video")}>
                          {ICONS.plus} Add Video
                        </button>
                        <span className="cb-divider">•</span>
                        <button type="button" className="cb-link" onClick={() => addItem(m.id, "reading")}>
                          {ICONS.plus} Add Documentation
                        </button>
                        <span className="cb-divider">•</span>
                        <button type="button" className="cb-link" onClick={() => openAQ(m.id)}>
                          {ICONS.plus} Add Assignment/Quiz
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}

            <div className="cb-add-module">
              <button type="button" className="cb-link" onClick={addModule}>
                {ICONS.plus} Add module
              </button>
            </div>
          </div>

          {/* Preview */}
          <aside className="cb-preview">
            <h3 className="cb-preview__title">Preview</h3>
            <div className="quiz-editor__questions" style={{ maxHeight: "60vh" }}>
              {[
                ["Videos", grouped.Videos],
                ["Documentation", grouped.Documentation],
                ["Assignments", grouped.Assignments],
                ["Quizzes", grouped.Quizzes],
              ].map(([label, arr]) => (
                <div key={label} className="quiz-question" style={{ marginTop: 12 }}>
                  <div className="quiz-question__top" style={{ marginBottom: 8 }}>
                    <span className="assignment-card__label">
                      {label} ({arr.length})
                    </span>
                  </div>
                  {arr.length === 0 ? (
                    <div className="assignment-card__subtle">No {label.toLowerCase()} yet.</div>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {arr.map((it) => (
                        <li key={it.id} style={{ marginBottom: 6 }}>
                          {it.title || "(untitled)"}{" "}
                          {it.estimatedMinutes ? (
                            <span className="assignment-card__subtle">
                              — {formatDuration(it.estimatedMinutes)}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="quiz-editor__totals" style={{ marginTop: 12 }}>
              <span className="quiz-editor__total-label">Total Course Time</span>
              <span className="quiz-editor__total-value">
                {formatDuration(totalMinutes)}
              </span>
            </div>
          </aside>
        </div>

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

        {/* Actions */}
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

      {aqModal.open && (
        <div className="cb-modal">
          <div className="cb-modal__backdrop" onClick={closeAQ} />
          <div className="cb-modal__panel">
            <div className="cb-modal__header">
              <h3 style={{ margin: 0 }}>Add Assignment / Quiz</h3>
              <button
                className="icon-btn danger"
                onClick={closeAQ}
                title="Close"
                aria-label="Close"
              >
                {ICONS.delete}
              </button>
            </div>
            <div className="cb-modal__body">
              <AssignmentCard
                assignmentService={assignmentService}
                onCreated={handleAQCreated}
              />
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}
