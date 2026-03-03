import { useEffect, useMemo, useState } from 'react';
import CourseCard from '../components/CourseCard';
import '../styles/course.css';
import { useLocation } from 'react-router-dom';
import { getAuthHeader } from '../lib/authLocal';

/**
 * CoursePage.jsx — now fetches from API:
 *   GET /api/courses?scope=enrolled|created|authored
 * If no scope, returns a general listing (server decides).
 */

export default function CoursePage() {
	const [courses, setCourses] = useState([]);
	const [query, setQuery] = useState('');
	const [showBest, setShowBest] = useState(false);

	const location = useLocation();
	const scopeFromState = location.state?.scope;
	const scopeFromQuery = new URLSearchParams(location.search).get('scope');
	const scope = scopeFromState || scopeFromQuery || null; // 'enrolled' | 'created' | 'authored' | null

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const API_BASE =
					import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
				const endpoint = scope
					? `${API_BASE}/courses?scope=${encodeURIComponent(scope)}`
					: `${API_BASE}/courses`;
				const res = await fetch(endpoint, {
					headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
				});
				const payload = await res.json();
				if (!alive) return;

				// Support either { ok, data } or raw list
				const list = payload?.data || payload || [];
				// Normalize id + thumbnail for Card navigation and image
				const normalized = (Array.isArray(list) ? list : []).map((c) => ({
					...c,
					id: c.id || c._id, // ensure id for <CourseCard/>
					thumbnail: c.thumbnail?.link || c.thumbnail || '',
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
