// model/QuizModel.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const QuizOptionSchema = new Schema(
  { text: { type: String, trim: true, required: true }, isCorrect: { type: Boolean, default: false } },
  { _id: false }
);

const QuizQuestionSchema = new Schema(
  {
    title: { type: String, trim: true, required: true },
    options: { type: [QuizOptionSchema], default: [] },
    points: { type: Number, min: 1, required: true },
  },
  { _id: false }
);

const QuizSchema = new Schema(
  {
    shuffleQuestions: { type: Boolean, default: true },
    questions: { type: [QuizQuestionSchema], default: [] },
  },
  { _id: false }
);

const QuizDocSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    estimatedMinutes: { type: Number, min: 1, required: true },
    maxScore: { type: Number, min: 1, required: true },
    passingScore: {
      type: Number, min: 1, required: true,
      validate: {
        validator(v) { return typeof this.maxScore === 'number' ? v <= this.maxScore : true; },
        message: 'passingScore cannot exceed maxScore',
      },
    },
    quiz: { type: QuizSchema, default: { shuffleQuestions: true, questions: [] } },
  },
  { timestamps: true }
);

QuizDocSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => { ret.id = ret._id.toString(); delete ret._id; },
});

module.exports = model('Quiz', QuizDocSchema);
