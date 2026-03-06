const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const AssignmentSubmissionSchema = new Schema(
  {
    assignment: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
      index: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    link: { type: String, default: null },

    fileName: { type: String, default: null },
    fileUrl: { type: String, default: null },

    status: {
      type: String,
      enum: ['Submitted', 'Resubmitted'],
      default: 'Submitted',
    },

    submittedAt: { type: Date, default: Date.now },

    // Optional evaluation later
    score: { type: Number, default: null },
    feedback: { type: String, default: null },
  },
  { timestamps: true }
);

// Prevent duplicate entries: user can have one active submission
AssignmentSubmissionSchema.index({ assignment: 1, user: 1 }, { unique: true });

module.exports = model('AssignmentSubmission', AssignmentSubmissionSchema);
