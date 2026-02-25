import { useCallback, useState } from "react";
import AssignmentCard from "./AssignmentCard";
import {
  DurationField,
  emptyItem,
  emptyModule,
  ICONS,
  formatDuration,
  uid,
} from "./courseBuilderShared";

export default function CourseModulesBuilder({
  modules,
  setModules,
  assignmentService,
  showToast,
  currentCourseId
}) {
  const [aqModal, setAqModal] = useState({ open: false, moduleId: null });
  const openAQ = (mid) => setAqModal({ open: true, moduleId: mid });
  const closeAQ = () => setAqModal({ open: false, moduleId: null });

  /** Module ops */
  const addModule = () => setModules((prev) => [...prev, emptyModule()]);

  // ✅ Fix: keep at least one module always
  const rmModule = (mid) =>
    setModules((prev) => {
      const next = prev.filter((m) => m.id !== mid);
      return next.length ? next : [emptyModule()];
    });

  const patchModule = (mid, patch) =>
    setModules((prev) =>
      prev.map((m) => (m.id === mid ? { ...m, ...patch } : m))
    );

  /** Item ops */
  const addItem = (mid, type) =>
    setModules((prev) =>
      prev.map((m) =>
        m.id === mid ? { ...m, items: [...m.items, emptyItem(type)] } : m
      )
    );

  const rmItem = (mid, iid) =>
    setModules((prev) =>
      prev.map((m) =>
        m.id === mid
          ? { ...m, items: m.items.filter((it) => it.id !== iid) }
          : m
      )
    );

  const patchItem = (mid, iid, patch) =>
    setModules((prev) =>
      prev.map((m) =>
        m.id === mid
          ? {
              ...m,
              items: m.items.map((it) =>
                it.id === iid ? { ...it, ...patch } : it
              ),
            }
          : m
      )
    );

  /** Collapse/expand */
  const setAllCollapsed = (collapsed) =>
    setModules((prev) => prev.map((m) => ({ ...m, collapsed })));

  const focusById = (id) => {
    const el = document.getElementById(id);
    if (el) el.focus();
  };

  /** AQ created */
  const handleAQCreated = useCallback(
    (created) => {
      const mid = aqModal.moduleId;
      if (!mid) return;

      const newItem = {
        id: "i_" + uid(),
        type: created?.type === "quiz" ? "quiz" : "assignment",
        title:
          created?.title ||
          (created?.type === "quiz" ? "New Quiz" : "New Assignment"),
        url: "",
        estimatedMinutes: Number(created?.estimatedMinutes) || 30,
        refId: created?.id ?? null,
        editing: false,
      };

      setModules((prev) =>
        prev.map((m) =>
          m.id === mid ? { ...m, items: [...m.items, newItem] } : m
        )
      );

      closeAQ();
      showToast?.(`${newItem.type === "quiz" ? "Quiz" : "Assignment"} added`);
    },
    [aqModal.moduleId, setModules, showToast]
  );

  return (
    <>
      {/* Toolbar */}
      <div className="cb-toolbar">
        <button
          type="button"
          className="cb-link"
          onClick={() => setAllCollapsed(true)}
        >
          {ICONS.chevronRight} Collapse all
        </button>
        <span className="cb-divider">•</span>
        <button
          type="button"
          className="cb-link"
          onClick={() => setAllCollapsed(false)}
        >
          {ICONS.chevronDown} Expand all
        </button>
      </div>

      {/* ✅ IMPORTANT: Only ONE cb-modules wrapper (prevents double scrollbar) */}
      <div className="cb-modules">
        {modules.map((m, mIdx) => {
          const moduleMinutes = m.items.reduce(
            (s, it) => s + (Number(it.estimatedMinutes) || 0),
            0
          );

          const disableDelete = modules.length === 1;

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
                    id={`mod-title-${m.id}`}
                    contentEditable={m.editingTitle}
                    suppressContentEditableWarning
                    role="textbox"
                    aria-label="Module title"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const text = e.currentTarget.textContent || "";
                        patchModule(m.id, { title: text, editingTitle: false });
                        showToast?.("Module title saved");
                      }
                    }}
                    onBlur={(e) => {
                      const text = e.currentTarget.textContent || "";
                      if (m.editingTitle) {
                        patchModule(m.id, { title: text, editingTitle: false });
                        showToast?.("Module title saved");
                      } else {
                        patchModule(m.id, { title: text });
                      }
                    }}
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
                        const span = document.getElementById(`mod-title-${m.id}`);
                        const text = (span?.textContent || "").trim();
                        patchModule(m.id, { title: text, editingTitle: false });
                        showToast?.("Module title saved");
                      } else {
                        patchModule(m.id, { editingTitle: true });
                        requestAnimationFrame(() => focusById(`mod-title-${m.id}`));
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
                    aria-label={
                      m.editingDesc ? "Save description" : "Edit description"
                    }
                    onClick={() => {
                      if (m.editingDesc) {
                        const el = document.getElementById(`mod-desc-${m.id}`);
                        const text = (el?.textContent || "").trim();
                        patchModule(m.id, {
                          description: text,
                          editingDesc: false,
                        });
                        showToast?.("Module description saved");
                      } else {
                        patchModule(m.id, { editingDesc: true });
                        requestAnimationFrame(() => focusById(`mod-desc-${m.id}`));
                      }
                    }}
                  >
                    {m.editingDesc ? ICONS.save : ICONS.edit}
                  </button>

                  {/* ✅ Fix: disable delete when only 1 module */}
                  <button
                    type="button"
                    className="icon-btn danger"
                    title={
                      disableDelete
                        ? "At least one module is required"
                        : "Delete module"
                    }
                    aria-label="Delete module"
                    onClick={() => rmModule(m.id)}
                    disabled={disableDelete}
                    style={disableDelete ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
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
                      showToast?.("Module description saved");
                    }
                  }}
                  onBlur={(e) => {
                    const text = e.currentTarget.textContent || "";
                    if (m.editingDesc) {
                      patchModule(m.id, { description: text, editingDesc: false });
                      showToast?.("Module description saved");
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
                                  showToast?.("Item saved");
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
                                    showToast?.("Item saved");
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
                                showToast?.("Item saved");
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
                    <button
                      type="button"
                      className="cb-link"
                      onClick={() => addItem(m.id, "video")}
                    >
                      {ICONS.plus} Add Video
                    </button>
                    <span className="cb-divider">•</span>
                    <button
                      type="button"
                      className="cb-link"
                      onClick={() => addItem(m.id, "reading")}
                    >
                      {ICONS.plus} Add Documentation
                    </button>
                    <span className="cb-divider">•</span>
                    <button
                      type="button"
                      className="cb-link"
                      onClick={() => openAQ(m.id)}
                    >
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

      {/* Assignment/Quiz Modal */}
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
                courseId={currentCourseId}
                assignmentService={assignmentService}
                onCreated={handleAQCreated}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
