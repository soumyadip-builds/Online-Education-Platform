import { useEffect, useState } from "react";
import "../styles/instructorHome.css";
import CourseCard from "../components/CourseCard";
// import NavbarComponent from "../components/NavbarComponent";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "../styles/instructorHome.css";
// import Footer from "../components/FooterComponent";
import { useNavigate, Link } from "react-router-dom";

// NEW: read the current user from your session util
import { getCurrentUser } from "../utils/session";
import {
    listPosts,
    addReply,
    getUsers,
} from "../services/communicationService";
import { getCurrentUser as getSessionUser } from "../utils/session";
import { getAuthHeader, getAuthUser } from "../lib/authLocal";

export default function InstructorHomePage() {
    const navigate = useNavigate();

    // NEW: compute current instructor's display name (normalized)
    const [instructorName, setInstructorName] = useState("");

    useEffect(() => {
        const pullUser = () => {
            const user = getCurrentUser();
            // Only instructors should land here; still guard defensively
            const name = (user?.name || "").trim();
            setInstructorName(name);
        };
        pullUser();
        // Keep in sync if session changes (your app already emits this event)
        window.addEventListener("session-changed", pullUser);
        return () => window.removeEventListener("session-changed", pullUser);
    }, []);

    // Slides using your uploaded hero images in /public/images/carousel
    const slides = [
        {
            t: "Inspire. Guide. Transform.",
            d: "Every lesson you craft shapes a learner’s future.",
            bg: "#0d6efd",
            rightImg: "/images/HeroSlide_1.png",
        },
        {
            t: "Design Learning That Lasts",
            d: "Build courses that spark curiosity and confidence.",
            bg: "#6f42c1",
            rightImg: "/images/HeroSlide_2.png",
        },
        {
            t: "Instructors Make Momentum",
            d: "Your guidance turns effort into excellence.",
            bg: "#198754",
            rightImg: "/images/HeroSlide_3.png",
        },
    ];

    // === Courses: now loaded via fetch from /courseDetails.json ===
    const [courses, setCourses] = useState([]);
    const [coursesLoading, setCoursesLoading] = useState(true);
    const [coursesError, setCoursesError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            setCoursesLoading(true);
            setCoursesError(null);
            try {
                // Prefer server-backed courses (requires auth token)
                const API_BASE =
                    import.meta.env.VITE_API_BASE ??
                    "http://localhost:8000/edstream";
                // Use scope=created to return courses created by this instructor (owner mapping)
                const res = await fetch(`${API_BASE}/courses?scope=created`, {
                    headers: {
                        "Content-Type": "application/json",
                        ...getAuthHeader(),
                    },
                    credentials: "include",
                });

                if (!res.ok) {
                    // Fallback: try authored-by-name branch if created fails
                    throw new Error(`Failed to load courses (${res.status})`);
                }

                const payload = await res.json();
                const items = payload?.data ?? [];

                // Map to the shape expected by this component
                const normalized = items.map((c) => ({
                    id: c.id,
                    title: c.title ?? "Untitled Course",
                    description: c.description ?? "",
                    thumbnail: c.thumbnail || "",
                    learners: c.learners ?? 0,
                    rating: 0,
                    author: c.author ?? "",
                    counts: c.counts || {},
                }));

                // If no results and we have instructorName, try authored-by-name
                let final = normalized;
                if ((!final || final.length === 0) && instructorName) {
                    const res2 = await fetch(
                        `${API_BASE}/courses?scope=authored`,
                        {
                            headers: {
                                "Content-Type": "application/json",
                                ...getAuthHeader(),
                            },
                            credentials: "include",
                        },
                    );
                    if (res2.ok) {
                        const p2 = await res2.json();
                        final = (p2?.data ?? []).map((c) => ({
                            id: c.id,
                            title: c.title ?? "Untitled Course",
                            description: c.description ?? "",
                            thumbnail: c.thumbnail || "",
                            learners: c.learners ?? 0,
                            rating: 0,
                            author: c.author ?? "",
                            counts: c.counts || {},
                        }));
                    }
                }

                if (isMounted) setCourses(final);
            } catch (err) {
                if (isMounted)
                    setCoursesError(err.message || "Error loading courses");
            } finally {
                if (isMounted) setCoursesLoading(false);
            }
        };

        load();
        return () => {
            isMounted = false;
        };
        // Re-run when instructorName becomes available/changes
    }, [instructorName]);

    // Stats (computed from loaded courses)
    const totalCourses = courses.length;
    const activeStudents = courses.reduce((a, c) => a + (c.learners || 0), 0);
    const assignmentsDue = Math.max(0, Math.round(courses.length * 1.3));
    const avgQuizScore = 86;

    // ----- SESSION ↔ FORUM USER (BY userId) -----
    const [currentSessionUser, setCurrentSessionUser] = useState(null);
    const [currentServiceUser, setCurrentServiceUser] = useState(null);

    useEffect(() => {
        (async () => {
            const s = getSessionUser();
            setCurrentSessionUser(s);
            const users = await getUsers();
            const svc = users.find((u) => u.userId === s?.userId); // userId mapping
            setCurrentServiceUser(svc ?? null);
        })();
    }, []);

    // ----- Q&A (MOST RECENT 3 from forum) -----
    const [qnaItems, setQnaItems] = useState([]);
    const [qnaLoading, setQnaLoading] = useState(true);
    const [qnaError, setQnaError] = useState(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            setQnaLoading(true);
            setQnaError(null);
            try {
                // First, get all forum users to resolve names
                const users = await getUsers();
                const usersById = Object.fromEntries(
                    (users ?? []).map((u) => [u.userId, u]),
                );

                const authored = courses; // already filtered above by authorName if provided
                const collected = [];
                for (const c of authored) {
                    const posts = await listPosts(c.id);
                    (posts ?? []).forEach((p) => {
                        // Resolve user name from users list, fallback to 'Unknown'
                        const user = usersById[p.userId];
                        collected.push({
                            id: p.postId,
                            courseId: c.id,
                            courseName: c.title,
                            askedByName: user?.name || user?.email || "Unknown",
                            message: p.message,
                            createdAt: p.timestamp,
                        });
                    });
                }
                collected.sort(
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
                );
                if (alive) setQnaItems(collected.slice(0, 3));
            } catch (e) {
                if (alive) setQnaError(e.message ?? "Failed to load Q&A");
            } finally {
                if (alive) setQnaLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [courses]);

    return (
        <div>
            {/* <NavbarComponent /> */}
            <div className="instructor-home">
                {/* ===== HERO CAROUSEL (unchanged) ===== */}
                <div className="position-relative">
                    <div
                        id="instructorCarousel"
                        className="carousel slide"
                        data-bs-ride="carousel"
                    >
                        <div className="carousel-inner">
                            {slides.map((s, i) => (
                                <div
                                    className={`carousel-item ${i === 0 ? "active" : ""}`}
                                    key={i}
                                >
                                    <div
                                        className="d-flex align-items-center justify-content-center w-100 h-70 px-3 px-md-4"
                                        style={{ backgroundColor: s.bg }}
                                    >
                                        <div className="container">
                                            <div className="row align-items-center justify-content-between g-4">
                                                {/* LEFT TEXT */}
                                                <div className="col-12 col-md-6 offset-md-1 text-white text-center text-md-start">
                                                    <h1 className="fw-semibold display-5 mb-3">
                                                        {s.t}
                                                    </h1>
                                                    <p className="lead mb-0">
                                                        {s.d}
                                                    </p>
                                                </div>
                                                {/* RIGHT IMAGE */}
                                                <div className="col-12 col-md-4 d-flex justify-content-center">
                                                    <img
                                                        src={s.rightImg}
                                                        alt="Hero"
                                                        className="hero-illustration-super"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Controls */}
                        <button
                            className="btn btn-light btn-lg rounded-circle carousel-ctrl position-absolute top-50 start-0 translate-middle-y"
                            type="button"
                            data-bs-target="#instructorCarousel"
                            data-bs-slide="prev"
                            aria-label="Previous"
                        >
                            <i className="bi bi-chevron-left"></i>
                        </button>
                        <button
                            className="btn btn-light btn-lg rounded-circle carousel-ctrl position-absolute top-50 end-0 translate-middle-y"
                            type="button"
                            data-bs-target="#instructorCarousel"
                            data-bs-slide="next"
                            aria-label="Next"
                        >
                            <i className="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>

                {/* ===== Welcome + Stats (unchanged, but now computed from fetched courses) ===== */}
                <div className="container py-5">
                    <div className="row align-items-center gy-3">
                        <div className="col-lg-5">
                            <h2 className="mb-2">
                                Welcome back,{" "}
                                <span className="text-primary">Instructor</span>{" "}
                                👋
                            </h2>
                            <p className="text-muted mb-0">
                                A quick glance at your impact and learner
                                activity.
                            </p>
                        </div>
                        <div className="col-lg-7">
                            <div className="row g-3">
                                {[
                                    { v: totalCourses, l: "Courses" },
                                    { v: activeStudents, l: "Active Students" },
                                    { v: assignmentsDue, l: "Assignments Due" },
                                    {
                                        v: `${avgQuizScore}%`,
                                        l: "Avg Quiz Score",
                                    },
                                ].map((s, i) => (
                                    <div key={i} className="col-6 col-md-3">
                                        <div className="card border-0 shadow-sm text-center">
                                            <div className="card-body py-3">
                                                <div className="fw-bold fs-5">
                                                    {s.v}
                                                </div>
                                                <div className="text-muted small">
                                                    {s.l}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== Your Courses (FILTERED) ===== */}
                <div className="py-5 bg-light border-top border-bottom">
                    <div className="container">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h3 className="mb-0">Your Courses</h3>
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate("/course-creator")}
                            >
                                + Add Course
                            </button>
                        </div>

                        {/* Loading / Error / Content */}
                        {coursesLoading && (
                            <div className="alert alert-light border">
                                Loading courses…
                            </div>
                        )}

                        {coursesError && !coursesLoading && (
                            <div className="alert alert-danger">
                                Error: {coursesError}
                            </div>
                        )}

                        {!coursesLoading &&
                            !coursesError &&
                            courses.length === 0 && (
                                <div className="alert alert-light border d-flex align-items-center">
                                    <div className="me-2">
                                        {instructorName
                                            ? `No courses found for "${instructorName}".`
                                            : "No courses yet."}
                                    </div>
                                </div>
                            )}

                        {!coursesLoading &&
                            !coursesError &&
                            courses.length > 0 && (
                                <div className="row g-4">
                                    {courses.map((c) => (
                                        <div
                                            key={c.id}
                                            className="col-12 col-sm-6 col-lg-4"
                                        >
                                            <div className="card h-100 shadow-sm border-0">
                                                <CourseCard course={c} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                    </div>
                </div>

                {/* Recent Q&A / Messages */}
                <div className="container py-5">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h3 className="mb-0">Recent Q&amp;A / Messages</h3>
                        <Link
                            to="/forum"
                            className="btn btn-outline-primary btn-sm"
                        >
                            Open Forum
                        </Link>
                    </div>

                    <div className="card border-0 shadow-sm">
                        <div className="card-body p-0">
                            {qnaLoading ? (
                                <div className="p-4 text-center text-muted">
                                    Loading Q&amp;A…
                                </div>
                            ) : qnaError ? (
                                <div className="p-4 text-danger">
                                    Error: {qnaError}
                                </div>
                            ) : qnaItems.length === 0 ? (
                                <div className="p-4 text-center text-muted">
                                    No recent posts. You’re all caught up!
                                </div>
                            ) : (
                                <ul className="list-group list-group-flush">
                                    {qnaItems.map((q) => (
                                        <li
                                            key={q.id}
                                            className="list-group-item"
                                        >
                                            <div className="d-flex justify-content-between align-items-start gap-3">
                                                <div className="flex-grow-1">
                                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                                        <span className="badge bg-light text-dark">
                                                            {q.askedByName}
                                                        </span>
                                                        <span className="text-muted small">
                                                            in
                                                        </span>
                                                        <span className="badge bg-primary-subtle text-primary">
                                                            {q.courseName}
                                                        </span>
                                                    </div>
                                                    <div className="fw-semibold">
                                                        {q.message}
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
                {/* <Footer /> */}
            </div>
        </div>
    );
}
