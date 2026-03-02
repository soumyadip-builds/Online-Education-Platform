import { useEffect, useMemo, useState } from "react";
import "../styles/editProfile.css";

// ⬅ NEW: import from authLocal.js
import {
    getAuthUser,
    createLocalSession,
    isAuthed,
    getAuthToken,
} from "../lib/authLocal";

// Resolve API base from env or fallback
const API_BASE = "http://localhost:8000/edstream";

/** Small reusable TagInput */
function TagInput({
    label,
    value = [],
    placeholder = "Type and press Enter",
    onChange,
}) {
    const [input, setInput] = useState("");

    function addTag(e) {
        if (e.key === "Enter") {
            // Prevent Enter from submitting the whole form
            e.preventDefault();

            if (input.trim()) {
                const next = Array.from(
                    new Set([...(value || []), input.trim()]),
                );
                onChange?.(next);
                setInput("");
            }
        }
    }

    function removeTag(tag) {
        const next = (value || []).filter((t) => t !== tag);
        onChange?.(next);
    }

    return (
        <div className="form-group">
            <label className="label">{label}</label>

            <div className="chip-input">
                {(value || []).map((tag) => (
                    <span
                        key={tag}
                        className="chip"
                        onClick={() => removeTag(tag)}
                    >
                        {tag}
                        <button type="button">&times;</button>
                    </span>
                ))}
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={addTag}
                    placeholder={placeholder}
                />
            </div>

            <small className="hint">
                Press Enter to add. Click a chip to remove.
            </small>
        </div>
    );
}

/** Skills input with explicit Add button */
function SkillsInput({
    label,
    value = [],
    placeholder = "Type a skill",
    onChange,
}) {
    const [input, setInput] = useState("");

    function addSkill() {
        const skill = input.trim();
        if (!skill) return;

        // prevent duplicates
        const next = Array.from(new Set([...(value || []), skill]));
        onChange?.(next);
        setInput("");
    }

    function removeSkill(skill) {
        const next = (value || []).filter((s) => s !== skill);
        onChange?.(next);
    }

    return (
        <div className="form-group">
            <label className="label">{label}</label>

            <div className="skill-add-row" style={{ display: "flex", gap: 8 }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={placeholder}
                    onKeyDown={(e) => {
                        // Optional: allow Enter to add skill, but still do NOT submit the form
                        if (e.key === "Enter") {
                            e.preventDefault();
                            addSkill();
                        }
                    }}
                />
                <button
                    type="button"
                    className="btn ghost"
                    onClick={addSkill}
                    disabled={!input.trim()}
                >
                    Add Skill
                </button>
            </div>

            <div
                className="chip-input"
                style={{ marginTop: 10 }}
                aria-label="Added skills"
            >
                {(value || []).map((skill) => (
                    <span
                        key={skill}
                        className="chip"
                        onClick={() => removeSkill(skill)}
                    >
                        {skill}
                        <button type="button">&times;</button>
                    </span>
                ))}
            </div>

            <small className="hint">
                Type a skill and click “Add Skill”. Click a chip to remove.
            </small>
        </div>
    );
}

/** Repeater for Education entries */
function EducationRepeater({ value = [], onChange }) {
    const [items, setItems] = useState(value);

    useEffect(() => setItems(value || []), [value]);

    function update(idx, field, val) {
        const next = items.map((it, i) =>
            i === idx ? { ...it, [field]: val } : it,
        );
        setItems(next);
        onChange?.(next);
    }

    function add() {
        const next = [...items, { degree: "", institution: "", year: "" }];
        setItems(next);
        onChange?.(next);
    }

    function remove(idx) {
        const next = items.filter((_, i) => i !== idx);
        setItems(next);
        onChange?.(next);
    }

    return (
        <div className="form-group">
            <label className="label">Educational Qualifications</label>

            <div className="edu-list">
                {items.length === 0 && (
                    <div className="muted">No entries yet (optional).</div>
                )}

                {items.map((row, idx) => (
                    <div className="edu-row" key={idx}>
                        <input
                            type="text"
                            placeholder="Degree / Program"
                            value={row.degree || ""}
                            onChange={(e) =>
                                update(idx, "degree", e.target.value)
                            }
                        />
                        <input
                            type="text"
                            placeholder="Institution"
                            value={row.institution || ""}
                            onChange={(e) =>
                                update(idx, "institution", e.target.value)
                            }
                        />
                        <input
                            type="text"
                            placeholder="Year (e.g., 2024)"
                            value={row.year || ""}
                            onChange={(e) =>
                                update(idx, "year", e.target.value)
                            }
                        />
                        <button
                            type="button"
                            className="btn ghost danger"
                            onClick={() => remove(idx)}
                        >
                            Remove
                        </button>
                    </div>
                ))}
            </div>

            <button type="button" className="btn ghost" onClick={add}>
                + Add Qualification
            </button>
        </div>
    );
}

/** ===========================
 *     MAIN COMPONENT
 * ========================== **/
export default function EditProfile() {
    const [loading, setLoading] = useState(true);
    const [initial, setInitial] = useState(null);
    const [alertState, setAlertState] = useState(null);

    const [form, setForm] = useState({
        name: "",
        dob: "",
        skills: [],
        occupation: "",
        experience: "",
        education: [],
        domainInterests: [],
    });

    /** ---------------------------
     *    Load the logged-in user
     * -------------------------- **/
    useEffect(() => {
        const authed = isAuthed();
        if (!authed) {
            setLoading(false);
            return;
        }

        const user = getAuthUser();

        // Build starting editable fields
        const start = {
            role: user.role,
            email: user.email,
            name: user.name || "",
            dob: user.dob || "",
            skills: Array.isArray(user.skills) ? user.skills : [],
            occupation: user.occupation || "",
            experience: user.experience ?? "",
            education: Array.isArray(user.education) ? user.education : [],
            domainInterests: Array.isArray(user.domainInterests)
                ? user.domainInterests
                : [],
        };

        setInitial(start);
        setForm(start);
        setLoading(false);
    }, []);

    const role = useMemo(() => initial?.role ?? "learner", [initial]);

    function patch(field, val) {
        setForm((prev) => ({ ...prev, [field]: val }));
    }

    function diff(original, current) {
        const out = {};
        Object.keys(current).forEach((k) => {
            if (k === "role" || k === "email") return; // immutable fields
            const a = original?.[k];
            const b = current?.[k];
            const changed =
                typeof b === "object"
                    ? JSON.stringify(a) !== JSON.stringify(b)
                    : a !== b;
            if (changed) out[k] = b;
        });
        return out;
    }

    /** ---------------------------
     *      SAVE PROFILE
     * -------------------------- **/
    async function save(e) {
        e.preventDefault();
        setAlertState(null);

        if (!initial?.email) return;

        const changes = diff(initial, form);
        if (Object.keys(changes).length === 0) {
            setAlertState({ type: "warning", message: "Nothing to update." });
            return;
        }

        // Build API payload based on current form + role
        const payload = {
            email: initial.email,
            name: form.name || undefined,
            dob: form.dob || undefined,
            // Keep UI names; server will map to model fields by role:
            ...(role === "learner"
                ? {
                      occupation: form.occupation ?? "",
                      // UI "skills" -> Learner.domainInterest
                      skills: Array.isArray(form.skills) ? form.skills : [],
                  }
                : {
                      // UI "experience" -> Instructor.experienceYears
                      experience: form.experience ?? "",
                      // UI "domainInterests" -> Instructor.skills
                      domainInterests: Array.isArray(form.domainInterests)
                          ? form.domainInterests
                          : [],
                  }),
        };

        try {
            const res = await fetch(`${API_BASE}/editProfile/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(getAuthToken()
                        ? { Authorization: `Bearer ${getAuthToken()}` }
                        : {}),
                },
                body: JSON.stringify(payload),
            });

            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body?.ok) {
                throw new Error(body?.error || "Failed to update profile.");
            }

            // Normalize the server response back into the UI shape
            const { user: serverUser, profile } = body.data || {};

            const mappedBack =
                role === "learner"
                    ? {
                          // Server model has domainInterest[]; UI expects domainInterests/skills used in Learner UI
                          occupation:
                              profile?.occupation ?? form.occupation ?? "",
                          skills: Array.isArray(profile?.domainInterest)
                              ? profile.domainInterest
                              : (form.skills ?? []),
                      }
                    : {
                          experience:
                              (profile?.experienceYears ??
                                  form.experience ??
                                  "") + "",
                          skills: Array.isArray(profile?.skills)
                              ? profile.skills
                              : [],
                          // UI has domainInterests under instructor; we map from skills so the chips stay visible
                          domainInterests: Array.isArray(profile?.skills)
                              ? profile.skills
                              : (form.domainInterests ?? []),
                      };

            const updatedUserForLocal = {
                // Keep the UI’s combined object, driven by your component
                ...initial,
                ...form,
                ...mappedBack,
                name: serverUser?.name ?? form.name,
                dob: serverUser?.dob
                    ? new Date(serverUser.dob).toISOString().slice(0, 10)
                    : form.dob || "",
                role, // unchanged
                email: initial.email,
            };

            // Persist to local auth store to keep the app state in sync
            createLocalSession({
                user: updatedUserForLocal,
                token: getAuthToken() || "valid",
            });

            setInitial(updatedUserForLocal);
            setForm(updatedUserForLocal);
            setAlertState({
                type: "success",
                message: "Profile updated successfully!",
            });
        } catch (err) {
            console.error(err);
            setAlertState({
                type: "danger",
                message: err.message || "Failed to update profile.",
            });
        }
    }

    if (loading) return <p>Loading...</p>;

    if (!initial) {
        return (
            <div>
                <h3>Edit Profile</h3>
                <p>
                    You’re not signed in. Please sign in to edit your profile.
                </p>
            </div>
        );
    }

    if (!initial) {
        return (
            <div className="edit-profile-layout">
                <div className="editcard">
                    <h2 className="title">Edit Profile</h2>
                    <p className="muted">
                        You’re not signed in. Please sign in to edit your
                        profile.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="edit-profile-layout">
            <div className="aurora-bg" />

            <form
                className="editcard"
                onSubmit={save}
                onKeyDown={(e) => {
                    // Only Save Changes should submit the form
                    if (e.key === "Enter") e.preventDefault();
                }}
            >
                <h2 className="title">
                    Edit Profile <span className="role-pill">{role}</span>
                </h2>

                {/* Bootstrap Alert */}
                {alertState && (
                    <div
                        className={`alert alert-${alertState.type} alert-dismissible fade show`}
                        role="alert"
                        style={{ marginTop: 12 }}
                    >
                        {alertState.message}
                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={() => setAlertState(null)}
                        />
                    </div>
                )}

                {/* Common fields */}
                <div className="form-group">
                    <label className="label">Name (optional)</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => patch("name", e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label className="label">Date of Birth (optional)</label>
                    <input
                        type="date"
                        value={form.dob || ""}
                        onChange={(e) => patch("dob", e.target.value)}
                    />
                </div>

                {/* Learner */}
                {role === "learner" && (
                    <>
                        <SkillsInput
                            label="Skills (optional)"
                            value={form.skills}
                            onChange={(v) => patch("skills", v)}
                        />

                        <div className="form-group">
                            <label className="label">
                                Occupation (optional)
                            </label>
                            <input
                                type="text"
                                value={form.occupation}
                                onChange={(e) =>
                                    patch("occupation", e.target.value)
                                }
                            />
                        </div>
                    </>
                )}

                {/* Instructor */}
                {role === "instructor" && (
                    <>
                        <div className="form-group">
                            <label className="label">
                                Experience (years, optional)
                            </label>
                            <input
                                type="number"
                                value={form.experience}
                                onChange={(e) =>
                                    patch("experience", e.target.value)
                                }
                            />
                        </div>

                        <EducationRepeater
                            value={form.education}
                            onChange={(v) => patch("education", v)}
                        />

                        <TagInput
                            label="Domain Interests (optional)"
                            value={form.domainInterests}
                            onChange={(v) => patch("domainInterests", v)}
                        />
                    </>
                )}

                <div className="actions">
                    <button type="submit" className="btn primary">
                        Save Changes
                    </button>
                    <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                            setForm(initial);
                            setAlertState(null);
                        }}
                    >
                        Reset
                    </button>
                </div>

                <p className="footnote muted">
                    All fields are optional — update only what you want.
                </p>
            </form>
        </div>
    );
}
