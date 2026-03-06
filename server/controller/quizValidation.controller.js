// controllers/quizValidation.controller.js
/**
 * Quiz answer validation and grading logic
 * This module contains all validation and scoring logic for quiz submissions
 */

const asNumber = (v, fallback = 0) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : fallback;
};

/**
 * Validates quiz submission and computes the score
 * @param {Object} quizDoc - The quiz document from database
 * @param {Array} questionsPayload - Array of {qIndex, pickedSourceIndexes}
 * @returns {Object} {answers, total, maxScore, passingScore, passed}
 * @throws {Error} if validation fails
 */
function validateAndGradeAnswers(quizDoc, questionsPayload) {
	if (!quizDoc) {
		throw new Error('Quiz document is required');
	}

	// Get canonical questions from database
	const dbQuestions = Array.isArray(quizDoc?.quiz?.questions)
		? quizDoc.quiz.questions
		: [];

	if (!Array.isArray(questionsPayload)) {
		throw new Error('Questions payload must be an array');
	}

	// Validate and compute scoring
	const answers = [];
	let total = 0;

	// Process each question in the quiz
	for (let i = 0; i < dbQuestions.length; i++) {
		const q = dbQuestions[i];
		const qPoints = Number(q.points || 0);

		// Find corresponding client answer
		const clientQ = questionsPayload.find((x) => Number(x?.qIndex) === i) || {
			pickedSourceIndexes: [],
		};

		// Validate pickedSourceIndexes format
		const picked = new Set(
			(Array.isArray(clientQ.pickedSourceIndexes)
				? clientQ.pickedSourceIndexes
				: []
			).map(Number),
		);

		// Get correct answer indexes from database
		const correctSourceIndexes = (Array.isArray(q.options) ? q.options : [])
			.map((opt, idx) => ({ idx, isCorrect: !!opt.isCorrect }))
			.filter((x) => x.isCorrect)
			.map((x) => x.idx);

		const correctSet = new Set(correctSourceIndexes);

		// Check if picked answers match correct answers exactly
		const isExact =
			picked.size === correctSet.size &&
			[...picked].every((p) => correctSet.has(p));

		const awarded = isExact ? qPoints : 0;
		total += awarded;

		// Record answer result
		answers.push({
			qIndex: i,
			pickedSourceIndexes: [...picked],
			correctSourceIndexes,
			points: qPoints,
			awarded,
			isCorrect: isExact,
		});
	}

	// Compute max and passing scores
	const computedMax = dbQuestions.reduce((s, q) => s + Number(q.points || 0), 0);
	const maxScore = Number.isFinite(Number(quizDoc.maxScore))
		? Number(quizDoc.maxScore)
		: computedMax;

	const passingScore = Number(quizDoc.passingScore);
	if (!Number.isFinite(passingScore)) {
		throw new Error('Quiz has invalid passingScore');
	}

	const passed = total >= passingScore;

	return {
		answers,
		score: total,
		maxScore,
		passingScore,
		passed,
	};
}

/**
 * Validates a single question answer
 * @param {Object} question - The question document
 * @param {Array} pickedSourceIndexes - Indexes of picked options
 * @returns {Object} {isCorrect, awarded, correctSourceIndexes}
 */
function validateSingleAnswer(question, pickedSourceIndexes = []) {
	if (!question) {
		throw new Error('Question is required');
	}

	const qPoints = Number(question.points || 0);
	const picked = new Set(
		(Array.isArray(pickedSourceIndexes) ? pickedSourceIndexes : []).map(Number),
	);

	const correctSourceIndexes = (Array.isArray(question.options) ? question.options : [])
		.map((opt, idx) => ({ idx, isCorrect: !!opt.isCorrect }))
		.filter((x) => x.isCorrect)
		.map((x) => x.idx);

	const correctSet = new Set(correctSourceIndexes);

	const isExact =
		picked.size === correctSet.size && [...picked].every((p) => correctSet.has(p));

	const awarded = isExact ? qPoints : 0;

	return {
		isCorrect: isExact,
		awarded,
		correctSourceIndexes,
		pickedSourceIndexes: [...picked],
	};
}

/**
 * Validates quiz submission payload structure
 * @param {Object} payload - The submission payload
 * @throws {Error} if validation fails
 */
function validateSubmissionPayload(payload) {
	if (!payload) {
		throw new Error('Submission payload is required');
	}

	if (!Array.isArray(payload.questions)) {
		throw new Error('Questions array is required');
	}

	// Validate each question in payload
	payload.questions.forEach((q, idx) => {
		if (!Number.isFinite(Number(q.qIndex))) {
			throw new Error(`Question ${idx}: invalid qIndex`);
		}
		if (!Array.isArray(q.pickedSourceIndexes)) {
			throw new Error(`Question ${idx}: pickedSourceIndexes must be an array`);
		}
		// Validate all indexes are numbers
		q.pickedSourceIndexes.forEach((pidx, pidx_idx) => {
			if (!Number.isInteger(pidx)) {
				throw new Error(
					`Question ${idx}, option ${pidx_idx}: invalid source index`,
				);
			}
		});
	});
}

/**
 * Computes overall quiz performance metrics
 * @param {number} score - User's score
 * @param {number} maxScore - Maximum possible score
 * @param {number} passingScore - Score needed to pass
 * @returns {Object} {scorePercentage, passed, performance}
 */
function computePerformanceMetrics(score, maxScore, passingScore) {
	const scorePercentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
	const passed = score >= passingScore;

	let performance = 'fail';
	if (scorePercentage >= 90) performance = 'excellent';
	else if (scorePercentage >= 80) performance = 'good';
	else if (scorePercentage >= 70) performance = 'satisfactory';
	else if (scorePercentage >= 60) performance = 'needs-improvement';

	return {
		scorePercentage,
		passed,
		performance,
	};
}

module.exports = {
	validateAndGradeAnswers,
	validateSingleAnswer,
	validateSubmissionPayload,
	computePerformanceMetrics,
	asNumber,
};
