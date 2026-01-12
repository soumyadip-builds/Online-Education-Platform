// src/components/CoursePage.jsx
import React, { useMemo, useState } from 'react';
import CourseCard from '../components/CourseCard';
import coursesData from '../data/courseDetails.json'; // bundled import (recommended)
import '../styles/course.css';

export default function CoursePage() {
	const courses = Array.isArray(coursesData) ? coursesData : [];

	const [query, setQuery] = useState('');
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return courses
			.filter((c) =>
				q ? `${c.title || ''} ${c.author || ''}`.toLowerCase().includes(q) : true
			)
			.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
	}, [courses, query]);

	return (
		<section className="course-page">
			<h2 className="course-page__title">Courses</h2>

			<div className="course-page__controls">
				<input
					type="search"
					placeholder="Search by title or author..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="course-page__search"
					aria-label="Search courses"
				/>
			</div>

			{filtered.length === 0 && (
				<div className="course-page__status">No courses found.</div>
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
