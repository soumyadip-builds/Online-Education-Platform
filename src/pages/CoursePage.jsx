// src/components/CoursePage.jsx
import React, { useMemo, useState } from 'react';
import CourseCard from '../components/CourseCard';
import coursesData from '../data/courseDetails.json'; // bundled import (recommended)
import '../styles/course.css';

export default function CoursePage() {
	const courses = Array.isArray(coursesData) ? coursesData : [];
	const [query, setQuery] = useState('');
	const [showBest, setShowBest] = useState(false); // <-- NEW: bestseller toggle

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();

		// 1) Text filter (title/author), 2) Bestseller filter, 3) Sort by title
		return courses
			.filter((c) => {
				const matchesText = q
					? `${c.title ?? ''} ${c.author ?? ''}`.toLowerCase().includes(q)
					: true;

				const matchesBest = showBest ? c.isBestseller === true : true;
				return matchesText && matchesBest;
			})
			.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
	}, [courses, query, showBest]);

	return (
		<section className="course-page">
			<h3>Courses</h3>

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
	);
}
