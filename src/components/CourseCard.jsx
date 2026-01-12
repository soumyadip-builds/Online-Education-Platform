// src/components/CourseCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import '../styles/course.css';

/**
 * Instead of embedding YouTube (which may be blocked),
 * render a button that opens the original video URL in a new tab.
 */
function YoutubeLinkButton({ url, title }) {
	// Normalize/validate: ensure it's an http(s) URL; otherwise just render as-is
	const href =
		typeof url === 'string' && url.startsWith('http')
			? url
			: `https://www.youtube.com/watch?v=${url}`;
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="video-button"
			aria-label={`Open video on YouTube: ${title}`}
			title={`Open on YouTube: ${title}`}
		>
			▶ Watch on YouTube
		</a>
	);
}

YoutubeLinkButton.propTypes = {
	url: PropTypes.string.isRequired,
	title: PropTypes.string.isRequired,
};

export default function CourseCard({ course }) {
	const {
		title,
		description,
		level,
		duration,
		tags = [],
		videos = [],
		docs = [],
		links = [],
	} = course;

	return (
		<article className="course-card">
			<header className="course-card__header">
				<div className="course-card__meta">
					<h3 className="course-card__title">{title}</h3>
					<p className="course-card__info">
						{level && <span className="badge badge--level">{level}</span>}
						{duration && (
							<span className="badge badge--duration">{duration}</span>
						)}
					</p>
					{tags.length > 0 && (
						<ul className="course-card__tags">
							{tags.map((t) => (
								<li key={t} className="tag">
									{t}
								</li>
							))}
						</ul>
					)}
				</div>
			</header>

			{description && <p className="course-card__desc">{description}</p>}

			{/* Videos */}
			{videos.length > 0 && (
				<details className="course-card__section" open>
					<summary>Videos ({videos.length})</summary>
					<div className="course-card__videos course-card__videos--buttons">
						{videos.map((v, idx) => (
							<div
								key={`${v.url}-${idx}`}
								className="course-card__video-item"
							>
								<div className="course-card__video-title">
									{v.title || `Video ${idx + 1}`}
								</div>
								<YoutubeLinkButton
									url={v.url}
									title={v.title || `Video ${idx + 1}`}
								/>
							</div>
						))}
					</div>
				</details>
			)}

			{/* Docs */}
			{docs.length > 0 && (
				<details className="course-card__section">
					<summary>Documentation ({docs.length})</summary>
					<ul className="course-card__list">
						{docs.map((d, idx) => (
							<li key={`${d.url}-${idx}`}>
								<a href={d.url} target="_blank" rel="noopener noreferrer">
									📄 {d.title || d.url}
								</a>
							</li>
						))}
					</ul>
				</details>
			)}

			{/* Links */}
			{links.length > 0 && (
				<details className="course-card__section">
					<summary>Resources ({links.length})</summary>
					<ul className="course-card__list">
						{links.map((l, idx) => (
							<li key={`${l.url}-${idx}`}>
								<a href={l.url} target="_blank" rel="noopener noreferrer">
									🔗 {l.label || l.url}
								</a>
							</li>
						))}
					</ul>
				</details>
			)}
		</article>
	);
}

CourseCard.propTypes = {
	course: PropTypes.shape({
		id: PropTypes.string,
		title: PropTypes.string.isRequired,
		description: PropTypes.string,
		level: PropTypes.string,
		duration: PropTypes.string,
		tags: PropTypes.arrayOf(PropTypes.string),
		videos: PropTypes.arrayOf(
			PropTypes.shape({
				title: PropTypes.string,
				url: PropTypes.string.isRequired,
			})
		),
		docs: PropTypes.arrayOf(
			PropTypes.shape({
				title: PropTypes.string,
				url: PropTypes.string.isRequired,
			})
		),
		links: PropTypes.arrayOf(
			PropTypes.shape({
				label: PropTypes.string,
				url: PropTypes.string.isRequired,
			})
		),
	}).isRequired,
};
