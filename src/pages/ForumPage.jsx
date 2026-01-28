import React, { useEffect, useMemo, useRef, useState } from 'react';
import ForumPost from '../components/ForumPost';
import {
  getUsers,
  listPosts,
  addPost,
  addReply,
  listNotifications,
  markNotificationRead,
  subscribe,
} from '../services/communicationService';
import { getCurrentUser as getSessionUser, getUserById } from '../utils/session';
import { publicUrl } from '../utils/publicUrl';
import "../styles/forum-post.css";

const SEED_FLAG_KEY = 'forum.seeded.v1';

export default function ForumPage() {
  const [serviceUsers, setServiceUsers] = useState([]);
  const [currentSessionUser, setCurrentSessionUser] = useState(null);
  const [currentServiceUser, setCurrentServiceUser] = useState(null);

  // fetched from /public/data
  const [courseDetails, setCourseDetails] = useState([]);
  const [qnaSeed, setQnaSeed] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [posts, setPosts] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [postError, setPostError] = useState('');
  const toastContainerRef = useRef(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const usersById = useMemo(
    () => Object.fromEntries((serviceUsers ?? []).map(u => [u.userId, u])),
    [serviceUsers]
  );

  function showToast(n) {
    if (!toastContainerRef.current) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'toast align-items-center text-bg-dark border-0';
    wrapper.setAttribute('role', 'alert');
    wrapper.setAttribute('aria-live', 'assertive');
    wrapper.setAttribute('aria-atomic', 'true');
    wrapper.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <strong>${n.type}</strong>: ${n.message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;
    toastContainerRef.current.appendChild(wrapper);
    // eslint-disable-next-line no-undef
    const toast = new bootstrap.Toast(wrapper, { delay: 4000 });
    toast.show();
    toast._element.addEventListener('hidden.bs.toast', () => wrapper.remove());
  }

  // ---- helpers ----
  async function fetchJsonSafe(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${url}`);
    const ct = (res.headers.get('content-type') ?? '').toLowerCase();
    if (!ct.includes('application/json')) {
      const text = await res.text();
      const preview = text.slice(0, 60).replace(/\s+/g, ' ');
      throw new Error(`Expected JSON but got "${preview}..." from ${url}`);
    }
    return res.json();
  }

  // ---- SEED: push QnA items into forum if missing (robust + attribution) ----
  async function seedForumFromQnA(qna) {
    try {
      if (!Array.isArray(qna) || qna.length === 0) return;
      if (localStorage.getItem(SEED_FLAG_KEY) === 'true') return;

      // Build maps to resolve course by ID or Title
      const titleById = Object.fromEntries((courseDetails ?? []).map(c => [c.id, (c.title ?? '').trim()]));
      const idByTitle = Object.fromEntries((courseDetails ?? []).map(c => [(c.title ?? '').trim().toLowerCase(), c.id]));
      const perCourseExisting = new Map();

      // for email → forum userId mapping
      const forumUsers = await getUsers();

      for (const q of qna) {
        // Resolve courseId by explicit id or by title
        let cId = q.courseId;
        if (!cId || !titleById[cId]) {
          const guess = idByTitle[(q.courseName ?? '').trim().toLowerCase()];
          if (guess) cId = guess;
        }
        if (!cId || !titleById[cId]) {
          console.warn('[Forum seed] Skipped QnA item — cannot resolve course:', q);
          continue;
        }

        if (!perCourseExisting.has(cId)) {
          const existing = await listPosts(cId);
          perCourseExisting.set(
            cId,
            new Set((existing ?? []).map(p => `${cId}::${(p.message ?? '').trim()}`))
          );
        }

        const key = `${cId}::${(q.message ?? '').trim()}`;
        const existingSet = perCourseExisting.get(cId);
        if (!existingSet.has(key)) {
          const askedBy = forumUsers.find(
            u => (u.email ?? '').toLowerCase() === (q.askedByEmail ?? '').toLowerCase()
          );
          await addPost({
            courseId: cId,
            userId: askedBy?.userId ?? null,   // attribute if we can; else anonymous learner
            message: q.message
          });
          existingSet.add(key);
        }
      }

      localStorage.setItem(SEED_FLAG_KEY, 'true');
      window.dispatchEvent(new StorageEvent('storage', { key: 'forumData.v1' }));
    } catch (e) {
      console.warn('[Forum seed] Skipped:', e?.message ?? e);
    }
  }

  // ---- initial data ----
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingData(true);
      setDataError(null);
      try {
        const [coursesJson, qnaJson] = await Promise.all([
          fetchJsonSafe(publicUrl('data/courseDetails.json')),
          fetchJsonSafe(publicUrl('data/qnaSeed.json')),
        ]);
        if (!alive) return;
        const courses = (Array.isArray(coursesJson) ? coursesJson : []).map((c, idx) => ({
          id: c.id ?? `c_${idx}`,
          title: c.title ?? 'Untitled Course',
          author: c.author ?? '',
        }));
        setCourseDetails(courses);
        setQnaSeed(Array.isArray(qnaJson) ? qnaJson : []);
      } catch (e) {
        if (alive) setDataError(e.message ?? 'Failed to load forum data');
      } finally {
        if (alive) setLoadingData(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ---- session → service user mapping (BY userId) ----
  useEffect(() => {
    (async () => {
      const sessionUser = getSessionUser(); // { userId, role, name, email, ... }
      setCurrentSessionUser(sessionUser);
      const svcUsers = await getUsers();
      setServiceUsers(svcUsers);

      const svcUser = svcUsers.find(u => u.userId === sessionUser?.userId);
      setCurrentServiceUser(svcUser ?? null);
    })();
  }, []);

  // ---- compute courseOptions by role (using courseDetails) ----
  useEffect(() => {
    (async () => {
      if (!currentSessionUser || courseDetails.length === 0) return;

      const role = (currentSessionUser.role ?? '').toLowerCase();

      if (role === 'instructor' || role === 'mentor') {
        // Map author name → forum userId using forum users (no schema change)
        const forumUsers = await getUsers();
        const byName = Object.fromEntries((forumUsers ?? []).map(u => [u.name, u.userId]));
        const authored = courseDetails.filter(c => byName[c.author] === currentSessionUser.userId);
        setCourseOptions(authored);
        setCourseId(prev => prev || authored[0]?.id || '');
      } else if (role === 'learner' || role === 'student') {
        // Enrolled courses by userId
        const full = getUserById(currentSessionUser.userId);
        const ids = full?.enrolledCourseIds ?? [];
        const enrolled = courseDetails.filter(c => ids.includes(c.id));
        setCourseOptions(enrolled);
        setCourseId(prev => prev || enrolled[0]?.id || '');
      } else {
        setCourseOptions([]);
        setCourseId('');
      }
    })();
  }, [currentSessionUser, courseDetails]);

  // ---- subscribe for updates ----
  useEffect(() => {
    const unsubscribe = subscribe(async () => {
      if (currentServiceUser?.userId) {
        const notifs = await listNotifications(currentServiceUser.userId);
        setNotifications(notifs);
      }
      if (courseId) {
        const p = await listPosts(courseId);
        setPosts(p);
      }
    });
    return unsubscribe;
  }, [currentServiceUser?.userId, courseId]);

  // ---- notifications for current user ----
  useEffect(() => {
    (async () => {
      if (!currentServiceUser?.userId) return;
      const notifs = await listNotifications(currentServiceUser.userId);
      setNotifications(notifs);
      const unread = notifs.filter(n => !n.read);
      if (unread.length > 0) showToast(unread[0]);
    })();
  }, [currentServiceUser?.userId]);

  // ---- seed from QnA once, then load posts for current course ----
  useEffect(() => {
    (async () => {
      if (qnaSeed.length === 0) return;
      await seedForumFromQnA(qnaSeed);
      if (courseId) {
        const p = await listPosts(courseId);
        setPosts(p);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qnaSeed]);

  // ---- load posts on course change ----
  useEffect(() => {
    (async () => {
      if (!courseId) return;
      const p = await listPosts(courseId);
      setPosts(p);
    })();
  }, [courseId]);

  // ---- actions ----
  const canPost = Boolean(newMessage.trim() && courseId && currentServiceUser?.userId);

  const onSendPost = async (e) => {
    e.preventDefault();
    setPostError('');
    if (!currentServiceUser?.userId) {
      setPostError('No forum user found for the signed-in account. Check /data/forum.json → users[].');
      return;
    }
    if (!courseId) {
      setPostError('Please select a course.');
      return;
    }
    if (!newMessage.trim()) {
      setPostError('Message cannot be empty.');
      return;
    }
    try {
      await addPost({ courseId, userId: currentServiceUser.userId, message: newMessage.trim() });
      setNewMessage('');
      const updated = await listPosts(courseId);
      setPosts(updated);
      const notifs = await listNotifications(currentServiceUser.userId);
      setNotifications(notifs);
    } catch (err) {
      setPostError(err?.message ?? 'Failed to post. Please try again.');
    }
  };

  const onReply = async (postId, message) => {
    if (!currentServiceUser?.userId) return;
    await addReply({ postId, userId: currentServiceUser.userId, message });
    const updated = await listPosts(courseId);
    setPosts(updated);
  };

  const markAllRead = async () => {
    if (!currentServiceUser?.userId) return;
    for (const n of notifications.filter(n => !n.read)) {
      await markNotificationRead(n.notificationId);
    }
    const refreshed = await listNotifications(currentServiceUser.userId);
    setNotifications(refreshed);
  };

  // ---- UI ----
  if (loadingData) {
    return (<div className="container py-5">Loading forum data…</div>);
  }
  if (dataError) {
    return (<div className="container py-5 text-danger">Error: {dataError}</div>);
  }

  return (
    <div className="container py-4">
      {/* Toast container */}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
        <div ref={toastContainerRef} />
      </div>

      {/* Top bar */}
      <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-3">
        <h5 className="mb-0">Course Forum</h5>
        <div className="d-flex flex-column">
          <div className="fw-semibold">
            User: {currentSessionUser?.name} ({currentSessionUser?.role})
          </div>
          <div className="small text-muted">{currentSessionUser?.email}</div>
        </div>

        {/* Notifications dropdown */}
        <div className="dropdown">
          <button className="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
            Notifications {unreadCount > 0 && <span className="badge bg-danger ms-2">{unreadCount}</span>}
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            {notifications.length === 0 && (
              <li className="dropdown-item text-muted">No notifications</li>
            )}
            {notifications.map((n) => (
              <li key={n.notificationId} className="dropdown-item">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="fw-semibold">{n.type}</span> {n.message} {!n.read && <span className="badge bg-primary ms-2">new</span>}
                  </div>
                  <div className="small text-muted">{new Date(n.timestamp).toLocaleString()}</div>
                </div>
              </li>
            ))}
            {notifications.length > 0 && <li><hr className="dropdown-divider" /></li>}
            {notifications.length > 0 && (
              <li>
                <button className="dropdown-item" onClick={markAllRead}>Mark all as read</button>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Filters */}
      <div className="row g-2 align-items-center mb-3">
        <div className="col-auto">
          <label className="form-label mb-0 me-2">Course</label>
        </div>
        <div className="col-auto">
          <select className="form-select" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {courseOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* New Post */}
      <div className="card mb-3">
        <div className="card-body">
          <form className="d-flex gap-2" onSubmit={onSendPost}>
            <input
              className="form-control"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask a question or start a discussion..."
            />
            <button className="btn btn-primary" type="submit" disabled={!canPost}>Post</button>
          </form>
          {postError && <div className="text-danger small mt-2">{postError}</div>}
          {!currentServiceUser?.userId && (
            <div className="text-muted small mt-2">
              Tip: Add a user with your session identity to <code>/data/forum.json → users[]</code>.
            </div>
          )}
          {!courseId && (
            <div className="text-muted small mt-2">
              No course available/selected. Instructors see authored; learners see enrolled.
            </div>
          )}
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="alert alert-light border">No messages yet. Be the first to post!</div>
      ) : (
        posts.map((p) => (
          <ForumPost key={p.postId} post={p} usersById={usersById} onReply={onReply} />
        ))
      )}
    </div>
  );
}