import { useMemo, useState, useRef } from 'react';
import '../styles/assignmentCard.css';
import '../styles/courseBuilder.css';

import CourseModulesBuilder from './CourseModulesBuilder';
import { ICONS, emptyModule, formatDuration } from './courseBuilderShared';
import { getCurrentUser } from '../utils/session';
import { recordCourseCreated } from '../utils/userStorage';

/** Local Storage helpers */
const LS_KEY_COURSES = 'cb_courses_v1';

const loadCourses = () => {
	try {
		return JSON.parse(localStorage.getItem(LS_KEY_COURSES) || '[]');
	} catch {
		return [];
	}
};

const saveCourses = (list) => localStorage.setItem(LS_KEY_COURSES, JSON.stringify(list));

const lsCreateCourse = (payload) => {
	const id = 'c_' + Math.random().toString(36).slice(2, 10);
	const now = new Date().toISOString();
	const created = { id, createdAt: now, updatedAt: now, ...payload };
	const list = loadCourses();
	list.push(created);
	saveCourses(list);
	return created;
};

function Toast({ message, type }) {
	return (
		<div
			className={`cb-toast cb-toast--${type}`}
			style={{
				position: 'fixed',
				bottom: 20,
				right: 20,
				background: type === 'success' ? '#28a745' : '#d9534f',
				color: '#fff',
				padding: '10px 16px',
				borderRadius: 6,
				boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
				zIndex: 10000,
			}}
			role="status"
			aria-live="polite"
		>
			{message}
		</div>
	);
}

export default function CourseCreation({ assignmentService, onCreated }) {
	const [title, setTitle] = useState('New Course');
	const [description, setDescription] = useState('');
	const [courseId, setCourseId] = useState(null);

	// Udemy-style metadata
	const [level, setLevel] = useState('Beginner'); // Beginner | Intermediate | Advanced
	const [tagsText, setTagsText] = useState(''); // comma separated tags
  
	// Includes (right panel “This course includes”)
	const [includesHours, setIncludesHours] = useState(0); // hours on-demand video
	const [includesArticles, setIncludesArticles] = useState(0);
	const [includesDownloads, setIncludesDownloads] = useState(0);

	// Optional ratings (you can also auto-default these)
	// const [learners, setLearners] = useState(0);

	/** Default one module */
	const [modules, setModules] = useState(() => [emptyModule()]);

	// bullet points
	const [learningOutcomes, setLearningOutcomes] = useState(['']);
	const addOutcome = () => setLearningOutcomes((prev) => [...prev, '']);
	const rmOutcome = (idx) =>
		setLearningOutcomes((prev) => prev.filter((_, i) => i !== idx));
	const patchOutcome = (idx, value) =>
		setLearningOutcomes((prev) => prev.map((v, i) => (i === idx ? value : v)));

	// thumbnail
	const [thumbnailMode, setThumbnailMode] = useState('link'); // 'upload' | 'link'
	const [thumbnailLink, setThumbnailLink] = useState('');

	// toast
	const [toast, setToast] = useState(null);
	const showToast = (msg, type = 'success') => {
		setToast({ msg, type });
		setTimeout(() => setToast(null), 1500);
	};

	// status message + save
	const [saving, setSaving] = useState(false);
	const [msg, setMsg] = useState({ type: '', text: '' });
	const [publishMode, setPublishMode] = useState('draft'); // 'draft' | 'publish'

	/** totals + grouped */
	const totalMinutes = useMemo(
		() =>
			modules.reduce(
				(sum, m) =>
					sum +
					m.items.reduce((s, it) => s + (Number(it.estimatedMinutes) || 0), 0),
				0,
			),
		[modules],
	);
	/** Auto-calc "This course includes" **/
	const includesAuto = useMemo(() => {
		let videoMinutes = 0;
		let articles = 0;
		let downloads = 0;

		modules.forEach((m) => {
		m.items.forEach((it) => {
			const mins = Number(it.estimatedMinutes) || 0;

			if (it.type === 'video') videoMinutes += mins;
			if (it.type === 'reading') articles += 1;

			// If later you add a downloads/attachments field, update this rule:
			// Example options:
			// downloads += Number(it.downloadCount) || 0;
			// downloads += Array.isArray(it.attachments) ? it.attachments.length : 0;
		});
		});

		const hoursOnDemandVideo = Math.round((videoMinutes / 60) * 10) / 10; // 1 decimal
		return {
		hoursOnDemandVideo,
		articles,
		downloadableResources: downloads,
		accessOnMobile: true,
		certificate: true,
		};
	}, [modules]);

	const grouped = useMemo(() => {
		const out = { Videos: [], Documentation: [], Assignments: [], Quizzes: [] };
		modules.forEach((m) =>
			m.items.forEach((it) => {
				if (it.type === 'video') out.Videos.push(it);
				else if (it.type === 'reading') out.Documentation.push(it);
				else if (it.type === 'assignment') out.Assignments.push(it);
				else if (it.type === 'quiz') out.Quizzes.push(it);
			}),
		);
		return out;
	}, [modules]);

	const validate = () => {
		const errors = [];
		if (!title.trim()) errors.push('Course title is required.');

		modules.forEach((m, mi) => {
			if (!m.title.trim()) errors.push(`Module ${mi + 1}: title is required.`);
			m.items.forEach((it, ii) => {
				if (!it.title.trim())
					errors.push(`Module ${mi + 1}, item ${ii + 1}: title is required.`);
				const mins = Number(it.estimatedMinutes);
				if (!Number.isFinite(mins) || mins <= 0)
					errors.push(
						`Module ${mi + 1}, item ${ii + 1}: duration must be > 0 minutes.`,
					);
				if ((it.type === 'video' || it.type === 'reading') && !it.url?.trim())
					errors.push(
						`Module ${mi + 1}, item ${ii + 1}: URL is required for link items.`,
					);
			});
		});
		if (thumbnailMode === 'link' && !thumbnailLink.trim()) {
			errors.push('Course thumbnail link is required.');
		}
		if (!level.trim()) errors.push('Level is required.');

		const tags = tagsText
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		if (tags.length === 0) errors.push('At least one tag is required.');

		if (includesHours < 0) errors.push('Hours on-demand video must be 0 or more.');
		if (includesArticles < 0) errors.push('Articles must be 0 or more.');
		if (includesDownloads < 0)
			errors.push('Downloadable resources must be 0 or more.');
		return errors;
	};

	//  LOCAL STORAGE SAVING
	const handleSave = async () => {
		setMsg({ type: '', text: '' });

		const errors = validate();
		if (errors.length) {
			setMsg({ type: 'error', text: errors.join(' ') });
			return;
		}

		//normalization

		const status = 'published';

		const me = getCurrentUser();
		const tags = tagsText
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);

		const courseToSave = {
			title: title.trim(),
			author: (me?.name ?? '').trim(),
			description: description.trim(),
			level,
			tags,
			includes: includesAuto,

			// Use a simple string thumbnail for compatibility
			thumbnail: thumbnailMode === 'link' ? thumbnailLink.trim() : '',

			// Keep your builder modules (CourseDetails can still read sections/videos separately)
			modules: modules.map((m) => ({
				...m,
				title: m.title.trim(),
				description: (m.description ?? '').trim(),
				items: m.items.map((it) => ({
					...it,
					title: it.title.trim(),
					url: it.url?.trim() || '',
					estimatedMinutes: Number(it.estimatedMinutes) || 0,
					refId: it.refId ?? null,
				})),
			})),

			totalEstimatedMinutes: totalMinutes,
			counts: {
				videos: grouped.Videos.length,
				documentation: grouped.Documentation.length,
				assignments: grouped.Assignments.length,
				quizzes: grouped.Quizzes.length,
			},

			lastUpdated: new Date().toISOString(), 
			status,
		};

		setSaving(true);
		try {
			// Local-Saving
			const created = lsCreateCourse(courseToSave);
			setCourseId(created.id);
			// ✅ Add this course into instructor's "coursesCreated" list
			if (me?.email) {
				recordCourseCreated(me.email, created.id);
			}

			// ✅ Tell CoursePage to refresh the list
			window.dispatchEvent(new Event('courses-changed'));

			setMsg({ type: 'success', text: 'Course saved successfully.' });
			showToast(status === 'published' ? 'Course published' : 'Course saved');

			// Bubble up, if needed (e.g., navigate away)
			onCreated?.(created);
		} catch (err) {
			console.error(err);
			const text = err?.message || 'Failed to save course.';
			setMsg({ type: 'error', text });
			showToast(text, 'error');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="course-creator">
			<div className="assignment-card-page">
				<div className="assignment-card">
					<div className="assignment-card__stripe" />

					{/* Header */}
					<div
						className="assignment-card__header"
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							gap: 12,
						}}
					>
						<div className="cb-field">
							<label className="cb-meta-title">
								Course Title *
							</label>
							<input
								className="cb-input"
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Enter course title"
								required
								maxLength={80}
							/>
						</div>
					</div>

					{/* Description */}
					<div className="cb-meta-card">
						{/* <label className="assignment-card__label">Course Description</label>
            <div
              ref={courseDescRef}
              className="cb-desc-edit"
              contentEditable
              role="textbox"
              aria-label="Course description"
              suppressContentEditableWarning
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                  setDescription(e.currentTarget.textContent || "");
                  showToast("Course description saved");
                }
              }}
              onBlur={(e) => {
                const val = e.currentTarget.textContent || "";
                setDescription(val);
                showToast("Course description saved");
              }}
            >
              {description || "Add a short description for learners…"}
            </div> */}
						<div className="cb-field">
							<label className="assignment-card__group assignment-card__group--full">
								Course Description *
							</label>
							<textarea
								className="cb-textarea"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Add a short description for learners…"
								required
								rows={4}
								maxLength={300}
							/>
						</div>
						{/* Udemy-style metadata */}
						<div className="cb-grid">
							<div className="cb-field">
								<label className="assignment-card__group assignment-card__group--full">
									Level *
								</label>
								<select
									className="cb-input"
									value={level}
									onChange={(e) => setLevel(e.target.value)}
									required
								>
									<option value="Beginner">Beginner</option>
									<option value="Intermediate">Intermediate</option>
									<option value="Advanced">Advanced</option>
								</select>
							</div>

							<div className="cb-field">
								<label className="assignment-card__group assignment-card__group--full">
									Tags *
								</label>
								<input
									className="cb-input"
									value={tagsText}
									onChange={(e) => setTagsText(e.target.value)}
									placeholder="react, javascript, frontend"
									required
								/>
								<small className="cb-hint">
									Comma separated (min 1 tag)
								</small>
							</div>
						</div>

					</div>
					<div className='bg-light my-2 p-3 border rounded-4'>
						<p>{includesAuto.hoursOnDemandVideo} hours on-demand video</p>
						<p>{includesAuto.articles} articles</p>
						<p>{includesAuto.downloadableResources} downloadable resources</p>
					</div>
					{/* What you'll learn */}
					<div className="cb-meta-card">
						<div className="cb-meta-header">
							<div>
								<h3 className="cb-meta-title">What you’ll learn</h3>
								<p className="cb-meta-subtitle">
									Add bullet points that will be shown to students.
								</p>
							</div>

							<button
								type="button"
								className="cb-link"
								onClick={() => {
									addOutcome();
									showToast('Added learning outcome');
									requestAnimationFrame(() => {
										const el =
											document.getElementById('cb-outcomes-scroll');
										if (el) el.scrollLeft = el.scrollWidth;
									});
								}}
							>
								{ICONS.plus} Add bullet
							</button>
						</div>

						<div
							className="cb-outcomes-scroll"
							id="cb-outcomes-scroll"
							role="list"
							aria-label="Learning outcomes"
						>
							{learningOutcomes.map((val, idx) => (
								<div
									className="cb-outcome-pill"
									role="listitem"
									key={`outcome-${idx}`}
								>
									<span className="cb-outcome-dot" aria-hidden="true">
										•
									</span>

									<input
										className="assignment-card-input cb-outcome-input"
										value={val}
										placeholder={`Outcome ${idx + 1}`}
										onChange={(e) =>
											patchOutcome(idx, e.target.value)
										}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												addOutcome();
												showToast('Added learning outcome');
											}
										}}
									/>

									<button
										type="button"
										className="icon-btn danger"
										title="Remove"
										onClick={() => {
											rmOutcome(idx);
											showToast('Removed learning outcome');
										}}
										disabled={learningOutcomes.length === 1}
									>
										{ICONS.delete}
									</button>
								</div>
							))}
						</div>

						<div className="cb-meta-hint">
							Tip: Press <b>Enter</b> to add a new bullet quickly.
						</div>
					</div>

					{/* Thumbnail */}
					<div className="cb-meta-card">
						<div className="cb-meta-header">
							<div>
								<h3 className="cb-meta-title">Course Thumbnail</h3>
								<p className="cb-meta-subtitle">
									For now, only the link option works. Upload will be
									enabled later.
								</p>
							</div>
						</div>

						<div
							className="cb-radio-row"
							role="radiogroup"
							aria-label="Thumbnail mode"
						>
							<label
								className={`cb-radio ${thumbnailMode === 'link' ? 'is-active' : ''}`}
							>
								<input
									type="radio"
									name="thumbnailMode"
									value="link"
									checked={thumbnailMode === 'link'}
									onChange={() => setThumbnailMode('link')}
								/>
								<span>Link</span>
							</label>

							<label
								className={`cb-radio is-disabled ${thumbnailMode === 'upload' ? 'is-active' : ''}`}
							>
								<input
									type="radio"
									name="thumbnailMode"
									value="upload"
									checked={thumbnailMode === 'upload'}
									onChange={() => setThumbnailMode('upload')}
								/>
								<span>Upload (coming soon)</span>
							</label>
						</div>

						{thumbnailMode === 'link' ? (
							<div className="cb-thumb-link">
								<input
									className="assignment-card-input cb-thumb-input"
									placeholder="https://example.com/thumbnail.jpg"
									value={thumbnailLink}
									onChange={(e) => setThumbnailLink(e.target.value)}
								/>

								{thumbnailLink.trim() ? (
									<div className="cb-thumb-preview">
										<img
											src={thumbnailLink}
											alt="Thumbnail preview"
											className="cb-thumb-img"
											onError={(e) => {
												e.currentTarget.style.display = 'none';
											}}
										/>
										<div className="cb-meta-hint">
											Preview (if the link is valid)
										</div>
									</div>
								) : (
									<div className="cb-meta-hint">
										Paste an image URL to preview it.
									</div>
								)}
							</div>
						) : (
							<div className="cb-thumb-upload">
								<input type="file" accept="image/*" disabled />
								<div className="cb-meta-hint" style={{ marginTop: 8 }}>
									Upload is disabled for now. Please use a link.
								</div>
							</div>
						)}
					</div>

					{/* Modules Builder */}
					<CourseModulesBuilder
						modules={modules}
						setModules={setModules}
						assignmentService={assignmentService}
						showToast={showToast}
						courseId={courseId}
					/>

					{/* Status message */}
					{msg.text && (
						<div
							className={
								msg.type === 'error'
									? 'assignment-card__msg-error'
									: 'assignment-card__msg-success'
							}
							role={msg.type === 'error' ? 'alert' : 'status'}
							style={{ marginTop: 12 }}
						>
							{msg.text}
						</div>
					)}

					{/* Total Time Bar */}
					<div className="cb-total-bar">
						<div>
							<div className="cb-total-bar__label">Total Course Time</div>
							<div className="cb-total-bar__value">
								{formatDuration(totalMinutes)}
							</div>
						</div>
						<div className="cb-total-bar__hint">Based on item durations</div>
					</div>

					{/* Actions */}
					<div className="assignment-card__actions">
						<button
							type="button"
							disabled={saving}
							className="assignment-card__btn-primary"
							onClick={handleSave}
						>
							{saving
									? 'Publishing...'
									: 'Publish Course'}
						</button>
					</div>
				</div>

				{toast && <Toast message={toast.msg} type={toast.type} />}
			</div>
		</div>
	);
}
