// model/AssignmentModel.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const AssignmentSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    attachmentName: { type: String, default: '' },
    estimatedMinutes: { type: Number, min: 1, required: true },
    maxScore: { type: Number, min: 1, required: true },
    passingScore: {
      type: Number, min: 1, required: true,
      validate: {
        validator(v) { return typeof this.maxScore === 'number' ? v <= this.maxScore : true; },
        message: 'passingScore cannot exceed maxScore',
      },
    },
  },
  { timestamps: true }
);

AssignmentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => { ret.id = ret._id.toString(); delete ret._id; },
});

module.exports = model('Assignment', AssignmentSchema);