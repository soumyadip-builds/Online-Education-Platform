import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/course.css";
import CourseCollapsibleSection from "./CourseCollapsibleSection";

// 🔐 Auth (JWT + user)
import { getAuthUser, isAuthed, getAuthHeader } from "../lib/authLocal";

// (Optional) notify on enrollment; keep if you already use it
import { notifyCourseEnrollment } from "../services/communicationService";

/** Build video list from modules/items if top-level videos absent */
function deriveVideosFromCourse(courseObj) {
    if (Array.isArray(courseObj?.videos) && courseObj.videos.length > 0) {
        return courseObj.videos;
    }
    const itemsFromModules = (courseObj?.modules ?? []).flatMap(
        (m) => m?.items ?? [],
    );
    const videos = itemsFromModules
        .filter((it) => (it?.type ?? "").toLowerCase() === "video")
        .map((v, i) => ({
            id: v?.id ?? `video-${i + 1}`,
            title: v?.title ?? `Video ${i + 1}`,
            url: v?.url ?? "",
            estimatedMinutes: v?.estimatedMinutes ?? v?.durationMinutes ?? 0,
        }))
        .filter((v) => !!v.url);
    return videos;
}

function Star({ filled }) {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill={filled ? "#f59e0b" : "none"}
            stroke="#f59e0b"
            strokeWidth="1.5"
            aria-hidden="true"
            style={{ display: "block" }}
        >
            <path d="M10 2.5l2.47 5.3 5.83.46-4.38 3.8 1.32 5.6L10 14.9l-5.24 2.76 1.32-5.6-4.38-3.8 5.83-.46L10 2.5z" />
        </svg>
    );
}

export default function CourseDetails() {
    const { id } = useParams(); // courseId (Mongo _id)
    const navigate = useNavigate();

    // 🔐 guard
    useEffect(() => {
        if (!isAuthed()) navigate("/auth", { replace: true });
    }, [navigate]);

    // Fetch state
    const [loading, setLoading] = useState(true);
    const [loadErr, setLoadErr] = useState("");
    const [course, setCourse] = useState(null);
    // NEW: toast + checking flag
    const [checkingEnrollment, setCheckingEnrollment] = useState(false);
    const [toast, setToast] = useState({
        type: "",
        message: "",
        visible: false,
    });

    // Tiny toast helpers
    function showToast(message, type = "success", timeoutMs = 2500) {
        setToast({ type, message, visible: true });
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(() => {
            setToast((t) => ({ ...t, visible: false }));
        }, timeoutMs);
    }

    // Enrollment + role
    const [enrolled, setEnrolled] = useState(false);
    const [role, setRole] = useState(null);
    const isLearner = role === "learner";
    const isInstructor = role === "instructor";
    const hasAccess = isLearner ? enrolled : true;

    // compute role/enrollment from auth user (you can keep your own store/event wiring)
    const refreshEnrollmentAndRole = useCallback(() => {
        const me = getAuthUser();
        const r = me?.role ?? null;
        setRole(r);
    }, []);

    useEffect(() => {
        refreshEnrollmentAndRole();
        const onAuthChanged = () => refreshEnrollmentAndRole();
        window.addEventListener("auth-changed", onAuthChanged);
        return () => window.removeEventListener("auth-changed", onAuthChanged);
    }, [refreshEnrollmentAndRole]);

    // Fetch course from API
    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setLoading(true);
                setLoadErr("");

                const API_BASE = "http://localhost:8000/edstream";

                const res = await fetch(`${API_BASE}/courses/${id}?expand=1`, {
                    headers: {
                        "Content-Type": "application/json",
                        ...getAuthHeader(),
                    },
                    credentials: "include",
                });

                if (!res.ok)
                    throw new Error(`HTTP ${res.status} fetching course`);

                const payload = await res.json();

                // Works with both shapes: {ok:true,data} OR raw doc
                const isWrapped =
                    payload &&
                    typeof payload === "object" &&
                    Object.prototype.hasOwnProperty.call(payload, "ok");

                if (isWrapped && payload.ok === false) {
                    throw new Error(payload?.error || "Failed to load course");
                }

                const foundCourse = isWrapped ? payload.data : payload;
                if (!foundCourse || typeof foundCourse !== "object") {
                    throw new Error("Course not found");
                }

                // DEBUG: Log the API response
                console.log("CourseDetails - API Response:", payload);
                console.log("CourseDetails - foundCourse:", foundCourse);

                const normalizedCourse = {
                    ...foundCourse,
                    // normalize thumbnail to a plain string
                    thumbnail: foundCourse?.thumbnail ?? "",
                    // Include learners count from API
                    learners: foundCourse?.learners ?? 0,
                    // DEBUG: Log the learners value
                    _debug_learners: foundCourse?.learners,
                    // Map learningOutcomes from API to whatYouWillLearn for the UI
                    whatYouWillLearn: foundCourse?.learningOutcomes ?? [],
                    // Calculate includes from course data
                    includes: {
                        hoursOnDemandVideo: foundCourse?.totalEstimatedMinutes
                            ? Math.round(
                                  (foundCourse.totalEstimatedMinutes / 60) * 10,
                              ) / 10
                            : (foundCourse?.counts?.videos ?? 0),
                        articles: foundCourse?.counts?.documentation ?? 0,
                        downloadableResources:
                            foundCourse?.counts?.assignments ?? 0,
                        accessOnMobile: true,
                        certificate: true,
                    },
                    // map modules -> sections your UI expects
                    sections: (foundCourse.modules ?? []).map((m, idx) => ({
                        id: m.id ?? `module-${idx + 1}`,
                        title: m.title ?? `Module ${idx + 1}`,
                        description: m.description ?? "",
                        items: (m.items ?? []).map((it, ii) => ({
                            id:
                                it.id ??
                                `${m.id ?? `module-${idx + 1}`}-item-${ii + 1}`,
                            title: it.title ?? `Item ${ii + 1}`,
                            type: it.type ?? "reading",
                            url: it.url || undefined,
                            to:
                                it.to ||
                                (it.refId && it.type === "assignment"
                                    ? `/assignment/${it.refId}`
                                    : it.refId && it.type === "quiz"
                                      ? `/quiz/${it.refId}`
                                      : undefined),
                            estimatedMinutes: it.estimatedMinutes ?? 0,
                        })),
                    })),
                    videos: deriveVideosFromCourse(foundCourse),
                };

                if (!alive) return;
                setCourse(normalizedCourse);
            } catch (e) {
                if (!alive) return;
                setLoadErr(e?.message ?? "Failed to load course.");
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [id]);

    // 2) Check if the learner already enrolled (hide CTA when true)
    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const me = getAuthUser();
                if (!me?.email || me?.role !== "learner") return;
                setCheckingEnrollment(true);

                const API_BASE = "http://localhost:8000/edstream";

                const res = await fetch(`${API_BASE}/courses?scope=enrolled`, {
                    headers: {
                        "Content-Type": "application/json",
                        ...getAuthHeader(),
                    },
                    credentials: "include",
                });

                if (!res.ok) return;

                const payload = await res.json();
                const list = Array.isArray(payload?.data)
                    ? payload.data
                    : Array.isArray(payload)
                      ? payload
                      : [];

                const already = list.some((c) => (c.id || c._id) === id);
                if (!alive) return;
                if (already) setEnrolled(true);
            } catch {
                // swallow
            } finally {
                if (!alive) return;
                setCheckingEnrollment(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [id]);

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
        try {
            const API_BASE = "http://localhost:8000/edstream";

            const resp = await fetch(`${API_BASE}/courses/${id}/enroll`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeader(),
                },
                credentials: "include",
            });

            const data = await resp.json();
            if (!resp.ok || data?.ok === false) {
                throw new Error(data?.error || "Failed to enroll.");
            }
            setEnrolled(true);
            showToast("Enrolled successfully ✅", "success");

            try {
                console.log("Enrolling learner:", me);
                await notifyCourseEnrollment({
                    courseId: id,
                    courseTitle: course?.title,
                    learnerEmail: me.email,
                    learnerName: me.name,
                    learnerUserId : me.userId
                });
            } catch (e) {
                console.warn("Enrollment notification failed:", e);
            }
        } catch (e) {
            showToast(e.message || "Enrollment failed", "error");
        }
    };

    /** Convert course.sections into normalized modules honoring access */
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
                id:
                    it?.id ??
                    `${s.id ?? `module-${idx + 1}`}-item-${itemIdx + 1}`,
                title: it?.title ?? it?.name ?? `Item ${itemIdx + 1}`,
                type: it?.type ?? "reading",
                url: hasAccess ? it?.url : undefined,
                to: hasAccess ? it?.to : undefined,
                estimatedMinutes:
                    it?.estimatedMinutes ?? it?.durationMinutes ?? 0,
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
        return out;
    }, [sectionModules]);

    // Handler to open edit module - redirects to CourseCreator with course data
    const handleEditModule = useCallback(
        (moduleId) => {
            // Navigate to CourseCreator with the original course data for editing
            // We need to pass the raw course data (foundCourse) which has 'modules'
            // instead of the normalized 'sections' format
            const API_BASE = "http://localhost:8000/edstream";

            // Fetch the raw course data directly for editing
            fetch(`${API_BASE}/courses/${id}`, {
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeader(),
                },
                credentials: "include",
            })
                .then((res) => res.json())
                .then((payload) => {
                    const isWrapped =
                        payload &&
                        typeof payload === "object" &&
                        Object.prototype.hasOwnProperty.call(payload, "ok");
                    const rawCourse =
                        isWrapped && payload.ok ? payload.data : payload;

                    navigate("/course-creator", {
                        state: {
                            editCourse: rawCourse,
                            editMode: true,
                        },
                    });
                })
                .catch((err) => {
                    console.error("Error fetching course for edit:", err);
                    // Fallback to using the current normalized course
                    navigate("/course-creator", {
                        state: {
                            editCourse: course,
                            editMode: true,
                        },
                    });
                });
        },
        [course, id, navigate],
    );

    // Loading / Error UI
    if (loading) {
        return (
            <div className="course-details">
                <p>Loading course…</p>
            </div>
        );
    }
    if (loadErr || !course) {
        return (
            <div className="course-details">
                {loadErr ?? "Course not found."}
            </div>
        );
    }

    const {
        title,
        author,
        rating,
        ratingsCount,
        learners,
        lastUpdated,
        languages = {},
        thumbnail,
        description,
        whatYouWillLearn = [],
        includes = {},
        videos = [],
    } = course;

    const stars = Math.round(Number(rating ?? 3.5));
    const formattedLearners = new Intl.NumberFormat().format(learners ?? 0);
    const formattedRatings = ratingsCount
        ? new Intl.NumberFormat().format(ratingsCount)
        : undefined;

    return (
        <div>
            <div className="course-details">
                {/* HERO */}
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
                                {formattedRatings && (
                                    <span style={{ marginLeft: 8 }}>
                                        ({formattedRatings} ratings)
                                    </span>
                                )}
                            </span>
                            <span className="chip" title="Learners">
                                {formattedLearners} learners
                            </span>
                            {author && (
                                <span className="chip">
                                    Created by{" "}
                                    <strong style={{ marginLeft: 6 }}>
                                        {author}
                                    </strong>
                                </span>
                            )}
                            {lastUpdated && (
                                <span className="chip">
                                    Last updated{" "}
                                    {new Date(lastUpdated).toLocaleDateString()}
                                </span>
                            )}
                            {(languages.audio ||
                                (languages.captions ?? []).length > 0) && (
                                <span className="chip">
                                    {languages.audio
                                        ? `Audio: ${languages.audio}`
                                        : null}
                                    {(languages.captions ?? []).length > 0
                                        ? ` • CC: ${(languages.captions ?? []).join(", ")}`
                                        : ""}
                                </span>
                            )}
                        </div>

                        {description && (
                            <p className="course-details__desc">
                                {description}
                            </p>
                        )}

                        {/* CTA / Enrollment */}
                        {isLearner && !enrolled ? (
                            <>
                                {checkingEnrollment ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            minHeight: 40,
                                        }}
                                    >
                                        <span
                                            className="mini-spinner"
                                            aria-hidden="true"
                                        />
                                        <span className="enrollment-status">
                                            Checking enrollment…
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            className="mybtn mybtn-primary mybtn-xl"
                                            onClick={handleEnroll}
                                            disabled={checkingEnrollment}
                                        >
                                            Enroll now
                                        </button>
                                        <div className="enrollment-status">
                                            Content is locked until you enroll
                                        </div>
                                    </>
                                )}
                            </>
                        ) : isLearner && enrolled ? (
                            <div className="enrollment-status">
                                ✅ You're enrolled. All content is unlocked.
                            </div>
                        ) : null}
                    </div>

                    {/* Right-side resources */}
                    <div className="resources">
                        {videos?.length > 0 && (
                            <section className="course-details__section">
                                <div className="video-grid">
                                    {videos.slice(0, 1).map((v) => (
                                        <article
                                            className="video-card"
                                            key={v.id || v.title}
                                        >
                                            <div className="video-thumb">
                                                {thumbnail ? (
                                                    <img
                                                        src={thumbnail}
                                                        alt={v.title}
                                                    />
                                                ) : (
                                                    <div className="video-thumb__placeholder">
                                                        {v.title || "Video"}
                                                    </div>
                                                )}
                                                {isLearner && !enrolled && (
                                                    <div className="lock-overlay">
                                                        <div className="lock-text">
                                                            Enroll to Play
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="video-info">
                                                <h4 className="video-title">
                                                    {v.title}
                                                </h4>
                                                <a
                                                    href={v.url}
                                                    className={`video-link ${
                                                        !hasAccess
                                                            ? "video-link--disabled"
                                                            : ""
                                                    }`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => {
                                                        if (!hasAccess)
                                                            e.preventDefault();
                                                    }}
                                                >
                                                    ▶ Watch
                                                </a>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className="course-details__section">
                            <h3 className="section-title">
                                This course includes
                            </h3>
                            <ul className="includes-list list-unstyled">
                                {includes.hoursOnDemandVideo > 0 && (
                                    <li>
                                        <span className="icon">🎬</span>{" "}
                                        {includes.hoursOnDemandVideo} hours
                                        on-demand video
                                    </li>
                                )}
                                {includes.articles > 0 && (
                                    <li>
                                        <span className="icon">📰</span>{" "}
                                        {includes.articles} articles
                                    </li>
                                )}
                                {includes.downloadableResources > 0 && (
                                    <li>
                                        <span className="icon">📥</span>{" "}
                                        {includes.downloadableResources}{" "}
                                        downloadable resource(s)
                                    </li>
                                )}
                                {includes.accessOnMobile && (
                                    <li>
                                        <span className="icon">📱</span>
                                        Access on mobile
                                    </li>
                                )}
                                {includes.certificate && (
                                    <li>
                                        <span className="icon">🎓</span>
                                        Certificate of completion
                                    </li>
                                )}
                            </ul>
                        </section>
                    </div>
                </section>

                {/* WHAT YOU'LL LEARN */}
                {whatYouWillLearn.length > 0 && (
                    <section className="course-details__section">
                        <h3 className="section-title">What you'll learn</h3>
                        <ul className="learn-grid list-unstyled">
                            {whatYouWillLearn.map((item, i) => (
                                <li key={i}>
                                    <span className="tick">✔</span> {item}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Course content */}
                {contentModules.length > 0 && (
                    <section className="course-details__section">
                        <h3 className="section-title">Course content</h3>
                        <CourseCollapsibleSection
                            modules={contentModules}
                            role={role ?? "learner"}
                            defaultCollapsed={true}
                            onEditModule={handleEditModule}
                        />
                    </section>
                )}
            </div>

            {toast.visible && (
                <div
                    className={`inline-toast inline-toast--${toast.type}`}
                    role="status"
                    aria-live="polite"
                >
                    {toast.message}
                </div>
            )}
        </div>
    );
}
