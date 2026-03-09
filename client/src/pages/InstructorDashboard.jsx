// src/pages/InstructorDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/instructorMetrics.css";
import {
    getAuthUser,
    isAuthed,
    subscribeAuth,
    getAuthHeader,
} from "../lib/authLocal";

/**
 * API payload shape (GET /api/instructor/:id/dashboard):
 * {
 *   courses: [{ _id, title }],
 *   learnersByCourse: { [courseId]: [{ userId, name, email }] },
 *   metrics: {
 *     [courseId]: {
 *       totals: { assignments: number, quizzes: number, trackable: number },
 *       byStudent: {
 *         [userId]: {
 *           assignmentsCompleted: number,
 *           quizzesCompleted: number,
 *           items: {
 *             assignments: [{ assignmentId, status, score, submittedAt, fileName, link, fileUrl }],
 *             quizzes: [{ quizId, passed, score, maxScore, submittedAt }]
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 */

const API_BASE = "http://localhost:8000/edstream"; // e.g., "http://localhost:4000"

const normalize = (v) => (v ?? "").toString().trim().toLowerCase();

export default function InstructorDashboard() {
    const navigate = useNavigate();
    const [me, setMe] = useState(getAuthUser());
    const isInstructor = normalize(me?.role) === "instructor";

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [courses, setCourses] = useState([]);
    const [learnersByCourse, setLearnersByCourse] = useState({});
    const [metrics, setMetrics] = useState({});
    const [selectedCourseId, setSelectedCourseId] = useState("");

    // Guard
    useEffect(() => {
        if (!isAuthed()) {
            navigate("/auth", { replace: true });
            return;
        }
        if (normalize(getAuthUser()?.role) !== "instructor") {
            navigate("/not-authorized", { replace: true });
        }
    }, [navigate]);

    // Keep me in sync with login/logout
    useEffect(() => {
        const unsub = subscribeAuth(setMe);
        return () => unsub?.();
    }, []);

    // Fetch dashboard data for the instructor
    useEffect(() => {
        const instructorId = me?._id; // from auth_user (localStorage)
        if (!instructorId) return;

        let alive = true;
        (async () => {
            try {
                setLoading(true);
                setErr("");

                const res = await fetch(
                    `${API_BASE}/instructorDashboard/${instructorId}/dashboard`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            ...getAuthHeader(),
                        },
                        credentials: "include", // optional when using cookies
                    },
                );

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(
                        `Failed to load dashboard (${res.status}): ${text || res.statusText}`,
                    );
                }

                const data = await res.json();
                if (!alive) return;

                setCourses(Array.isArray(data.courses) ? data.courses : []);
                console.log("Inside Instructor Dashboard: ", data);
                setLearnersByCourse(data.learnersByCourse || {});
                setMetrics(data.metrics || {});

                if (!selectedCourseId && data.courses?.length) {
                    setSelectedCourseId(data.courses[0]._id);
                }
            } catch (e) {
                if (!alive) return;
                setErr(e?.message || "Failed to load instructor dashboard.");
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [me?._id]);

    const backPath = isInstructor ? "/instructor-home" : "/";

    const enrolledStudents = useMemo(() => {
        if (!selectedCourseId) return [];
        return (learnersByCourse[selectedCourseId] || []).sort((a, b) =>
            (a.name ?? "").localeCompare(b.name ?? ""),
        );
    }, [learnersByCourse, selectedCourseId]);

    const totals = metrics?.[selectedCourseId]?.totals || {
        assignments: 0,
        quizzes: 0,
        trackable: 0,
    };

    const studentRows = useMemo(() => {
        const byStudent = metrics?.[selectedCourseId]?.byStudent || {};
        const totalTrackable = totals.trackable;

        return enrolledStudents.map((s) => {
            const m = byStudent[s.userId] || {
                assignmentsCompleted: 0,
                quizzesCompleted: 0,
                items: { assignments: [], quizzes: [] },
            };
            const completedTrackable =
                (m.assignmentsCompleted || 0) + (m.quizzesCompleted || 0);
            const pct =
                totalTrackable === 0
                    ? 0
                    : Math.round((completedTrackable / totalTrackable) * 100);

            // Calculate average quiz score from quiz submissions
            const quizItems = m.items?.quizzes || [];
            let averageQuizScore = 0;
            if (quizItems.length > 0) {
                const totalScore = quizItems.reduce(
                    (sum, q) => sum + (q.score || 0),
                    0,
                );
                averageQuizScore =
                    Math.round((totalScore / quizItems.length) * 10) / 10; // Round to 1 decimal
            }

            return {
                ...s,
                completedAssignments: m.assignmentsCompleted || 0,
                totalAssignments: totals.assignments || 0,
                assignmentsDue: Math.max(
                    0,
                    (totals.assignments || 0) - (m.assignmentsCompleted || 0),
                ),
                completedQuizzes: m.quizzesCompleted || 0,
                totalQuizzes: totals.quizzes || 0,
                averageQuizScore,
                completedTrackable,
                totalTrackable,
                pct,
            };
        });
    }, [enrolledStudents, metrics, selectedCourseId, totals]);

    if (loading) {
        return (
            <div className="im-page">
                <div className="im-card">
                    <h2 className="im-title">Instructor Dashboard</h2>
                    <p className="im-muted">Loading…</p>
                </div>
            </div>
        );
    }

    if (err) {
        return (
            <div className="im-page">
                <div className="im-card">
                    <h2 className="im-title">Instructor Dashboard</h2>
                    <p className="im-alert im-alert--err">{err}</p>
                    <Link className="im-link" to={backPath}>
                        ← Back
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="im-page">
            <div className="im-card">
                <div className="im-header">
                    <div>
                        <h2 className="im-title">Instructor Dashboard</h2>
                        <div className="im-muted" style={{ marginTop: 4 }}>
                            Signed in as <b>{me?.name}</b> ({me?.email})
                        </div>
                    </div>
                    <Link className="im-link" to={backPath}>
                        ← Back
                    </Link>
                </div>

                {/* Courses */}
                <div style={{ marginTop: 16 }}>
                    <div className="im-sectionTitle">My Courses</div>
                    {courses.length === 0 ? (
                        <div className="im-empty">
                            <p className="im-muted">
                                No courses found for you.
                            </p>
                            <p className="im-muted">
                                Create a course to see learner progress here.
                            </p>
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                gap: 14,
                                flexWrap: "wrap",
                                alignItems: "center",
                            }}
                        >
                            <label
                                className="im-muted"
                                style={{ fontWeight: 600 }}
                            >
                                Select Course:
                            </label>
                            <select
                                value={selectedCourseId}
                                onChange={(e) =>
                                    setSelectedCourseId(e.target.value)
                                }
                                style={{
                                    height: 40,
                                    borderRadius: 10,
                                    padding: "0 12px",
                                    border: "1px solid #e5e7eb",
                                    minWidth: 280,
                                }}
                            >
                                {courses.map((c) => (
                                    <option key={c._id} value={c._id}>
                                        {c.title}
                                    </option>
                                ))}
                            </select>
                            <div className="im-muted">
                                Trackables: <b>{totals.assignments}</b>{" "}
                                assignments + <b>{totals.quizzes}</b> quizzes
                            </div>
                        </div>
                    )}
                </div>

                {/* Enrolled Students & Progress */}
                {selectedCourseId && (
                    <div style={{ marginTop: 20 }}>
                        <div className="im-sectionTitle">
                            Enrolled Students & Progress
                        </div>
                        {enrolledStudents.length === 0 ? (
                            <div className="im-empty">
                                <p className="im-muted">
                                    No students enrolled in this course yet.
                                </p>
                            </div>
                        ) : (
                            <div style={{ marginTop: 10 }}>
                                <div style={{ overflowX: "auto" }}>
                                    <table
                                        style={{
                                            width: "100%",
                                            borderCollapse: "collapse",
                                        }}
                                    >
                                        <thead>
                                            <tr
                                                style={{
                                                    textAlign: "left",
                                                    borderBottom:
                                                        "1px solid #e5e7eb",
                                                }}
                                            >
                                                <th
                                                    style={{
                                                        padding: "10px 8px",
                                                    }}
                                                >
                                                    Student
                                                </th>
                                                <th
                                                    style={{
                                                        padding: "10px 8px",
                                                    }}
                                                >
                                                    Email
                                                </th>
                                                <th
                                                    style={{
                                                        padding: "10px 8px",
                                                        width: 160,
                                                    }}
                                                >
                                                    Progress
                                                </th>
                                                <th
                                                    style={{
                                                        padding: "10px 8px",
                                                    }}
                                                >
                                                    Completed
                                                </th>
                                                <th
                                                    style={{
                                                        padding: "10px 8px",
                                                    }}
                                                >
                                                    Quizzes
                                                </th>
                                                <th
                                                    style={{
                                                        padding: "10px 8px",
                                                    }}
                                                >
                                                    Avg Quiz Score
                                                </th>
                                                <th
                                                    style={{
                                                        padding: "10px 8px",
                                                    }}
                                                >
                                                    Assignments
                                                </th>
                                                <th
                                                    style={{
                                                        padding: "10px 8px",
                                                    }}
                                                >
                                                    Assignments Due
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentRows.map((row) => (
                                                <tr
                                                    key={row.userId}
                                                    style={{
                                                        borderBottom:
                                                            "1px solid #f1f5f9",
                                                    }}
                                                >
                                                    <td
                                                        style={{
                                                            padding: "10px 8px",
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {row.name}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "10px 8px",
                                                        }}
                                                    >
                                                        {row.email}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "10px 8px",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                gap: 10,
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    height: 10,
                                                                    width: 120,
                                                                    background:
                                                                        "#eef2ff",
                                                                    borderRadius: 999,
                                                                    overflow:
                                                                        "hidden",
                                                                    border: "1px solid #e5e7eb",
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        height: "100%",
                                                                        width: `${row.pct}%`,
                                                                        background:
                                                                            "linear-gradient(90deg, #6C4BF4, #22D3EE)",
                                                                    }}
                                                                />
                                                            </div>
                                                            <div
                                                                style={{
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                {row.pct}%
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "10px 8px",
                                                        }}
                                                    >
                                                        {row.completedTrackable}
                                                        /{row.totalTrackable}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "10px 8px",
                                                        }}
                                                    >
                                                        {row.completedQuizzes}/
                                                        {row.totalQuizzes}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "10px 8px",
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {row.averageQuizScore >
                                                        0
                                                            ? row.averageQuizScore
                                                            : "-"}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "10px 8px",
                                                        }}
                                                    >
                                                        {
                                                            row.completedAssignments
                                                        }
                                                        /{row.totalAssignments}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "10px 8px",
                                                            fontWeight: 600,
                                                            color: "#6C4BF4",
                                                        }}
                                                    >
                                                        {row.assignmentsDue}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <br />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
