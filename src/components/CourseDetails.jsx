
// src/components/CourseDetails.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/course.css';
import NavbarComponent from './NavbarComponent';
import CourseCollapsibleSection from './CourseCollapsibleSection';

/** Prefix a path with app base (Vite BASE_URL or CRA PUBLIC_URL). */
function withBase(path) {
    const base =
        (typeof import.meta !== 'undefined' &&
            import.meta.env &&
            import.meta.env.BASE_URL) ||
        '/';
    const b = base.endsWith('/') ? base : `${base}/`;
    return path?.startsWith('/') ? `${b}${path.slice(1)}` : `${b}${path ?? ''}`;
}

/** Resolve a doc URL coming from JSON so it works in dev & prod. */
function resolveDocUrl(raw) {
    if (!raw || typeof raw !== 'string') return undefined;
    if (/^https?:\/\//i.test(raw)) return raw; // absolute
    if (raw.startsWith('/')) return withBase(raw); // root-relative
    let normalized = raw
        .replace(/^\.?\.?\//, '')
        .replace(/^\.?\.?\//, '')
        .replace(/^\.{1,2}\\/, '');
    if (/^docs\//i.test(normalized)) normalized = `/${normalized}`;
    if (!normalized.startsWith('/')) normalized = `/${normalized}`;
    return withBase(normalized);
}

function Star({ filled }) {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill={filled ? '#f59e0b' : 'none'}
            stroke="#f59e0b"
            strokeWidth="1.5"
            aria-hidden="true"
            style={{ display: 'block' }}
        >
            <path d="M10 2.5l2.47 5.3 5.83.46-4.38 3.8 1.32 5.6L10 14.9l-5.24 2.76 1.32-5.6-4.38-3.8 5.83-.46L10 2.5z" />
        </svg>
    );
}

export default function CourseDetails() {
    const { id } = useParams();

    // Fetch state
    const [loading, setLoading] = useState(true);
    const [loadErr, setLoadErr] = useState('');
    const [course, setCourse] = useState(null);

    // For resources panel
    const [assignments, setAssignments] = useState([]);
    const [quizzes, setQuizzes] = useState([]);

    // Enrollment
    const [enrolled, setEnrolled] = useState(false);
    useEffect(() => {
        const saved = localStorage.getItem(`enrolled:${id}`);
        if (saved === 'true') setEnrolled(true);
    }, [id]);

    const handleEnroll = () => {
        setEnrolled(true);
        localStorage.setItem(`enrolled:${id}`, 'true');
    };

    // ✅ Fetch from public/data/ (base-safe)
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                setLoadErr('');

                const [cRes, aRes, qRes] = await Promise.all([
                    fetch(withBase('data/courseDetails.json')),
                    fetch(withBase('data/assignmentData.json')),
                    fetch(withBase('data/quizData.json')),
                ]);

                if (!cRes.ok)
                    throw new Error(`HTTP ${cRes.status} fetching courseDetails.json`);
                if (!aRes.ok)
                    throw new Error(`HTTP ${aRes.status} fetching assignmentData.json`);
                if (!qRes.ok)
                    throw new Error(`HTTP ${qRes.status} fetching quizData.json`);

                const [coursesJson, assignmentsJson, quizzesJson] = await Promise.all([
                    cRes.json(),
                    aRes.json(),
                    qRes.json(),
                ]);

                const foundCourse =
                    (Array.isArray(coursesJson) ? coursesJson : []).find(
                        (c) => c.id === id,
                    ) || null;

                const aForCourse = (Array.isArray(assignmentsJson) ? assignmentsJson : []).filter(
                    (a) => a.courseId === id,
                );

                const qForCourse = (Array.isArray(quizzesJson) ? quizzesJson : []).filter(
                    (q) => q.courseId === id,
                );

                if (!alive) return;
                setCourse(foundCourse);
                setAssignments(aForCourse);
                setQuizzes(qForCourse);
                if (!foundCourse) setLoadErr('Course not found.');
            } catch (e) {
                if (!alive) return;
                setLoadErr(e.message || 'Failed to load course.');
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [id]);

    /**
     * ✅ Convert course.sections into normalized modules
     */
    const sectionModules = useMemo(() => {
        const sections = course?.sections || [];
        return (sections || []).map((s, idx) => {
            const rawItems =
                (Array.isArray(s.items) && s.items) ||
                (Array.isArray(s.lessons) && s.lessons) ||
                (Array.isArray(s.lectures) && s.lectures) ||
                [];

            const items = rawItems.map((it, itemIdx) => ({
                ...it,
                id: it?.id || `${s.id || `module-${idx + 1}`}-item-${itemIdx + 1}`,
                title: it?.title || it?.name || `Item ${itemIdx + 1}`,
                type: it?.type || 'reading',
                // keep url if present (lock if not enrolled)
                url: enrolled ? it?.url : undefined,
                estimatedMinutes: it?.estimatedMinutes ?? it?.durationMinutes ?? 0,
            }));

            return {
                ...s,
                id: s.id || `module-${idx + 1}`,
                title: s.title || s.name || `Module ${idx + 1}`,
                description: s.description || '',
                items,
            };
        });
    }, [course?.sections, enrolled]);

    /**
     * ✅ Build ONE course content list using DUMMY module names + DUMMY item names,
     * while preserving actual links/routes under the hood.
     *
     * - Assignments & Quizzes MUST use same routes as before:
     *   `/assignment/:id` and `/quiz/:id`
     * - We pass `to` for internal navigation, `url` for external.
     */
    const contentModules = useMemo(() => {
        const out = [];

        // 1) Keep existing course section modules first (as-is)
        out.push(...(sectionModules || []));

        // source arrays from course
        const videos = course?.videos || [];
        const docs = course?.docs || [];
        const links = course?.links || [];

        // 2) DUMMY module: "Practice Pack"
        // Put assignments + quizzes here (dummy item names), but route correctly.
        const practiceItems = [];

        (assignments || []).forEach((a, i) => {
            practiceItems.push({
                id: a?.id || `assignment-${i + 1}`,
                // dummy name (NOT "Assignments")
                title: `Challenge ${i + 1}`,
                type: 'assignment',
                // ✅ same route you used previously
                to: enrolled ? `/assignment/${a.id}` : undefined,
                // optional extra data if your collapsible supports it
                dueAt: a?.dueAt,
            });
        });

        (quizzes || []).forEach((q, i) => {
            practiceItems.push({
                id: q?.id || `quiz-${i + 1}`,
                // dummy name (NOT "Quizzes")
                title: `Checkpoint ${i + 1}`,
                type: 'quiz',
                // ✅ same route you used previously
                to: enrolled ? `/quiz/${q.id}` : undefined,
                dueAt: q?.dueAt,
            });
        });

        if (practiceItems.length > 0) {
            out.push({
                id: 'module-practice-pack',
                title: 'Module X: Practice Pack',
                description: 'Hands-on challenges and checkpoints to test your progress.',
                items: practiceItems,
            });
        }

        // 3) DUMMY module: "Media Vault"
        // videos go here with dummy item titles; URL preserved.
        const mediaItems = (videos || []).map((v, i) => ({
            id: v?.id || `video-${i + 1}`,
            title: `Clip ${i + 1}`,
            type: 'video',
            url: enrolled ? v?.url : undefined,
            estimatedMinutes: v?.estimatedMinutes ?? v?.durationMinutes ?? 0,
        }));

        if (mediaItems.length > 0) {
            out.push({
                id: 'module-media-vault',
                title: 'Module Y: Media Vault',
                description: 'Short clips and visual walkthroughs.',
                items: mediaItems,
            });
        }

        // 4) DUMMY module: "Reference Vault"
        // docs + links go here with dummy item titles; URLs preserved.
        const refItems = [];

        (docs || []).forEach((d, i) => {
            refItems.push({
                id: d?.id || `doc-${i + 1}`,
                title: `Reference Note ${i + 1}`,
                type: 'doc',
                url: enrolled ? resolveDocUrl(d?.url) : undefined,
            });
        });

        (links || []).forEach((l, i) => {
            refItems.push({
                id: l?.id || `link-${i + 1}`,
                title: `Extra Read ${i + 1}`,
                type: 'link',
                url: enrolled ? l?.url : undefined,
            });
        });

        if (refItems.length > 0) {
            out.push({
                id: 'module-reference-vault',
                title: 'Module Z: Reference Vault',
                description: 'Handy notes and supporting materials.',
                items: refItems,
            });
        }

        return out;
    }, [course, sectionModules, assignments, quizzes, enrolled]);

    // Loading / Error handling
    if (loading) {
        return (
            <div className="course-details">
                <p>Loading course…</p>
            </div>
        );
    }
    if (loadErr || !course) {
        return <div className="course-details">{loadErr || 'Course not found.'}</div>;
    }

    // Destructure only after course exists
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

    const stars = Math.round(Number(rating || 0));
    const formattedLearners = new Intl.NumberFormat().format(learners || 0);
    const formattedRatings = ratingsCount ? new Intl.NumberFormat().format(ratingsCount) : null;

    return (
        <div>
            <NavbarComponent />

            <div className="course-details">
                {/* HERO */}
                <section className="course-details__hero">
                    <div>
                        <h1 className="course-details__title">{title}</h1>

                        <div className="course-details__chips">
                            <span className="chip" title="Rating">
                                <strong style={{ marginRight: 6 }}>
                                    {Number(rating || 0).toFixed(1)}
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
                                {formattedLearners} students
                            </span>

                            {author && (
                                <span className="chip">
                                    Created by <strong style={{ marginLeft: 6 }}>{author}</strong>
                                </span>
                            )}

                            {lastUpdated && (
                                <span className="chip">
                                    Last updated {new Date(lastUpdated).toLocaleDateString()}
                                </span>
                            )}

                            {(languages.audio || (languages.captions || []).length > 0) && (
                                <span className="chip">
                                    {languages.audio ? `Audio: ${languages.audio}` : null}
                                    {(languages.captions || []).length > 0
                                        ? ` • CC: ${(languages.captions || []).join(', ')}`
                                        : ''}
                                </span>
                            )}
                        </div>

                        {description && <p className="course-details__desc">{description}</p>}

                        {!enrolled ? (
                            <>
                                <button
                                    className="mybtn mybtn-primary mybtn-xl"
                                    onClick={handleEnroll}
                                >
                                    Enroll now
                                </button>
                                <div className="enrollment-status">
                                    Content is locked until you enroll
                                </div>
                            </>
                        ) : (
                            <div className="enrollment-status">
                                ✅ You’re enrolled. All content is unlocked.
                            </div>
                        )}
                    </div>

                    {/* Right-side resources panel (keep featured video + includes) */}
                    <div className="resources">
                        {/* Featured video (first only) */}
                        {videos?.length > 0 && (
                            <section className="course-details__section">
                                <div className="video-grid">
                                    {videos.map((v, i) =>
                                        i === 0 ? (
                                            <article className="video-card" key={i}>
                                                <div className="video-thumb">
                                                    {thumbnail ? (
                                                        <img
                                                            src={withBase(thumbnail)}
                                                            alt={`Video ${i + 1}`}
                                                        />
                                                    ) : (
                                                        <div className="video-thumb__placeholder">
                                                            Video {i + 1}
                                                        </div>
                                                    )}
                                                    {!enrolled && (
                                                        <div className="lock-overlay">
                                                            <div className="lock-text">Enroll to Play</div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="video-info">
                                                    <h4 className="video-title">
                                                        {v.title || `Video ${i + 1}`}
                                                    </h4>
                                                    <a
                                                        href={v.url}
                                                        className={`video-link ${
                                                            !enrolled ? 'video-link--disabled' : ''
                                                        }`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => {
                                                            if (!enrolled) e.preventDefault();
                                                        }}
                                                    >
                                                        ▶ Watch
                                                    </a>
                                                </div>
                                            </article>
                                        ) : (
                                            <div key={i} />
                                        ),
                                    )}
                                </div>
                            </section>
                        )}

                        {/* THIS COURSE INCLUDES */}
                        <section className="course-details__section">
                            <h3 className="section-title">This course includes</h3>
                            <ul className="includes-list">
                                {'hoursOnDemandVideo' in includes && (
                                    <li>
                                        <span className="icon">🎬</span>
                                        {includes.hoursOnDemandVideo} hours on‑demand video
                                    </li>
                                )}
                                {'articles' in includes && (
                                    <li>
                                        <span className="icon">📰</span>
                                        {includes.articles} articles
                                    </li>
                                )}
                                {'downloadableResources' in includes && (
                                    <li>
                                        <span className="icon">📥</span>
                                        {includes.downloadableResources} downloadable resource(s)
                                    </li>
                                )}
                                {includes.accessOnMobile && (
                                    <li>
                                        <span className="icon">📱</span>Access on mobile
                                    </li>
                                )}
                                {includes.certificate && (
                                    <li>
                                        <span className="icon">🎓</span>Certificate of completion
                                    </li>
                                )}
                            </ul>
                        </section>
                    </div>
                </section>

                {/* WHAT YOU'LL LEARN */}
                {whatYouWillLearn.length > 0 && (
                    <section className="course-details__section">
                        <h3 className="section-title">What you’ll learn</h3>
                        <ul className="learn-grid">
                            {whatYouWillLearn.map((item, i) => (
                                <li key={i}>
                                    <span className="tick">✔</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* ✅ ONLY THIS CONTENT (blue section removed completely) */}
                {contentModules.length > 0 && (
                    <section className="course-details__section">
                        <h3 className="section-title">Course content</h3>
                        <CourseCollapsibleSection
                            modules={contentModules}
                            role="learner"
                            defaultCollapsed={true}
                        />
                    </section>
                )}
            </div>
        </div>
    );
}

