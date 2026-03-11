import { useMemo, useRef, useState, useEffect } from "react";
import "../styles/coursebuilder.css";

import CourseModulesBuilder from "./CourseModulesBuilder";
import { ICONS, emptyModule, formatDuration } from "./courseBuilderShared";
import { getCurrentUser } from "../utils/session";
import { recordCourseCreated } from "../utils/userStorage";
import { useNavigate, useLocation } from "react-router-dom";
import { createCourse, updateCourse } from "../api/courses";

export default function CourseCreation() {
  const navigate = useNavigate();
  const location = useLocation();

  // 🔹 Check for edit mode
  const editCourse = location.state?.editCourse;
  const isEditMode = !!editCourse;
  const courseId = editCourse?._id || editCourse?.id;

  // 🔹 FORM REFS (uncontrolled inputs for course details)
  const formRef = useRef(null);
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const thumbLinkRef = useRef(null);

  // 🔹 Minimal UI state
  const [modules, setModules] = useState(() => [emptyModule()]);
  const [outcomeKeys, setOutcomeKeys] = useState([Date.now()]);
  const [outcomeValues, setOutcomeValues] = useState({});
  const [saving, setSaving] = useState(false);

  // ✅ Thumbnail mode toggle (link | upload)
  const [thumbMode, setThumbMode] = useState("link");
  const [thumbLink, setThumbLink] = useState("");
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreviewUrl, setThumbPreviewUrl] = useState("");

  // Clean up object URL on unmount/change
  useEffect(() => {
    return () => {
      if (thumbPreviewUrl) URL.revokeObjectURL(thumbPreviewUrl);
    };
  }, [thumbPreviewUrl]);

  // 🔹 Pre-fill form data when in edit mode
  useEffect(() => {
    if (isEditMode && editCourse) {
      // Pre-fill title and description using refs
      if (titleRef.current) {
        titleRef.current.value = editCourse.title || "";
      }
      if (descRef.current) {
        descRef.current.value = editCourse.description || "";
      }

      // Pre-fill thumbnail
      const thumbnail = editCourse.thumbnail;
      if (thumbnail) {
        const mode = thumbnail.mode || "link";
        setThumbMode(mode);
        if (mode === "link" && thumbnail) {
          setThumbLink(thumbnail);
        }
      }

      // Pre-fill learning outcomes
      const outcomes = editCourse.learningOutcomes || [];
      if (outcomes.length > 0) {
        setOutcomeKeys(outcomes.map(() => Date.now() + Math.random()));
        // Also populate outcomeValues with the actual outcome strings
        const outcomeObj = {};
        outcomes.forEach((outcome, idx) => {
          outcomeObj[idx] = outcome;
        });
        setOutcomeValues(outcomeObj);
      }

      // Pre-fill modules
      const courseModules = editCourse.modules || [];
      if (courseModules.length > 0) {
        setModules(
          courseModules.map((m) => ({
            id: m.id || `module-${Date.now()}-${Math.random()}`,
            title: m.title || "",
            description: m.description || "",
            items: (m.items || []).map((it, idx) => ({
              id: it.id || `item-${Date.now()}-${idx}`,
              title: it.title || "",
              type: it.type || "video",
              url: it.url || "",
              estimatedMinutes: it.estimatedMinutes || 0,
              refId: it.refId || null,
            })),
          })),
        );
      }
    }
  }, [isEditMode, editCourse]);

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
        0,
      ),
    [modules],
  );

  // ✅ You can still keep this grouped memo if used elsewhere in UI.
  // We won't rely on it for payload counts (we compute counts from normalized modules in handleSave).
  const grouped = useMemo(() => {
    const out = {
      Videos: [],
      Documentation: [],
      Assignments: [],
      Quizzes: [],
    };
    modules.forEach((m) =>
      m.items.forEach((it) => {
        if (it.type === "video") out.Videos.push(it);
        else if (it.type === "reading") out.Documentation.push(it);
        else if (it.type === "assignment") out.Assignments.push(it);
        else if (it.type === "quiz") out.Quizzes.push(it);
      }),
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
            `Module ${mi + 1}, item ${ii + 1}: duration must be > 0 minutes.`,
          );

        if ((it.type === "video" || it.type === "reading") && !it.url?.trim())
          errors.push(
            `Module ${mi + 1}, item ${ii + 1}: URL is required for link items.`,
          );
      });
    });

    // Thumbnail validation (optional): no hard requirement, but if link mode and entered, basic check
    if (thumbMode === "link" && thumbLink) {
      try {
        // rudimentary URL format check
        const u = new URL(thumbLink);
        if (!/^https?:/.test(u.protocol)) throw new Error("Invalid URL");
      } catch {
        errors.push("Thumbnail link must be a valid URL.");
      }
    }

    // If in upload mode and file selected, ensure it's an image
    if (thumbMode === "upload" && thumbFile) {
      if (!thumbFile.type.startsWith("image/")) {
        errors.push("Uploaded thumbnail must be an image file.");
      }
    }

    return errors;
  };

  // Save course (JSON-only; Upload mode records file name only)
  const handleSave = async (e) => {
    e.preventDefault();

    const fd = new FormData(formRef.current);
    const errors = validate(fd);
    if (errors.length) {
      console.warn("Validation error:", errors[0]);
      return;
    }

    const title = (fd.get("title") || "").trim();
    const description = (fd.get("description") || "").trim();
    const learningOutcomes = (fd.getAll("outcomes[]") || [])
      .map((s) => (s || "").trim())
      .filter(Boolean);

    const thumbnailMode = thumbMode; // 'link' | 'upload'
    const thumbnailLink =
      thumbnailMode === "link" ? (thumbLink || "").trim() : "";
    const uploadedFile =
      thumbnailMode === "upload" ? fd.get("thumbnailFile") || null : null;

    // Normalize modules
    const normalizedModules = modules.map((m) => ({
      ...m,
      title: m.title.trim(),
      description: (m.description ?? "").trim(),
      items: m.items.map((it) => ({
        ...it,
        title: it.title.trim(),
        url: it.url?.trim() || "",
        estimatedMinutes: Number(it.estimatedMinutes) || 0,
        refId: it.refId ?? null,
        type: (it.type || "").toLowerCase(), // 'video'|'reading'|'assignment'|'quiz'
      })),
    }));

    // Totals & counts from normalizedModules
    const totalEstimatedMinutes = normalizedModules.reduce(
      (sum, m) =>
        sum +
        m.items.reduce((s, it) => s + (Number(it.estimatedMinutes) || 0), 0),
      0,
    );

    let videos = 0,
      documentation = 0,
      assignments = 0,
      quizzes = 0;
    normalizedModules.forEach((m) => {
      m.items.forEach((it) => {
        if (it.type === "video") videos++;
        else if (it.type === "reading") documentation++;
        else if (it.type === "assignment") assignments++;
        else if (it.type === "quiz") quizzes++;
      });
    });
    const counts = { videos, documentation, assignments, quizzes };

    // Thumbnail payload: only keep mode, link (for link mode), and fileName (for upload mode)
    const thumbnail = {
      mode: thumbnailMode, // 'link' or 'upload'
      link: thumbnailMode === "link" ? thumbnailLink : "",
      fileName: uploadedFile?.name || "", // when 'upload', record filename only
    };

    const me = getCurrentUser();

    const courseMeta = {
      title,
      author: "",
      description,
      learningOutcomes,
      thumbnail,
      modules: normalizedModules,
      totalEstimatedMinutes,
      counts,
    };

    setSaving(true);
    try {
      if (isEditMode && courseId) {
        // Update existing course
        await updateCourse(courseId, courseMeta);
        window.dispatchEvent(new Event("courses-changed"));
        navigate("/instructor-home");
      } else {
        // Create new course
        const created = await createCourse(courseMeta, {
          isMultipart: false,
        });

        if (me?.email) {
          recordCourseCreated(me.email, created.id);
        }

        window.dispatchEvent(new Event("courses-changed"));
        navigate("/instructor-home");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container my-4">
      {/* ONE SINGLE FORM for everything */}
      <form ref={formRef} onSubmit={handleSave}>
        {/* Card header */}
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white d-flex align-items-center gap-2">
            <h1 className="h4 mb-0 d-flex align-items-center gap-2">
              <span className="text-secondary">{ICONS.book ?? "📘"}</span>
              <span>Create Course</span>
            </h1>
          </div>

          {/* Card body – all course fields */}
          <div className="card-body">
            {/* Title */}
            <div className="mb-3">
              <label htmlFor="title" className="form-label">
                Course Title
              </label>
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
                            <label htmlFor="description" className="form-label">
                                Course Description
                            </label>
                            <textarea
                                ref={descRef}
                                id="description"
                                name="description"
                                className="form-control"
                                placeholder="Describe what this course covers..."
                                rows={4}
                                defaultValue=""
                required
                            />
                            <div className="form-text">
                                Tip: Be clear and concise.
                            </div>
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
                  onClick={addOutcome}
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
                    <li
                      key={key}
                      className="list-group-item d-flex align-items-center gap-2"
                    >
                      <span className="text-muted">•</span>
                      <input
                        type="text"
                        className="form-control"
                        name="outcomes[]"
                        placeholder={`Outcome ${idx + 1}`}
                        defaultValue={outcomeValues[idx] || ""}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => rmOutcome(idx)}
                        disabled={outcomeKeys.length === 1}
                        title="Remove"
                      >
                        {ICONS.delete}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Thumbnail */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white d-flex align-items-center justify-content-between">
                <h3 className="h6 mb-0">Course Thumbnail</h3>

                {/* Reused segmented toggle for thumbnail mode */}
                <div
                  className="seg-toggle"
                  role="radiogroup"
                  aria-label="Thumbnail mode"
                >
                  <input
                    type="radio"
                    id="thumb-link"
                    name="thumbnailMode"
                    value="link"
                    className="seg-toggle__input"
                    checked={thumbMode === "link"}
                    onChange={() => {
                      setThumbMode("link");
                      // clear upload selection when switching to link
                      setThumbFile(null);
                      if (thumbPreviewUrl) {
                        URL.revokeObjectURL(thumbPreviewUrl);
                        setThumbPreviewUrl("");
                      }
                    }}
                  />
                  <label
                    htmlFor="thumb-link"
                    className={
                      "seg-toggle__btn" +
                      (thumbMode === "link" ? " is-active" : "")
                    }
                  >
                    Link
                  </label>

                  <input
                    type="radio"
                    id="thumb-upload"
                    name="thumbnailMode"
                    value="upload"
                    className="seg-toggle__input"
                    checked={thumbMode === "upload"}
                    onChange={() => {
                      setThumbMode("upload");
                      // keep link value but it won't be used in upload mode
                    }}
                  />
                  <label
                    htmlFor="thumb-upload"
                    className={
                      "seg-toggle__btn" +
                      (thumbMode === "upload" ? " is-active" : "")
                    }
                  >
                    Upload
                  </label>
                </div>
              </div>

              <div className="card-body">
                {thumbMode === "link" ? (
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
                        value={thumbLink}
                        onChange={(e) => setThumbLink(e.target.value)}
                      />
                    </div>
                    <div className="form-text">
                      Paste an image URL to preview it.
                    </div>

                    {!!thumbLink && (
                      <div className="border rounded p-2 cc-thumb-preview mt-2">
                        <img
                          src={thumbLink}
                          alt="Thumbnail preview"
                          className="img-fluid rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <div className="form-text mt-2">
                          Preview (if the link is valid)
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-3">
                    <label htmlFor="thumbnailFile" className="form-label">
                      Upload Thumbnail
                    </label>
                    <input
                      type="file"
                      id="thumbnailFile"
                      name="thumbnailFile"
                      className="form-control"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0] || null;
                        setThumbFile(file);
                        // Manage preview
                        if (thumbPreviewUrl)
                          URL.revokeObjectURL(thumbPreviewUrl);
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setThumbPreviewUrl(url);
                        } else {
                          setThumbPreviewUrl("");
                        }
                      }}
                    />
                    <div className="form-text">
                      Choose an image file (PNG, JPG, etc.).
                    </div>

                    {!!thumbPreviewUrl && (
                      <div className="border rounded p-2 cc-thumb-preview mt-2">
                        <img
                          src={thumbPreviewUrl}
                          alt="Thumbnail preview"
                          className="img-fluid rounded"
                        />
                        <div className="form-text mt-2">Local preview</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* --------------------------- */}
            {/* 🔻 MODULES BUILDER 🔻 */}
            {/* --------------------------- */}
            <div className="mb-4 course-modules-scope">
              <CourseModulesBuilder modules={modules} setModules={setModules} />
            </div>

            {/* --------------------------- */}
            {/* 🔻 TOTAL COURSE TIME 🔻 */}
            {/* --------------------------- */}
            <div className="d-flex align-items-center justify-content-between p-3 cc-total-bar mb-3">
              <div>
                <div className="text-muted small">Total Course Time</div>
                <div className="fw-semibold">
                  {formatDuration(totalMinutes)}
                </div>
              </div>
              <div className="text-muted small">Based on item durations</div>
            </div>

            {/* Bottom Action Bar */}
            <div
              className="d-flex align-items-center justify-content-end mt-4 p-3 border-top"
              style={{ gap: "1rem" }}
            >
              {/* Single Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? "Saving..." : "Publish Course"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
