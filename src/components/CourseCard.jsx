// src/components/CourseCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { getYouTubeIdFromUrl } from '../Utils/youtube';
import '../styles/course.css'; // local styles only, no global CSS

const placeholderThumb =
	'data:image/svg+xml;charset=UTF-8,' +
	encodeURIComponent(
		`<svg xmlns='http://www.w3.org/2000/svg' width='480' height='270'>
      <rect width='100%' height='100%' fill='#c9ada7'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
        font-family='Arial' font-size='16' fill='#22223b'>No Thumbnail</text>
    </svg>`
	);

function YoutubeEmbed({ url, title }) {
	const videoId = getYouTubeIdFromUrl(url);
	if (!videoId) {
		return (
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className="video-fallback-link"
				aria-label={`Open video: ${title}`}
			>
				▶ {title}
			</a>
		);
	}

	return (
		<div className="video-container" aria-label={`YouTube video: ${title}`}>
			<iframe
				src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
				title={title}
				frameBorder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
				allowFullScreen
				// optional sandbox:
				// sandbox="allow-scripts allow-same-origin allow-presentation"
			/>
		</div>
	);
}

YoutubeEmbed.propTypes = {
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
		thumbnail,
		videos = [],
		docs = [],
		links = [],
	} = course;

	return (
		<article className="course-card">
			<header className="course-card__header">
				<img
					src={thumbnail || placeholderThumb}
					alt={`${title} thumbnail`}
					className="course-card__thumb"
					loading="lazy"
				/>
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
					<div className="course-card__videos">
						{videos.map((v, idx) => (
							<div
								key={`${v.url}-${idx}`}
								className="course-card__video-item"
							>
								<YoutubeEmbed
									url={v.url}
									title={v.title || `Video ${idx + 1}`}
								/>
								<div className="course-card__video-title">{v.title}</div>
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
		thumbnail: PropTypes.string,
		videos: PropTypes.arrayOf(
			PropTypes.shape({ title: PropTypes.string, url: PropTypes.string.isRequired })
		),
		docs: PropTypes.arrayOf(
			PropTypes.shape({ title: PropTypes.string, url: PropTypes.string.isRequired })
		),
		links: PropTypes.arrayOf(
			PropTypes.shape({ label: PropTypes.string, url: PropTypes.string.isRequired })
		),
	}).isRequired,
};
