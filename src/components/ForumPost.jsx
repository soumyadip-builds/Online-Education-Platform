import React, { useState } from 'react';
import { formatDate } from '../utils/formatDate';

function initials(name) {
  const n = String(name ?? '').trim();
  if (!n) return 'L'; // default to Learner avatar initial
  return n
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Props:
 *  - post: { postId, userId, message, timestamp, replies[] }
 *  - usersById: { [userId]: { userId, name, role, ... } }
 *  - onReply(postId, text): function
 */
export default function ForumPost({ post, usersById, onReply }) {
  const [reply, setReply] = useState('');

  // Fallback author when the post was seeded with userId:null
  const author = usersById[post.userId] ?? { name: 'Learner', role: 'learner' };

  const handleReply = (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    onReply(post.postId, reply.trim());
    setReply('');
  };

  return (
    <div className="card mb-3">
      <div className="card-body">
        {/* Avatar + Author */}
        <div className="d-flex align-items-start gap-3">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 40, height: 40, background: '#0d6efd', color: 'white', fontWeight: 700 }}
            title={author.name}
          >
            {initials(author.name)}
          </div>

          <div className="flex-grow-1">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <div className="fw-semibold">{author.name} <span className="text-muted">({author.role})</span></div>
              </div>
              <div className="small text-muted">{formatDate(post.timestamp)}</div>
            </div>

            {/* Message */}
            <div className="fs-5 mb-3">{post.message}</div>

            {/* Replies */}
            {post.replies?.length > 0 && (
              <div className="ps-3 border-start">
                {post.replies.map((r) => {
                  const u = usersById[r.userId] ?? { name: 'User' };
                  return (
                    <div key={r.replyId} className="mb-2">
                      <div className="small text-muted">{formatDate(r.timestamp)}</div>
                      <div><strong>{u?.name}</strong>: {r.message}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reply form */}
            <form className="d-flex gap-2 mt-3" onSubmit={handleReply}>
              <input
                className="form-control"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply..."
              />
              <button className="btn btn-primary" type="submit">Reply</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}