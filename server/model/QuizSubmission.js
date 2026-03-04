const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/**
 * We store selections using source indexes so grading remains stable
 * even if client shuffled options.
 */
const QuestionAnswerSchema = new Schema(
  {
    qIndex: { type: Number, required: true, min: 0 }, // position in quiz.quiz.questions[]
    pickedSourceIndexes: { type: [Number], default: [] }, // which options user selected
    correctSourceIndexes: { type: [Number], default: [] }, // snapshot at submission time
    points: { type: Number, default: 0, min: 0 }, // question points
    awarded: { type: Number, default: 0, min: 0 }, // awarded for this question
  },
  { _id: false }
);

const QuizSubmissionSchema = new Schema(
  {
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: String, default: null }, // optional if you track this
    autoSubmitted: { type: Boolean, default: false },

    score: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true, min: 1 },
    passingScore: { type: Number, required: true, min: 1 },
    passed: { type: Boolean, required: true },

    answers: { type: [QuestionAnswerSchema], default: [] },
    submittedAt: { type: Date, default: Date.now },
    clientMeta: {
      timeSpentSec: { type: Number, default: null },
      userAgent: { type: String, default: null },
    },
  },
  { timestamps: true }
);

// If you want to prevent unlimited attempts, you could uncomment below:
// QuizSubmissionSchema.index({ quiz: 1, user: 1 }, { unique: false });

QuizSubmissionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => { ret.id = ret._id.toString(); delete ret._id; },
});

module.exports = model('QuizSubmission', QuizSubmissionSchema);