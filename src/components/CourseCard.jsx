
// src/components/CourseCard.jsx
import React from "react";

const Star = ({ filled }) => (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill={filled ? "#facc15" : "none"}
    stroke="#facc15"
    strokeWidth="2"
    style={{ display: "inline-block" }}
  >
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
  </svg>
);

const Rating = ({ value = 0 }) => {
  const full = Math.round(value);
  return (
    <span className="rating">
      <span className="rating-value">{value.toFixed(1)}</span>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} filled={i < full} />
      ))}
    </span>
  );
};

export default function CourseCard({ course, onClick }) {
  // Accept multiple possible field names for the thumbnail
  const thumbSrc = course.thumb || course.image || course.img || course.thumbnail;

  return (
    <article
      className="course-card"
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(course)}
      onKeyDown={(e) => e.key === "Enter" && onClick?.(course)}
      aria-label={`Open course ${course.title}`}
    >
      {/* THUMBNAIL */}
      <div className="thumb-wrap">
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={`${course.title} thumbnail`}
            loading="lazy"
            decoding="async"
          />
        ) : null}
        {course.isBestseller && <span className="badge">Bestseller</span>}
      </div>

      {/* BODY */}
      <div className="course-body">
        <h3 className="course-title">{course.title}</h3>
        <div className="author">{course.author}</div>

        <div className="meta-row">
          <Rating value={course.rating || 0} />
          <span>•</span>
          <span className="learners">
            {Number(course.learners || 0).toLocaleString()} learners
          </span>
        </div>

        <div className="pill-row">
          <span className="pill">{course.level}</span>
          <span className="pill">{course.duration}</span>
        </div>

        <div className="tags">
          {(course.tags || []).slice(0, 3).map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>

        <button
          className="primary-btn"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(course);
          }}
        >
          View details
        </button>
      </div>
    </article>
  );
}