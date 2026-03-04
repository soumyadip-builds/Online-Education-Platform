const Assignment = require('../model/AssignmentModel');
const AssignmentSubmission = require('../model/AssignmentSubmissionModel');
const path = require('path');

exports.submitAssignment = async (req, res) => {
	try {
		const assignmentId = req.params.id;
		const userId = req.user.id;

		const assignment = await Assignment.findById(assignmentId);
		if (!assignment)
			return res.status(404).json({ ok: false, error: 'Assignment not found' });

		const payload = {
			assignment: assignmentId,
			user: userId,
			link: req.body.link || null,
			submittedAt: new Date(),
		};

		if (req.file) {
			payload.fileName = req.file.filename;
			payload.fileUrl = `/uploads/assignments/${req.file.filename}`;
		}

		const existing = await AssignmentSubmission.findOne({
			assignment: assignmentId,
			user: userId,
		});

		if (existing) {
			payload.status = 'Resubmitted';
		}

		const submission = await AssignmentSubmission.findOneAndUpdate(
			{ assignment: assignmentId, user: userId },
			payload,
			{ upsert: true, new: true, setDefaultsOnInsert: true },
		);

		return res.status(201).json({ ok: true, data: submission });
	} catch (e) {
		return res.status(400).json({ ok: false, error: e.message });
	}
};

exports.getMySubmission = async (req, res) => {
	try {
		const assignmentId = req.params.id;
		const userId = req.user.id;

		const submission = await AssignmentSubmission.findOne({
			assignment: assignmentId,
			user: userId,
		});

		if (!submission)
			return res.status(404).json({ ok: false, error: 'No submission found' });

		res.json({ ok: true, data: submission });
	} catch (e) {
		return res.status(500).json({ ok: false, error: e.message });
	}
};
