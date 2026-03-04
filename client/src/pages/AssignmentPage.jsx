import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAuthUser, getAuthHeader } from '../lib/authLocal';

/**
 * AssignmentPage.jsx — now talks to the API:
 *   GET  /edstream/assignments/:id
 *   GET  /edstream/assignments/:id/submissions/me
 *   POST /edstream/assignments/:id/submissions  (JSON for links; multipart for files)
 */

function safeJSONParse(raw) {
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

export default function AssignmentPage() {
	const { assignmentId } = useParams();

	const [assignment, setAssignment] = useState(null);
	const [loading, setLoading] = useState(true);
	const [err, setErr] = useState(null);

	// Submission state
	const [linkUrl, setLinkUrl] = useState('');
	const [file, setFile] = useState(null);
	const [submitError, setSubmitError] = useState('');
	const [submitSuccess, setSubmitSuccess] = useState('');
	const [lastSubmission, setLastSubmission] = useState(null);

	const fileInputRef = useRef(null);
	const currentUser = getAuthUser();
	const backPath = currentUser?.role === 'learner' ? '/student-home' : '/';

	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/edstream';

	// Fetch assignment
	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				setLoading(true);
				setErr(null);

				const res = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
					headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
					credentials: 'include',
				});
				const payload = await res.json();
				if (!res.ok || payload?.ok === false) {
					throw new Error(payload?.error ?? 'Failed to load assignment');
				}
				const doc = payload.data ?? payload;

				const normalized = {
					id: doc.id ?? doc._id ?? assignmentId,
					title: doc.title ?? 'Untitled Assignment',
					description: doc.description ?? '',
					maxScore: doc.maxScore ?? null,
					passingScore: doc.passingScore ?? null,
					expectedTimeMins: doc.estimatedMinutes ?? null,
					attachments: Array.isArray(doc.attachments) ? doc.attachments : [],
					rubric: Array.isArray(doc.rubric) ? doc.rubric : [],
					submission: doc.submission ?? {
						type: ['link', 'file'],
						allowedFileTypes: [],
						maxSizeMB: 50,
					},
					status: doc.status ?? 'published',
					courseId: doc.courseId ?? 'N/A',
				};

				if (!alive) return;
				setAssignment(normalized);
			} catch (e) {
				if (!alive) return;
				setErr(e.message ?? 'Something went wrong');
			} finally {
				if (alive) setLoading(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, [assignmentId, API_BASE]);

	// Fetch my latest submission (if any)
	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const res = await fetch(
					`${API_BASE}/assignments/${assignmentId}/submissions/me`,
					{
						headers: {
							'Content-Type': 'application/json',
							...getAuthHeader(),
						},
						credentials: 'include',
					},
				);
				if (!res.ok) return; // no submission yet
				const payload = await res.json();
				if (!alive) return;
				const sub = payload?.data ?? payload;
				setLastSubmission(sub);
				if (sub?.link) setLinkUrl(sub.link);
			} catch {
				// ignore
			}
		})();
		return () => {
			alive = false;
		};
	}, [assignmentId, API_BASE]);

	const acceptAttr = useMemo(() => {
		if (!assignment) return '';
		const types = assignment?.submission?.allowedFileTypes ?? [];
		return types.join(',');
	}, [assignment]);

	const passingMarks = useMemo(() => {
		const max = Number(assignment?.maxScore ?? 100);
		return Math.round(max * 0.6);
	}, [assignment]);

	const onFileChange = (e) => {
		setSubmitError('');
		const f = e.target.files?.[0];
		if (!f) {
			setFile(null);
			return;
		}

		const allowed = (assignment?.submission?.allowedFileTypes ?? []).map((x) =>
			x.toLowerCase(),
		);
		const ext = '.' + (f.name.split('.').pop() ?? '').toLowerCase();
		const sizeMB = f.size / (1024 * 1024);
		const maxMB = assignment?.submission?.maxSizeMB ?? 50;

		if (allowed.length && !allowed.includes(ext)) {
			setFile(null);
			setSubmitError(`Invalid file type. Allowed: ${allowed.join(', ')}`);
			if (fileInputRef.current) fileInputRef.current.value = '';
			return;
		}
		if (sizeMB > maxMB) {
			setFile(null);
			setSubmitError(`File too large. Max size is ${maxMB} MB.`);
			if (fileInputRef.current) fileInputRef.current.value = '';
			return;
		}
		setFile(f);
	};

	const onSubmit = async (e) => {
		e.preventDefault();
		setSubmitError('');
		setSubmitSuccess('');
		if (!assignment) return;

		const allowFile = assignment.submission?.type?.includes('file');
		const allowLink = assignment.submission?.type?.includes('link');

		if (allowFile && allowLink) {
			if (!file && !linkUrl.trim()) {
				setSubmitError('Please provide a link or upload a file.');
				return;
			}
		} else if (allowFile && !file) {
			setSubmitError('Please upload a file.');
			return;
		} else if (allowLink && !linkUrl.trim()) {
			setSubmitError('Please enter a submission link.');
			return;
		}

		try {
			const url = `${API_BASE}/assignments/${assignment.id}/submissions`;

			let res;
			if (file) {
				// multipart
				const form = new FormData();
				form.append('link', linkUrl.trim());
				form.append('file', file);
				res = await fetch(url, {
					method: 'POST',
					headers: { ...getAuthHeader() }, // DON'T set Content-Type explicitly here
					body: form,
					credentials: 'include',
				});
			} else {
				// JSON
				res = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
					body: JSON.stringify({ link: linkUrl.trim() }),
					credentials: 'include',
				});
			}

			const payload = await res.json();
			if (!res.ok || payload?.ok === false) {
				throw new Error(payload?.error ?? 'Submission failed');
			}
			const sub = payload.data ?? payload;

			setLastSubmission(sub);
			setSubmitSuccess('Submission received! You can resubmit anytime.');
			if (fileInputRef.current) fileInputRef.current.value = '';
			setFile(null);
		} catch (e) {
			setSubmitError(e.message ?? 'Submission failed. Please try again.');
		}
	};

	if (loading) {
		return (
			<Page>
				<Style />
				<Card>
					<TopAccent />
					<div className="ap-pad">
						<p>Loading…</p>
					</div>
				</Card>
			</Page>
		);
	}

	if (err || !assignment) {
		return (
			<Page>
				<Style />
				<Card>
					<TopAccent />
					<div className="ap-pad">
						<h2 className="ap-title">Assignment</h2>
						<p className="ap-muted">{err ?? 'Not found'}</p>
						<div style={{ marginTop: 16 }}>
							<Link className="ap-link" to="/">
								← Back
							</Link>
						</div>
					</div>
				</Card>
			</Page>
		);
	}

	return (
		<Page>
			<Style />
			<Card>
				<TopAccent />
				<div className="ap-header">
					<h1 className="ap-title">{assignment.title}</h1>
					<div className="ap-rightMeta">
						<span
							className={`ap-badge ${assignment.status === 'published' ? 'ok' : ''}`}
						>
							<span className="ap-dot" />{' '}
							{assignment.status?.[0]?.toUpperCase() +
								assignment.status?.slice(1)}
						</span>
					</div>
				</div>

				<div className="ap-metaRow ap-pad">
					<Meta
						label="Course"
						value={
							typeof assignment.courseId === 'string'
								? assignment.courseId.replace(/-/g, ' ')
								: 'N/A'
						}
					/>
					<Meta label="Max Score" value={assignment.maxScore ?? '—'} />
					<Meta label="Passing Marks" value={passingMarks} />
					<Meta
						label="Expected Time"
						value={`${assignment.expectedTimeMins ?? 0} mins`}
					/>
				</div>

				{/* Last submission */}
				{lastSubmission?.submittedAt && (
					<div className="ap-section ap-pad">
						<SectionTitle>Submission Status</SectionTitle>
						<p className="ap-desc" style={{ marginBottom: 0 }}>
							<b>Status:</b> {lastSubmission.status ?? 'Submitted'}
							<br />
							<b>Submitted At:</b>{' '}
							{new Date(lastSubmission.submittedAt).toLocaleString()}
							<br />
							{lastSubmission.link ? (
								<>
									<b>Link:</b>{' '}
									<a
										className="ap-fileLink"
										href={lastSubmission.link}
										target="_blank"
										rel="noreferrer"
									>
										{lastSubmission.link}
									</a>
									<br />
								</>
							) : null}
							{lastSubmission.fileName ? (
								<>
									<b>File:</b>{' '}
									{lastSubmission.fileUrl ? (
										<a
											className="ap-fileLink"
											href={lastSubmission.fileUrl}
											target="_blank"
											rel="noreferrer"
										>
											{lastSubmission.fileName}
										</a>
									) : (
										lastSubmission.fileName
									)}
								</>
							) : null}
						</p>
					</div>
				)}

				<div className="ap-section ap-pad">
					<SectionTitle>Instructions</SectionTitle>
					<p className="ap-desc">{assignment.description}</p>

					{assignment.attachments?.length > 0 && (
						<div className="ap-attachments">
							<div className="ap-attachmentsTitle">Attachments</div>
							<ul>
								{assignment.attachments.map((a, idx) => (
									<li key={`${a.url ?? a.name}-${idx}`}>
										{a.url ? (
											<a
												className="ap-fileLink"
												href={a.url}
												target="_blank"
												rel="noreferrer"
											>
												{a.name ?? a.url}
											</a>
										) : (
											<span className="ap-muted">{a.name}</span>
										)}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				{assignment.rubric?.length > 0 && (
					<div className="ap-section ap-pad">
						<SectionTitle>Rubric</SectionTitle>
						<table className="ap-rubric">
							<thead>
								<tr>
									<th>Criterion</th>
									<th style={{ width: 120, textAlign: 'right' }}>
										Points
									</th>
								</tr>
							</thead>
							<tbody>
								{(assignment.rubric ?? []).map((r, idx) => (
									<tr key={idx}>
										<td>{r.criterion}</td>
										<td style={{ textAlign: 'right' }}>{r.points}</td>
									</tr>
								))}
								<tr className="ap-rubricTotal">
									<td>Total</td>
									<td style={{ textAlign: 'right' }}>
										{(assignment.rubric ?? []).reduce(
											(s, r) => s + (r.points ?? 0),
											0,
										)}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				)}

				<div className="ap-section ap-pad">
					<SectionTitle>Submit</SectionTitle>
					<form onSubmit={onSubmit} className="ap-form">
						{/* Link input (optional) */}
						<label className="ap-lbl">Submission Link (optional)</label>
						<input
							type="url"
							placeholder="https://github.com/your/repo or deployment URL"
							className="ap-input"
							value={linkUrl}
							onChange={(e) => setLinkUrl(e.target.value)}
						/>

						{/* File upload (optional) */}
						<label className="ap-lbl" style={{ marginTop: 16 }}>
							Upload File{' '}
							{acceptAttr && (
								<span className="ap-muted">({acceptAttr})</span>
							)}
						</label>
						<input
							ref={fileInputRef}
							className="ap-file"
							type="file"
							accept={acceptAttr}
							onChange={onFileChange}
						/>
						{file && (
							<div className="ap-fileMeta">
								<span className="ap-dot ap-small" />
								<span className="ap-muted">
									{file.name} • {(file.size / (1024 * 1024)).toFixed(2)}{' '}
									MB
								</span>
							</div>
						)}

						{submitError && <div className="ap-alert err">{submitError}</div>}
						{submitSuccess && (
							<div className="ap-alert ap-ok">{submitSuccess}</div>
						)}

						<div className="ap-actions">
							<button type="submit" className="ap-btn">
								Submit Assignment
							</button>
							<Link to={backPath} className="ap-btn ghost">
								Cancel
							</Link>
						</div>
					</form>
				</div>
			</Card>
		</Page>
	);
}

/* ---------- building blocks ---------- */
function Page({ children }) {
	return <div className="ap-assignment-page">{children}</div>;
}
function Card({ children }) {
	return <div className="ap-card">{children}</div>;
}
function TopAccent() {
	return <div className="ap-topAccent" aria-hidden="true" />;
}
function Meta({ label, value }) {
	return (
		<div className="ap-meta">
			<div className="ap-metaLabel">{label}</div>
			<div className="ap-metaValue">{value}</div>
		</div>
	);
}
function SectionTitle({ children }) {
	return <h3 className="ap-sectionTitle">{children}</h3>;
}

/* ---------- Scoped Styles (kept) ---------- */
function Style() {
	return (
		<style>{`
/* (Your existing styles kept as-is) */
.ap-assignment-page{
 --bg: #f7f7fb;
 --surface: #ffffff;
 --border: #e9e9ef;
 --text: #1f2937;
 --muted: #6b7280;
 --primary: #6C4BF4;
 --primary-600: #5b3df0;
 --primary-100: #efeafe;
 --accent: #22D3EE;
 --shadow: 0 8px 24px rgba(20, 20, 43, 0.06);
 --radius: 14px;
 min-height: 100vh;
 background: var(--bg);
 padding: 24px;
 display: flex;
 align-items: flex-start;
 justify-content: center;
}
.ap-assignment-page .ap-card{
 width: 100%;
 max-width: 980px;
 background: var(--surface);
 border: 1px solid var(--border);
 border-radius: var(--radius);
 box-shadow: var(--shadow);
 overflow: hidden;
}
.ap-assignment-page .ap-topAccent{
 height: 6px;
 background: linear-gradient(90deg, var(--primary), var(--accent));
}
.ap-assignment-page .ap-pad{ padding: 20px 24px; }
.ap-assignment-page .ap-header{
 display:flex; align-items:center; justify-content:space-between;
 padding: 18px 24px 8px 24px;
}
.ap-assignment-page .ap-title{
 font-size: 22px; font-weight: 700; color: var(--text); margin: 0;
}
.ap-assignment-page .ap-rightMeta{ display:flex; gap:12px; align-items:center; }
.ap-assignment-page .ap-badge{
 display:inline-flex; align-items:center; gap:6px;
 padding: 6px 10px; border-radius: 999px; font-size: 12px;
 color: var(--muted); background:#f2f2f8; border:1px solid var(--border);
}
.ap-assignment-page .ap-badge.ap-ok{ color: var(--primary-600); background: #f4f1ff; border-color: #e7e1fe; }
.ap-assignment-page .ap-dot{ width:8px; height:8px; border-radius:50%; background: var(--primary); display:inline-block; }
.ap-assignment-page .ap-small{ width:6px; height:6px; }
.ap-assignment-page .ap-muted{ color: var(--muted); }
.ap-assignment-page .ap-metaRow{
 display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px;
}
.ap-assignment-page .ap-meta{
 border:1px solid var(--border); border-radius:10px; padding:12px 14px; background:#fff;
}
.ap-assignment-page .ap-metaLabel{ font-size:12px; color: var(--muted); margin-bottom:4px; }
.ap-assignment-page .ap-metaValue{ font-weight:600; color: var(--text); }
.ap-assignment-page .ap-section{ border-top:1px solid var(--border); }
.ap-assignment-page .ap-sectionTitle{
 font-size:16px; font-weight:700; color: var(--text); margin: 0 0 12px 0;
}
.ap-assignment-page .ap-desc{ color: var(--text); line-height:1.6; }
.ap-assignment-page .ap-attachments{ margin-top:14px; }
.ap-assignment-page .ap-attachmentsTitle{ font-size:12px; color: var(--muted); margin-bottom:6px; }
.ap-assignment-page .ap-fileLink{ color: var(--primary-600); text-decoration: none; }
.ap-assignment-page .ap-fileLink:hover{ text-decoration: underline; }
.ap-assignment-page .ap-rubric{ width:100%; border-collapse: collapse; overflow:hidden; border-radius: 10px; }
.ap-assignment-page .ap-rubric th,
.ap-assignment-page .ap-rubric td{ border:1px solid var(--border); padding:10px 12px; }
.ap-assignment-page .ap-rubric thead th{ background: var(--primary-100); color: var(--text); text-align:left; font-weight:700; }
.ap-assignment-page .ap-rubricTotal td{ background:#fafafa; font-weight:700; }
.ap-assignment-page .ap-form{ display:flex; flex-direction:column; }
.ap-assignment-page .ap-lbl{ font-size:13px; color: var(--text); margin-bottom:6px; font-weight:600; }
.ap-assignment-page .ap-input{
 height: 40px; border-radius: 10px; border:1px solid var(--border);
 padding: 0 12px; outline: none; background:#fff;
}
.ap-assignment-page .ap-input:focus{ border-color: var(--primary); box-shadow: 0 0 0 3px rgba(108,75,244,0.12); }
.ap-assignment-page .ap-file{ display:block; }
.ap-assignment-page .ap-fileMeta{ margin-top:8px; display:flex; align-items:center; gap:8px; }
.ap-assignment-page .ap-alert{
 margin-top:14px; border-radius: 10px; padding: 10px 12px; font-size:14px; border:1px solid;
}
.ap-assignment-page .ap-alert.err{ color:#9b1c1c; background:#fff1f1; border-color:#ffd2d2; }
.ap-assignment-page .ap-alert.ap-ok{ color:#065f46; background:#ecfdf5; border-color:#a7f3d0; }
.ap-assignment-page .ap-actions{ display:flex; gap:10px; align-items:center; margin-top:18px; }
.ap-assignment-page .ap-btn{
 height: 40px; padding: 0 16px; border-radius: 10px; border: 0;
 background: var(--primary); color: white; font-weight:600; cursor:pointer;
 box-shadow: 0 8px 20px rgba(108,75,244,0.25);
}
.ap-assignment-page .ap-btn:hover{ background: var(--primary-600); }
.ap-assignment-page .ap-btn.ghost{
 background: #fff; color: var(--text); border:1px solid var(--border);
 box-shadow:none; text-decoration: none; display:inline-flex; align-items:center; justify-content:center;
}
.ap-assignment-page .ap-link{ color: var(--primary-600); text-decoration: none; }
.ap-assignment-page .ap-link:hover{ text-decoration: underline; }
@media (max-width: 820px){
 .ap-assignment-page .ap-metaRow{ grid-template-columns: repeat(2, minmax(0,1fr)); }
 .ap-assignment-page .ap-header{ align-items:flex-start; gap:10px; flex-direction:column; }
}
`}</style>
	);
}
