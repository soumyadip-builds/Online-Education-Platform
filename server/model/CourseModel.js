// model/CourseModel.js
const mongoose = require("mongoose");

// --- ItemSchema & ModuleSchema ---
const ItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["video", "reading", "assignment", "quiz"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    url: { type: String, default: "" },
    estimatedMinutes: { type: Number, min: 0, required: true },
    refId: { type: String, default: null },
  },
  { _id: false },
);

const ModuleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    items: { type: [ItemSchema], default: [] },
  },
  { _id: false },
);

// --- CourseSchema ---
const CourseSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    author: { type: String, trim: true, default: "" },
    description: { type: String, default: "" },
    learningOutcomes: { type: [String], default: [] },

    thumbnail: {
      mode: { type: String, enum: ["link", "upload"], default: "link" },

      // For mode='link'
      link: { type: String, default: "" },

      // For mode='upload'
      fileName: { type: String, default: "" },
    },

    modules: { type: [ModuleSchema], default: [] },

    totalEstimatedMinutes: { type: Number, default: 0 },
    counts: {
      videos: { type: Number, default: 0 },
      documentation: { type: Number, default: 0 },
      assignments: { type: Number, default: 0 },
      quizzes: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

CourseSchema.index({ owner: 1, createdAt: -1 });

CourseSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  },
});

const Course = mongoose.model("Course", CourseSchema);
module.exports = { Course };