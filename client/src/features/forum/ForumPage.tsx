import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddPostModal } from './AddPostModal';

interface Post {
  _id: string;
  title: string;
  content: string;
  category: string;
  attachments: string[];
  viewsCount: number;
  commentCount: number; 
  rating: number; // הוספנו כאן כדי שלא יהיו שגיאות טייפסקריפט
  author: { name: string };
  createdAt: string;
}

export const ForumPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchPosts = () => {
  fetch('http://localhost:5000/api/posts')
    .then((res) => res.json())
    .then((data) => setPosts(data));
};

  useEffect(() => {
    fetch('http://localhost:5000/api/posts')
      .then((res) => res.json())
      .then((data) => {
        setPosts(data);
        setLoading(false);
      })
      .catch((err) => console.error('Error fetching posts:', err));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '50px', direction: 'rtl' }}>טוען את הפורום...</div>;

  return (
    <div style={{ padding: '30px', direction: 'rtl', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Assistant, sans-serif' }}>
      
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ backgroundColor: '#10b981', color: 'white', padding: '12px 35px', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          הוסף תוכן חדש
        </button>
        
      </div>

      <h2 style={{ borderBottom: '3px solid #10b981', paddingBottom: '10px', color: '#064e3b', marginBottom: '25px' }}>
        פוסטים בפורום
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {posts.map((post) => (
          <div 
            key={post._id} 
            onClick={() => navigate(`/forum/post/${post._id}`)} 
            style={{ display: 'flex', border: '1px solid #d1fae5', borderRadius: '12px', backgroundColor: '#fff', cursor: 'pointer', overflow: 'hidden', transition: '0.2s' }}
          >
            {/* סרגל ימני */}
            <div style={{ width: '180px', backgroundColor: '#f0fdf4', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', borderLeft: '1px solid #d1fae5' }}>
              <div style={{ backgroundColor: '#10b981', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', marginBottom: '15px' }}>
                דירוג: {post.rating || 5} ★
              </div>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
                {post.author?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span style={{ fontWeight: 'bold', color: '#064e3b' }}>{post.author?.name || 'משתמש'}</span>
            </div>

            {/* גוף הפוסט */}
            <div style={{ flex: 1, padding: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{post.category}</span>
                  <h3 style={{ margin: 0, fontSize: '20px' }}>{post.title}</h3>
                </div>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                   צפיות: {post.viewsCount || 0} | תגובות: {post.commentCount || 0}
                </span>
              </div>
              <p style={{ color: '#4b5563', lineHeight: '1.6' }}>{post.content.substring(0, 150)}...</p>
            </div>
          </div>
        ))}
      </div>
      <AddPostModal 
  isOpen={isModalOpen} 
  onClose={() => setIsModalOpen(false)} 
  onPostCreated={fetchPosts} 
/>
    </div>
  );
};

// כעת הייצוא נמצא מחוץ לקומפוננטה ובמקום הנכון
export default ForumPage;