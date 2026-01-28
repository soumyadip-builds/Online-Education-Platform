
import React from "react";

/** Time helpers */
export const toMinutes = (hours = 0, minutes = 0) => {
  const h = Number(hours) || 0;
  const m = Number(minutes) || 0;
  return Math.max(0, h * 60 + m);
};

export const minutesToParts = (total = 0) => {
  const mins = Math.max(0, Number(total) || 0);
  return { hours: Math.floor(mins / 60), minutes: mins % 60 };
};

export const formatDuration = (total = 0) => {
  const { hours, minutes } = minutesToParts(total);
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
};

/** Duration input component */
export const DurationField = ({
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
      <label className="sr-only" htmlFor={`${id}-h`}>
        Hours
      </label>
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

      <label className="sr-only" htmlFor={`${id}-m`}>
        Minutes
      </label>
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

/** ID helpers + empty models */
export const uid = () => Math.random().toString(36).slice(2, 10);

export const emptyModule = () => ({
  id: "m_" + uid(),
  title: "",
  description: "",
  items: [],
  collapsed: false,
  editingTitle: false,
  editingDesc: false,
});

export const emptyItem = (type = "video") => ({
  id: "i_" + uid(),
  type, // 'video' | 'reading' | 'assignment' | 'quiz'
  title: "",
  url: "",
  estimatedMinutes: 5,
  refId: null,
  editing: true,
});

/** Icons */
export const ICONS = {
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
