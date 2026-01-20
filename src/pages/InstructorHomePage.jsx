
import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "../styles/instructorHome.css";
import CourseCard from "../components/CourseCard";

export default function InstructorHomePage() {
  // Slides using your uploaded hero images in /public/images/carousel
  const slides = [
    {
      t: "Inspire. Guide. Transform.",
      d: "Every lesson you craft shapes a learner’s future.",
      bg: "#0d6efd",
      rightImg: "/images/HeroSlide_1.png",
    },
    {
      t: "Design Learning That Lasts",
      d: "Build courses that spark curiosity and confidence.",
      bg: "#6f42c1",
      rightImg: "/images/HeroSlide_2.png",
    },
    {
      t: "Mentors Make Momentum",
      d: "Your guidance turns effort into excellence.",
      bg: "#198754",
      rightImg: "/images/HeroSlide_3.png",
    },
  ];

  // Demo courses
  const [courses, setCourses] = useState([
    {
      id: "c1",
      title: "Full‑Stack Web Development",
      description: "React, Node & DBs with projects.",
      category: "Development",
      thumbnail:
        "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=60",
      learners: 182,
      rating: 4.7,
    },
    {
      id: "c2",
      title: "Data Analysis with Python",
      description: "pandas, viz & reproducible notebooks.",
      category: "Data",
      thumbnail:
        "https://images.unsplash.com/photo-1551281044-8d8e9531a4d0?auto=format&fit=crop&w=1200&q=60",
      learners: 141,
      rating: 4.6,
    },
    {
      id: "c3",
      title: "Product Thinking for Engineers",
      description: "Discover needs, prioritize, ship value.",
      category: "Product",
      thumbnail:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=60",
      learners: 97,
      rating: 4.8,
    },
  ]);

  // Stats
  const totalCourses = courses.length;
  const activeStudents = courses.reduce((a, c) => a + (c.learners || 0), 0);
  const assignmentsDue = Math.max(0, Math.round(courses.length * 1.3));
  const avgQuizScore = 86;

  // Q&A (frontend-only)
  const [qna, setQna] = useState([
    {
      id: "q1",
      q: "Difference between state and props in React?",
      course: "Full‑Stack Web Development",
      by: "Aarav",
      date: "2026-01-16T09:00:00",
      answers: [{ by: "Instructor", text: "Props are inputs; state is local data." }],
      draft: "",
    },
    {
      id: "q2",
      q: "Best way to handle missing values before plotting in pandas?",
      course: "Data Analysis with Python",
      by: "Meera",
      date: "2026-01-18T10:15:00",
      answers: [],
      draft: "",
    },
    {
      id: "q3",
      q: "How to optimize SQL joins for large tables?",
      course: "Full‑Stack Web Development",
      by: "Rahul",
      date: "2026-01-19T09:20:00",
      answers: [],
      draft: "",
    },
    {
      id: "q4",
      q: "What’s the difference between precision and recall?",
      course: "Data Analysis with Python",
      by: "Neha",
      date: "2026-01-19T18:40:00",
      answers: [],
      draft: "",
    },
  ]);

  // Q&A helpers
  const setDraft = (id, value) =>
    setQna((prev) => prev.map((q) => (q.id === id ? { ...q, draft: value } : q)));

  const post = (id) =>
    setQna((prev) =>
      prev.map((q) =>
        q.id === id && q.draft.trim()
          ? {
              ...q,
              answers: [...q.answers, { by: "Instructor", text: q.draft.trim() }],
              draft: "",
            }
          : q
      )
    );

  // Add Course Modal
  const [nc, setNc] = useState({ title: "", description: "", category: "", thumbnail: "" });
  const addCourse = () => {
    setCourses((prev) => [
      {
        id: `c_${Date.now()}`,
        title: nc.title || "Untitled Course",
        description: nc.description || "New course",
        category: nc.category || "General",
        thumbnail:
          nc.thumbnail ||
          "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=60",
        learners: 0,
        rating: 0,
      },
      ...prev,
    ]);
    setNc({ title: "", description: "", category: "", thumbnail: "" });
  };

  return (
    <div className="instructor-home">
      {/* ===== HERO CAROUSEL (solid bg, centered content, big image) ===== */}
      <div className="position-relative">
        <div id="mentorCarousel" className="carousel slide" data-bs-ride="carousel">
          <div className="carousel-inner">
            {slides.map((s, i) => (
              <div className={`carousel-item ${i === 0 ? "active" : ""}`} key={i}>
                <div
                  className="d-flex align-items-center justify-content-center w-100 h-100 px-3 px-md-4"
                  style={{ backgroundColor: s.bg }}
                >
                  <div className="container">
                    <div className="row align-items-center justify-content-between g-4">
                      {/* LEFT TEXT (pulled inward via offset) */}
                      <div className="col-12 col-md-6 offset-md-1 text-white text-center text-md-start">
                        <h1 className="fw-semibold display-5 mb-3">{s.t}</h1>
                        <p className="lead mb-0">{s.d}</p>
                      </div>

                      {/* RIGHT IMAGE (LARGE) */}
                      <div className="col-12 col-md-4 d-flex justify-content-center">
                        <img
                          src={s.rightImg}
                          alt="Hero"
                          className="hero-illustration-super"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <button
            className="btn btn-light btn-lg rounded-circle carousel-ctrl position-absolute top-50 start-0 translate-middle-y"
            type="button"
            data-bs-target="#mentorCarousel"
            data-bs-slide="prev"
            aria-label="Previous"
          >
            <i className="bi bi-chevron-left"></i>
          </button>
          <button
            className="btn btn-light btn-lg rounded-circle carousel-ctrl position-absolute top-50 end-0 translate-middle-y"
            type="button"
            data-bs-target="#mentorCarousel"
            data-bs-slide="next"
            aria-label="Next"
          >
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>

      {/* ===== Welcome + Stats ===== */}
      <div className="container py-5">
        <div className="row align-items-center gy-3">
          <div className="col-lg-5">
            <h2 className="mb-2">
              Welcome back, <span className="text-primary">Mentor</span> 👋
            </h2>
            <p className="text-muted mb-0">A quick glance at your impact and learner activity.</p>
          </div>
          <div className="col-lg-7">
            <div className="row g-3">
              {[
                { v: totalCourses, l: "Courses" },
                { v: activeStudents, l: "Active Students" },
                { v: assignmentsDue, l: "Assignments Due" },
                { v: `${avgQuizScore}%`, l: "Avg Quiz Score" },
              ].map((s, i) => (
                <div key={i} className="col-6 col-md-3">
                  <div className="card border-0 shadow-sm text-center">
                    <div className="card-body py-3">
                      <div className="fw-bold fs-5">{s.v}</div>
                      <div className="text-muted small">{s.l}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Courses ===== */}
      <div className="py-5 bg-light border-top border-bottom">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="mb-0">Your Courses</h3>
            <button className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addCourseModal">
              + Add Course
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="alert alert-light border d-flex align-items-center">
              <div className="me-2">No courses yet.</div>
              <button
                className="btn btn-sm btn-outline-primary"
                data-bs-toggle="modal"
                data-bs-target="#addCourseModal"
              >
                Create one
              </button>
            </div>
          ) : (
            <div className="row g-4">
              {courses.map((c) => (
                <div key={c.id} className="col-12 col-sm-6 col-lg-4">
                  <CourseCard course={c} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Recent Q&A / Messages (unanswered triage + answering) ===== */}
      <div className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0">Recent Q&amp;A / Messages</h3>
          <a href="/qna" className="btn btn-primary btn-sm">View Full Q&amp;A</a>
        </div>

        {(() => {
          const recentUnanswered = qna
            .filter((x) => (x.answers?.length ?? 0) === 0)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3);

          return (
            <div className="card border-0 shadow-sm">
              <div className="card-body p-0">
                {recentUnanswered.length === 0 ? (
                  <div className="p-4 text-center text-muted">
                    No pending questions. You’re all caught up!
                  </div>
                ) : (
                  <ul className="list-group list-group-flush">
                    {recentUnanswered.map((item) => (
                      <li key={item.id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start gap-3">
                          {/* Left: Student + course + question */}
                          <div className="flex-grow-1">
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                              <span className="badge bg-light text-dark">{item.by}</span>
                              <span className="text-muted small">asked in</span>
                              <span className="badge bg-primary-subtle text-primary">{item.course}</span>
                            </div>

                            <div className="fw-semibold">{item.q}</div>
                            <div className="text-muted xsmall mt-1">
                              {new Date(item.date).toLocaleString()}
                            </div>

                            {/* Mentor reply UI (frontend-only) */}
                            <div className="mt-3">
                              <textarea
                                className="form-control form-control-sm"
                                placeholder="Write your reply..."
                                rows={2}
                                value={item.draft}
                                onChange={(e) => setDraft(item.id, e.target.value)}
                              />
                              <button
                                className="btn btn-primary btn-sm mt-2"
                                disabled={!item.draft.trim()}
                                onClick={() => post(item.id)}
                                title="Frontend only"
                              >
                                Send Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer link to the full Q&A page */}
              <div className="card-footer d-flex justify-content-end">
                <a href="/qna" className="btn btn-link btn-sm text-decoration-none">
                  Go to Full Q&amp;A →
                </a>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ===== Trusted by (Bootstrap grid with 6 local logos) ===== */}
      <div className="py-5">
        <div className="container text-center">
          <p className="text-uppercase text-muted small mb-3">
            Trusted by teams and professionals from
          </p>

          <div className="bg-light border rounded-4 p-4">
            <div className="row g-4 justify-content-center align-items-center">
              <div className="col-6 col-md-2">
                <img src="/images/Logos/Citi.png" alt="Cisco" className="img-fluid" />
              </div>
              <div className="col-6 col-md-2">
                <img src="/images/Logos/Cisco.png" alt="Citi" className="img-fluid" />
              </div>
              <div className="col-6 col-md-2">
                <img src="/images/Logos/Cognizant.png" alt="Cognizant" className="img-fluid" />
              </div>
              <div className="col-6 col-md-2">
                <img src="/images/Logos/Ericsson.png" alt="Ericsson" className="img-fluid" />
              </div>
              <div className="col-6 col-md-2">
                <img src="/images/Logos/HP.png" alt="HP" className="img-fluid" />
              </div>
              <div className="col-6 col-md-2">
                <img src="/images/Logos/Samsung.png" alt="Samsung" className="img-fluid" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Add Course Modal ===== */}
      <div className="modal fade" id="addCourseModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add New Course</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Course Title</label>
                <input
                  className="form-control"
                  value={nc.title}
                  onChange={(e) => setNc({ ...nc, title: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={nc.description}
                  onChange={(e) => setNc({ ...nc, description: e.target.value })}
                />
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Category</label>
                  <input
                    className="form-control"
                    value={nc.category}
                    onChange={(e) => setNc({ ...nc, category: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Thumbnail URL</label>
                  <input
                    type="url"
                    className="form-control"
                    value={nc.thumbnail}
                    onChange={(e) => setNc({ ...nc, thumbnail: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-light" data-bs-dismiss="modal">Cancel</button>
              <button className="btn btn-primary" data-bs-dismiss="modal" onClick={addCourse}>
                Add Course
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
