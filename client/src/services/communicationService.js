// client/src/services/communicationService.js
// Forum service that uses MongoDB via REST API instead of localStorage

const API_BASE = 'http://localhost:8000/edstream/forum';

// Helper to get auth headers
function getAuthHeader() {
	const token =
		localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
	return token ? { Authorization: `Bearer ${token}` } : {};
}

// Generate UUID-like ID (fallback for client)
function generateId() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

// ==================== USER FUNCTIONS ====================

// Get all forum users
export async function getUsers() {
	try {
		const response = await fetch(`${API_BASE}/users`, {
			headers: {
				'Content-Type': 'application/json',
				...getAuthHeader(),
			},
			credentials: 'include',
		});
		const data = await response.json();
		return Array.isArray(data) ? data : [];
	} catch (err) {
		console.error('getUsers error:', err);
		return [];
	}
}

// Get courses (for forum - uses existing course API)
export async function getCourses() {
	try {
		const response = await fetch('http://localhost:8000/edstream/courses?scope=all', {
			headers: {
				'Content-Type': 'application/json',
				...getAuthHeader(),
			},
			credentials: 'include',
		});
		const data = await response.json();
		return data?.data || [];
	} catch (err) {
		console.error('getCourses error:', err);
		return [];
	}
}

// ==================== POST FUNCTIONS ====================

// Get posts for a course (or all courses if no courseId provided)
export async function listPosts(courseId) {
	try {
		const url = courseId
			? `${API_BASE}/posts?courseId=${encodeURIComponent(courseId)}`
			: `${API_BASE}/posts`;

		const response = await fetch(url, {
			headers: {
				'Content-Type': 'application/json',
				...getAuthHeader(),
			},
			credentials: 'include',
		});
		const posts = await response.json();

		// Sort by timestamp descending
		return Array.isArray(posts)
			? posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
			: [];
	} catch (err) {
		console.error('listPosts error:', err);
		return [];
	}
}

// Create a new post
export async function addPost({ courseId, userId, message }) {
	try {
		const response = await fetch(`${API_BASE}/posts`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...getAuthHeader(),
			},
			credentials: 'include',
			body: JSON.stringify({ courseId, userId, message }),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to create post');
		}

		return await response.json();
	} catch (err) {
		console.error('addPost error:', err);
		throw err;
	}
}

// ==================== REPLY FUNCTIONS ====================

// Add a reply to a post
export async function addReply({ postId, userId, message }) {
	try {
		const response = await fetch(`${API_BASE}/posts/${postId}/replies`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...getAuthHeader(),
			},
			credentials: 'include',
			body: JSON.stringify({ userId, message }),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to add reply');
		}

		return await response.json();
	} catch (err) {
		console.error('addReply error:', err);
		throw err;
	}
}

// ==================== NOTIFICATION FUNCTIONS ====================

// Get notifications for a user
export async function listNotifications(userId) {
	try {
		const response = await fetch(
			`${API_BASE}/notifications?userId=${encodeURIComponent(userId)}`,
			{
				headers: {
					'Content-Type': 'application/json',
					...getAuthHeader(),
				},
				credentials: 'include',
			},
		);
		const notifications = await response.json();

		// Sort by timestamp descending
		return Array.isArray(notifications)
			? notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
			: [];
	} catch (err) {
		console.error('listNotifications error:', err);
		return [];
	}
}

// Mark a notification as read
export async function markNotificationRead(notificationId) {
	try {
		const response = await fetch(`${API_BASE}/notifications/${notificationId}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				...getAuthHeader(),
			},
			credentials: 'include',
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to mark notification as read');
		}

		return await response.json();
	} catch (err) {
		console.error('markNotificationRead error:', err);
		throw err;
	}
}

// Notify about course enrollment
export async function notifyCourseEnrollment({
	courseId,
	courseTitle,
	learnerEmail,
	learnerName,
	learnerUserId,
}) {
	try {
		const response = await fetch(`${API_BASE}/notifications/enrollment`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...getAuthHeader(),
			},
			credentials: 'include',
			body: JSON.stringify({
				courseId,
				courseTitle,
				learnerEmail,
				learnerName,
				learnerUserId,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to send enrollment notification');
		}

		return await response.json();
	} catch (err) {
		console.error('notifyCourseEnrollment error:', err);
		throw err;
	}
}

// ==================== SUBSCRIBE FUNCTION ====================

// Subscribe to updates (polling-based for now)
const subscribers = new Set();
let pollInterval = null;

export function subscribe(callback) {
	subscribers.add(callback);

	// Start polling if not already running
	if (!pollInterval) {
		pollInterval = setInterval(() => {
			subscribers.forEach((cb) => cb());
		}, 5000); // Poll every 5 seconds
	}

	return () => {
		subscribers.delete(callback);
		// Stop polling if no subscribers left
		if (subscribers.size === 0 && pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	};
}

// ==================== LEGACY FUNCTIONS (for compatibility) ====================

export async function getAllData() {
	try {
		const response = await fetch(`${API_BASE}/data`, {
			headers: {
				'Content-Type': 'application/json',
				...getAuthHeader(),
			},
			credentials: 'include',
		});
		return await response.json();
	} catch (err) {
		console.error('getAllData error:', err);
		return { users: [], forumPosts: [], notifications: [] };
	}
}

export async function getCurrentUser() {
	// This would need to be implemented based on the current session
	return null;
}

export async function setCurrentUser(userId) {
	// This can be handled differently in the new API
	console.log('setCurrentUser called with:', userId);
}
