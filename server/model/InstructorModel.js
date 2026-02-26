// models/InstructorModel.js
// Instructor schema referencing User (1:1 via userId)

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const InstructorSchema = new Schema(
  {
    // _id generated automatically (ObjectId)
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      unique: true, // enforce one Instructor profile per User
    },
    experienceYears: {
      type: Number,
      min: [0, 'experienceYears cannot be negative'],
      default: 0,
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    coursesCreated: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Course', // adjust if you use a different collection or remove ref if not applicable
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Helpful compound index examples (optional)
InstructorSchema.index({ experienceYears: -1 });
InstructorSchema.index({ skills: 1 });

const Instructor =
  mongoose.models.Instructor || model('Instructor', InstructorSchema);
module.exports = Instructor;