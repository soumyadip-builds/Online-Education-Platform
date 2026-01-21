
import React, { useEffect, useMemo, useState } from 'react';
import ForumPost from '../components/ForumPost';
import ForumReply from '../components/ForumReply';
import ForumPostSkeleton from '../components/ForumPostSkeleton';
import '../styles/forum-post.css';

/**
 * ForumPage.jsx
 * - Minimal forum list page with search, sort, pagination
 * - Uses Bootstrap 5 + small custom CSS
 * - NO third-party libraries
 * - All custom CSS is scoped under `.ed-forum` to avoid leaking styles
 *
 * Replace the seed/fake logic with your real services when ready:
 *   // import { getForumPosts, likePost, addReply } from '../services/communicationService';
 */

const PAGE_SIZE = 5;

const seedPosts = () => ([
  {
    id: 'p_101',
    author: { name: 'Priya Sharma', role: 'Student' },
    title: 'Tips for the Week 3 Quiz preparation?',
    content:
      'Any suggestions on focusing topics? I found the DP section tricky. Also, do we have partial credit for near-correct answers?',
    tags: ['quiz', 'week-3', 'dp'],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    stats: { likes: 12, comments: 4, views: 198 },
    isLiked: false,
  },
  {
    id: 'p_102',
    author: { name: 'Arun Kumar', role: 'TA' },
    title: 'Assignment 2 rubric posted',
    content:
      'The detailed rubric for Assignment 2 has been published. Please check the course page > Assignments section. Clarifications welcome here.',
    tags: ['assignment', 'rubric'],
    createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(), // 28h ago
    stats: { likes: 7, comments: 2, views: 241 },
    isLiked: false,
  },
  {
    id: 'p_103',
    author: { name: 'Meera Iyer', role: 'Student' },
    title: 'Best way to visualize greedy vs DP?',
    content:
      'I confuse greedy with DP when substructures look similar. How do you decide quickly which paradigm fits? Any heuristics?',
    tags: ['algorithms', 'greedy', 'dp'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    stats: { likes: 15, comments: 6, views: 503 },
    isLiked: true,
  },
  {
    id: 'p_104',
    author: { name: 'Course Bot', role: 'Assistant' },
    title: 'Weekly study group links',
    content:
      'Join the peer groups for live problem-solving. Slots available Tue/Thu evenings. Links are pinned in the course announcements.',
    tags: ['study-group', 'announcement'],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5h ago
    stats: { likes: 4, comments: 1, views: 120 },
    isLiked: false,
  },
  {
    id: 'p_105',
    author: { name: 'Rohit Gupta', role: 'Student' },
    title: 'Sharing a DP cheatsheet I made',
    content:
      'Compiled transitions and typical base cases for common DP categories. Hope it helps! Feedback welcome to improve it.',
    tags: ['dp', 'cheatsheet', 'resources'],
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6h ago
    stats: { likes: 21, comments: 8, views: 640 },
    isLiked: false,
  },
]);

export default function ForumPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [replyingPostId, setReplyingPostId] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'likes' | 'comments'
  const [page, setPage] = useState(1);

  // Simulate initial load — replace with your service call
  useEffect(() => {
    let isMounted = true;
    const t = setTimeout(() => {
      if (isMounted) {
        setPosts(seedPosts());
        setLoading(false);
      }
    }, 700);
    return () => {
      isMounted = false;
      clearTimeout(t);
    };
  }, []);

  // Derived list: search + sort
  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = posts.filter(p => {
      if (!q) return true;
      const hay = `${p.title} ${p.content} ${p.tags?.join(' ')}`.toLowerCase();
      return hay.includes(q);
    });

    switch (sortBy) {
      case 'likes':
        list = list.sort((a, b) => (b.stats?.likes || 0) - (a.stats?.likes || 0));
        break;
      case 'comments':
        list = list.sort((a, b) => (b.stats?.comments || 0) - (a.stats?.comments || 0));
        break;
      default: // newest
        list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  }, [posts, search, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const currentItems = filteredSorted.slice(start, start + PAGE_SIZE);

  // Handlers
  const handleLike = (id) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id !== id) return p;
        const isLiked = !p.isLiked;
        const delta = isLiked ? 1 : -1;
        return {
          ...p,
          isLiked,
          stats: { ...p.stats, likes: Math.max(0, (p.stats?.likes || 0) + delta) },
        };
      }),
    );
    // TODO: call likePost(id) in your service layer
  };

  const handleComment = (id) => {
    setReplyingPostId(prev => (prev === id ? null : id));
  };

  const handleShare = (id) => {
    // Optional: custom share handler; fallback handled in ForumPost
    console.log('share', id);
  };

  const handleReplySubmit = async (postId, text) => {
    // TODO: await addReply(postId, text)
    // For UI: increment comments and close composer
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, stats: { ...p.stats, comments: (p.stats?.comments || 0) + 1 } }
          : p,
      ),
    );
    setReplyingPostId(null);
  };

  const clearSearch = () => setSearch('');

  return (
    <section className="ed-forum">
      {/* Page header */}
      <div className="card border-0 shadow-sm forum-page__header mb-3">
        <div className="forum-post__accent" aria-hidden="true" />
        <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <h1 className="h5 mb-1">Forum</h1>
            <div className="text-muted small">Discuss assignments, quizzes, and learning tips</div>
          </div>
          <button
            type="button"
            className="btn btn-sm forum-post__btn-primary"
            onClick={() => alert('New Post composer can go here')}
          >
            <i className="bi bi-plus-lg me-1" />
            New Post
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card border-0 shadow-sm forum-page__toolbar mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-8">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search posts, tags, keywords…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
                {search && (
                  <button className="btn btn-outline-secondary" type="button" onClick={clearSearch}>
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
              >
                <option value="newest">Newest</option>
                <option value="likes">Most Liked</option>
                <option value="comments">Most Commented</option>
              </select>
            </div>
            <div className="col-6 col-md-2 text-md-end">
              <span className="text-muted small">
                {filteredSorted.length} post{filteredSorted.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <>
          <ForumPostSkeleton lines={3} className="mb-3" />
          <ForumPostSkeleton lines={3} className="mb-3" />
          <ForumPostSkeleton lines={3} className="mb-3" />
        </>
      ) : currentItems.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center text-muted py-5">
            <i className="bi bi-chat-left-text fs-3 d-block mb-2" />
            No posts found. Try a different search or create a new post.
          </div>
        </div>
      ) : (
        currentItems.map((p) => (
          <div key={p.id} className="mb-3">
            <ForumPost
              {...p}
              onLike={handleLike}
              onComment={handleComment}
              onShare={handleShare}
            />
            {replyingPostId === p.id && (
              <ForumReply
                className="mt-2"
                onSubmit={(text) => handleReplySubmit(p.id, text)}
                onCancel={() => setReplyingPostId(null)}
              />
            )}
          </div>
        ))
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <nav className="d-flex justify-content-between align-items-center mt-3" aria-label="Forum pagination">
          <button
            className="btn btn-outline-secondary btn-sm forum-post__btn"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <i className="bi bi-arrow-left-short me-1" />
            Prev
          </button>
          <div className="text-muted small">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </div>
          <button
            className="btn btn-outline-secondary btn-sm forum-post__btn"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
            <i className="bi bi-arrow-right-short ms-1" />
          </button>
        </nav>
      )}
    </section>
  );
}

