// controllers/EditProfileController.js
const User = require('../model/UserModel');
const Learner = require('../model/LearnerModel');
const Instructor = require('../model/InstructorModel');

/**
 * GET /editProfile/profile
 * Query/body: { email }
 * Returns the user and the role-specific profile so the UI can pre-fill existing values.
 */
exports.getProfile = async function getProfile(req, res) {
  try {
    const email = (req.query.email ?? req.body?.email ?? '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    let profileDoc = null;
    if (user.role === 'learner') {
      profileDoc = await Learner.findOne({ userId: user._id });
    } else if (user.role === 'instructor') {
      profileDoc = await Instructor.findOne({ userId: user._id });
    }

    // Return even if profileDoc is null (first-time edit still needs prefill from user)
    return res.json({
      ok: true,
      data: {
        user,
        profile: profileDoc,
      },
    });
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
};

/**
 * PUT /editProfile/profile
 * Body: {
 *  email, name?, dob?, occupation?, experience?, skills?[], domainInterests?[], education?[]
 * }
 * Notes:
 * - Learner: domainInterest[] (model) <= skills[] (UI) OR domainInterests[] (fallback)
 * - Instructor: skills[] (model) <= domainInterests[] (UI) OR skills[] (fallback)
 * - Instructor: experienceYears (model) <= experience (UI)
 * - Instructor: qualifications[] (model) <= education[] (UI: { degree, institution, year })
 */
exports.updateProfile = async function updateProfile(req, res) {
  try {
    const {
      email,
      name,
      dob,
      // learner-oriented from UI
      occupation,
      skills,           // UI "skills" (used by learner UI)
      domainInterests,  // UI "domainInterests" (used by instructor UI)
      experience,       // UI "experience" (string/number)
      education,        // UI "education" (array of { degree, institution, year })
    } = req.body ?? {};

    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email: (email ?? '').trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // Update top-level user fields (name, dob)
    if (typeof name === 'string') user.name = name;
    if (dob) {
      const parsed = new Date(dob);
      if (!isNaN(parsed.getTime())) user.dob = parsed;
    }
    await user.save();

    let profileDoc = null;

    if (user.role === 'learner') {
      // LearnerModel supports: occupation (string), domainInterest (string[])
      const learnerUpdate = {};
      if (typeof occupation === 'string') learnerUpdate.occupation = occupation;

      // Map UI "skills" -> model "domainInterest"
      const learnerInterests = Array.isArray(skills)
        ? skills
        : Array.isArray(domainInterests)
        ? domainInterests
        : undefined;
      if (learnerInterests) learnerUpdate.domainInterest = learnerInterests;

      profileDoc = await Learner.findOneAndUpdate(
        { userId: user._id },
        { $set: learnerUpdate, $setOnInsert: { userId: user._id } },
        { new: true, upsert: true }
      );
    } else if (user.role === 'instructor') {
      // InstructorModel supports: experienceYears (number), skills (string[])
      const instructorUpdate = {};

      if (experience !== undefined) {
        const v = Number(experience);
        instructorUpdate.experienceYears = Number.isFinite(v) && v >= 0 ? v : 0;
      }

      // Map UI "domainInterests" -> model "skills"
      const instructorSkills = Array.isArray(domainInterests)
        ? domainInterests
        : Array.isArray(skills)
        ? skills
        : undefined;
      if (instructorSkills) instructorUpdate.skills = instructorSkills;

      // Map UI "education" -> model "qualifications"
      if (Array.isArray(education)) {
        const sanitized = education
          .filter((q) => q && typeof q === 'object')
          .map((q) => ({
            degree: (q.degree ?? '').toString().trim(),
            institution: (q.institution ?? '').toString().trim(),
            year: (q.year ?? '').toString().trim(),
          }))
          // keep only entries where at least one field is present
          .filter((q) => q.degree || q.institution || q.year);
        instructorUpdate.qualifications = sanitized;
      }

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