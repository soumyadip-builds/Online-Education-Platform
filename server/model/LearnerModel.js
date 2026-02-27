// models/LearnerModel.js
// Learner schema referencing User (1:1 via userId)

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const LearnerSchema = new Schema(
  {
    // _id generated automatically (ObjectId)
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      unique: true, // enforce one Learner profile per User
    },
    occupation: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    domainInterest: [
      {
        type: String,
        trim: true,
      },
    ],
    coursesEnrolled: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Course', // adjust/remove ref as needed
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

LearnerSchema.index({ occupation: 1 });
LearnerSchema.index({ domainInterest: 1 });

const Learner = mongoose.models.Learner || model('Learner', LearnerSchema);
module.exports = Learner;