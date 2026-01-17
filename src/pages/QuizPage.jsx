// src/pages/QuizPage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

/**
 * QuizPage.jsx — self-scoped, student-facing quiz page
 * - Theme: Purple (#6C4BF4) + Cyan (#22D3EE)
 * - All CSS scoped under `.ap-quiz-page` to avoid clashes
 * - Data sources:
 *    GET /data/quizData.json       (no answers)
 *    GET /data/quizAnswers.json    (answers fetched only on submit)
 */

export default function QuizPage() {
	const { quizId } = useParams();

	const [loading, setLoading] = useState(true);
	const [err, setErr] = useState(null);
	const [quiz, setQuiz] = useState(null);

	// Working copy after shuffling (questions & options)
	const [renderQuestions, setRenderQuestions] = useState([]);

	// Attempt state
	const [answers, setAnswers] = useState({}); // { Q1: ["A"], Q2: ["B","C"], ... }
	const [submitted, setSubmitted] = useState(false);
	const [score, setScore] = useState(null);
	const [maxScore, setMaxScore] = useState(0);
	const [passed, setPassed] = useState(false);
	const [gradingError, setGradingError] = useState('');

	// Timer
	const [timeLeftSec, setTimeLeftSec] = useState(null);
	const timerRef = useRef(null);

	// Load the quiz (no answers inside)
	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				setLoading(true);
				setErr(null);
				const res = await fetch('/data/quizData.json');
				if (!res.ok) throw new Error('Failed to fetch quizData.json');
				const all = await res.json();
				const found = all.find((q) => q.id === quizId) || null;
				if (!found) throw new Error('Quiz not found');

				// Prepare shuffled copies
				const qCopy = JSON.parse(JSON.stringify(found));
				const prepared = prepareQuestionsForRender(qCopy);

				if (alive) {
					setQuiz(qCopy);
					setRenderQuestions(prepared);
					setMaxScore(prepared.reduce((s, q) => s + (q.points || 0), 0));

					// Timer
					const limitMin = qCopy?.settings?.timeLimitMins;
					if (limitMin && Number.isFinite(limitMin)) {
						setTimeLeftSec(limitMin * 60);
					}
				}
			} catch (e) {
				if (alive) setErr(e.message || 'Something went wrong');
			} finally {
				if (alive) setLoading(false);
			}
		})();

		return () => {
			alive = false;
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [quizId]);

	// Start countdown when timeLeftSec is set the first time
	useEffect(() => {
		if (timeLeftSec == null || submitted) return;
		if (timerRef.current) clearInterval(timerRef.current);
		timerRef.current = setInterval(() => {
			setTimeLeftSec((t) => {
				if (t == null) return t;
				if (t <= 1) {
					clearInterval(timerRef.current);
					// auto-submit on time up
					handleSubmit(true);
					return 0;
				}
				return t - 1;
			});
		}, 1000);
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [timeLeftSec, submitted]);

	function prepareQuestionsForRender(qz) {
		const shuffleQ = !!qz?.settings?.shuffleQuestions;
		const shuffleO = !!qz?.settings?.shuffleOptions;

		const qs = (qz.questions || []).map((q) => {
			const options = [...(q.options || [])];
			if (shuffleO) shuffleInPlace(options);
			return {
				...q,
				options,
			};
		});

		if (shuffleQ) shuffleInPlace(qs);

		return qs;
	}

	function shuffleInPlace(arr) {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	const formattedDue = useMemo(() => {
		if (!quiz?.dueAt) return '-';
		return new Date(quiz.dueAt).toLocaleString();
	}, [quiz]);

	const isPastDue = useMemo(() => {
		if (!quiz?.dueAt) return false;
		return new Date(quiz.dueAt).getTime() < Date.now();
	}, [quiz]);

	const remainingClock = useMemo(() => {
		if (timeLeftSec == null) return null;
		const m = Math.floor(timeLeftSec / 60);
		const s = timeLeftSec % 60;
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}, [timeLeftSec]);

	const selectSingle = (qid, oid) => {
		setAnswers((prev) => ({ ...prev, [qid]: [oid] }));
	};

	const toggleMulti = (qid, oid) => {
		setAnswers((prev) => {
			const cur = new Set(prev[qid] || []);
			if (cur.has(oid)) cur.delete(oid);
			else cur.add(oid);
			return { ...prev, [qid]: Array.from(cur) };
		});
	};

	const handleSubmit = async (auto = false) => {
		if (submitted) return;
		setGradingError('');
		try {
			// Fetch answers for this quizId
			const res = await fetch('/data/quizAnswers.json');
			if (!res.ok) throw new Error('Failed to fetch quizAnswers.json');
			const all = await res.json();
			const entry = all.find((x) => x.quizId === quizId);
			if (!entry) throw new Error('Answers not found for this quiz');

			// Build a quick lookup for correct answers
			const correctMap = new Map(); // qid -> [A, C] etc
			entry.answers.forEach((a) => correctMap.set(a.qid, a.correctOptionIds || []));

			// Grade
			let s = 0;
			renderQuestions.forEach((q) => {
				const picked = new Set(answers[q.qid] || []);
				const correct = new Set(correctMap.get(q.qid) || []);
				if (q.type === 'multi') {
					// full marks only when set matches exactly
					if (eqSet(picked, correct)) s += q.points || 0;
				} else {
					// single correct
					if (picked.size === 1 && eqSet(picked, correct)) s += q.points || 0;
				}
			});

			setScore(s);
			setSubmitted(true);
			setPassed(s >= (quiz?.passingScore ?? 0));
			if (timerRef.current) clearInterval(timerRef.current);
		} catch (e) {
			setGradingError(e.message || 'Grading failed');
		}
	};

	function eqSet(a, b) {
		if (a.size !== b.size) return false;
		for (const v of a) if (!b.has(v)) return false;
		return true;
	}

	if (loading) {
		return (
			<Page>
				<Style />
				<Card>
					<TopAccent />
					<div className="apq-pad">
						<p>Loading…</p>
					</div>
				</Card>
			</Page>
		);
	}

	if (err || !quiz) {
		return (
			<Page>
				<Style />
				<Card>
					<TopAccent />
					<div className="apq-pad">
						<h2 className="apq-title">Quiz</h2>
						<p className="apq-muted">{err || 'Not found'}</p>
						<div style={{ marginTop: 16 }}>
							<Link className="apq-link" to="/">
								← Back
							</Link>
						</div>
					</div>
				</Card>
			</Page>
		);
	}

	const showAnswersAfterSubmit = !!quiz?.settings?.showAnswersAfterSubmit;

	return (
		<Page>
			<Style />
			<Card>
				<TopAccent />

				<div className="apq-header">
					<h1 className="apq-title">{quiz.title}</h1>
					<div className="apq-rightMeta">
						<span
							className={`apq-badge ${quiz.status === 'published' ? 'ok' : ''}`}
						>
							<span className="apq-dot" />{' '}
							{quiz.status?.[0]?.toUpperCase() + quiz.status?.slice(1)}
						</span>
					</div>
				</div>

				<div className="apq-metaRow apq-pad">
					<Meta label="Course" value={quiz.courseId.replace(/-/g, ' ')} />
					<Meta label="Max Score" value={quiz.maxScore} />
					<Meta label="Passing" value={quiz.passingScore} />
					<Meta label="Due" value={formattedDue} danger={isPastDue} />
				</div>

				<div className="apq-metaRow apq-pad">
					<Meta
						label="Estimated Time"
						value={`${quiz.estimatedTimeMins} mins`}
					/>
					<Meta
						label="Time Limit"
						value={`${quiz.settings?.timeLimitMins ?? '—'} mins`}
					/>
					<Meta
						label="Shuffle Qs"
						value={quiz.settings?.shuffleQuestions ? 'Yes' : 'No'}
					/>
					<Meta
						label="Shuffle Options"
						value={quiz.settings?.shuffleOptions ? 'Yes' : 'No'}
					/>
				</div>

				{quiz.description && (
					<div className="apq-section apq-pad">
						<SectionTitle>Description</SectionTitle>
						<p className="apq-desc">{quiz.description}</p>
					</div>
				)}

				{!!quiz.settings?.timeLimitMins && (
					<div className="apq-timerBar" role="timer" aria-live="polite">
						<div className="apq-pad apq-timerRow">
							<span>Time Left</span>
							<span
								className={`apq-timer ${timeLeftSec !== null && timeLeftSec <= 30 ? 'danger' : ''}`}
							>
								{remainingClock}
							</span>
						</div>
					</div>
				)}

				<div className="apq-section apq-pad">
					<SectionTitle>Questions</SectionTitle>

					{renderQuestions.map((q, idx) => (
						<div key={q.qid} className="apq-question">
							<div className="apq-qHeader">
								<span className="apq-qNum">Q{idx + 1}</span>
								<span className="apq-qPts">
									{q.points} pt{q.points !== 1 ? 's' : ''}
								</span>
							</div>
							<div className="apq-qText">{q.text}</div>

							<div className="apq-options">
								{q.options.map((opt) => {
									const isChecked = (answers[q.qid] || []).includes(
										opt.oid,
									);
									const inputType =
										q.type === 'multi' ? 'checkbox' : 'radio';
									return (
										<label className="apq-option" key={opt.oid}>
											<input
												type={inputType}
												name={q.qid}
												value={opt.oid}
												checked={isChecked}
												disabled={submitted}
												onChange={() => {
													if (q.type === 'multi')
														toggleMulti(q.qid, opt.oid);
													else selectSingle(q.qid, opt.oid);
												}}
											/>
											<span className="apq-optionText">
												<b>{opt.oid}.</b> {opt.text}
											</span>
										</label>
									);
								})}
							</div>

							{/* If submitted and showAnswersAfterSubmit, highlight correctness */}
							{submitted && showAnswersAfterSubmit && (
								<AnswerReveal quizId={quiz.id} qid={q.qid} />
							)}
						</div>
					))}

					{gradingError && <div className="apq-alert err">{gradingError}</div>}

					<div className="apq-actions">
						{!submitted ? (
							<>
								<button
									type="button"
									className="apq-btn"
									disabled={isPastDue}
									onClick={() => handleSubmit(false)}
								>
									Submit Quiz
								</button>
								<Link to="/" className="apq-btn ghost">
									Cancel
								</Link>
							</>
						) : (
							<>
								<div className={`apq-result ${passed ? 'ok' : 'warn'}`}>
									<div className="apq-resultTitle">
										{passed ? 'Passed' : 'Not Passed'}
									</div>
									<div className="apq-resultScore">
										Score: {score} / {maxScore} (Passing:{' '}
										{quiz.passingScore})
									</div>
								</div>
								<Link to="/" className="apq-btn ghost">
									Back
								</Link>
							</>
						)}
					</div>
				</div>
			</Card>
		</Page>
	);
}

/* ---------- AnswerReveal (reads from quizAnswers.json once submitted) ---------- */

function AnswerReveal({ quizId, qid }) {
	const [correct, setCorrect] = useState([]);
	const [err, setErr] = useState(null);

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const res = await fetch('/data/quizAnswers.json');
				if (!res.ok) throw new Error('Failed to fetch quizAnswers.json');
				const all = await res.json();
				const entry = all.find((x) => x.quizId === quizId);
				const q = entry?.answers?.find((a) => a.qid === qid);
				if (!q) throw new Error('Answer not found');
				if (alive) setCorrect(q.correctOptionIds || []);
			} catch (e) {
				if (alive) setErr(e.message || 'Failed to load answers');
			}
		})();
		return () => (alive = false);
	}, [quizId, qid]);

	if (err) return <div className="apq-alert err">{err}</div>;
	if (!correct.length) return null;
	return <div className="apq-answer">Correct: {correct.join(', ')}</div>;
}

/* ---------- small building blocks ---------- */

function Page({ children }) {
	return <div className="ap-quiz-page">{children}</div>;
}
function Card({ children }) {
	return <div className="apq-card">{children}</div>;
}
function TopAccent() {
	return <div className="apq-topAccent" aria-hidden="true" />;
}
function Meta({ label, value, danger }) {
	return (
		<div className={`apq-meta ${danger ? 'danger' : ''}`}>
			<div className="apq-metaLabel">{label}</div>
			<div className="apq-metaValue">{value}</div>
		</div>
	);
}
function SectionTitle({ children }) {
	return <h3 className="apq-sectionTitle">{children}</h3>;
}

/* ---------- Scoped Styles ---------- */

function Style() {
	return (
		<style>{`
      .ap-quiz-page{
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
      .ap-quiz-page .apq-card{
        width: 100%;
        max-width: 980px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        overflow: hidden;
      }
      .ap-quiz-page .apq-topAccent{
        height: 6px;
        background: linear-gradient(90deg, var(--primary), var(--accent));
      }
      .ap-quiz-page .apq-pad{ padding: 20px 24px; }

      .ap-quiz-page .apq-header{
        display:flex; align-items:center; justify-content:space-between;
        padding: 18px 24px 8px 24px;
      }
      .ap-quiz-page .apq-title{
        font-size: 22px; font-weight: 700; color: var(--text); margin: 0;
      }
      .ap-quiz-page .apq-rightMeta{ display:flex; gap:12px; align-items:center; }
      .ap-quiz-page .apq-badge{
        display:inline-flex; align-items:center; gap:6px;
        padding: 6px 10px; border-radius: 999px; font-size: 12px;
        color: var(--muted); background:#f2f2f8; border:1px solid var(--border);
      }
      .ap-quiz-page .apq-badge.ok{ color: var(--primary-600); background: #f4f1ff; border-color: #e7e1fe; }
      .ap-quiz-page .apq-dot{ width:8px; height:8px; border-radius:50%; background: var(--primary); display:inline-block; }

      .ap-quiz-page .apq-metaRow{
        display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px;
      }
      .ap-quiz-page .apq-meta{
        border:1px solid var(--border); border-radius:10px; padding:12px 14px; background:#fff;
      }
      .ap-quiz-page .apq-meta.danger{ border-color:#ffd1d1; background:#fff8f8; }
      .ap-quiz-page .apq-metaLabel{ font-size:12px; color: var(--muted); margin-bottom:4px; }
      .ap-quiz-page .apq-metaValue{ font-weight:600; color: var(--text); }

      .ap-quiz-page .apq-section{ border-top:1px solid var(--border); }
      .ap-quiz-page .apq-sectionTitle{
        font-size:16px; font-weight:700; color: var(--text); margin: 0 0 12px 0;
      }
      .ap-quiz-page .apq-desc{ color: var(--text); line-height:1.6; }

      .ap-quiz-page .apq-timerBar{
        border-top: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
        background: #fbfbfe;
      }
      .ap-quiz-page .apq-timerRow{
        display:flex; align-items:center; justify-content:space-between;
        font-weight:600; color: var(--text);
      }
      .ap-quiz-page .apq-timer{
        font-feature-settings: "tnum";
        font-variant-numeric: tabular-nums;
        padding: 6px 10px; border-radius: 8px;
        background: #f1efff; color: var(--primary-600);
      }
      .ap-quiz-page .apq-timer.danger{
        background: #fff1f1; color: #9b1c1c;
      }

      .ap-quiz-page .apq-question{
        border:1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 16px;
      }
      .ap-quiz-page .apq-qHeader{
        display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px;
      }
      .ap-quiz-page .apq-qNum{
        display:inline-flex; align-items:center; justify-content:center;
        min-width: 32px; height: 32px; border-radius: 999px;
        background: var(--primary-100); color: var(--primary-600); font-weight: 700;
      }
      .ap-quiz-page .apq-qPts{ font-size:12px; color: var(--muted); }
      .ap-quiz-page .apq-qText{ font-weight:600; color: var(--text); margin: 6px 0 12px; }

      .ap-quiz-page .apq-options{ display:flex; flex-direction:column; gap:8px; }
      .ap-quiz-page .apq-option{
        display:flex; gap:10px; align-items:center; padding: 10px 12px; border-radius: 10px;
        border:1px solid var(--border); background:#fff; cursor:pointer;
      }
      .ap-quiz-page .apq-option input{ transform: scale(1.1); }
      .ap-quiz-page .apq-optionText{ color: var(--text); }
      .ap-quiz-page .apq-answer{
        margin-top: 8px; color:#065f46; background:#ecfdf5; border:1px solid #a7f3d0; padding:8px 10px; border-radius:8px; display:inline-block;
      }

      .ap-quiz-page .apq-alert{
        margin-top:14px; border-radius: 10px; padding: 10px 12px; font-size:14px; border:1px solid;
      }
      .ap-quiz-page .apq-alert.err{ color:#9b1c1c; background:#fff1f1; border-color:#ffd2d2; }
      .ap-quiz-page .apq-alert.ok{ color:#065f46; background:#ecfdf5; border-color:#a7f3d0; }
      .ap-quiz-page .apq-alert.warn{ color:#92400e; background:#fffbeb; border-color:#fde68a; }

      .ap-quiz-page .apq-actions{ display:flex; gap:10px; align-items:center; margin-top:18px; }
      .ap-quiz-page .apq-btn{
        height: 40px; padding: 0 16px; border-radius: 10px; border: 0;
        background: var(--primary); color: white; font-weight:600; cursor:pointer;
        box-shadow: 0 8px 20px rgba(108,75,244,0.25);
        text-decoration: none; display:inline-flex; align-items:center; justify-content:center;
      }
      .ap-quiz-page .apq-btn:hover{ background: var(--primary-600); }
      .ap-quiz-page .apq-btn:disabled{ opacity: 0.6; cursor: not-allowed; box-shadow:none; }
      .ap-quiz-page .apq-btn.ghost{
        background: #fff; color: var(--text); border:1px solid var(--border);
        box-shadow:none;
      }
      .ap-quiz-page .apq-link{ color: var(--primary-600); text-decoration: none; }
      .ap-quiz-page .apq-link:hover{ text-decoration: underline; }

      .ap-quiz-page .apq-result{
        flex: 1;
        border-radius: 12px; padding: 12px; border: 1px solid;
      }
      .ap-quiz-page .apq-result.ok{ color:#065f46; background:#ecfdf5; border-color:#a7f3d0; }
      .ap-quiz-page .apq-result.warn{ color:#92400e; background:#fffbeb; border-color:#fde68a; }
      .ap-quiz-page .apq-resultTitle{ font-weight: 700; margin-bottom: 6px; }
      .ap-quiz-page .apq-resultScore{ font-feature-settings: "tnum"; font-variant-numeric: tabular-nums; }

      @media (max-width: 820px){
        .ap-quiz-page .apq-metaRow{ grid-template-columns: repeat(2, minmax(0,1fr)); }
        .ap-quiz-page .apq-header{ align-items:flex-start; gap:10px; flex-direction:column; }
      }
    `}</style>
	);
}
