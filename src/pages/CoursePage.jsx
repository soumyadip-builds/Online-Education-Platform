// src/components/CoursePage.jsx
import React, { useMemo, useState } from 'react';
import CourseCard from '../components/CourseCard'; // ← as requested
import coursesData from '../data/courseDetails.json'; // ← bundled JSON import (no fetch)
import '../styles/course.css'; // local styles only, no global CSS

export default function CoursePage() {
	// Load courses from bundled JSON safely
	const courses = Array.isArray(coursesData) ? coursesData : [];

	// UI state
	const [query, setQuery] = useState('');
	const [tagFilter, setTagFilter] = useState('all');

	// Collect unique tags for dropdown
	const allTags = useMemo(() => {
		const set = new Set();
		courses.forEach((c) => (c.tags || []).forEach((t) => set.add(t)));
		return ['all', ...Array.from(set).sort()];
	}, [courses]);

	// Apply search and tag filtering
	const filteredCourses = useMemo(() => {
		const q = query.trim().toLowerCase();

		return courses
			.filter((c) => {
				// Tag filter
				if (tagFilter !== 'all') {
					const tags = c.tags || [];
					if (!tags.includes(tagFilter)) return false;
				}
				// Search across title + description
				if (!q) return true;
				const hay = `${c.title || ''} ${c.description || ''}`.toLowerCase();
				return hay.includes(q);
			})
			.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
	}, [courses, query, tagFilter]);

	return (
		<section className="course-page">
			<h1 className="h1 course-page__title">Available Courses</h1>
			<h4 className="h4 text-center">Start learning now</h4>

			{/* Controls */}
			<div className="course-page__controls">
				<input
					type="search"
					placeholder="Search by title or description..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="course-page__search"
					aria-label="Search courses"
				/>
				<select
					value={tagFilter}
					onChange={(e) => setTagFilter(e.target.value)}
					className="course-page__select"
					aria-label="Filter by tag"
				>
					{allTags.map((t) => (
						<option key={t} value={t}>
							{t === 'all' ? 'All tags' : t}
						</option>
					))}
				</select>
			</div>

			{/* Empty state */}
			{filteredCourses.length === 0 && (
				<div className="course-page__status">No courses found.</div>
			)}

			{/* Grid */}
			{filteredCourses.length > 0 && (
				<div className="course-grid">
					{filteredCourses.map((course) => (
						<CourseCard key={course.id || course.title} course={course} />
					))}
				</div>
			)}
		</section>
	);
}
