
// src/components/CourseCollapsibleSection.jsx
import React, { useMemo, useState } from "react";
import "../styles/courseBuilder.css";
/** Utility: minutes → “1h 30m” */
function formatDuration(total = 0) {
  const mins = Math.max(0, Number(total) || 0);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/** Simple inline icons to keep this component standalone */
const I = {
  chevronRight: () => <span aria-hidden>▶</span>,
  chevronDown: () => <span aria-hidden>▼</span>,
  clock: () => <span aria-hidden>⏱</span>,
  edit: () => <span aria-hidden>✎</span>,
  trash: () => <span aria-hidden>🗑</span>,
};

export default function CourseCollapsibleSection({
  /** Array of modules with items; same shape you save from CourseCreator */
  modules = [],

  /** Role-based control (if 'instructor' → show edit/delete). 
   * You can also override using showActions.
   */
  role = "learner",
  showActions, // optional hard override (boolean)

  /** Behavior / callbacks */
  defaultCollapsed = false,
  onEditModule,      // (moduleId) => void
  onDeleteModule,    // (moduleId) => void
  onEditItem,        // (moduleId, itemId) => void
  onDeleteItem,      // (moduleId, itemId) => void
  onToggleModule,    // (moduleId, collapsed) => void

  /** Link behavior */
  itemLinkTarget = "_blank",
}) {
  const isInstructor = (typeof showActions === "boolean")
    ? showActions
    : role === "instructor";

  // local collapsed state per module
  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(modules.map(m => [m.id, defaultCollapsed]))
  );

  const totalsByModule = useMemo(() => {
    const map = {};
    for (const m of modules) {
      map[m.id] = (m.items || []).reduce(
        (s, it) => s + (Number(it.estimatedMinutes) || 0), 0
      );
    }
    return map;
  }, [modules]);

  const toggle = (mid) => {
    setCollapsed(prev => {
      const next = { ...prev, [mid]: !prev[mid] };
      onToggleModule?.(mid, next[mid]);
      return next;
    });
  };

  const badgeLabel = (type) => {
    if (type === "video") return "Video";
    if (type === "reading") return "Document";
    if (type === "assignment") return "Assignment";
    if (type === "quiz") return "Quiz";
    return "Item";
  };

  return (
    <section className="ccs">
      {modules.map((m, idx) => {
        const isCollapsed = !!collapsed[m.id];
        return (
          <article className="ccs__module" key={m.id}>
            {/* Header */}
            <div className="ccs__moduleHeader">
              <button
                type="button"
                className="ccs__toggle"
                aria-expanded={!isCollapsed}
                aria-controls={`ccs-panel-${m.id}`}
                onClick={() => toggle(m.id)}
                title={isCollapsed ? "Expand module" : "Collapse module"}
              >
                {isCollapsed ? <I.chevronRight /> : <I.chevronDown />}
                <span className="ccs__moduleIndex">{idx + 1}</span>
                <span className="ccs__moduleTitle">{m.title || "Untitled module"}</span>
              </button>

              <div className="ccs__spacer" />

              <div className="ccs__meta">
                <I.clock /> <span>{formatDuration(totalsByModule[m.id] || 0)}</span>
              </div>

              {isInstructor && (
                <div className="ccs__actions">
                  <button
                    type="button"
                    className="ccs__iconBtn"
                    onClick={() => onEditModule?.(m.id)}
                    aria-label="Edit module"
                    title="Edit module"
                  >
                    <I.edit />
                  </button>
                  <button
                    type="button"
                    className="ccs__iconBtn cc--danger"
                    onClick={() => onDeleteModule?.(m.id)}
                    aria-label="Delete module"
                    title="Delete module"
                  >
                    <I.trash />
                  </button>
                </div>
              )}
            </div>

            {/* Body */}
            {!isCollapsed && (
              <div className="ccs__moduleBody" id={`ccs-panel-${m.id}`}>
                {m.description ? (
                  <p className="ccs__moduleDesc">{m.description}</p>
                ) : null}

                <ul className="ccs__items">
                  {(m.items || []).map((it) => {
                    const dur = (Number(it.estimatedMinutes) || 0) > 0
                      ? formatDuration(it.estimatedMinutes)
                      : null;

                    const isLinkType = it.type === "video" || it.type === "reading";
                    const title = it.title || "(untitled)";
                    const label = badgeLabel(it.type);

                    return (
                      <li className="ccs__item" key={it.id}>
                        <span className={`ccs__badge type-${it.type}`}>{label}</span>

                        {isLinkType && it.url ? (
                          <a
                            className="ccs__itemTitle"
                            href={it.url}
                            target={itemLinkTarget}
                            rel="noopener noreferrer"
                          >
                            {title}
                          </a>
                        ) : (
                          <span className="ccs__itemTitle">{title}</span>
                        )}

                        {dur && <span className="ccs__itemDur">— {dur}</span>}

                        {isInstructor && (
                          <span className="ccs__itemActions">
                            <button
                              type="button"
                              className="ccs__iconBtn"
                              onClick={() => onEditItem?.(m.id, it.id)}
                              aria-label="Edit item"
                              title="Edit item"
                            >
                              <I.edit />
                            </button>
                            <button
                              type="button"
                              className="ccs__iconBtn cc--danger"
                              onClick={() => onDeleteItem?.(m.id, it.id)}
                              aria-label="Delete item"
                              title="Delete item"
                            >
                              <I.trash />
                            </button>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

