import { useEffect, useState } from "react";
import { getNews } from "../api/client";
import { formatDate } from "../format";
import type { NewsPost } from "../types";

export default function NewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getNews().then(setPosts).catch((err: Error) => setError(err.message));
  }, []);

  return (
    <section className="page-grid">
      <div className="section-heading">
        <p className="eyebrow">Bulletin</p>
        <h2>News And Posts</h2>
      </div>

      {error && <p className="alert">{error}</p>}

      <div className="post-grid">
        {posts.length === 0 && <p className="empty-state">No posts yet.</p>}
        {posts.map((post) => (
          <article className="post-card" key={post.id}>
            <div className="post-card__meta">
              <span>{post.category}</span>
              {post.isPinned && <span>Pinned</span>}
            </div>
            <h3>{post.title}</h3>
            <p className="muted">{formatDate(post.publishedAt)}</p>
            <p>{post.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
