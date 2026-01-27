
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
  getAllData,
} from '../services/communicationService';
import { getCurrentUser as getSessionUser, getUserByEmail } from '../utils/session';
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
    () => Object.fromEntries((serviceUsers || []).map(u => [u.userId, u])),
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
        <div class="toast-body"><strong>${n.type}:</strong> ${n.message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>`;
    toastContainerRef.current.appendChild(wrapper);
    // eslint-disable-next-line no-undef
    const toast = new bootstrap.Toast(wrapper, { delay: 4000 });
    toast.show();
    toast._element.addEventListener('hidden.bs.toast', () => wrapper.remove());
  }

  // ------- fetch helpers -------
  async function fetchJsonSafe(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${url}`);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/json')) {
      const text = await res.text();
      const preview = text.slice(0, 60).replace(/\s+/g, ' ');
      throw new Error(`Expected JSON but got "${preview}..." from ${url}`);
    }
    return res.json();
  }

  // ------- SEED: push QnA items into forum if missing -------
  async function seedForumFromQnA(qna) {
    try {
      if (!Array.isArray(qna) || qna.length === 0) return;

      // Optional one-time guard to avoid repeated checks
      if (localStorage.getItem(SEED_FLAG_KEY) === 'true') return;

      const emailToId = Object.fromEntries(
        (await getUsers()).map(u => [(u.email || '').toLowerCase(), u.userId])
      );

      // Cache existing posts by courseId to reduce listPosts calls
      const perCourseExisting = new Map();

      for (const q of qna) {
        const cId = q.courseId;
        if (!perCourseExisting.has(cId)) {
          const existing = await listPosts(cId);
          perCourseExisting.set(
            cId,
            new Set((existing || []).map(p => `${cId}::${(p.message || '').trim()}`))
          );
        }
        const key = `${cId}::${(q.message || '').trim()}`;
        const existingSet = perCourseExisting.get(cId);

        if (!existingSet.has(key)) {
          const uid = (q.askedByEmail && emailToId[q.askedByEmail.toLowerCase()]) || null;
          await addPost({ courseId: cId, userId: uid, message: q.message });
          existingSet.add(key);
        }
      }

      localStorage.setItem(SEED_FLAG_KEY, 'true');
      // Ask listeners to refresh
      window.dispatchEvent(new StorageEvent('storage', { key: 'forumData.v1' }));
    } catch (e) {
      // Non-fatal: just log to console to avoid blocking the page
      console.warn('[Forum seed] Skipped:', e?.message || e);
    }
  }

  // ------- initial public data fetch -------
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
        if (alive) setDataError(e.message || 'Failed to load forum data');
      } finally {
        if (alive) setLoadingData(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ------- session → service user mapping -------
  useEffect(() => {
    (async () => {
      const sessionUser = getSessionUser(); // { role, name, email, ... }
      setCurrentSessionUser(sessionUser);

      const svcUsers = await getUsers();
      setServiceUsers(svcUsers);

      const svcUser = svcUsers.find(
        (u) => (u.email || '').toLowerCase() === (sessionUser?.email || '').toLowerCase()
      );
      setCurrentServiceUser(svcUser || null);
    })();
  }, []);

  // ------- compute courseOptions by role (using courseDetails) -------
  useEffect(() => {
    if (!currentSessionUser || courseDetails.length === 0) return;

    if ((currentSessionUser.role || '').toLowerCase() === 'instructor'
      || (currentSessionUser.role || '').toLowerCase() === 'mentor') {
      const authored = courseDetails.filter(c => c.author === currentSessionUser.name);
      setCourseOptions(authored);
      setCourseId(prev => prev || authored[0]?.id || '');
    } else if ((currentSessionUser.role || '').toLowerCase() === 'learner'
      || (currentSessionUser.role || '').toLowerCase() === 'student') {
      const full = getUserByEmail(currentSessionUser.email);
      const ids = full?.enrolledCourseIds || [];
      const enrolled = courseDetails.filter(c => ids.includes(c.id));
      setCourseOptions(enrolled);
      setCourseId(prev => prev || enrolled[0]?.id || '');
    } else {
      setCourseOptions([]);
      setCourseId('');
    }
  }, [currentSessionUser, courseDetails]);

  // ------- subscribe for updates (notifications + posts) -------
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

  // ------- notifications for current user -------
  useEffect(() => {
    (async () => {
      if (!currentServiceUser?.userId) return;
      const notifs = await listNotifications(currentServiceUser.userId);
      setNotifications(notifs);
      const unread = notifs.filter(n => !n.read);
      if (unread.length > 0) showToast(unread[0]);
    })();
  }, [currentServiceUser?.userId]);

  // ------- SEED FORUM FROM QnA (once) THEN load posts for current course -------
  useEffect(() => {
    (async () => {
      if (qnaSeed.length === 0) return;
      // Seed everything first (deduped + one-time flag)
      await seedForumFromQnA(qnaSeed);
      // Then load posts for the selected course (if any is selected later)
      if (courseId) {
        const p = await listPosts(courseId);
        setPosts(p);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qnaSeed]);

  // ------- load posts on course change -------
  useEffect(() => {
    (async () => {
      if (!courseId) return;
      const p = await listPosts(courseId);
      setPosts(p);
    })();
  }, [courseId]);

  // ------- actions -------
  const canPost = Boolean(newMessage.trim() && courseId && currentServiceUser?.userId);

  const onSendPost = async (e) => {
    e.preventDefault();
    setPostError('');

    if (!currentServiceUser?.userId) {
      setPostError('No forum user found for the signed-in email. Check /data/forum.json → users[].email.');
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
      setPostError(err?.message || 'Failed to post. Please try again.');
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

  // ------- UI -------
  if (loadingData) {
    return (
      <div className="container py-5">
        <div className="alert alert-light border">Loading forum data…</div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">Error: {dataError}</div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Toast container */}
      <div ref={toastContainerRef} className="toast-container position-fixed bottom-0 end-0 p-3" />

      {/* Top bar */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="m-0">Course Forum</h4>

        {/* current user (auto from session.js) */}
        <div className="text-end small">
          <div><strong>User:</strong> {currentSessionUser?.name} ({currentSessionUser?.role})</div>
          <div className="text-muted">{currentSessionUser?.email}</div>
        </div>

        {/* Notifications dropdown (ForumPage only) */}
        <div className="dropdown ms-3">
          <button
            className="btn btn-outline-secondary dropdown-toggle position-relative"
            data-bs-toggle="dropdown"
          >
            Notifications
            {unreadCount > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {unreadCount}
              </span>
            )}
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            {notifications.length === 0 && (
              <li className="dropdown-item text-muted">No notifications</li>
            )}
            {notifications.map((n) => (
              <li key={n.notificationId} className="dropdown-item">
                <span className="badge bg-primary me-1">{n.type}</span>
                {n.message} {!n.read && <span className="badge bg-warning ms-1">new</span>}
              </li>
            ))}
            {notifications.length > 0 && <li><hr className="dropdown-divider" /></li>}
            {notifications.length > 0 && (
              <li><button className="dropdown-item" onClick={markAllRead}>Mark all as read</button></li>
            )}
          </ul>
        </div>
      </div>

      {/* Filters */}
      <div className="row g-2 align-items-center mb-3">
        <div className="col-auto"><label className="col-form-label">Course</label></div>
        <div className="col-auto">
          <select
            className="form-select"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            {courseOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* New Post */}
      <form onSubmit={onSendPost} className="mb-3">
        <label className="form-label">New Message</label>
        <textarea
          className="form-control"
          rows={3}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Ask a question or start a discussion..."
        />
        {postError && <div className="text-danger small mt-2">{postError}</div>}
        {!currentServiceUser?.userId && (
          <div className="text-warning small mt-2">
            Tip: Add a user with your session email to <code>/data/forum.json</code> → <code>users[]</code>.
          </div>
        )}
        {!courseId && (
          <div className="text-warning small mt-2">
            No course available/selected. Instructors see authored; learners see enrolled.
          </div>
        )}
        <div className="mt-2">
          <button type="submit" className="btn btn-primary" disabled={!canPost}>
            Post
          </button>
        </div>
      </form>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="text-muted">No messages yet. Be the first to post!</div>
      ) : (
        posts.map((p) => (
          <ForumPost key={p.postId} post={p} usersById={usersById} onReply={onReply} />
        ))
      )}
    </div>
  );
}
