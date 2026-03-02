// model/CourseModel.js
const mongoose = require('mongoose');

// If you keep ItemSchema for non-work content (e.g., video/reading), keep it as-is.
// Consider narrowing the enum to only content types you still embed.
const ItemSchema = new mongoose.Schema(
  {
    // Allow work types as well so course modules can embed assignments/quizzes
    type: { type: String, enum: ['video', 'reading', 'assignment', 'quiz'], required: true },
    title: { type: String, required: true, trim: true },
    url: { type: String, default: '' },
    // allow zero so drafts or placeholders don't fail validation
    estimatedMinutes: { type: Number, min: 0, required: true },
    // external reference id (can be ObjectId string or local client id like 'local_...')
    refId: { type: String, default: null },
  },
  { _id: false }
);

const ModuleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    items: { type: [ItemSchema], default: [] },
  },
  { _id: false }
);

const CourseSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    author: { type: String, trim: true, default: '' },
    description: { type: String, default: '' },
    learningOutcomes: { type: [String], default: [] },

    thumbnail: {
      mode: { type: String, enum: ['link'], default: 'link' },
      link: { type: String, default: '' },
    },

    // Keep modules for non-work content
    modules: { type: [ModuleSchema], default: [] },

    // NEW: external references
    assignments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', index: true, default: [] }],
    quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', index: true, default: [] }],

    totalEstimatedMinutes: { type: Number, default: 0 },
    counts: {
      videos: { type: Number, default: 0 },
      documentation: { type: Number, default: 0 },
      assignments: { type: Number, default: 0 },
      quizzes: { type: Number, default: 0 },
    },
    status: { type: String, enum: ['published', 'draft'], default: 'draft' },
  },
  { timestamps: true }
);

CourseSchema.index({ owner: 1, createdAt: -1 }); // helpful index

CourseSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  },
});

const Course = mongoose.model('Course', CourseSchema);
module.exports = { Course };