// src/components/CourseDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import coursesData from '../data/courseDetails.json';
import '../styles/course.css';

/** Prefix a path with app base (Vite BASE_URL or CRA PUBLIC_URL). */
function withBase(path) {
	const base =
		(typeof import.meta !== 'undefined' &&
			import.meta.env &&
			import.meta.env.BASE_URL) ||
		(typeof process !== 'undefined' && process.env && process.env.PUBLIC_URL) ||
		'/';
	const b = base.endsWith('/') ? base : `${base}/`;
	return path?.startsWith('/') ? `${b}${path.slice(1)}` : `${b}${path ?? ''}`;
}

/** Resolve a doc URL coming from JSON so it works in dev & prod. */
function resolveDocUrl(raw) {
	if (!raw || typeof raw !== 'string') return undefined;
	if (/^https?:\/\//i.test(raw)) return raw; // absolute
	if (raw.startsWith('/')) return withBase(raw); // root-relative
	let normalized = raw
		.replace(/^\.?\.\//, '')
		.replace(/^\.?\.\//, '')
		.replace(/^\.{1,2}\\/, '');
	if (/^docs\//i.test(normalized)) normalized = `/${normalized}`;
	if (!normalized.startsWith('/')) normalized = `/${normalized}`;
	return withBase(normalized);
}

function Star({ filled }) {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 20 20"
			fill={filled ? '#f59e0b' : 'none'}
			stroke="#f59e0b"
			strokeWidth="1.5"
			aria-hidden="true"
			style={{ display: 'block' }}
		>
			<path d="M10 2.5l2.47 5.3 5.83.46-4.38 3.8 1.32 5.6L10 14.9l-5.24 2.76 1.32-5.6-4.38-3.8 5.83-.46L10 2.5z" />
		</svg>
	);
}

export default function CourseDetails() {
	const { id } = useParams();
	const course = (coursesData || []).find((c) => c.id === id);

	if (!course) return <div className="course-details">Course not found.</div>;

	const {
		title,
		author,
		rating,
		ratingsCount,
		learners,
		lastUpdated,
		languages = {},
		isBestseller,
		thumbnail,
		description,
		whatYouWillLearn = [],
		includes = {},
		sections = [],
		videos = [],
		docs = [],
		links = [],
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

	const stars = Math.round(Number(rating || 0));
	const formattedLearners = new Intl.NumberFormat().format(learners || 0);
	const formattedRatings = ratingsCount
		? new Intl.NumberFormat().format(ratingsCount)
		: null;

	return (
		<div className="course-details">
			{/* HERO */}
			<section className="course-details__hero">
				<div>
					<h1 className="course-details__title">{title}</h1>

					<div className="course-details__chips">
						<span className="chip" title="Rating">
							<strong style={{ marginRight: 6 }}>
								{Number(rating || 0).toFixed(1)}
							</strong>
							{Array.from({ length: 5 }).map((_, i) => (
								<Star key={i} filled={i < stars} />
							))}
							{formattedRatings && (
								<span style={{ marginLeft: 8 }}>
									({formattedRatings} ratings)
								</span>
							)}
						</span>

						<span className="chip" title="Learners">
							{formattedLearners} students
						</span>

						{author && (
							<span className="chip">
								Created by{' '}
								<strong style={{ marginLeft: 6 }}>{author}</strong>
							</span>
						)}

						{lastUpdated && (
							<span className="chip">
								Last updated {new Date(lastUpdated).toLocaleDateString()}
							</span>
						)}

						{(languages.audio || (languages.captions || []).length > 0) && (
							<span className="chip">
								{languages.audio ? `Audio: ${languages.audio}` : null}
								{(languages.captions || []).length > 0
									? ` • CC: ${(languages.captions || []).join(', ')}`
									: ''}
							</span>
						)}
					</div>

					{description && <p className="course-details__desc">{description}</p>}

					{!enrolled ? (
						<>
							<button
								className="mybtn mybtn-primary mybtn-xl"
								onClick={handleEnroll}
							>
								Enroll now
							</button>
							<div className="enrollment-status">
								Content is locked until you enroll
							</div>
						</>
					) : (
						<div className="enrollment-status">
							✅ You’re enrolled. All content is unlocked.
						</div>
					)}
				</div>
				<div className="resources">
					{/* VIDEOS */}
					{videos?.length > 0 && (
						<section className="course-details__section">
							{/* <h3 className="section-title">Videos ({videos.length})</h3> */}
							<div className="video-grid">
								{videos.map((v, i) => (
									<article className="video-card" key={i}>
										<div className="video-thumb">
											{thumbnail ? (
												<img
													src={withBase(thumbnail)}
													alt={`Video ${i + 1}`}
												/>
											) : (
												<div className="video-thumb__placeholder">
													Video {i + 1}
												</div>
											)}
											{!enrolled && (
												<div className="lock-overlay">
													<div className="lock-text">
														Enroll to Play
													</div>
												</div>
											)}
										</div>
										<div className="video-info">
											<h4 className="video-title">
												{v.title || `Video ${i + 1}`}
											</h4>
											<a
												href={v.url}
												className={`video-link ${
													!enrolled
														? 'video-link--disabled'
														: ''
												}`}
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
							<h3 className="section-title">
								Documentation ({docs.length})
							</h3>
							<ul className="resource-list">
								{docs.map((d, i) => {
									const url = resolveDocUrl(d.url);
									return (
										<li key={i}>
											<a
												className={`resource-link ${
													!enrolled
														? 'resource-link--disabled'
														: ''
												}`}
												href={url}
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
							<h3 className="section-title">Resources ({links.length})</h3>
							<ul className="resource-list">
								{links.map((l, i) => (
									<li key={i}>
										<a
											className={`resource-link ${
												!enrolled ? 'resource-link--disabled' : ''
											}`}
											href={l.url}
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
					{/* ASSIGNMENTS */}
					{/* {links?.length > 0 && (
						<section className="course-details__section">
							<h3 className="section-title">
								Assignments ({links.length})
							</h3>
							<ul className="resource-list">
								{links.map((l, i) => (
									<li key={i}>
										<a
											className={`resource-link ${
												!enrolled ? 'resource-link--disabled' : ''
											}`}
											href={l.url}
											onClick={(e) => {
												if (!enrolled) e.preventDefault();
											}}
										>
											<i class="bi bi-pencil-square"></i>{' '}
											{l.label || l.url}
										</a>
									</li>
								))}
							</ul>
						</section>
					)} */}
				</div>
			</section>

			{/* WHAT YOU'LL LEARN */}
			{whatYouWillLearn.length > 0 && (
				<section className="course-details__section">
					<h3 className="section-title">What you’ll learn</h3>
					<ul className="learn-grid">
						{whatYouWillLearn.map((item, i) => (
							<li key={i}>
								<span className="tick">✔</span>
								{item}
							</li>
						))}
					</ul>
				</section>
			)}

			{/* THIS COURSE INCLUDES */}
			<section className="course-details__section">
				<h3 className="section-title">This course includes</h3>
				<ul className="includes-list">
					{'hoursOnDemandVideo' in includes && (
						<li>
							<span className="icon">🎬</span>
							{includes.hoursOnDemandVideo} hours on‑demand video
						</li>
					)}
					{'articles' in includes && (
						<li>
							<span className="icon">📰</span>
							{includes.articles} articles
						</li>
					)}
					{'downloadableResources' in includes && (
						<li>
							<span className="icon">📥</span>
							{includes.downloadableResources} downloadable resource(s)
						</li>
					)}
					{includes.accessOnMobile && (
						<li>
							<span className="icon">📱</span>Access on mobile
						</li>
					)}
					{includes.certificate && (
						<li>
							<span className="icon">🎓</span>Certificate of completion
						</li>
					)}
				</ul>
			</section>

			{/* COURSE CONTENT / SECTIONS (compact summary) */}
			{sections.length > 0 && (
				<section className="course-details__section">
					<h3 className="section-title">Course content</h3>
					<ul className="sections-list">
						{sections.map((s, i) => (
							<li key={i}>
								<span className="section-dot">•</span>
								<span className="section-title-line">{s.title}</span>
								{typeof s.lectures === 'number' && (
									<span className="muted">
										{' '}
										· {s.lectures} lectures
									</span>
								)}
								{s.length && <span className="muted"> · {s.length}</span>}
							</li>
						))}
					</ul>
				</section>
			)}
		</div>
	);
}
``;
