/* eslint-disable react-refresh/only-export-components */
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
export function DurationField({
  id,
  valueMinutes,
  onChangeMinutes,
  minuteStep = 5,
  maxHours = 12,
}) {
  const total = Number(valueMinutes) || 0;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  const minuteOptions = [];
  for (let m = 0; m < 60; m += minuteStep) minuteOptions.push(m);

  const hourOptions = [];
  for (let h = 0; h <= maxHours; h++) hourOptions.push(h);

  const safeMinutes = minuteOptions.includes(minutes) ? minutes : 0;
  const safeHours = hours > maxHours ? maxHours : hours;

  const setHours = (h) => onChangeMinutes(h * 60 + safeMinutes);
  const setMins = (m) => onChangeMinutes(safeHours * 60 + m);

  return (
    <div
      className="cb-duration"
      style={{ display: "flex", gap: 6, alignItems: "center" }}
    >
      {/* Hours dropdown */}
      <select
        id={id ? `${id}-h` : undefined}
        className="assignment-card-input cb-duration__select"
        value={safeHours}
        onChange={(e) => setHours(Number(e.target.value))}
        aria-label="Hours"
      >
        {hourOptions.map((h) => (
          <option key={h} value={h}>
            {h}h
          </option>
        ))}
      </select>

      {/* Minutes dropdown */}
      <select
        id={id ? `${id}-m` : undefined}
        className="assignment-card-input cb-duration__select"
        value={safeMinutes}
        onChange={(e) => setMins(Number(e.target.value))}
        aria-label="Minutes"
      >
        {minuteOptions.map((m) => (
          <option key={m} value={m}>
            {m}m
          </option>
        ))}
      </select>
    </div>
  );
}

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
