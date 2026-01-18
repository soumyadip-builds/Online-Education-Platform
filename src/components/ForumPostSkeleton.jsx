
import React from 'react';
import '../styles/forum-post.css';

/**
 * ForumPostSkeleton.jsx
 * - Lightweight loading skeleton with a soft shimmer
 * - Scoped to `.ed-forum`
 */
const ForumPostSkeleton = ({ lines = 2, className = '' }) => {
  const bodyLines = Array.from({ length: Math.max(1, lines) });

  return (
    <div className={`ed-forum ${className}`}>
      <article className="forum-post card border-0 shadow-sm forum-skeleton" aria-hidden="true">
        <div className="forum-post__accent" />
        <div className="card-body pb-0">
          <div className="d-flex align-items-center gap-3">
            <div className="skeleton-circle" style={{ width: 44, height: 44 }} />
            <div className="flex-grow-1">
              <div className="skeleton-line edw-50 mb-2" />
              <div className="d-flex gap-2">
                <div className="skeleton-pill edw-25" />
                <div className="skeleton-pill edw-20" />
                <div className="skeleton-pill edw-15" />
              </div>
            </div>
          </div>
        </div>
        <div className="card-body pt-3">
          {bodyLines.map((_, i) => (
            <div
              key={i}
              className={`skeleton-line ${i === bodyLines.length - 1 ? 'edw-75' : 'edw-100'} mb-2`}
            />
          ))}
          <div className="d-flex gap-2 mt-3">
            <div className="skeleton-pill edw-15" />
            <div className="skeleton-pill edw-15" />
            <div className="skeleton-pill edw-15" />
          </div>
        </div>
      </article>
    </div>
  );
};

export default ForumPostSkeleton;
