import { useEffect, useMemo, useState } from 'react';
import CourseCard from '../components/CourseCard';
import '../styles/course.css';
import { useLocation } from 'react-router-dom';
import { getAuthHeader } from '../lib/authLocal';

/**
 * CoursePage.jsx — fetches from API:
 *   GET /edstream/courses?scope=enrolled|created|authored|all
 * If no scope, we request scope=all (catalog).
 */
export default function CoursePage() {
	const [courses, setCourses] = useState([]);
	const [query, setQuery] = useState('');
	const [showBest, setShowBest] = useState(false);

	const location = useLocation();
	const scopeFromState = location.state?.scope;
	const scopeFromQuery = new URLSearchParams(location.search).get('scope');

	// ✅ fix: proper OR chaining
	const scope = scopeFromState || scopeFromQuery || null; // 'enrolled' | 'created' | 'authored' | null

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const API_BASE =
					import.meta.env.VITE_API_BASE || 'http://localhost:8000/edstream';

				// ✅ If no scope passed (Explore), ask the server for a public/all listing
				const effectiveScope = scope || 'all';
				const endpoint = `${API_BASE}/courses?scope=${encodeURIComponent(effectiveScope)}`;

				const res = await fetch(endpoint, {
					headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
				});

				// If the server responds with 401 for public/all (while unauthenticated),
				// we still try to parse JSON to show a meaningful message.
				const payload = await res.json().catch(() => ({}));
				if (!alive) return;

				// Support both { ok, data } and raw arrays
				const list = Array.isArray(payload?.data)
					? payload.data
					: Array.isArray(payload)
						? payload
						: [];
				
				const normalized = list.map((c) => ({
					...c,
					id: c.id || c._id, // used by <CourseCard/>
					thumbnail: c.thumbnail || '',
					title: c.title ?? '',
					author: c.author ?? '',
				}));				

				setCourses(normalized);
			} catch (e) {
				if (!alive) return;
				setCourses([]);
			}
		})();

		return () => {
			alive = false;
		};
	}, [scope]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return (Array.isArray(courses) ? courses : [])
			.filter((c) => {
				const title = (c.title ?? '').toLowerCase();
				const author = (c.author ?? '').toLowerCase();
				const matchesText = q ? `${title} ${author}`.includes(q) : true;
				const matchesBest = showBest ? c.isBestseller === true : true;
				return matchesText && matchesBest;
			})
			.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
	}, [courses, query, showBest]);

	const heading =
		scope === 'enrolled'
			? 'My Learning'
			: scope === 'created'
				? 'My Courses'
				: scope === 'authored'
					? 'Courses Authored by You'
					: 'Courses';

	return (
		<div>
			<section className="course-page">
				<h3>{heading}</h3>

				{/* Controls */}
				<div className="course-page__controls">
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="course-page__search"
						aria-label="Search courses"
						placeholder="Search by title or author…"
						type="search"
					/>
					<button
						type="button"
						className={`mybtn ${showBest ? 'mybtn--active' : ''}`}
						onClick={() => setShowBest((prev) => !prev)}
						aria-pressed={showBest}
						title={showBest ? 'Show all' : 'Show only bestsellers'}
					>
						{showBest ? 'Show all' : 'Show only bestsellers'}
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
