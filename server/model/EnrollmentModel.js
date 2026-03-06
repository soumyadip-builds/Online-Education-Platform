// models/EnrollmentModel.js
const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const EnrollmentSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: false, index: true },
    user:   { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role:   { type: String, enum: ["learner", "instructor"], default: "learner", index: true },
  },
  { timestamps: true, versionKey: false }
);

EnrollmentSchema.index({ course: 1, user: 1 }, { unique: true });

module.exports = mongoose.models.Enrollment || model("Enrollment", EnrollmentSchema);