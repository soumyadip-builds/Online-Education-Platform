import { useEffect, useMemo, useRef, useState } from 'react';
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
import { publicUrl } from '../utils/publicUrl';
import '../styles/forum-post.css';
import { getAuthHeader } from '../lib/authLocal';

export default function ForumPage() {
	const [serviceUsers, setServiceUsers] = useState([]);
	const [currentSessionUser, setCurrentSessionUser] = useState(null);
	const [courseDetails, setCourseDetails] = useState([]);
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
		[notifications],
	);

	const usersById = useMemo(
		() => Object.fromEntries((serviceUsers ?? []).map((u) => [u.userId, u])),
		[serviceUsers],
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
          <strong>${n.type}:</strong> ${n.message}
          <div class="small opacity-75">${new Date(n.timestamp).toLocaleString()}</div>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;
		toastContainerRef.current.appendChild(wrapper);
		const toast = new bootstrap.Toast(wrapper, { delay: 4000 });
		toast.show();
		toast._element.addEventListener('hidden.bs.toast', () => wrapper.remove());
	}

	async function fetchJsonSafe(url) {
		const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
		if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${url}`);
		const ct = (res.headers.get('content-type') ?? '').toLowerCase();
		if (!ct.includes('application/json')) {
			const text = await res.text();
			const preview = text.slice(0, 60).replace(/\/s+/g, ' ');
			throw new Error(`Expected JSON but got "${preview}..." from ${url}`);
		}
		return res.json();
	}

	useEffect(() => {
		let alive = true;
		(async () => {
			setLoadingData(true);
			setDataError(null);
			try {
				const response = await fetch(
					'http://localhost:8000/edstream/courses?scope=all',
					{
						headers: {
							'Content-Type': 'application/json',
							...getAuthHeader(),
						},
					},
				);
				const resp = await response.json();

				if (!alive) return;
				const courses = Array.isArray(resp.data)
					? resp.data.map((c, idx) => ({
							id: c.id ?? `c_${idx}`,
							title: c.title ?? 'Untitled Course',
							author: c.author ?? '',
						}))
					: [];
				setCourseDetails(courses);
			} catch (e) {
				if (alive) setDataError(e.message ?? 'Failed to load forum data');
			} finally {
				if (alive) setLoadingData(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, []);

	useEffect(() => {
		(async () => {
			try {
				const token =
					localStorage.getItem('auth_token') ||
					sessionStorage.getItem('auth_token');
				if (token) {
					const payload = JSON.parse(atob(token.split('.')[1]));
					let mergedUser = { ...payload };
					if (payload.role === 'learner' && payload.sub) {
						try {
							const resp = await fetch(
								`http://localhost:8000/edstream/learners/by-user/${payload.sub}`,
								{
									headers: {
										'Content-Type': 'application/json',
										...getAuthHeader(),
									},
									credentials: 'include',
								},
							);
							const data = await resp.json();
							if (data.ok && Array.isArray(data.data?.courses)) {
								mergedUser.coursesEnrolled = data.data.courses.map(
									(c) => c.id,
								);
							}
						} catch (err) {
							console.log('Failed to fetch enrolled courses:', err);
						}
					}
					setCurrentSessionUser(mergedUser);

					const forumUserId = mergedUser.sub || mergedUser.userId;
					try {
						await fetch('http://localhost:8000/edstream/forum/users', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								...getAuthHeader(),
							},
							credentials: 'include',
							body: JSON.stringify({
								userId: forumUserId,
								name: mergedUser.name,
								email: mergedUser.email,
								role: mergedUser.role,
							}),
						});
					} catch (err) {
						console.log('Failed to upsert forum user:', err);
					}
				} else {
					setCurrentSessionUser(null);
				}
			} catch (e) {
				setCurrentSessionUser(null);
			}
			const svcUsers = await getUsers();
			setServiceUsers(svcUsers);
		})();
	}, []);

	// ---- DERIVED: service user for the current session ----
	// FIX: Use userId if available, otherwise fall back to sub (JWT uses 'sub' not 'userId')
	const currentServiceUser = useMemo(() => {
		if (!currentSessionUser || !serviceUsers?.length) return null;
		const searchId = currentSessionUser.userId || currentSessionUser.sub;
		return serviceUsers.find((u) => u.userId === searchId) ?? null;
	}, [serviceUsers, currentSessionUser]);

	useEffect(() => {
		(async () => {
			if (!currentSessionUser || courseDetails.length === 0) {
				return;
			}

			const role = (currentSessionUser.role ?? '').toLowerCase();
			if (role === 'instructor') {
				const instructorName = (currentSessionUser?.name ?? '')
					.trim()
					.toLowerCase();
				const authored = courseDetails.filter(
					(c) => (c.author ?? '').trim().toLowerCase() === instructorName,
				);
				setCourseOptions(authored);
				setCourseId((prev) =>
					authored.some((c) => c.id === prev) ? prev : (authored[0]?.id ?? ''),
				);
				if (authored.length === 0) setPosts([]);
			} else if (role === 'learner' || role === 'student') {
				const ids = currentSessionUser?.coursesEnrolled ?? [];
				const enrolled = courseDetails.filter((c) => ids.includes(c.id));
				setCourseOptions(enrolled);
				setCourseId((prev) =>
					enrolled.some((c) => c.id === prev) ? prev : (enrolled[0]?.id ?? ''),
				);
				if (enrolled.length === 0) setPosts([]);
			} else {
				setCourseOptions([]);
				setCourseId('');
				setPosts([]);
			}
		})();
	}, [currentSessionUser, courseDetails]);

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
			if (!currentServiceUser?.userId) {
				return;
			}
			const notifs = await listNotifications(currentServiceUser.userId);
			setNotifications(notifs);
			const unread = notifs.filter((n) => !n.read);
			if (unread.length > 0) showToast(unread[0]);
		})();
	}, [currentServiceUser?.userId]);

	useEffect(() => {
		(async () => {
			if (!courseId) return;
			const p = await listPosts(courseId);
			setPosts(p);
		})();
	}, [courseId]);

	const canPost = Boolean(
		newMessage.trim() &&
		courseId &&
		(currentSessionUser?.userId || currentSessionUser?.sub),
	);

	const getActiveForumUserId = () => {
		return currentSessionUser?.userId ?? currentSessionUser?.sub ?? null;
	};

	const onSendPost = async (e) => {
		e.preventDefault();
		setPostError('');

		const userId = getActiveForumUserId();

		if (!userId) {
			setPostError('No forum user found for the signed-in account.');
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
			await addPost({ courseId, userId, message: newMessage.trim() });
			setNewMessage('');
			const updated = await listPosts(courseId);
			setPosts(updated);
			const notifs = await listNotifications(userId);
			setNotifications(notifs);
		} catch (err) {
			setPostError(err?.message ?? 'Failed to post. Please try again.');
		}
	};

	const onReply = async (postId, message) => {
		setPostError('');
		const userId = getActiveForumUserId();

		if (!userId) {
			setPostError('No forum user found for the signed-in account.');
			return;
		}
		if (!message?.trim()) {
			setPostError('Reply cannot be empty.');
			return;
		}

		try {
			await addReply({ postId, userId, message: message.trim() });
			const updated = await listPosts(courseId);
			setPosts(updated);
		} catch (err) {
			setPostError(err?.message ?? 'Failed to post reply. Please try again.');
		}
	};

	const markAllRead = async () => {
		const userId = getActiveForumUserId();
		if (!userId) return;
		for (const n of notifications.filter((n) => !n.read)) {
			await markNotificationRead(n.notificationId);
		}
		const refreshed = await listNotifications(userId);
		setNotifications(refreshed);
	};

	if (loadingData) {
		return (
			<div className="container py-4">
				<div>Loading forum data…</div>
			</div>
		);
	}

	if (dataError) {
		return (
			<div className="container py-4">
				<div className="alert alert-danger">Error: {dataError}</div>
			</div>
		);
	}

	return (
		<div className="container py-4">
			<div
				className="toast-container position-fixed bottom-0 end-0 p-3"
				ref={toastContainerRef}
				style={{ zIndex: 1060 }}
			/>

			<div className="d-flex justify-content-between align-items-center mb-3">
				<div>
					<h6 className="mb-1">Course Forum</h6>
					<div className="text-muted small">
						User: {currentSessionUser?.name} ({currentSessionUser?.role})
						<br />
						<span className="opacity-75">{currentSessionUser?.email}</span>
					</div>
				</div>

				<div className="dropdown">
					<button
						className="btn btn-outline-secondary dropdown-toggle"
						type="button"
						data-bs-toggle="dropdown"
						aria-expanded="false"
					>
						Notifications{' '}
						{unreadCount > 0 && (
							<span className="badge bg-danger ms-1">{unreadCount}</span>
						)}
					</button>
					<ul className="dropdown-menu dropdown-menu-end">
						{notifications.length === 0 && (
							<li className="dropdown-item text-muted">
								- No notifications
							</li>
						)}
						{notifications.map((n) => (
							<li key={n.notificationId} className="dropdown-item">
								<div className="d-flex justify-content-between">
									<div>
										<strong>{n.type}</strong> {n.message}{' '}
										{!n.read && (
											<span className="badge bg-primary ms-1">
												new
											</span>
										)}
									</div>
									<div className="text-muted small">
										{new Date(n.timestamp).toLocaleString()}
									</div>
								</div>
							</li>
						))}
						{notifications.length > 0 && (
							<li>
								<hr className="dropdown-divider" />
							</li>
						)}
						{notifications.length > 0 && (
							<li>
								<button className="dropdown-item" onClick={markAllRead}>
									Mark all as read
								</button>
							</li>
						)}
					</ul>
				</div>
			</div>

			<div className="row g-2 align-items-center mb-3">
				<div className="col-auto">
					<label htmlFor="courseSelect" className="form-label mb-0">
						Course
					</label>
				</div>
				<div className="col">
					<select
						id="courseSelect"
						className="form-select"
						value={courseId}
						onChange={(e) => setCourseId(e.target.value)}
					>
						<option value="" disabled>
							{courseOptions.length > 0
								? 'Select a course...'
								: 'No courses available'}
						</option>
						{courseOptions.map((c) => (
							<option key={c.id} value={c.id}>
								{c.title}
							</option>
						))}
					</select>
				</div>
			</div>

			<form className="mb-3" onSubmit={onSendPost}>
				<div className="input-group">
					<input
						type="text"
						className="form-control"
						value={newMessage}
						onChange={(e) => setNewMessage(e.target.value)}
						placeholder="Ask a question or start a discussion..."
						disabled={!courseId}
					/>
					<button className="btn btn-primary" type="submit" disabled={!canPost}>
						Post
					</button>
				</div>
				{postError && <div className="text-danger small mt-2">{postError}</div>}
				{!courseId && (
					<div className="text-muted small mt-1">
						No course available/selected. Instructors see authored; learners
						see enrolled.
					</div>
				)}
			</form>

			{!posts || posts.length === 0 ? (
				<div className="text-muted">No messages yet. Be the first to post!</div>
			) : (
				posts.map((p) => (
					<ForumPost
						key={p.postId}
						post={p}
						usersById={usersById}
						onReply={onReply}
					/>
				))
			)}
		</div>
	);
}
