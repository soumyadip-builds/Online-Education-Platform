// controllers/EditProfileController.js
const User = require('../model/UserModel');
const Learner = require('../model/LearnerModel');
const Instructor = require('../model/InstructorModel');

/**
 * PUT /api/profile
 * Body: {
 *   email, name?, dob?, occupation?, experience?, skills?[], domainInterests?[]
 * }
 * Notes:
 *  - Learner:  domainInterest[] (model)  <= skills[] (UI) OR domainInterests[] (fallback)
 *  - Instructor: skills[] (model)        <= domainInterests[] (UI) OR skills[] (fallback)
 *  - Instructor: experienceYears (model) <= experience (UI)
 */
exports.updateProfile = async function updateProfile(req, res) {
  try {
    const {
      email,
      name,
      dob,
      // learner-oriented from UI
      occupation,
      skills,              // UI "skills" (used by learner UI)
      domainInterests,     // UI "domainInterests" (used by instructor UI)
      experience,          // UI "experience" (string/number)
    } = req.body || {};

    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email: (email || '').trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // Update top-level user fields (name, dob) according to User model
    // (User model supports name, dob; gender exists but not on UI)  // refs:
    // userModel.js: name, email, role, dob, gender                // [3](https://cognizantonline-my.sharepoint.com/personal/2463364_cognizant_com/Documents/Microsoft%20Copilot%20Chat%20Files/userModel.js)
    if (typeof name === 'string') user.name = name;
    if (dob) {
      const parsed = new Date(dob);
      if (!isNaN(parsed.getTime())) user.dob = parsed;
    }
    await user.save();

    let profileDoc = null;

    if (user.role === 'learner') {
      // LearnerModel supports: occupation (string), domainInterest (string[])  // [1](https://cognizantonline-my.sharepoint.com/personal/2463364_cognizant_com/Documents/Microsoft%20Copilot%20Chat%20Files/LearnerModel.js)
      const learnerUpdate = {};
      if (typeof occupation === 'string') learnerUpdate.occupation = occupation;

      // Map UI "skills" -> model "domainInterest"
      const learnerInterests = Array.isArray(skills) ? skills
                           : Array.isArray(domainInterests) ? domainInterests
                           : undefined;
      if (learnerInterests) learnerUpdate.domainInterest = learnerInterests;

      profileDoc = await Learner.findOneAndUpdate(
        { userId: user._id },
        { $set: learnerUpdate, $setOnInsert: { userId: user._id } },
        { new: true, upsert: true }
      );
    } else if (user.role === 'instructor') {
      // InstructorModel supports: experienceYears (number), skills (string[])  // [2](https://cognizantonline-my.sharepoint.com/personal/2463364_cognizant_com/Documents/Microsoft%20Copilot%20Chat%20Files/InstructorModel.js)
      const instructorUpdate = {};

      if (experience !== undefined) {
        const v = Number(experience);
        instructorUpdate.experienceYears = Number.isFinite(v) && v >= 0 ? v : 0;
      }

      // Map UI "domainInterests" -> model "skills"
      const instructorSkills = Array.isArray(domainInterests) ? domainInterests
                            : Array.isArray(skills) ? skills
                            : undefined;
      if (instructorSkills) instructorUpdate.skills = instructorSkills;

      profileDoc = await Instructor.findOneAndUpdate(
        { userId: user._id },
        { $set: instructorUpdate, $setOnInsert: { userId: user._id } },
        { new: true, upsert: true }
      );
    }

    // Shape response for the frontend
    const safeUser = user.toObject();
    const payload = { user: safeUser, profile: profileDoc };

    return res.json({ ok: true, data: payload });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
};