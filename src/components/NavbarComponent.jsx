// src/components/NavbarComponent.jsx
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import edLogo from "../assets/edLogo.png";
import userLogo from "../assets/userLogo.png";
import {
    Navbar,
    Nav,
    NavDropdown,
    Form,
    FormControl,
    Button,
    Image,
    ListGroup,
} from "react-bootstrap";
import "../styles/EdNavbar.css";
import {
    destroySession,
    getCurrentUser,
    isAuthenticated,
} from "../utils/session";
import { useNavigate } from "react-router-dom";
import { COURSES } from "../data/courses";

const NavbarComponent = () => {
    const [auth, setAuth] = useState({ isAuthed: false, user: null });
    const navigate = useNavigate();

    // --- NEW: central role→home resolver
    const getHomePath = useCallback((user) => {
        if (!user) return "/"; // fallback for guests
        switch (user.role) {
            case "instructor":
                return "/mentor-home";
            case "learner":
                return "/student-home";
            default:
                return "/";
        }
    }, []);

    // Initialize auth state from session.js
    useEffect(() => {
        setAuth({ isAuthed: isAuthenticated(), user: getCurrentUser() });
    }, []);

    // Keep multiple tabs/windows in sync (e.g., logout in one tab)
    // Also respond instantly in the same tab via 'session-changed'
    useEffect(() => {
        const onStorage = () => {
            setAuth({ isAuthed: isAuthenticated(), user: getCurrentUser() });
        };
        const onSessionChanged = () => {
            setAuth({ isAuthed: isAuthenticated(), user: getCurrentUser() });
        };
        window.addEventListener("storage", onStorage);
        window.addEventListener("session-changed", onSessionChanged);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("session-changed", onSessionChanged);
        };
    }, []);

    // Single place to handle logout
    const handleLogout = useCallback(() => {
        // 1) clear session (both sessionStorage & localStorage via destroySession)
        destroySession();
        // 2) update UI state
        setAuth({ isAuthed: false, user: null });
        // 3) navigate to home (change to '/' if that's your home route)
        navigate("/home", { replace: true });
    }, [navigate]);

    const editProfile = useCallback(
        () => navigate("/edit-profile"),
        [navigate],
    );
    const goToAuth = useCallback(() => navigate("/auth"), [navigate]);

    // --- NEW: logo click handler
    const goToRoleHome = useCallback(() => {
        const user = getCurrentUser();
        navigate(getHomePath(user), { replace: true });
    }, [getHomePath, navigate]);

    // ---------------------- SEARCH: state & helpers ----------------------
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const inputRef = useRef(null);

    // Normalize helper
    const norm = (s) => (s || "").toString().toLowerCase().trim();

    // Basic scoring: title (3), tags (2), author/description (1)
    const scoreMatch = useCallback((course, q) => {
        if (!q) return 0;
        const nQ = norm(q);
        let score = 0;

        if (norm(course.title).includes(nQ)) score += 3;
        if ((course.tags || []).some((t) => norm(t).includes(nQ))) score += 2;

        if (norm(course.author).includes(nQ)) score += 1;
        if (norm(course.description).includes(nQ)) score += 1;

        // small boost for prefix match on title
        if (norm(course.title).startsWith(nQ)) score += 1;

        return score;
    }, []);

    // Compute matches as user types
    const matches = useMemo(() => {
        if (!query.trim()) return [];
        const withScores = COURSES.map((c) => ({ c, s: scoreMatch(c, query) }))
            .filter(({ s }) => s > 0)
            .sort((a, b) => b.s - a.s || a.c.title.localeCompare(b.c.title));
        return withScores.map(({ c }) => c);
    }, [query, scoreMatch]);

    const topSuggestions = matches.slice(0, 6);

    const handleChange = (e) => {
        setQuery(e.target.value);
        setOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;

        // Navigate to a results page with state (query + results)
        navigate(`/search?q=${encodeURIComponent(trimmed)}`, {
            state: { query: trimmed, results: matches },
        });
        setOpen(false);
        // Keep focus on input if needed:
        // inputRef.current?.focus();
    };

    const handleSuggestionClick = (courseId) => {
        navigate(`/courses/${courseId}`);
        setOpen(false);
    };

    const handleBlurContainer = (e) => {
        // Close suggestions if click/blur outside the suggestions or input
        // Add a slight timeout so click on suggestion still registers
        setTimeout(() => setOpen(false), 100);
    };
    // --------------------------------------------------------------------

    return (
        <>
            {/* Left Section: Logo + App Name */}
            <Navbar bg="light" expand="lg" className="px-3">
                <Navbar.Brand
                    onClick={goToRoleHome}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                        (e.key === "Enter" || e.key === " ") && goToRoleHome()
                    }
                    className="d-flex align-items-center gap-2"
                    aria-label="Go to your homepage"
                >
                    <Image src={edLogo} alt="EdStream logo" height={32} />
                    <span className="fw-semibold">EdStream</span>
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="main-nav" />
                <Navbar.Collapse id="main-nav">
                    {/* Explore Dropdown */}
                    {/* <Nav className="me-auto">
                        <NavDropdown title="Explore" id="explore-dropdown">
                            <NavDropdown.Item
                                onClick={() => navigate("/explore/science")}
                            >
                                Science
                            </NavDropdown.Item>
                            <NavDropdown.Item
                                onClick={() => navigate("/explore/technology")}
                            >
                                Technology
                            </NavDropdown.Item>
                            <NavDropdown.Item
                                onClick={() => navigate("/explore/engineering")}
                            >
                                Engineering
                            </NavDropdown.Item>
                            <NavDropdown.Item
                                onClick={() => navigate("/explore/mathematics")}
                            >
                                Mathematics
                            </NavDropdown.Item>
                        </NavDropdown> */}

                    {/* My Learning Dropdown */}
                    {/* <NavDropdown
                            title="My Learning"
                            id="mylearning-dropdown"
                        >
                            <NavDropdown.Item
                                onClick={() =>
                                    navigate("/courses/react-basics")
                                }
                            >
                                React Basics
                            </NavDropdown.Item>
                            <NavDropdown.Item
                                onClick={() =>
                                    navigate("/courses/data-structures")
                                }
                            >
                                Data Structures
                            </NavDropdown.Item>
                            <NavDropdown.Item
                                onClick={() =>
                                    navigate("/courses/ai-fundamentals")
                                }
                            >
                                AI Fundamentals
                            </NavDropdown.Item>
                        </NavDropdown>
                    </Nav> */}

                    <Nav className="me-auto">
                        {/* Explore button: choose a primary landing route for Explore */}
                        <Button
                            className="nav-btn"
                            onClick={() => navigate("/coursepage")}
                            aria-label="Go to Explore"
                        >
                            Explore Courses
                        </Button>
                        {/* My Learning button: pick the main destination for the learner */}
                        {/* <Button
                            className="nav-btn"
                            onClick={() => navigate("/my-learning")}
                            aria-label="Go to My Learning"
                        >
                            My Learning
                        </Button> */}

                        {auth.isAuthed && auth.user?.role === "learner" && (
                            <Button
                                className="nav-btn"
                                onClick={() =>
                                    navigate("/coursepage", {
                                        state: { scope: "enrolled" },
                                    })
                                }
                                aria-label="Go to My Learning"
                            >
                                My Learning
                            </Button>
                        )}

                        {auth.isAuthed && auth.user?.role === "instructor" && (
                            <Button
                                className="nav-btn"
                                onClick={() =>
                                    navigate("/coursepage", {
                                        state: { scope: "created" },
                                    })
                                }
                                aria-label="Go to My Courses"
                            >
                                My Courses
                            </Button>
                        )}
                    </Nav>

                    {/* ------------------ Search Box (UPDATED) ------------------ */}
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
                                    overflowY: "auto",
                                }}
                            >
                                {topSuggestions.map((course) => (
                                    <ListGroup.Item
                                        key={course.id}
                                        action
                                        onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                                        onClick={() =>
                                            handleSuggestionClick(course.id)
                                        }
                                    >
                                        <div className="d-flex justify-content-between">
                                            <strong>{course.title}</strong>
                                            <small className="text-muted">
                                                {course.level}
                                            </small>
                                        </div>
                                        <div className="text-muted small">
                                            {course.author} •{" "}
                                            {course.tags
                                                ?.slice(0, 3)
                                                .join(", ")}
                                        </div>
                                    </ListGroup.Item>
                                ))}
                                {matches.length > topSuggestions.length && (
                                    <ListGroup.Item
                                        action
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={handleSubmit}
                                    >
                                        View all {matches.length} results for “
                                        {query}”
                                    </ListGroup.Item>
                                )}
                            </ListGroup>
                        )}
                    </div>
                    {/* ---------------------------------------------------------- */}

                    {/* Right Section: Auth-dependent */}
                    {auth.isAuthed ? (
                        <Nav>
                            <NavDropdown
                                align="end"
                                title={
                                    <span className="d-inline-flex align-items-center gap-2">
                                        <Image
                                            src={userLogo}
                                            alt=""
                                            height={24}
                                        />
                                        {auth.user?.name ?? "Profile"}
                                    </span>
                                }
                                id="profile-dropdown"
                            >
                                <NavDropdown.Item
                                    onClick={() => navigate("/settings")}
                                >
                                    ⚙️ Settings
                                </NavDropdown.Item>
                                <NavDropdown.Item
                                    onClick={() => navigate("/help")}
                                >
                                    ❓ Help
                                </NavDropdown.Item>
                                <NavDropdown.Divider />
                                <NavDropdown.Item onClick={editProfile}>
                                    ✏️ Edit Profile
                                </NavDropdown.Item>
                                <NavDropdown.Item onClick={handleLogout}>
                                    🚪 Logout
                                </NavDropdown.Item>
                            </NavDropdown>
                        </Nav>
                    ) : (
                        <Button variant="primary" onClick={goToAuth}>
                            Login/Register
                        </Button>
                    )}
                </Navbar.Collapse>
            </Navbar>
        </>
    );
};

export default NavbarComponent;
