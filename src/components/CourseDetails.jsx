// src/components/CourseDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import coursesData from '../data/courseDetails.json';
import '../styles/course.css';

/**
 * Prefix a path with your app base (supports Vite BASE_URL or CRA PUBLIC_URL).
 */
function withBase(path) {
	const base =
		(typeof import.meta !== 'undefined' &&
			import.meta.env &&
			import.meta.env.BASE_URL) ||
		(typeof process !== 'undefined' && process.env && process.env.PUBLIC_URL) ||
		'/';
	const b = base.endsWith('/') ? base : `${base}/`;
	return path?.startsWith('/') ? `${b}${path.slice(1)}` : `${b}${path || ''}`;
}

/**
 * Resolve a doc URL coming from JSON so it works in dev & prod.
 * - Absolute (http/https) → as-is.
 * - Root-relative ("/docs/...") → prefix base.
 * - Relative ("docs/...", "./docs/...", "../docs/...") → normalize to "/docs/..." then prefix base.
 */
function resolveDocUrl(raw) {
	if (!raw || typeof raw !== 'string') return undefined;

	// Absolute URL
	if (/^https?:\/\//i.test(raw)) return raw;

	// Root-relative
	if (raw.startsWith('/')) return withBase(raw);

	// Normalize common relative forms
	let normalized = raw
		.replace(/^\.\//, '') // "./docs/x.pdf" -> "docs/x.pdf"
		.replace(/^\.\.\//, '') // "../docs/x.pdf" -> "docs/x.pdf"
		.replace(/^\.{1,2}\\/, ''); // ".\docs\x.pdf" or "..\docs\x.pdf" -> "docs/x.pdf"

	// If it begins with "docs/", convert to "/docs/..."
	if (/^docs\//i.test(normalized)) normalized = `/${normalized}`;

	// Last fallback: ensure leading slash
	if (!normalized.startsWith('/')) normalized = `/${normalized}`;

	return withBase(normalized);
}

export default function CourseDetails() {
	const { id } = useParams();
	const course = (coursesData || []).find((c) => c.id === id);

	if (!course) {
		return <div className="course-details__not-found">Course not found.</div>;
	}

	const {
		title,
		author,
		rating,
		learners,
		description,
		docs = [],
		links = [],
		videos = [],
		isBestseller,
		thumbnail,
	} = course;

	const [enrolled, setEnrolled] = useState(false);

	useEffect(() => {
		const saved = localStorage.getItem(`enrolled:${id}`);
		if (saved === 'true') setEnrolled(true);
	}, [id]);

	const handleEnroll = () => {
		setEnrolled(true);
		localStorage.setItem(`enrolled:${id}`, 'true');
	};

	return (
		<div className="course-details">
			{/* HERO */}
			<header className="course-details__hero">
				{thumbnail && (
					<div className="course-details__hero-thumb">
						<img src={thumbnail} alt={`${title} cover`} />
						{isBestseller && (
							<span className="my_badge badge--bestseller badge-hero">
								Bestseller <i class="bi bi-award-fill"></i>
							</span>
						)}
					</div>
				)}

				<div className="course-details__hero-content">
					<h1 className="course-details__title">
						{title}
						{isBestseller && (
							<span className="my_badge badge--bestseller badge--inline">
								Bestseller <i class="bi bi-award-fill"></i>
							</span>
						)}
					</h1>

					<div className="course-details__chips">
						<span className="chip">{author}</span>
						<span className="chip">⭐ {Number(rating).toFixed(1)}</span>
						<span className="chip">
							{Intl.NumberFormat().format(learners)} learners
						</span>
					</div>

					{description && <p className="course-details__desc">{description}</p>}

					{!enrolled ? (
						<button
							className="mybtn mybtn--primary mybtn--xl"
							onClick={handleEnroll}
							aria-label={`Enroll in ${title}`}
						>
							Enroll to Unlock Content
						</button>
					) : (
						<div
							className="enrollment-status"
							role="status"
							aria-live="polite"
						>
							✅ You’re enrolled. All content is unlocked.
						</div>
					)}
				</div>
			</header>

			{/* VIDEOS */}
			{videos?.length > 0 && (
				<section className="course-details__section">
					<h2 className="section-title">Videos ({videos.length})</h2>

					<div className="video-grid">
						{videos.map((v, i) => (
							<article key={v.url || i} className="video-card">
								<div className="video-thumb">
									{v.thumbnail ? (
										<img
											src={v.thumbnail}
											alt={`${
												v.title || `Video ${i + 1}`
											} thumbnail`}
										/>
									) : (
										<div className="video-thumb__placeholder">
											<span>Video {i + 1}</span>
										</div>
									)}

									{!enrolled && (
										<div className="lock-overlay" aria-hidden="true">
											<span className="lock-text">
												Enroll to Play
											</span>
										</div>
									)}
								</div>

								<div className="video-info">
									<h3 className="video-title">
										{v.title || `Video ${i + 1}`}
									</h3>

									<a
										className={`video-link ${
											!enrolled ? 'video-link--disabled' : ''
										}`}
										href={enrolled ? v.url : undefined}
										target="_blank"
										rel="noreferrer"
										onClick={(e) => {
											if (!enrolled) e.preventDefault();
										}}
									>
										▶ Watch
									</a>
								</div>
							</article>
						))}
					</div>
				</section>
			)}

			{/* DOCUMENTATION */}
			{docs?.length > 0 && (
				<section className="course-details__section">
					<h2 className="section-title">Documentation ({docs.length})</h2>

					<ul className="resource-list">
						{docs.map((d, i) => {
							const url = resolveDocUrl(d.url); // ← use JSON url, normalized

							return (
								<li key={d.url || i}>
									<a
										className={`resource-link ${
											!enrolled ? 'resource-link--disabled' : ''
										}`}
										href={enrolled ? url : undefined}
										target="_blank"
										rel="noreferrer"
										onClick={(e) => {
											if (!enrolled) e.preventDefault();
										}}
									>
										📄 {d.title || d.url}
									</a>
								</li>
							);
						})}
					</ul>
				</section>
			)}

			{/* RESOURCES */}
			{links?.length > 0 && (
				<section className="course-details__section">
					<h2 className="section-title">Resources ({links.length})</h2>

					<ul className="resource-list">
						{links.map((l, i) => (
							<li key={l.url || i}>
								<a
									className={`resource-link ${
										!enrolled ? 'resource-link--disabled' : ''
									}`}
									href={enrolled ? l.url : undefined}
									target="_blank"
									rel="noreferrer"
									onClick={(e) => {
										if (!enrolled) e.preventDefault();
									}}
								>
									🔗 {l.label || l.url}
								</a>
							</li>
						))}
					</ul>
				</section>
			)}
		</div>
	);
}
