// src/utils/userStorage.js

const STORAGE_KEY = "edstream_users";
const COUNTERS_KEY = "edstream_userid_counters"; // { instructor: number, learner: number }

// ---------- Sequential ID helpers ----------
function readCounters() {
    try {
        const raw = localStorage.getItem(COUNTERS_KEY);
        const obj = raw ? JSON.parse(raw) : {};
        return {
            instructor: Number.isInteger(obj?.instructor) ? obj.instructor : 0,
            learner: Number.isInteger(obj?.learner) ? obj.learner : 0,
        };
    } catch (e) {
        console.error("Failed to read userId counters:", e);
        return { instructor: 0, learner: 0 };
    }
}

function writeCounters(counters) {
    localStorage.setItem(COUNTERS_KEY, JSON.stringify(counters));
}

function roleToKey(role = "") {
    return role === "instructor" ? "instructor" : "learner";
}

function rolePrefix(role = "") {
    return role === "instructor" ? "I" : "L";
}

/**
 * Return next sequential 4-char userId for the given role.
 * - Instructor: I001..I999
 * - Learner:    L001..L999
 */
function nextSequentialId(role) {
    const key = roleToKey(role);
    const counters = readCounters();
    const next = (counters[key] ?? 0) + 1; // start at 1
    if (next > 999) {
        throw new Error(`ID space exhausted for role ${key}.`);
    }
    counters[key] = next;
    writeCounters(counters);
    return `${rolePrefix(role)}${String(next).padStart(3, "0")}`;
}

export const getUsers = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error("Failed to parse users:", e);
        return [];
    }
};

export const saveUsers = (users) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
};

/* Event emitters to keep UI in sync (Navbar listens to `session-changed`) */
const emitUserMutated = (email) => {
    try {
        window.dispatchEvent(
            new CustomEvent("users-changed", { detail: { email } }),
        );
        window.dispatchEvent(new Event("session-changed"));
    } catch {
        // noop for non-browser envs
    }
};

/* Ensure learner/instructor schema fields exist for a user object */
const ensureRoleArrays = (user) => {
    if (user.role === "learner") {
        if (!Array.isArray(user.coursesEnrolled)) user.coursesEnrolled = [];
    } else if (user.role === "instructor") {
        if (!Array.isArray(user.coursesCreated)) user.coursesCreated = [];
    }
};

/* One-time migration for existing stored users */
const migrateUsersIfNeeded = () => {
    const users = getUsers();
    let changed = false;
    for (const u of users) {
        const before = JSON.stringify(u);
        ensureRoleArrays(u);
        if (!u.createdAt) u.createdAt = new Date().toISOString();
        if (before !== JSON.stringify(u)) changed = true;
    }
    if (changed) saveUsers(users);
};
migrateUsersIfNeeded();

export const addUser = (user) => {
    const users = getUsers();
    const exists = users.some(
        (u) => u.email.toLowerCase() === (user.email || "").toLowerCase(),
    );
    if (exists) {
        return { ok: false, error: "Email is already registered." };
    }

    // Generate sequential userId
    let userId;
    try {
        userId = nextSequentialId(user.role);
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message || "Could not generate userId." };
    }

    const newUser = {
        userId,
        role: user.role, // 'learner' | 'instructor'
        name: user.name,
        email: user.email,
        password: user.password, // NOTE: plain text for demo only (dev use)
        dob: user.dob || "",
        gender: user.gender || "",
        // instructor-only
        experience:
            user.role === "instructor"
                ? Number(user.experience || 0)
                : undefined,
        skills: user.role === "instructor" ? user.skills || [] : undefined,
        // learner-only
        domainInterests:
            user.role === "learner" ? user.domainInterests || [] : undefined,
        occupation: user.role === "learner" ? user.occupation : undefined,

        // NEW: role-specific arrays
        coursesEnrolled: user.role === "learner" ? [] : undefined,
        coursesCreated: user.role === "instructor" ? [] : undefined,

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);
    emitUserMutated(newUser.email);
    return { ok: true, user: newUser };
};

export const findUser = (email) => {
    const users = getUsers();
    return users.find(
        (u) => u.email.toLowerCase() === (email || "").toLowerCase(),
    );
};

/* -------------------- Safe updaters -------------------- */

/**
 * Internal: patch a single user by email with a mutator, then save & emit.
 */
const updateUserByEmail = (email, mutator) => {
    const users = getUsers();
    const idx = users.findIndex(
        (u) => u.email.toLowerCase() === (email || "").toLowerCase(),
    );
    if (idx === -1) return { ok: false, error: "User not found." };

    // Work on a copy to avoid accidental shared mutations
    const next = { ...users[idx] };
    ensureRoleArrays(next);

    try {
        mutator(next);
    } catch (err) {
        return { ok: false, error: err?.message || "Failed to update user." };
    }

    next.updatedAt = new Date().toISOString();
    users[idx] = next;
    saveUsers(users);
    emitUserMutated(next.email);

    return { ok: true, user: next };
};

/* -------------------- Public API: Learner -------------------- */

/**
 * Enroll a learner into a course (no duplicates).
 */
export const enrollInCourse = (studentEmail, courseId) =>
    updateUserByEmail(studentEmail, (u) => {
        if (u.role !== "learner") {
            throw new Error("Only learners can enroll in courses.");
        }
        if (!courseId) {
            throw new Error("courseId is required.");
        }
        if (!u.coursesEnrolled.includes(courseId)) {
            u.coursesEnrolled.push(courseId);
        }
    });

/**
 * Unenroll a learner from a course.
 */
export const unenrollFromCourse = (studentEmail, courseId) =>
    updateUserByEmail(studentEmail, (u) => {
        if (u.role !== "learner") {
            throw new Error("Only learners can unenroll from courses.");
        }
        u.coursesEnrolled = (u.coursesEnrolled || []).filter(
            (id) => id !== courseId,
        );
    });

/* -------------------- Public API: Instructor -------------------- */

/**
 * Record a course created by an instructor (no duplicates).
 */
export const recordCourseCreated = (instructorEmail, courseId) =>
    updateUserByEmail(instructorEmail, (u) => {
        if (u.role !== "instructor") {
            throw new Error("Only instructors can create courses.");
        }
        if (!courseId) {
            throw new Error("courseId is required.");
        }
        if (!u.coursesCreated.includes(courseId)) {
            u.coursesCreated.push(courseId);
        }
    });

/**
 * Remove a course from the instructor's created list.
 * (Use when a course is deleted or ownership changes.)
 */
export const removeCourseCreated = (instructorEmail, courseId) =>
    updateUserByEmail(instructorEmail, (u) => {
        if (u.role !== "instructor") {
            throw new Error("Only instructors can remove created courses.");
        }
        u.coursesCreated = (u.coursesCreated || []).filter(
            (id) => id !== courseId,
        );
    });
