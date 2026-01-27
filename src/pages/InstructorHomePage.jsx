
import React, { useEffect, useState } from "react";
import "../styles/instructorHome.css";
import CourseCard from "../components/CourseCard";
import NavbarComponent from "../components/NavbarComponent";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/instructorHome.css';
import Footer from '../components/FooterComponent';
import { useNavigate, Link } from 'react-router-dom';
import { listPosts, addReply, subscribe } from '../services/communicationService';

// --- CHANGED: fetch helper for public assets
import { publicUrl } from '../utils/publicUrl';

// If you want to post replies to the forum backend directly from here, you can:
// import { listPosts, addReply } from '../services/communicationService';

export default function InstructorHomePage({ authorName }) {
  const navigate = useNavigate();
  // Slides using your uploaded hero images in /public/images/carousel
  const slides = [
    {
      t: 'Inspire. Guide. Transform.',
      d: 'Every lesson you craft shapes a learner’s future.',
      bg: '#0d6efd',
      rightImg: '/images/HeroSlide_1.png',
    },
    {
      t: 'Design Learning That Lasts',
      d: 'Build courses that spark curiosity and confidence.',
      bg: '#6f42c1',
      rightImg: '/images/HeroSlide_2.png',
    },
    {
      t: 'Mentors Make Momentum',
      d: 'Your guidance turns effort into excellence.',
      bg: '#198754',
      rightImg: '/images/HeroSlide_3.png',
    },
  ];

  // === Courses: now loaded via fetch from /courseDetails.json ===
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setCoursesLoading(true);
      setCoursesError(null);
      try {
        const res = await fetch('/data/courseDetails.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load courseDetails.json (${res.status})`);
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];
        const normalized = items.map((c, idx) => ({
          id: c.id ?? `c_${idx}`,
          title: c.title ?? 'Untitled Course',
          description: c.description ?? '',
          isBestseller: c.isBestseller ? true : false,
          thumbnail:
            c.thumbnail ??
            'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=60',
          learners: typeof c.learners === 'number' ? c.learners : 0,
          rating: typeof c.rating === 'number' ? c.rating : 0,
          author: c.author ?? '',
        }));
        const filtered =
          authorName && authorName.trim()
            ? normalized.filter(
                (c) => (c.author || '').toLowerCase() === authorName.toLowerCase()
              )
            : normalized;
        if (isMounted) setCourses(filtered);
      } catch (err) {
        if (isMounted) setCoursesError(err.message || 'Error loading courses');
      } finally {
        if (isMounted) setCoursesLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [authorName]);

  // Stats (computed from loaded courses)
  const totalCourses = courses.length;
  const activeStudents = courses.reduce((a, c) => a + (c.learners || 0), 0);
  const assignmentsDue = Math.max(0, Math.round(courses.length * 1.3));
  const avgQuizScore = 86;

  // ---------------------------
  // Q&A (UPDATED to fetch from /public/data)
  // ---------------------------
  const [qnaItems, setQnaItems] = useState([]);
  const [qnaLoading, setQnaLoading] = useState(true);
  const [qnaError, setQnaError] = useState(null);

  useEffect(() => {
    let alive = true;

    async function fetchJsonSafe(url) {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} while fetching ${url}`);
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.toLowerCase().includes('application/json')) {
        const text = await res.text();
        const preview = text.slice(0, 60).replace(/\s+/g, ' ');
        throw new Error(`Expected JSON but received "${preview}..." from ${url}`);
      }
      return res.json();
    }

    (async () => {
      setQnaLoading(true);
      setQnaError(null);
      try {
        const url = publicUrl('data/qnaSeed.json');
        const data = await fetchJsonSafe(url);
        if (!alive) return;
        const arr = Array.isArray(data) ? data : [];
        // Only unanswered here; ForumPage shows all
        const unanswered = arr.filter(q => (q.replies || []).length === 0);
        setQnaItems(unanswered);
      } catch (e) {
        if (alive) setQnaError(e.message || 'Failed to load Q&A');
      } finally {
        if (alive) setQnaLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  const topThreeUnanswered = qnaItems.slice(0, 3);

  const handleReply = async (q) => {
    // Optional: push reply to forum backend (uncomment if needed)
    /*
    const posts = await listPosts(q.courseId);
    const target = (posts || []).find(
      p => (p.message || '').trim() === (q.message || '').trim()
    );
    if (target) {
      await addReply({ postId: target.postId, userId: null, message: '(Answered by instructor) ...' });
    }
    */
    // Remove from the snippet immediately
    setQnaItems(prev => prev.filter(x => x.id !== q.id));
  };

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div>
      {/* <NavbarComponent /> */}
      <div className="instructor-home">
        {/* ===== HERO CAROUSEL (unchanged) ===== */}
        <div className="position-relative">
          <div id="mentorCarousel" className="carousel slide" data-bs-ride="carousel">
            <div className="carousel-inner">
              {slides.map((s, i) => (
                <div className={`carousel-item ${i === 0 ? 'active' : ''}`} key={i}>
                  <div
                    className="d-flex align-items-center justify-content-center w-100 h-70 px-3 px-md-4"
                    style={{ backgroundColor: s.bg }}
                  >
                    <div className="container">
                      <div className="row align-items-center justify-content-between g-4">
                        {/* LEFT TEXT */}
                        <div className="col-12 col-md-6 offset-md-1 text-white text-center text-md-start">
                          <h1 className="fw-semibold display-5 mb-3">{s.t}</h1>
                          <p className="lead mb-0">{s.d}</p>
                        </div>
                        {/* RIGHT IMAGE */}
                        <div className="col-12 col-md-4 d-flex justify-content-center">
                          <img src={s.rightImg} alt="Hero" className="hero-illustration-super" />
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

        {/* ===== Welcome + Stats (unchanged) ===== */}
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
                  { v: totalCourses, l: 'Courses' },
                  { v: activeStudents, l: 'Active Students' },
                  { v: assignmentsDue, l: 'Assignments Due' },
                  { v: `${avgQuizScore}%`, l: 'Avg Quiz Score' },
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

        {/* ===== Courses (unchanged) ===== */}
        <div className="py-5 bg-light border-top border-bottom">
          <div className="container">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="mb-0">Your Courses</h3>
              <button className="btn btn-primary" onClick={() => navigate('/course-creator')}>
                + Add Course
              </button>
            </div>

            {/* Loading / Error / Content */}
            {coursesLoading && <div className="alert alert-light border">Loading courses…</div>}
            {coursesError && !coursesLoading && (
              <div className="alert alert-danger">Error: {coursesError}</div>
            )}
            {!coursesLoading && !coursesError && courses.length === 0 && (
              <div className="alert alert-light border d-flex align-items-center">
                <div className="me-2">
                  {authorName ? `No courses found for "${authorName}".` : 'No courses yet.'}
                </div>
              </div>
            )}
            {!coursesLoading && !coursesError && courses.length > 0 && (
              <div className="row g-4">
                {courses.map((c) => (
                  <div key={c.id} className="col-12 col-sm-6 col-lg-4">
                    <div className="card h-100 shadow-sm border-0">
                      <CourseCard course={c} />
                    </div>
                    {/* End Inline Course Card */}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== Recent Q&A / Messages (UPDATED) ===== */}
        <div className="container py-5">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0">Recent Q&amp;A / Messages</h3>
            <Link to="/forum" className="btn btn-outline-primary btn-sm">
              Open Forum
            </Link>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              {qnaLoading ? (
                <div className="p-4 text-center text-muted">Loading Q&amp;A…</div>
              ) : qnaError ? (
                <div className="p-4 text-danger">Error: {qnaError}</div>
              ) : topThreeUnanswered.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  No pending questions. You’re all caught up!
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {topThreeUnanswered.map((q) => (
                    <li key={q.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start gap-3">
                        <div className="flex-grow-1">
                          <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                            <span className="badge bg-light text-dark">{q.askedByName}</span>
                            <span className="text-muted small">asked in</span>
                            <span className="badge bg-primary-subtle text-primary">{q.courseName}</span>
                          </div>
                          <div className="fw-semibold">{q.message}</div>

                          {/* Mentor Reply Box */}
                          <div className="mt-3">
                            <InlineReply onSubmit={() => handleReply(q)} />
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ===== Trusted by (unchanged) ===== */}
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

      </div>
      {/* <Footer /> */}
    </div>
  );
}

// Small inline reply component (kept local to this file)
function InlineReply({ onSubmit }) {
  const [txt, setTxt] = React.useState('');
  return (
    <div className="d-flex gap-2">
      <input
        className="form-control form-control-sm"
        placeholder="Write a reply…"
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
      />
      <button
        className="btn btn-sm btn-primary"
        onClick={() => { if (txt.trim()) { onSubmit(txt.trim()); setTxt(''); } }}
      >
        Reply
      </button>
    </div>
  );
}
