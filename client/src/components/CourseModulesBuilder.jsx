import { useCallback, useState } from "react";
import "../styles/coursebuilder.css"; // theme
import AssignmentCard from "./AssignmentCard";
import {
  DurationField,
  emptyItem,
  emptyModule,
  ICONS,
  formatDuration,
  uid,
} from "./courseBuilderShared";

export default function CourseModulesBuilder({ modules, setModules }) {
  const [aqModal, setAqModal] = useState({ open: false, moduleId: null });
  const openAQ = (mid) => setAqModal({ open: true, moduleId: mid });
  const closeAQ = () => setAqModal({ open: false, moduleId: null });

  /** Module ops */
  const addModule = () => setModules((prev) => [...prev, emptyModule()]);

  // keep at least one module always
  const rmModule = (mid) =>
    setModules((prev) => {
      const next = prev.filter((m) => m.id !== mid);
      return next.length ? next : [emptyModule()];
    });

  const patchModule = (mid, patch) =>
    setModules((prev) => prev.map((m) => (m.id === mid ? { ...m, ...patch } : m)));

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
        m.id === mid ? { ...m, items: m.items.filter((it) => it.id !== iid) } : m
      )
    );

  const patchItem = (mid, iid, patch) =>
    setModules((prev) =>
      prev.map((m) =>
        m.id === mid
          ? {
              ...m,
              items: m.items.map((it) => (it.id === iid ? { ...it, ...patch } : it)),
            }
          : m
      )
    );

  /** Collapse/expand */
  const setAllCollapsed = (collapsed) =>
    setModules((prev) => prev.map((m) => ({ ...m, collapsed })));

  /** AQ created */
  const handleAQCreated = useCallback(
    (created) => {
      const mid = aqModal.moduleId;
      if (!mid) return;

      const createdType = (created?.type || "").toLowerCase() === "quiz" ? "quiz" : "assignment";

      const newItem = {
        id: "i_" + uid(),
        type: createdType, // normalized
        title: created?.title || (createdType === "quiz" ? "New Quiz" : "New Assignment"),
        url: "",
        estimatedMinutes: Number(created?.estimatedMinutes) || 30,
        refId: created?.id ?? null,
        editing: false,
      };

      setModules((prev) =>
        prev.map((m) => (m.id === mid ? { ...m, items: [...m.items, newItem] } : m))
      );

      closeAQ();
    },
    [aqModal.moduleId, setModules]
  );

  return (
    <>
      {/* Toolbar */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <button
          type="button"
          className="btn btn-link p-0"
          onClick={() => setAllCollapsed(true)}
        >
          {ICONS.chevronRight} Collapse all
        </button>
        <span className="text-body-secondary">·</span>
        <button
          type="button"
          className="btn btn-link p-0"
          onClick={() => setAllCollapsed(false)}
        >
          {ICONS.chevronDown} Expand all
        </button>
      </div>

      {/* Modules wrapper */}
      <div>
        {modules.map((m, mIdx) => {
          const moduleMinutes = m.items.reduce(
            (s, it) => s + (Number(it.estimatedMinutes) || 0),
            0
          );

          const disableDelete = modules.length === 1;

          return (
            <section key={m.id} className="card shadow-sm mb-3 border-0">
              <header className="card-header bg-white d-grid gap-2">
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => patchModule(m.id, { collapsed: !m.collapsed })}
                    aria-label={m.collapsed ? "Expand module" : "Collapse module"}
                    title={m.collapsed ? "Expand" : "Collapse"}
                  >
                    {m.collapsed ? ICONS.chevronRight : ICONS.chevronDown}
                  </button>

                  <span className="badge rounded-pill">{mIdx + 1}</span>

                  {/* Module title */}
                  <input
                    id={`mod-title-${m.id}`}
                    type="text"
                    className="form-control form-control-sm"
                    value={m.title || ""}
                    placeholder="Untitled module"
                    onChange={(e) => patchModule(m.id, { title: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur(); // save on Enter
                      }
                    }}
                    onBlur={(e) => {
                      const text = (e.currentTarget.value || "").trim();
                      patchModule(m.id, { title: text });
                    }}
                  />

                  {/* meta */}
                  <div className="ms-auto d-inline-flex align-items-center gap-2 module-meta">
                    {ICONS.clock}
                    <span>{formatDuration(moduleMinutes)}</span>
                  </div>

                  {/* delete */}
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    title={
                      disableDelete ? "At least one module is required" : "Delete module"
                    }
                    aria-label="Delete module"
                    onClick={() => rmModule(m.id)}
                    disabled={disableDelete}
                  >
                    {ICONS.delete}
                  </button>
                </div>

                {/* Module description */}
                {!m.collapsed && (
                  <div>
                    <textarea
                      id={`mod-desc-${m.id}`}
                      className="form-control"
                      value={m.description || ""}
                      placeholder="Describe this module…"
                      rows={3}
                      onChange={(e) => patchModule(m.id, { description: e.target.value })}
                      onKeyDown={(e) => {
                        // Enter saves; Shift+Enter inserts newline
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                      onBlur={(e) => {
                        const text = (e.currentTarget.value || "").trim();
                        patchModule(m.id, { description: text });
                      }}
                    />
                  </div>
                )}
              </header>

              {!m.collapsed && (
                <div className="card-body">
                  {/* Items list */}
                  <ul className="list-group list-group-flush">
                    {m.items.map((it) => {
                      const isLinkType = it.type === "video" || it.type === "reading";
                      const typeBadgeClass =
                        it.type === "video"
                          ? "badge-item-video"
                          : it.type === "reading"
                          ? "badge-item-doc"
                          : it.type === "quiz"
                          ? "badge-item-quiz"
                          : "badge-item-assignment";

                      return (
                        <li key={it.id} className="list-group-item">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            {/* Type badge */}
                            <span
                              className={`badge ${typeBadgeClass}`}
                              style={{ whiteSpace: "nowrap" }}
                              title={it.type}
                            >
                              {it.type === "video"
                                ? "Video"
                                : it.type === "reading"
                                ? "Document"
                                : it.type === "quiz"
                                ? "Quiz"
                                : "Assignment"}
                            </span>

                            {/* Title */}
                            <div
                              className="d-inline-flex align-items-center"
                              style={{ minWidth: 220, flex: "1 1 240px" }}
                            >
                              {it.editing ? (
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={it.title}
                                  placeholder="Item title"
                                  onChange={(e) =>
                                    patchItem(m.id, it.id, { title: e.target.value })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      patchItem(m.id, it.id, { editing: false });
                                    }
                                  }}
                                />
                              ) : (
                                <span
                                  className="fw-semibold text-truncate"
                                  title={it.title || "(untitled)"}
                                  style={{ maxWidth: 280 }}
                                >
                                  {it.title || "(untitled)"}
                                </span>
                              )}
                            </div>

                            {/* Time */}
                            <div className="d-inline-flex align-items-center gap-1">
                              <span className="text-body-secondary">{ICONS.clock}</span>
                              <DurationField
                                id={`dur-${it.id}`}
                                valueMinutes={it.estimatedMinutes}
                                onChangeMinutes={(mins) =>
                                  patchItem(m.id, it.id, { estimatedMinutes: mins })
                                }
                                minuteStep={5}
                              />
                            </div>

                            {/* URL (for link types) */}
                            {isLinkType ? (
                              <div
                                className="d-inline-flex align-items-center gap-2 flex-grow-1"
                                style={{ minWidth: 240, flex: "1 1 320px" }}
                              >
                                <span className="text-body-secondary">{ICONS.link}</span>
                                {it.editing ? (
                                  <input
                                    type="url"
                                    className="form-control form-control-sm"
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
                                      }
                                    }}
                                  />
                                ) : (
                                  <a
                                    href={it.url || "#"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-decoration-none text-primary text-truncate d-inline-block"
                                    style={{ maxWidth: 360 }}
                                    title={it.url ? "Open link" : "No link"}
                                  >
                                    {it.url || "—"}
                                  </a>
                                )}
                              </div>
                            ) : (
                              <div className="flex-grow-1" />
                            )}

                            {/* Actions (right aligned) */}
                            <div className="ms-auto d-inline-flex align-items-center gap-2">
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                title="Delete item"
                                aria-label="Delete item"
                                onClick={() => rmItem(m.id, it.id)}
                              >
                                {ICONS.delete}
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Add row */}
                  <div className="d-flex align-items-center flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-link p-0"
                      onClick={() => addItem(m.id, "video")}
                    >
                      {ICONS.plus} Add Video
                    </button>
                    <span className="text-body-secondary">·</span>
                    <button
                      type="button"
                      className="btn btn-link p-0"
                      onClick={() => addItem(m.id, "reading")}
                    >
                      {ICONS.plus} Add Documentation
                    </button>
                    <span className="text-body-secondary">·</span>
                    <button
                      type="button"
                      className="btn btn-link p-0"
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

        {/* Add module */}
        <div className="d-flex justify-content-center my-2">
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={addModule}>
            {ICONS.plus} Add module
          </button>
        </div>
      </div>

      {/* Assignment/Quiz Modal */}
      {aqModal.open && (
        <>
          <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title mb-0">Add Assignment / Quiz</h5>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={closeAQ}
                    title="Close"
                    aria-label="Close"
                  >
                    {ICONS.delete}
                  </button>
                </div>
                <div className="modal-body">
                  <AssignmentCard onCreated={handleAQCreated} />
                </div>
              </div>
            </div>
          </div>
          {/* Backdrop */}
          <div className="modal-backdrop show"></div>
        </>
      )}
    </>
  );
}
