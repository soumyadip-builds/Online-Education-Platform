import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import "../styles/course.css";
import { isAuthenticated } from "../utils/session";

/** Prefix static paths with app base (Vite/CRA safe) */
function withBase(path) {
    const base =
        typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.BASE_URL
            ? import.meta.env.BASE_URL
            : process.env.PUBLIC_URL || "/";
    const b = base.endsWith("/") ? base : `${base}/`;
    return path?.startsWith("/") ? `${b}${path.slice(1)}` : `${b}${path || ""}`;
}

export default function CourseCard({ course }) {
    const navigate = useNavigate();

    const { id, title, author, isBestseller, rating, learners, thumbnail } =
        course;
    
const handleClick = () => {
  // Basic context logs
  console.groupCollapsed('[CourseCard] handleClick');
  console.log('course.id:', id);
  console.log('course.title:', title);

  // Auth check
  const authed = isAuthenticated();
  console.log('isAuthenticated():', authed);

  if (authed) {
    // Route must match App.jsx → /course/:courseId  (singular)
    const target = `/courses/${id}`;
    console.log('Navigating to:', target);

    try {
      navigate(target);
      console.log('navigate() called successfully');

      // Scroll after route update
      setTimeout(() => {
        console.log('Scrolling to top after navigation');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }, 0);
    } catch (err) {
      console.error('Error during navigate():', err);
    }
  } else {
    console.warn('User not authenticated. Redirecting to /auth');
    try {
      navigate('/auth');
      console.log('navigate("/auth") called successfully');
    } catch (err) {
      console.error('Error navigating to /auth:', err);
    }
  }

  console.groupEnd();
};


    return (
        <article
            className="course_page_course_card course_page_course_card--compact"
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(e) =>
                e.key === "Enter" || e.key === " " ? handleClick() : null
            }
            aria-label={`Open course: ${title}`}
        >
            {/* Thumbnail */}
            <div className="ratio ratio-16x9 bg-light">
                <img
                    src={thumbnail}
                    alt={title}
                    className="card-img-top object-fit-cover"
                    style={{
                        borderTopLeftRadius: ".375rem",
                        borderTopRightRadius: ".375rem",
                    }}
                    onError={(e) => {
                        e.currentTarget.src =
                            "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=60";
                    }}
                />
            </div>

            {/* Body */}
            <div className="card-body d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="badge bg-primary-subtle text-primary">
                        {isBestseller ? (
                            <span>
                                <i className="bi bi-bookmark-star-fill"></i>{" "}
                                Bestseller
                            </span>
                        ) : (
                            <span>
                                <i className="bi bi-shield-fill-check"></i>{" "}
                                Premium
                            </span>
                        )}
                    </span>

                    {rating > 0 && (
                        <span className="text-warning small">
                            ★ {rating.toFixed(1)}
                        </span>
                    )}
                </div>

                <h5 className="card-title mb-1">{title}</h5>

                {author && (
                    <div className="text-muted xsmall mb-2">by {author}</div>
                )}

                <p className="card-text text-muted small flex-grow-1">
                    {course.description?.length > 120
                        ? course.description.slice(0, 117) + "..."
                        : course.description}
                </p>

                {/* Learners only — buttons removed */}
                <div className="d-flex justify-content-start align-items-center mt-auto">
                    <div className="text-muted small">
                        👥 {learners.toLocaleString()} learners
                    </div>
                </div>
            </div>
        </article>
    );
}

CourseCard.propTypes = {
    course: PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        author: PropTypes.string.isRequired,
        rating: PropTypes.number.isRequired,
        learners: PropTypes.number.isRequired,
        thumbnail: PropTypes.string,
        isBestseller: PropTypes.string,
        description: PropTypes.string,
    }).isRequired,
};
