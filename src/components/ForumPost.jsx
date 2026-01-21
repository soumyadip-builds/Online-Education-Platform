
import React from 'react';
import PropTypes from 'prop-types';
import '../styles/forum-post.css';

/**
 * ForumPost.jsx
 * Minimal forum post card for EdStream
 * - Styles are namespaced under `.ed-forum` to avoid clashes
 * - Uses Bootstrap 5 utility classes + small custom CSS
 * - NO third-party libraries (uses local "time ago" helper)
 */

/* ===== Simple "time ago" formatter — no dependencies ===== */
const formatTimeAgo = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  const units = [
    { name: 'year',   secs: 31536000 },
    { name: 'month',  secs: 2592000 },
    { name: 'day',    secs: 86400 },
    { name: 'hour',   secs: 3600 },
    { name: 'minute', secs: 60 },
  ];

  for (const u of units) {
    const value = Math.floor(seconds / u.secs);
    if (value >= 1) {
      return `${value} ${u.name}${value > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
};

const ForumPost = ({
  id,
  author = {},
  title,
  content,
  tags = [],
  createdAt,
  stats = { likes: 0, comments: 0, views: 0 },
  onLike,
  onComment,
  onShare,
  isLiked = false,
  compact = false,
  className = '',
}) => {
  const timeAgo = formatTimeAgo(createdAt);

  const handleLike = (e) => {
    e.stopPropagation();
    onLike?.(id);
  };

  const handleComment = (e) => {
    e.stopPropagation();
    onComment?.(id);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    onShare?.(id);
    // Fallback: copy link to clipboard
    try {
      if (navigator?.clipboard) {
        navigator.clipboard.writeText(`${window.location.href}#post-${id}`);
      }
    } catch (_) {}
  };

  return (
    <div className={`ed-forum ${className}`}>
      <article
        id={`post-${id}`}
        className={`forum-post card border-0 shadow-sm ${compact ? 'forum-post--compact' : ''}`}
        role="article"
        aria-labelledby={`post-title-${id}`}
      >
        {/* Slim gradient top bar to match the app theme */}
        <div className="forum-post__accent" aria-hidden="true" />

        {/* Header */}
        <div className="card-body pb-0">
          <div className="d-flex align-items-center gap-3">
            <img
              src={
                author.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name || 'User')}&background=EEE&color=444`
              }
              alt={`${author.name || 'User'} avatar`}
              className="rounded-circle forum-post__avatar"
              width="44"
              height="44"
            />
            <div className="flex-grow-1 min-w-0">
              <h2 id={`post-title-${id}`} className="h6 mb-1 fw-semibold text-truncate">
                {title}
              </h2>
              <div className="text-muted small d-flex flex-wrap align-items-center gap-2">
                <span className="fw-medium">{author.name || 'Anonymous'}</span>
                {author.role && <span className="badge forum-post__role-badge">{author.role}</span>}
                {timeAgo && <span aria-label={`posted ${timeAgo}`}>· {timeAgo}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="card-body pt-3">
          <p className={`forum-post__content ${compact ? 'mb-2' : 'mb-3'}`}>{content}</p>

          {/* Tags */}
          {tags?.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mb-3">
              {tags.map((t) => (
                <span key={t} className="badge forum-post__tag">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          {!compact && (
            <div className="d-flex flex-wrap align-items-center gap-2 text-muted small mb-3">
              <span className="forum-post__chip" aria-label={`${stats.likes} likes`}>
                <i className={`bi ${isLiked ? 'bi-heart-fill text-danger' : 'bi-heart'} me-1`} />
                {stats.likes}
              </span>
              <span className="forum-post__chip" aria-label={`${stats.comments} comments`}>
                <i className="bi bi-chat-left me-1" />
                {stats.comments}
              </span>
              <span className="forum-post__chip" aria-label={`${stats.views} views`}>
                <i className="bi bi-eye me-1" />
                {stats.views}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn btn-sm ${isLiked ? 'btn-like-active' : 'btn-outline-like'}`}
              onClick={handleLike}
              aria-pressed={isLiked}
            >
              <i className={`bi ${isLiked ? 'bi-heart-fill me-1' : 'bi-heart me-1'}`} />
              {isLiked ? 'Liked' : 'Like'}
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline-secondary forum-post__btn"
              onClick={handleComment}
            >
              <i className="bi bi-chat-left-text me-1" />
              Comment
            </button>

            <button
              type="button"
              className="btn btn-sm forum-post__btn-primary"
              onClick={handleShare}
            >
              <i className="bi bi-share me-1" />
              Share
            </button>
          </div>
        </div>
      </article>
    </div>
  );
};

ForumPost.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  author: PropTypes.shape({
    name: PropTypes.string,
    role: PropTypes.string,
    avatarUrl: PropTypes.string,
  }),
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  tags: PropTypes.arrayOf(PropTypes.string),
  createdAt: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.instanceOf(Date),
  ]),
  stats: PropTypes.shape({
    likes: PropTypes.number,
    comments: PropTypes.number,
    views: PropTypes.number,
  }),
  onLike: PropTypes.func,
  onComment: PropTypes.func,
  onShare: PropTypes.func,
  isLiked: PropTypes.bool,
  compact: PropTypes.bool,
  className: PropTypes.string,
};

export default ForumPost;
