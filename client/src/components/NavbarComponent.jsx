import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import edLogo from '../assets/edLogo.png';
import userLogo from '../assets/userLogo.png';
import {
	Navbar,
	Nav,
	NavDropdown,
	Form,
	FormControl,
	Button,
	Image,
	ListGroup,
} from 'react-bootstrap';
import '../styles/EdNavbar.css';
import { useNavigate } from 'react-router-dom';
// we no longer use the static COURSES list; we'll fetch courses from the backend
import { getAuthHeader } from '../lib/authLocal';

/** -------------------- Local-only auth helpers -------------------- */
/** Prefer a tiny inline set so we don't depend on utils/session anymore. */
function getAuthUser() {
	try {
		const raw = localStorage.getItem('auth_user');
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}
function getAuthToken() {
	return localStorage.getItem('auth_token') || null;
}
function isAuthed() {
	return Boolean(getAuthToken() && getAuthUser());
}
function clearLocalSession() {
	localStorage.removeItem('auth_user');
	localStorage.removeItem('auth_token');
	// notify other tabs/listeners if needed
	window.dispatchEvent(new Event('storage'));
	window.dispatchEvent(new Event('auth-changed'));
}
/** ---------------------------------------------------------------- */

const NavbarComponent = () => {
	const [auth, setAuth] = useState({ isAuthed: false, user: null });
	const navigate = useNavigate();

	// fetch course catalog for search suggestions instead of using static data
	const [courses, setCourses] = useState([]);

	useEffect(() => {
		let isMounted = true;
		const load = async () => {
			try {
				const API_BASE =
					import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/edstream';
				const res = await fetch(`${API_BASE}/courses`, {
					headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
					credentials: 'include',
				});
				if (!res.ok) throw new Error(`Failed to load courses (${res.status})`);
				const payload = await res.json();
				const items = payload?.data ?? [];
				const normalized = items.map((c) => ({
					id: c.id,
					title: c.title ?? '',
					description: c.description ?? '',
					author: c.author ?? '',
					tags: c.tags ?? [],
					level: c.level || '',
				}));
				if (isMounted) setCourses(normalized);
			} catch (err) {
				console.error('Failed to fetch courses for navbar search:', err);
			}
		};
		load();
		return () => {
			isMounted = false;
		};
	}, []);

	// Compute home route by role
	const homeFor = useCallback((user) => {
		if (!user) return '/';
		return user.role === 'instructor' ? '/instructor-home' : '/student-home';
	}, []);

	// Initialize purely from localStorage (auth_user / auth-token)
	useEffect(() => {
		setAuth({ isAuthed: isAuthed(), user: getAuthUser() });
	}, []);

	// Keep multiple tabs/windows in sync; react to any “auth” changes
	useEffect(() => {
		const refresh = () => setAuth({ isAuthed: isAuthed(), user: getAuthUser() });
		window.addEventListener('storage', refresh);
		window.addEventListener('auth-changed', refresh);
		return () => {
			window.removeEventListener('storage', refresh);
			window.removeEventListener('auth-changed', refresh);
		};
	}, []);

	// ---------------------- SEARCH: state & helpers ----------------------
	const [query, setQuery] = useState('');
	const [open, setOpen] = useState(false);
	const inputRef = useRef(null);

	const norm = (s) => (s ?? '').toString().toLowerCase().trim();

	const scoreMatch = useCallback((course, q) => {
		if (!q) return 0;
		const nQ = norm(q);
		let score = 0;
		if (norm(course.title).includes(nQ)) score += 3;
		if ((course.tags ?? []).some((t) => norm(t).includes(nQ))) score += 2;
		if (norm(course.author).includes(nQ)) score += 1;
		if (norm(course.description).includes(nQ)) score += 1;
		if (norm(course.title).startsWith(nQ)) score += 1;
		return score;
	}, []);

	const matches = useMemo(() => {
		if (!query.trim()) return [];
		// use fetched courses array (empty while loading)
		const withScores = courses
			.map((c) => ({ c, s: scoreMatch(c, query) }))
			.filter(({ s }) => s > 0)
			.sort((a, b) => b.s - a.s || a.c.title.localeCompare(b.c.title));
		return withScores.map(({ c }) => c);
	}, [query, scoreMatch, courses]);

	const topSuggestions = matches.slice(0, 6);

	const handleChange = (e) => {
		setQuery(e.target.value);
		setOpen(true);
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		const trimmed = query.trim();
		if (!trimmed) return;
		navigate(`/search?q=${encodeURIComponent(trimmed)}`, {
			state: { query: trimmed, results: matches },
		});
		setOpen(false);
	};

	const handleSuggestionClick = (courseId) => {
		navigate(`/courses/${courseId}`);
		setOpen(false);
	};

	const handleBlurContainer = () => {
		setTimeout(() => setOpen(false), 100);
	};

	// -------------- Role-aware pieces derived from localStorage --------------
	const role = useMemo(() => auth.user?.role ?? null, [auth.user]);

	const goHome = useCallback(
		() => navigate(homeFor(getAuthUser()), { replace: true }),
		[navigate, homeFor],
	);

	//   const handleLogout = useCallback(() => {
	//     clearLocalSession();
	//     setAuth({ isAuthed: false, user: null });
	//     toast.success("You’ve been logged out.");
	//     navigate("/", { replace: true });
	//   }, [navigate]);

	return (
		<>
			<Navbar bg="light" expand="lg" className="px-3">
				{/* Brand */}
				<Navbar.Brand
					onClick={goHome}
					role="button"
					tabIndex={0}
					onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goHome()}
					className="d-flex align-items-center gap-2"
					aria-label="Go to your homepage"
				>
					<Image src={edLogo} alt="EdStream logo" height={32} />
					<span className="fw-semibold">EdStream</span>
				</Navbar.Brand>

				<Navbar.Toggle aria-controls="main-nav" />
				<Navbar.Collapse id="main-nav">
					{/* LEFT: Explore + role-specific primary actions */}
					<Nav className="me-auto">
						<Button
							className="nav-btn"
							onClick={() => navigate('/coursepage')}
						>
							Explore Courses
						</Button>

						{/* ---- Learner-specific navbar (from your JSX) ---- */}
						{auth.isAuthed && role === 'learner' && (
							<Button
								className="nav-btn"
								onClick={() =>
									navigate('/coursepage', {
										state: { scope: 'enrolled' },
									})
								}
								aria-label="Go to My Learning"
							>
								My Learning
							</Button>
						)}

						{/* ---- Instructor-specific navbar (from your JSX) ---- */}
						{auth.isAuthed && role === 'instructor' && (
							<>
								<Button
									className="nav-btn"
									onClick={() =>
										navigate('/coursepage', {
											state: { scope: 'authored' },
										})
									}
									aria-label="Go to My Courses"
								>
									My Courses
								</Button>
								<Button
									className="nav-btn"
									onClick={() => navigate('/course-creator')}
								>
									+ Create Course
								</Button>
							</>
						)}
					</Nav>

					{/* MIDDLE: Search */}
					<div
						className="position-relative"
						onBlur={handleBlurContainer}
						style={{ minWidth: 360 }}
					>
						<Form
							className="d-flex me-3"
							role="search"
							onSubmit={handleSubmit}
						>
							<FormControl
								ref={inputRef}
								type="search"
								value={query}
								onChange={handleChange}
								placeholder="Search for Courses"
								aria-label="Search for Courses"
							/>
							<Button
								type="submit"
								variant="outline-primary"
								className="ms-2"
							>
								Search
							</Button>
						</Form>

						{/* Suggestions dropdown */}
						{open && topSuggestions.length > 0 && (
							<ListGroup
								className="position-absolute w-100 shadow-sm"
								style={{
									zIndex: 1050,
									maxHeight: 320,
									overflowY: 'auto',
								}}
							>
								{topSuggestions.map((course) => (
									<ListGroup.Item
										key={course.id}
										action
										onMouseDown={(e) => e.preventDefault()}
										onClick={() => handleSuggestionClick(course.id)}
									>
										<div className="d-flex justify-content-between">
											<strong>{course.title}</strong>
											<small className="text-muted">
												{course.level}
											</small>
										</div>
										<div className="text-muted small">
											{course.author} •{' '}
											{course.tags?.slice(0, 3).join(', ')}
										</div>
									</ListGroup.Item>
								))}
								{matches.length > topSuggestions.length && (
									<ListGroup.Item
										action
										onMouseDown={(e) => e.preventDefault()}
										onClick={handleSubmit}
									>
										View all {matches.length} results for “{query}”
									</ListGroup.Item>
								)}
							</ListGroup>
						)}
					</div>

					{/* RIGHT: Auth area */}
					{auth.isAuthed ? (
						<Nav>
							<NavDropdown
								align="end"
								id="profile-dropdown"
								title={
									<span className="d-inline-flex align-items-center gap-2">
										<Image src={userLogo} alt="" height={24} />
										{auth.user?.name ?? 'Profile'}
									</span>
								}
							>
								{/* Optional role-specific metrics link */}
								{role === 'instructor' && (
									<NavDropdown.Item
										onClick={() =>
											navigate('/performance-instructor')
										}
									>
										📈 Performance Metrics
									</NavDropdown.Item>
								)}
								{role === 'learner' && (
									<NavDropdown.Item
										onClick={() => navigate('/performance-student')}
									>
										📈 Performance Metrics
									</NavDropdown.Item>
								)}
								<NavDropdown.Divider />
								<NavDropdown.Item
									onClick={() => navigate('/edit-profile')}
								>
									✏️ Edit Profile
								</NavDropdown.Item>
								<NavDropdown.Item onClick={() => navigate('/logout')}>
									🚪 Logout
								</NavDropdown.Item>
							</NavDropdown>
						</Nav>
					) : (
						<Button variant="primary" onClick={() => navigate('/auth')}>
							Login / Register
						</Button>
					)}
				</Navbar.Collapse>
			</Navbar>
		</>
	);
};

export default NavbarComponent;
