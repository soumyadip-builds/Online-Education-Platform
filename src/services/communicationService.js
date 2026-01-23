
import { v4 as uuid } from 'uuid';

const STORAGE_KEY = 'forumData.v1';
// const CHANNEL = new BroadcastChannel ? new BroadcastChannel('forum_channel') : null;
let CHANNEL = null;

async function ensureDataLoaded() {
  let data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    const resp = await fetch('/data/forum.json');
    const seed = await resp.json();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(data);
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (CHANNEL) CHANNEL.postMessage({ type: 'DATA_UPDATED' });
  // Also trigger storage for same-tab updates
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
}

export async function getAllData() {
  return ensureDataLoaded();
}

export async function getUsers() {
  const { users } = await ensureDataLoaded();
  return users;
}

export async function getCourses() {
  const { courses } = await ensureDataLoaded();
  return courses;
}

export async function getCurrentUser() {
  const data = await ensureDataLoaded();
  return data.users.find(u => u.userId === data.currentUserId) ?? data.users[0];
}

export async function setCurrentUser(userId) {
  const data = await ensureDataLoaded();
  data.currentUserId = userId;
  saveData(data);
}

export async function listPosts(courseId) {
  const data = await ensureDataLoaded();
  const posts = data.forumPosts
    .filter(p => !courseId || p.courseId === courseId)
    .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  return posts;
}

function inferNotificationTypeFromMessage(msg) {
  const m = msg.toLowerCase();
  if (m.includes('[assignment due]')) return 'Assignment Due';
  if (m.includes('[new course]'))    return 'New Course';
  if (m.includes('[announcement]'))  return 'Announcement';
  return null;
}

export async function addPost({ courseId, userId, message }) {
  const data = await ensureDataLoaded();
  const post = {
    postId: uuid(),
    courseId,
    userId,
    message,
    timestamp: new Date().toISOString(),
    replies: []
  };
  data.forumPosts.push(post);

  // Generate notifications if tagged
  const notifType = inferNotificationTypeFromMessage(message);
  if (notifType) {
    const usersInCourse = data.users; // In a real app, filter by enrollments
    const receivers = usersInCourse.filter(u => u.userId !== userId);
    receivers.forEach(r => {
      data.notifications.push({
        notificationId: uuid(),
        userId: r.userId,
        message: message,
        type: notifType,
        timestamp: new Date().toISOString(),
        read: false
      });
    });
  }

  saveData(data);
  return post;
}

export async function addReply({ postId, userId, message }) {
  const data = await ensureDataLoaded();
  const post = data.forumPosts.find(p => p.postId === postId);
  if (!post) throw new Error('Post not found');
  post.replies.push({
    replyId: uuid(),
    userId,
    message,
    timestamp: new Date().toISOString()
  });
  saveData(data);
}

export async function listNotifications(userId) {
  const data = await ensureDataLoaded();
  return data.notifications
    .filter(n => n.userId === userId)
    .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function markNotificationRead(notificationId) {
  const data = await ensureDataLoaded();
  const n = data.notifications.find(x => x.notificationId === notificationId);
  if (n) {
    n.read = true;
    saveData(data);
  }
}

const listeners = new Set();
export function subscribe(callback) {
  const handler = (e) => {
    if (e.key && e.key !== STORAGE_KEY) return;
    callback();
  };
  window.addEventListener('storage', handler);
  if (CHANNEL) CHANNEL.onmessage = (e) => {
    if (e?.data?.type === 'DATA_UPDATED') callback();
  };
  listeners.add(handler);
  return () => {
    window.removeEventListener('storage', handler);
    listeners.delete(handler);
    if (CHANNEL) CHANNEL.onmessage = null;
  };
}
