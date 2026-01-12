// src/components/CourseCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import '../styles/course.css';

/** Prefix static paths with app base (Vite/CRA safe) */
function withBase(path) {
	const base =
		typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL
			? import.meta.env.BASE_URL
			: process.env.PUBLIC_URL || '/';
	const b = base.endsWith('/') ? base : `${base}/`;
	return path?.startsWith('/') ? `${b}${path.slice(1)}` : `${b}${path || ''}`;
}

export default function CourseCard({ course }) {
	const navigate = useNavigate();

	const { id, title, author, rating, learners, thumbnail, isBestseller } = course; // ← added isBestseller

	const handleClick = () => {
		// Navigate to details page: /courses/:id
		navigate(`/courses/${id}`);
	};

	return (
		<article
			className="course-card course-card--compact"
			role="button"
			tabIndex={0}
			onClick={handleClick}
			onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
			aria-label={`Open course: ${title}`}
		>
			{/* Thumbnail */}

			<div className="course-card__thumb">
				{thumbnail ? (
					<img src={thumbnail} alt={`${title} thumbnail`} />
				) : (
					<div className="course-card__thumb--placeholder" />
				)}

				{/* Bestseller badge */}
				{isBestseller && (
					<span className="badge badge--bestseller" aria-label="Bestseller">
						Bestseller
					</span>
				)}
			</div>

			{/* Meta */}
			<div className="course-card__compact-body">
				<h3 className="course-card__compact-title">{title}</h3>
				<p className="course-card__compact-author">{author}</p>

				<div className="course-card__compact-stats">
					<span
						className="rating-chip"
						aria-label={`Rating ${rating} out of 5`}
					>
						⭐ {Number(rating).toFixed(1)}
					</span>
					<span className="learners-chip" aria-label={`${learners} learners`}>
						{Intl.NumberFormat().format(learners)} learners
					</span>
				</div>
			</div>
		</article>
	);
}

CourseCard.propTypes = {
	course: PropTypes.shape({
		id: PropTypes.string.isRequired,
		title: PropTypes.string.isRequired,
		author: PropTypes.string.isRequired,
		rating: PropTypes.number.isRequired,
		learners: PropTypes.number.isRequired,
		thumbnail: PropTypes.string,
	}).isRequired,
};
