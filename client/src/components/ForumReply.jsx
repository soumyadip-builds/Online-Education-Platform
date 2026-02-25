import { useState } from 'react';
import PropTypes from 'prop-types';
import '../styles/forum-post.css';

const ForumReply = ({
  placeholder = 'Write your reply…',
  onSubmit,
  onCancel,
  autoFocus = false,
  className = '',
}) => {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = text.trim().length > 0 && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      await onSubmit?.(text.trim());
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`ed-forum ${className}`}>
      <form className="forum-reply card border-0 shadow-sm" onSubmit={handleSubmit}>
        <div className="forum-reply__accent" aria-hidden="true" />
        <div className="card-body">
          <textarea
            className="form-control forum-reply__textarea"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            aria-label="Reply text"
          />
          <div className="d-flex justify-content-end gap-2 mt-3">
            {onCancel && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary forum-post__btn"
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn btn-sm forum-post__btn-primary"
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  Posting…
                </>
              ) : (
                <>
                  <i className="bi bi-send me-1" />
                  Post Reply
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

ForumReply.propTypes = {
  placeholder: PropTypes.string,
  onSubmit: PropTypes.func,
  onCancel: PropTypes.func,
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
};

export default ForumReply;
