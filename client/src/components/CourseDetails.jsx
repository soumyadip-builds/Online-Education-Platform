import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/course.css";
import CourseCollapsibleSection from "./CourseCollapsibleSection";

// ✅ Auth only from authLocal (JWT + user)
import { getAuthUser, isAuthed } from "../lib/authLocal";

// Keeping this only for local user lookup to check enrollment
import { getUserByEmail } from "../utils/session";

import { enrollInCourse } from "../utils/userStorage";
import { notifyCourseEnrollment } from "../services/communicationService";

const LS_KEY_COURSES = "cb_courses_v1";
const LS_ASSIGNMENTS_KEY = "cb_assignments_v1";

function lsAssignmentsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_ASSIGNMENTS_KEY) ?? "[]"); }
  catch { return []; }
}
function loadCreatedCourses() {
  try {
    const raw = localStorage.getItem(LS_KEY_COURSES) ?? "[]";
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}
function mergeCourses(seedCourses, createdCourses) {
  const map = new Map();
  [...(seedCourses ?? []), ...(createdCourses ?? [])].forEach((c) => {
    if (c && c.id) map.set(c.id, c);
  });
  return Array.from(map.values());
}
function deriveVideosFromCourse(courseObj) {
  if (Array.isArray(courseObj?.videos) && courseObj.videos.length > 0) {
    return courseObj.videos;
  }
  const itemsFromSections = (courseObj?.sections ?? []).flatMap((s) => s?.items ?? []);
  const itemsFromModules = (courseObj?.modules ?? []).flatMap((m) => m?.items ?? []);
  const allItems = [...itemsFromSections, ...itemsFromModules];
  return allItems
    .filter((it) => (it?.type ?? "").toLowerCase() === "video")
    .map((v, i) => ({
      id: v?.id ?? `video-${i + 1}`,
      title: v?.title ?? `Video ${i + 1}`,
      url: v?.url ?? "",
      estimatedMinutes: v?.estimatedMinutes ?? v?.durationMinutes ?? 0,
    }))
    .filter((v) => !!v.url);
}
function withBase(path) {
  const base =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL) || "/";
  const b = base.endsWith("/") ? base : `${base}/`;
  return path?.startsWith("/") ? `${b}${path.slice(1)}` : `${b}${path ?? ""}`;
}
function resolveDocUrl(raw) {
  if (!raw || typeof raw !== "string") return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return withBase(raw);
  let normalized = raw.replace(/^\.\.?\//, "").replace(/^\.\.?\//, "");
  if (/^docs\//i.test(normalized)) normalized = `/${normalized}`;
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  return withBase(normalized);
}
function Star({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill={filled ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="1.5" aria-hidden="true" style={{ display: "block" }}>
      <path d="M10 2.5l2.47 5.3 5.83.46-4.38 3.8 1.32 5.6L10 14.9l-5.24 2.76 1.32-5.6-4.38-3.8 5.83-.46L10 2.5z" />
    </svg>
  );
}

export default function CourseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 🔐 Auth guard
  useEffect(() => {
    if (!isAuthed()) navigate("/auth", { replace: true });
  }, [navigate]);

  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [course, setCourse] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  const [enrolled, setEnrolled] = useState(false);
  const [role, setRole] = useState(null);
  const isLearner = role === "learner";
  const isInstructor = role === "instructor";
  const hasAccess = isLearner ? enrolled : true;

  // Compute enrollment + role from auth user
  const refreshEnrollmentAndRole = useCallback(() => {
    const me = getAuthUser();
    const r = me?.role ?? null;
    setRole(r);
    if (!me?.email) {
      setEnrolled(false);
      return;
    }
    const fullUser = getUserByEmail(me.email);
    const isEnrolled =
      !!fullUser &&
      Array.isArray(fullUser.coursesEnrolled) &&
      fullUser.coursesEnrolled.includes(id);
    setEnrolled(isEnrolled);
  }, [id]);

  // React to auth and user-base changes
  useEffect(() => {
    refreshEnrollmentAndRole();
    const onAuthChanged = () => refreshEnrollmentAndRole();
    const onUsersChanged = () => refreshEnrollmentAndRole();
    window.addEventListener("auth-changed", onAuthChanged);
    window.addEventListener("users-changed", onUsersChanged);
    return () => {
      window.removeEventListener("auth-changed", onAuthChanged);
      window.removeEventListener("users-changed", onUsersChanged);
    };
  }, [refreshEnrollmentAndRole]);

  const handleEnroll = async () => {
    const me = getAuthUser();
    if (!me?.email) {
      alert("Please log in to enroll.");
      return;
    }
    if (me.role !== "learner") {
      alert("Only learners can enroll in courses.");
      return;
    }
    const { ok, error } = enrollInCourse(me.email, id);
    if (!ok) {
      alert(error ?? "Failed to enroll. Please try again.");
      return;
    }
    setEnrolled(true);
    try {
      await notifyCourseEnrollment({
        courseId: id,
        courseTitle: course?.title,
        learnerEmail: me.email,
        learnerName: me.name,
      });
    } catch (e) {
      console.warn("Enrollment notification failed:", e);
    }
  };

  // fetch course + resources
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setLoadErr("");
        const [cRes, aRes, qRes] = await Promise.all([
          fetch("/data/courseDetails.json"),
          fetch("/data/assignmentData.json"),
          fetch("/data/quizData.json"),
        ]);
        if (!cRes.ok) throw new Error(`HTTP ${cRes.status} fetching courseDetails.json`);
        if (!aRes.ok) throw new Error(`HTTP ${aRes.status} fetching assignmentData.json`);
        if (!qRes.ok) throw new Error(`HTTP ${qRes.status} fetching quizData.json`);

        const [coursesJson, assignmentsJson, quizzesJson] = await Promise.all([
          cRes.json(),
          aRes.json(),
          qRes.json(),
        ]);

        const seedCourses = Array.isArray(coursesJson) ? coursesJson : [];
        const createdCourses = loadCreatedCourses();
        const allCourses = mergeCourses(seedCourses, createdCourses);
        const foundCourse = allCourses.find((c) => c.id === id) ?? null;

        const normalizedCourse = foundCourse
          ? {
              ...foundCourse,
              thumbnail:
                typeof foundCourse.thumbnail === "string"
                  ? foundCourse.thumbnail
                  : foundCourse.thumbnail?.link ?? "",
              sections: Array.isArray(foundCourse.sections)
                ? foundCourse.sections
                : (foundCourse.modules ?? []).map((m, idx) => ({
                    id: m.id ?? `module-${idx + 1}`,
                    title: m.title ?? `Module ${idx + 1}`,
                    description: m.description ?? "",
                    items: (m.items ?? []).map((it, ii) => ({
                      id: it.id ?? `${m.id ?? `module-${idx + 1}`}-item-${ii + 1}`,
                      title: it.title ?? `Item ${ii + 1}`,
                      type: it.type ?? "reading",
                      url: it.url ?? "",
                      estimatedMinutes: it.estimatedMinutes ?? 0,
                    })),
                  })),
              videos: deriveVideosFromCourse(foundCourse),
            }
          : null;

        setCourse(normalizedCourse);

        const lsAll = lsAssignmentsLoad();
        const mergedAssignments = [
          ...(Array.isArray(assignmentsJson) ? assignmentsJson : []),
          ...lsAll,
        ];
        const aForCourse = mergedAssignments.filter((a) => a.courseId === id);
        const qForCourse = (Array.isArray(quizzesJson) ? quizzesJson : []).filter(
          (q) => q.courseId === id
        );

        if (!alive) return;
        setAssignments(aForCourse);
        setQuizzes(qForCourse);
        if (!foundCourse) setLoadErr("Course not found.");
      } catch (e) {
        if (!alive) return;
        setLoadErr(e.message ?? "Failed to load course.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const reload = () => window.location.reload();
    window.addEventListener("courses-changed", reload);
    return () => {
      alive = false;
      window.removeEventListener("courses-changed", reload);
    };
  }, [id]);

  const sectionModules = useMemo(() => {
    const sections = course?.sections ?? [];
    return (sections ?? []).map((s, idx) => {
      const rawItems =
        (Array.isArray(s.items) && s.items) ||
        (Array.isArray(s.lessons) && s.lessons) ||
        (Array.isArray(s.lectures) && s.lectures) ||
        [];
      const items = rawItems.map((it, itemIdx) => ({
        ...it,
        id: it?.id ?? `${s.id ?? `module-${idx + 1}`}-item-${itemIdx + 1}`,
        title: it?.title ?? it?.name ?? `Item ${itemIdx + 1}`,
        type: it?.type ?? "reading",
        url: hasAccess ? it?.url : undefined,
        estimatedMinutes: it?.estimatedMinutes ?? it?.durationMinutes ?? 0,
      }));
      return {
        ...s,
        id: s.id ?? `module-${idx + 1}`,
        title: s.title ?? s.name ?? `Module ${idx + 1}`,
        description: s.description ?? "",
        items,
      };
    });
  }, [course?.sections, hasAccess]);

  const contentModules = useMemo(() => {
    const out = [];
    out.push(...(sectionModules ?? []));
    const videos = course?.videos ?? [];
    const docs = course?.docs ?? [];
    const links = course?.links ?? [];

    const practiceItems = [];
    (assignments ?? []).forEach((a, i) => {
      practiceItems.push({
        id: a?.id ?? `assignment-${i + 1}`,
        title: `Challenge ${i + 1}`,
        type: "assignment",
        to: hasAccess ? `/assignment/${a.id}` : undefined,
        dueAt: a?.dueAt,
      });
    });
    (quizzes ?? []).forEach((q, i) => {
      practiceItems.push({
        id: q?.id ?? `quiz-${i + 1}`,
        title: `Checkpoint ${i + 1}`,
        type: "quiz",
        to: hasAccess ? `/quiz/${q.id}` : undefined,
        dueAt: q?.dueAt,
      });
    });
    if (practiceItems.length > 0) {
      out.push({
        id: "module-practice-pack",
        title: "Module X: Practice Pack",
        description: "Hands-on challenges and checkpoints to test your progress.",
        items: practiceItems,
      });
    }

    const mediaItems = (videos ?? []).map((v, i) => ({
      id: v?.id ?? `video-${i + 1}`,
      title: `Clip ${i + 1}`,
      type: "video",
      url: hasAccess ? v?.url : undefined,
      estimatedMinutes: v?.estimatedMinutes ?? v?.durationMinutes ?? 0,
    }));
    if (mediaItems.length > 0) {
      out.push({
        id: "module-media-vault",
        title: "Module Y: Media Vault",
        description: "Short clips and visual walkthroughs.",
        items: mediaItems,
      });
    }

    const refItems = [];
    (docs ?? []).forEach((d, i) => {
      refItems.push({
        id: d?.id ?? `doc-${i + 1}`,
        title: `Reference Note ${i + 1}`,
        type: "doc",
        url: hasAccess ? resolveDocUrl(d?.url) : undefined,
      });
    });
    (links ?? []).forEach((l, i) => {
      refItems.push({
        id: l?.id ?? `link-${i + 1}`,
        title: `Extra Read ${i + 1}`,
        type: "link",
        url: hasAccess ? l?.url : undefined,
      });
    });
    if (refItems.length > 0) {
      out.push({
        id: "module-reference-vault",
        title: "Module Z: Reference Vault",
        description: "Handy notes and supporting materials.",
        items: refItems,
      });
    }
    return out;
  }, [course, sectionModules, assignments, quizzes, hasAccess]);

  if (loading) {
    return <div className="course-details"><p>Loading course…</p></div>;
  }
  if (loadErr || !course) {
    return <div className="course-details">{loadErr ?? "Course not found."}</div>;
  }

  const {
    title, author, rating, ratingsCount, learners, lastUpdated,
    languages = {}, thumbnail, description,
    whatYouWillLearn = [], includes = {}, videos = [],
  } = course;

  const stars = Math.round(Number(rating ?? 3.5));
  const formattedLearners = new Intl.NumberFormat().format(learners ?? 1369);
  const formattedRatings = ratingsCount ? new Intl.NumberFormat().format(ratingsCount) : 12;

  return (
    <div>
      <div className="course-details">
        <section className="course-details__hero">
          <div>
            <h1 className="course-details__title">{title}</h1>
            <div className="course-details__chips">
              <span className="chip" title="Rating">
                <strong style={{ marginRight: 6 }}>
                  {Number(rating ?? 3.5).toFixed(1)}
                </strong>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} filled={i < stars} />
                ))}
                {formattedRatings && <span style={{ marginLeft: 8 }}>({formattedRatings} ratings)</span>}
              </span>
              <span className="chip" title="Learners">{formattedLearners} students</span>
              {author && <span className="chip">Created by <strong style={{ marginLeft: 6 }}>{author}</strong></span>}
              {lastUpdated && <span className="chip">Last updated {new Date(lastUpdated).toLocaleDateString()}</span>}
              {(languages.audio || (languages.captions ?? []).length > 0) && (
                <span className="chip">
                  {languages.audio ? `Audio: ${languages.audio}` : null}
                  {(languages.captions ?? []).length > 0 ? ` • CC: ${(languages.captions ?? []).join(", ")}` : ""}
                </span>
              )}
            </div>

            {description && <p className="course-details__desc">{description}</p>}

            {isLearner && !enrolled ? (
              <>
                <button className="mybtn mybtn-primary mybtn-xl" onClick={handleEnroll}>Enroll now</button>
                <div className="enrollment-status">Content is locked until you enroll</div>
              </>
            ) : isLearner && enrolled ? (
              <div className="enrollment-status">✅ You’re enrolled. All content is unlocked.</div>
            ) : null}
          </div>

          <div className="resources">
            {videos?.length > 0 && (
              <section className="course-details__section">
                <div className="video-grid">
                  {videos.map((v, i) =>
                    i === 0 ? (
                      <article className="video-card" key={i}>
                        <div className="video-thumb">
                          {thumbnail ? <img src={thumbnail} alt={`Video ${i + 1}`} /> : <div className="video-thumb__placeholder">Video {i + 1}</div>}
                          {isLearner && !enrolled && (
                            <div className="lock-overlay"><div className="lock-text">Enroll to Play</div></div>
                          )}
                        </div>
                        <div className="video-info">
                          <h4 className="video-title">{v.title ?? `Video ${i + 1}`}</h4>
                          <a
                            href={v.url}
                            className={`video-link ${!hasAccess ? "video-link--disabled" : ""}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => { if (!hasAccess) e.preventDefault(); }}
                          >
                            ▶ Watch
                          </a>
                        </div>
                      </article>
                    ) : <div key={i} />
                  )}
                </div>
              </section>
            )}

            <section className="course-details__section">
              <h3 className="section-title">This course includes</h3>
              <ul className="includes-list">
                {"hoursOnDemandVideo" in includes && (
                  <li><span className="icon">🎬</span> {includes.hoursOnDemandVideo} hours on‑demand video</li>
                )}
                {"articles" in includes && (<li><span className="icon">📰</span> {includes.articles} articles</li>)}
                {"downloadableResources" in includes && (
                  <li><span className="icon">📥</span> {includes.downloadableResources} downloadable resource(s)</li>
                )}
                {includes.accessOnMobile && (<li><span className="icon">📱</span>Access on mobile</li>)}
                {includes.certificate && (<li><span className="icon">🎓</span>Certificate of completion</li>)}
              </ul>
            </section>
          </div>
        </section>

        { (course.whatYouWillLearn ?? []).length > 0 && (
          <section className="course-details__section">
            <h3 className="section-title">What you’ll learn</h3>
            <ul className="learn-grid">
              {course.whatYouWillLearn.map((item, i) => (
                <li key={i}><span className="tick">✔</span> {item}</li>
              ))}
            </ul>
          </section>
        )}

        {/** Course content */}
        { (contentModules ?? []).length > 0 && (
          <section className="course-details__section">
            <h3 className="section-title">Course content</h3>
            <CourseCollapsibleSection
              modules={contentModules}
              role={role ?? "learner"}
              defaultCollapsed={true}
            />
          </section>
        )}
      </div>
    </div>
  );
}