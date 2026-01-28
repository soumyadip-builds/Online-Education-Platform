// src/components/CoursePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import CourseCard from "../components/CourseCard";
import "../styles/course.css";
import NavbarComponent from "../components/NavbarComponent";
import Footer from "../components/FooterComponent";

// NEW: pull user + role-aware lists
import { getCurrentUser } from "../utils/session";
import { findUser } from "../utils/userStorage";
import { useLocation } from "react-router-dom";

/**
 * Courses listing page
 * - Fetches /data/courseDetails.json (public/data/)
 * - Search by title/author
 * - Toggle to filter bestsellers
 * - Renders CourseCard for each course
 */
export default function CoursePage() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadErr, setLoadErr] = useState("");
    const [query, setQuery] = useState("");
    const [showBest, setShowBest] = useState(false);

    // NEW: read scope from query or navigation state
    const location = useLocation();
    const scopeFromState = location.state?.scope;
    const scopeFromQuery = new URLSearchParams(location.search).get("scope");
    const scope = scopeFromState || scopeFromQuery || null; // 'enrolled' | 'created' | null

    // NEW: keep a copy of the current, fully-populated user from storage
    const [user, setUser] = useState(null);
    useEffect(() => {
        const pull = () => {
            const cu = getCurrentUser();
            setUser(cu?.email ? findUser(cu.email) : null);
        };
        pull();
        window.addEventListener("session-changed", pull);
        return () => window.removeEventListener("session-changed", pull);
    }, []);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                setLoadErr("");
                // Fetch from public/data
                const res = await fetch("/data/courseDetails.json");
                if (!res.ok) {
                    throw new Error(
                        `HTTP ${res.status} fetching courseDetails.json`,
                    );
                }
                const ct = res.headers.get("content-type") || "";
                if (!ct.includes("application/json")) {
                    const text = await res.text();
                    throw new Error(
                        `Expected JSON but got '${ct}'. First bytes: ${text.slice(0, 80)}`,
                    );
                }
                const data = await res.json();
                if (!Array.isArray(data))
                    throw new Error("courseDetails.json must be an array");
                if (alive) setCourses(data);
            } catch (e) {
                if (alive) setLoadErr(e.message || "Failed to load courses");
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    // NEW: build a Set of IDs to keep, based on scope + role
    const scopedIdSet = useMemo(() => {
        if (!user || !scope) return null;
        if (scope === "enrolled" && user.role === "learner") {
            return new Set(user.coursesEnrolled || []);
        }
        if (scope === "created" && user.role === "instructor") {
            return new Set(user.coursesCreated || []);
        }
        return null;
    }, [user, scope]);

    // NEW (authored): normalized author name for current instructor
    const authoredName = useMemo(() => {
        if (!user || user.role !== "instructor") return null;
        const n = (user.name || "").trim().toLowerCase();
        return n || null;
    }, [user]);

    // Combine: text + bestseller + scope filters
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (Array.isArray(courses) ? courses : [])
            .filter((c) => {
                const title = (c.title ?? "").toLowerCase();
                const author = (c.author ?? "").toLowerCase();
                const matchesText = q ? `${title} ${author}`.includes(q) : true;
                const matchesBest = showBest ? c.isBestseller === true : true;

                // Scope by IDs (enrolled/created)
                const matchesIdScope = scopedIdSet
                    ? scopedIdSet.has(c.id)
                    : true;

                // NEW (authored): author exact match with current instructor's name
                const matchesAuthored =
                    scope === "authored" && authoredName
                        ? author.trim() === authoredName
                        : true;

                return (
                    matchesText &&
                    matchesBest &&
                    matchesIdScope &&
                    matchesAuthored
                );
            })
            .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    }, [courses, query, showBest, scopedIdSet, scope, authoredName]);

    const heading =
        scope === "enrolled"
            ? "My Learning"
            : scope === "created"
              ? "My Courses"
              : scope === "authored" // NEW
                ? "Courses Authored by You"
                : "Courses";

    const emptyMsg =
        scope === "enrolled"
            ? "You haven't enrolled in any courses yet."
            : scope === "created"
              ? "You haven't created any courses yet."
              : scope === "authored" // NEW
                ? "No courses authored by you were found."
                : "No courses found.";

    return (
        <div>
            {/* <NavbarComponent /> */}
            <section className="course-page">
                <h3>{heading}</h3>
                {/* Controls row */}
                <div className="course-page__controls">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="course-page__search"
                        aria-label="Search courses"
                        placeholder="Search by title or author…"
                        type="search"
                    />

                    {/* Bestseller toggle button */}
                    <button
                        type="button"
                        className={`mybtn ${showBest ? "mybtn--active" : ""}`}
                        onClick={() => setShowBest((prev) => !prev)}
                        aria-pressed={showBest}
                        title={showBest ? "Show all" : "Show only bestsellers"}
                    >
                        {showBest ? "Show all" : "Show only bestsellers"}
                    </button>
                </div>

                {/* Results */}
                {filtered.length === 0 && (
                    <p className="course-page__empty">No courses found.</p>
                )}

                {filtered.length > 0 && (
                    <div className="course-grid">
                        {filtered.map((course) => (
                            <CourseCard key={course.id} course={course} />
                        ))}
                    </div>
                )}
            </section>
            {/* <Footer /> */}
        </div>
    );
}
