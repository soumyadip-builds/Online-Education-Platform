
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ForumPost from '../components/ForumPost';
import {
  getAllData, getUsers, getCourses, getCurrentUser, setCurrentUser,
  listPosts, addPost, addReply, listNotifications, markNotificationRead,
  subscribe
} from '../services/communicationService';
import "../styles/forum-post.css";

export default function ForumPage() {
  const [users, setUsers] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [courses, setCourses] = useState([]);
  const [currentUser, setUser] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [posts, setPosts] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const toastContainerRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [u, c, cu] = await Promise.all([getUsers(), getCourses(), getCurrentUser()]);
      setUsers(u);
      setUsersById(Object.fromEntries(u.map(x => [x.userId, x])));
      setCourses(c);
      setUser(cu);
      setCourseId(c[0]?.courseId || '');
    })();

    const unsubscribe = subscribe(async () => {
      if (currentUser) {
        const notifs = await listNotifications(currentUser.userId);
        setNotifications(notifs);
      }
      if (courseId) {
        const p = await listPosts(courseId);
        setPosts(p);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      const p = await listPosts(courseId);
      setPosts(p);
    })();
  }, [courseId]);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const notifs = await listNotifications(currentUser.userId);
      setNotifications(notifs);
      // show toast for latest unread
      const unread = notifs.filter(n => !n.read);
      if (unread.length > 0) showToast(unread[0]);
    })();
  }, [currentUser]);

  function showToast(n) {
    if (!toastContainerRef.current) return;
    // Create toast element
    const wrapper = document.createElement('div');
    wrapper.className = 'toast align-items-center text-bg-dark border-0';
    wrapper.setAttribute('role', 'alert');
    wrapper.setAttribute('aria-live', 'assertive');
    wrapper.setAttribute('aria-atomic', 'true');

    wrapper.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <span class="badge bg-warning text-dark me-2">${n.type}</span>
          ${n.message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;

    toastContainerRef.current.appendChild(wrapper);
    // eslint-disable-next-line no-undef
    const toast = new bootstrap.Toast(wrapper, { delay: 4000 });
    toast.show();
    toast._element.addEventListener('hidden.bs.toast', () => {
      wrapper.remove();
    });
  }

  const onSendPost = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !courseId || !currentUser) return;
    const p = await addPost({ courseId, userId: currentUser.userId, message: newMessage.trim() });
    setNewMessage('');
    const updated = await listPosts(courseId);
    setPosts(updated);

    // After adding, refresh notifications for current user (instructor won't receive themselves)
    const notifs = await listNotifications(currentUser.userId);
    setNotifications(notifs);
  };

  const onReply = async (postId, message) => {
    await addReply({ postId, userId: currentUser.userId, message });
    const updated = await listPosts(courseId);
    setPosts(updated);
  };

  const onSwitchUser = async (e) => {
    const id = e.target.value;
    await setCurrentUser(id);
    const cu = await getCurrentUser();
    setUser(cu);
    const notifs = await listNotifications(cu.userId);
    setNotifications(notifs);
  };

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const markAllRead = async () => {
    for (const n of notifications.filter(n => !n.read)) {
      await markNotificationRead(n.notificationId);
    }
    const refreshed = await listNotifications(currentUser.userId);
    setNotifications(refreshed);
  };

  return (
    <div className="container py-4">
      {/* Toast container */}
      <div className="toast-container position-fixed bottom-0 end-0 p-3" ref={toastContainerRef}></div>

      {/* Top bar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3">
        <h3 className="mb-2 mb-md-0">Course Forum</h3>

        <div className="d-flex gap-2">
          {/* User switcher (simulate login) */}
          <select className="form-select" style={{width: '220px'}} value={currentUser?.userId || ''} onChange={onSwitchUser}>
            {users.map(u => (
              <option key={u.userId} value={u.userId}>{u.name} ({u.role})</option>
            ))}
          </select>

          {/* Notifications dropdown */}
          <div className="dropdown">
            <button className="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" type="button">
              Notifications {unreadCount > 0 && <span className="badge bg-danger ms-1">{unreadCount}</span>}
            </button>
            <ul className="dropdown-menu dropdown-menu-end" style={{width: '360px', maxHeight: '60vh', overflowY: 'auto'}}>
              {notifications.length === 0 && <li className="dropdown-item text-muted">No notifications</li>}
              {notifications.map(n => (
                <li key={n.notificationId} className="dropdown-item small">
                  <div className="d-flex justify-content-between">
                    <span><span className="badge bg-warning text-dark me-2">{n.type}</span>{n.message}</span>
                    {!n.read && <span className="badge bg-primary">new</span>}
                  </div>
                </li>
              ))}
              {notifications.length > 0 && (
                <li><hr className="dropdown-divider" /></li>
              )}
              {notifications.length > 0 && (
                <li><button className="dropdown-item text-primary" onClick={markAllRead}>Mark all as read</button></li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row g-3 align-items-end mb-3">
        <div className="col-sm-6 col-md-4">
          <label className="form-label">Course</label>
          <select className="form-select" value={courseId} onChange={e => setCourseId(e.target.value)}>
            {courses.map(c => <option key={c.courseId} value={c.courseId}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* New Post */}
      <div className="card mb-4">
        <div className="card-header bg-light">New Message</div>
        <div className="card-body">
          <form onSubmit={onSendPost}>
            <div className="mb-2">
              <textarea
                className="form-control"
                rows="3"
                placeholder="Share something with your course (tip: add [Announcement], [Assignment Due], or [New Course] to trigger notifications)"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
              />
            </div>
            <button className="btn btn-primary">Post</button>
          </form>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 && <div className="text-muted">No messages yet. Be the first to post!</div>}
      {posts.map(p => (
        <ForumPost key={p.postId} post={p} usersById={usersById} onReply={onReply} />
      ))}
    </div>
  );
}
