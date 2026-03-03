import { useEffect, useMemo, useState } from "react";
import CourseCard from "../components/CourseCard";
import "../styles/course.css";

// ✅ Auth (JWT + user) — use centralized helpers
import { getAuthUser } from "../lib/authLocal";

import { findUser } from "../utils/userStorage";
import { useLocation } from "react-router-dom";

/**
 * Courses listing page
 * - Fetches /data/courseDetails.json (public/data/)
 * - Search by title/author
 * - Toggle to filter bestsellers
 * - Supports scoped views: enrolled (learner), created/authored (instructor)
 */

// Created courses are stored by CourseCreator in localStorage under this key
const LS_KEY_COURSES = "cb_courses_v1";

function loadCreatedCourses() {
  try {
    const raw = localStorage.getItem(LS_KEY_COURSES) ?? "[]";
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function mergeCourses(seedCourses, createdCourses) {
  // Avoid duplicates by id; created items override seed with same id
  const map = new Map();
  [...(seedCourses ?? []), ...(createdCourses ?? [])].forEach((c) => {
    if (c && c.id) map.set(c.id, c);
  });
  return Array.from(map.values());
}

export default function CoursePage() {
  const [courses, setCourses] = useState([]);
  const [query, setQuery] = useState("");
  const [showBest, setShowBest] = useState(false);

  // Scope from navigation state or querystring: enrolled | created | authored
  const location = useLocation();
  const scopeFromState = location.state?.scope;
  const scopeFromQuery = new URLSearchParams(location.search).get("scope");
  const scope = scopeFromState || scopeFromQuery || null;

  // Keep a copy of the current, fully-populated user (has coursesEnrolled/Created)
  const [user, setUser] = useState(null);

  useEffect(() => {
    const pull = () => {
      const cu = getAuthUser();
      setUser(cu?.email ? findUser(cu.email) : null);
    };
    pull();
    // React when login/logout occurs (authLocal dispatches "auth-changed")
    window.addEventListener("auth-changed", pull);
    return () => window.removeEventListener("auth-changed", pull);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Fetch from public/data
        const res = await fetch("/data/courseDetails.json");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} fetching courseDetails.json`);
        }
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Expected JSON but got '${ct}'. First bytes: ${text.slice(0, 80)}`,
          );
        }
        const data = await res.json();
        if (!Array.isArray(data))
          throw new Error("courseDetails.json must be an array");
        const created = loadCreatedCourses();
        const merged = mergeCourses(data, created);
        if (alive) setCourses(merged);
      } catch (e) {
        console.log("Failed to load courses");
      }
    })();

    const reload = () => {
      const createdNow = loadCreatedCourses();
      setCourses((prev) => mergeCourses(prev, createdNow));
    };
    window.addEventListener("courses-changed", reload);
    return () => {
      alive = false;
      window.removeEventListener("courses-changed", reload);
    };
  }, []);

  // Build a Set of course IDs to keep when scoped
  const scopedIdSet = useMemo(() => {
    if (!user || !scope) return null;

    if (scope === "enrolled" && user.role === "learner") {
      return new Set(user.coursesEnrolled ?? []);
    }
    if (scope === "created" && user.role === "instructor") {
      return new Set(user.coursesCreated ?? []);
    }
    return null;
  }, [user, scope]);

  // Exact author match for instructor "authored" view
  const authoredName = useMemo(() => {
    if (!user || user.role !== "instructor") return null;
    const n = (user.name ?? "").trim().toLowerCase();
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
        const matchesIdScope = scopedIdSet ? scopedIdSet.has(c.id) : true;

        // Instructor-authored view (author exact name match)
        const matchesAuthored =
          scope === "authored" && authoredName
            ? author.trim() === authoredName
            : true;

        return matchesText && matchesBest && matchesIdScope && matchesAuthored;
      })
      .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
  }, [courses, query, showBest, scopedIdSet, scope, authoredName]);

  const heading =
    scope === "enrolled"
      ? "My Learning"
      : scope === "created"
      ? "My Courses"
      : scope === "authored"
      ? "Courses Authored by You"
      : "Courses";

  return (
    <div>
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
    </div>
  );
}