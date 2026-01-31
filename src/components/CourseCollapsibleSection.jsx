import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  /** Array of modules with items */
  modules = [],

  /** Role-based control (if 'instructor' → show edit/delete). */
  role = "learner",
  showActions, // optional hard override (boolean)

  /** Behavior / callbacks */
  defaultCollapsed = false,
  onEditModule, // (moduleId) => void
  onDeleteModule, // (moduleId) => void
  onEditItem, // (moduleId, itemId) => void
  onDeleteItem, // (moduleId, itemId) => void
  onToggleModule, // (moduleId, collapsed) => void

  /** Link behavior */
  itemLinkTarget = "_blank",
}) {
  const isInstructor =
    typeof showActions === "boolean" ? showActions : role === "instructor";

  // local collapsed state per module
  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries((modules || []).map((m) => [m.id, defaultCollapsed]))
  );

  // ✅ keep collapsed map in sync when modules prop changes
  useEffect(() => {
    setCollapsed((prev) => {
      const next = { ...prev };
      for (const m of modules || []) {
        if (typeof next[m.id] === "undefined") next[m.id] = defaultCollapsed;
      }
      // remove old keys that no longer exist
      for (const k of Object.keys(next)) {
        if (!(modules || []).some((m) => m.id === k)) delete next[k];
      }
      return next;
    });
  }, [modules, defaultCollapsed]);

  const totalsByModule = useMemo(() => {
    const map = {};
    for (const m of modules || []) {
      map[m.id] = (m.items || []).reduce(
        (s, it) => s + (Number(it.estimatedMinutes) || 0),
        0
      );
    }
    return map;
  }, [modules]);

  const toggle = (mid) => {
    setCollapsed((prev) => {
      const next = { ...prev, [mid]: !prev[mid] };
      onToggleModule?.(mid, next[mid]);
      return next;
    });
  };

  // ✅ Turn resources into documents:
  // - "link" type now behaves like "doc" for label and CSS type class
  const normalizedType = (type) => (type === "link" ? "doc" : type);

  const badgeLabel = (type) => {
    const t = normalizedType(type);
    if (t === "video") return "Video";
    if (t === "reading" || t === "doc") return "Document";
    if (t === "assignment") return "Assignment";
    if (t === "quiz") return "Quiz";
    return "Item";
  };

  return (
    <section className="ccs">
      {(modules || []).map((m, idx) => {
        const isCollapsed = !!collapsed[m.id];
        const items = m.items || [];
        const total = totalsByModule[m.id] || 0;

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
                <span className="ccs__moduleTitle">
                  {m.title || "Untitled module"}
                </span>
              </button>

              <div className="ccs__spacer" />

              <div className="ccs__meta" title="Total duration">
                <I.clock /> <span>{formatDuration(total)}</span>
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
                  {items.map((it) => {
                    const title = it.title || "(untitled)";
                    const type = normalizedType(it.type); // ✅ "link" becomes "doc"
                    const label = badgeLabel(type);

                    const dur =
                      (Number(it.estimatedMinutes) || 0) > 0
                        ? formatDuration(it.estimatedMinutes)
                        : null;

                    // ✅ Clickability rules:
                    // - if it.to -> internal route via <Link>
                    // - else if it.url -> external via <a>
                    // - else -> locked/static
                    const isLocked = !it?.to && !it?.url;

                    const ItemInner = (
                      <>
                        <span className={`ccs__badge type-${type}`}>{label}</span>

                        <span className="ccs__itemTitle">{title}</span>

                        <span className="ccs__itemRight">
                          {dur ? (
                            <span className="ccs__itemDur">— {dur}</span>
                          ) : null}
                          {isLocked ? (
                            <span className="ccs__itemLock">🔒</span>
                          ) : null}
                        </span>
                      </>
                    );

                    return (
                      <li
                        className={`ccs__item ${isLocked ? "is-locked" : ""}`}
                        key={it.id}
                      >
                        {/* ✅ INTERNAL route (Assignments / Quizzes) */}
                        {it?.to ? (
                          <Link
                            className="ccs__itemLink"
                            to={it.to}
                            target={itemLinkTarget}
                            rel="noopener noreferrer"
                          >
                            {ItemInner}
                          </Link>
                        ) : it?.url ? (
                          /* ✅ EXTERNAL URL (Videos / Docs / Resources) */
                          <a
                            className="ccs__itemLink"
                            href={it.url}
                            target={itemLinkTarget}
                            rel="noopener noreferrer"
                          >
                            {ItemInner}
                          </a>
                        ) : (
                          /* 🔒 LOCKED / NON-CLICKABLE */
                          <span className="ccs__itemLink ccs__itemLink--disabled">
                            {ItemInner}
                          </span>
                        )}

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
