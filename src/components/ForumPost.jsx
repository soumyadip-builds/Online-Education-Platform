
import React, { useState } from 'react';
import { formatDate } from '../utils/formatDate';

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
}

export default function ForumPost({ post, usersById, onReply }) {
  const [reply, setReply] = useState('');

  const author = usersById[post.userId];
  const handleReply = (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    onReply(post.postId, reply.trim());
    setReply('');
  };

  return (
    <div className="card mb-3 shadow-sm">
      <div className="card-body">
        <div className="d-flex">
          <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3" style={{width:40,height:40}}>
            <span className="fw-bold">{initials(author?.name || '?')}</span>
          </div>
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between">
              <div>
                <strong>{author?.name}</strong>
                <span className="badge bg-light text-dark ms-2">{author?.role}</span>
              </div>
              <small className="text-muted">{formatDate(post.timestamp)}</small>
            </div>
            <p className="mt-2 mb-2">{post.message}</p>

            {/* Replies */}
            {post.replies?.length > 0 && (
              <div className="ps-3 border-start ms-2">
                {post.replies.map(r => {
                  const u = usersById[r.userId];
                  return (
                    <div className="mt-2" key={r.replyId}>
                      <small className="text-muted">{formatDate(r.timestamp)}</small>
                      <div><strong>{u?.name}:</strong> {r.message}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reply form */}
            <form className="d-flex mt-3" onSubmit={handleReply}>
              <input
                className="form-control me-2"
                placeholder="Write a reply..."
                value={reply}
                onChange={e => setReply(e.target.value)}
              />
              <button className="btn btn-outline-primary" type="submit">Reply</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
``
