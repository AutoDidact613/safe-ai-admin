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
  rating: number;
  author: { name: string };
  createdAt: string;
  tags: { _id: string; name: string }[];
  lastComment: { authorName: string; content: string } | null;
}

export const ForumPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchPosts = (search: string = '') => {
    setLoading(true);
    const url = search.trim() 
      ? `http://localhost:5000/api/posts/search?query=${search}`
      : 'http://localhost:5000/api/posts';

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('שרת הפורום החזיר שגיאה');
        return res.json();
      })
      .then((data) => {
        setPosts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching posts:', err);
        setPosts([]); 
        setLoading(false);
      });
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPosts(searchQuery);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // פונקציה חדשה: מאפסת את החיפוש ומחזירה את כל הפוסטים מיד
  const handleClearFilter = () => {
    setSearchQuery('');
    fetchPosts(''); // מביא את הרשימה המלאה ללא השהיית ה-Debounce
  };

  return (
    <div style={{ padding: '20px', direction: 'rtl', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Assistant, sans-serif' }}>
      
      {/* שורת כפתור הוספה + שדה חיפוש מעוצב */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', gap: '20px' }}>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 25px', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
        >
          הוסף תוכן חדש
        </button>

        {/* שדה חיפוש סגנון פרוג */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חפשי פוסטים, תגיות או נושאים..."
            style={{ width: '100%', padding: '10px 35px 10px 15px', borderRadius: '6px', border: '2px solid #d1fae5', fontSize: '15px', outline: 'none' }}
          />
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', color: '#10b981', fontSize: '16px' }}></i>
        </div>
      </div>

      {/* שורת כותרת דינמית + כפתור חזור לרשימה המלאה */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #10b981', paddingBottom: '10px', marginBottom: '25px' }}>
        <h2 style={{ color: '#064e3b', margin: 0, fontWeight: 'bold', fontSize: '20px' }}>
          {searchQuery ? `תוצאות חיפוש עבור: "${searchQuery}"` : 'פוסטים בפורום'}
        </h2>
        
        {/* שדרוג: כפתור חזור לרשימה המלאה שמופיע רק כשיש סינון פעיל */}
        {searchQuery && (
          <button
            onClick={handleClearFilter}
            style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          >
            <i className="fa-solid fa-arrow-rotate-left"></i>
            חזור לרשימה המלאה
          </button>
        )}
      </div>

      {/* תצוגת טעינה או הגנה על מערך ריק */}
      {loading ? (
        <div style={{ padding: '50px', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>מחפש פוסטים...</div>
      ) : !Array.isArray(posts) || posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '2px dashed #cbd5e1', borderRadius: '12px', backgroundColor: '#f8fafc', color: '#64748b' }}>
          <i className="fa-solid fa-folder-open" style={{ fontSize: '50px', color: '#cbd5e1', marginBottom: '15px' }}></i>
          <h3 style={{ margin: '0 0 10px 0', color: '#475569' }}>לא נמצאו פוסטים מתאימים</h3>
          <p style={{ margin: 0, fontSize: '15px', marginBottom: '15px' }}>נסי לחפש מילת מפתח אחרת או בדקי שאין שגיאות כתיב.</p>
          
          {/* שדרוג: גם במסך "לא נמצאו תוצאות" נשים כפתור חזרה מהיר כדי שלא יתקעו */}
          <button 
            onClick={handleClearFilter}
            style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            הצג את כל הפוסטים
          </button>
        </div>
      ) : (
        /* רשימת הפוסטים */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {posts.map((post) => (
            <div 
              key={post._id} 
              onClick={() => navigate(`/forum/post/${post._id}`)} 
              style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer', overflow: 'hidden', transition: '0.1s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            >
              {/* סרגל ימני מצומצם ואחיד בגודלו שלא נמרח */}
              <div style={{ width: '130px', minWidth: '130px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px', borderLeft: '1px solid #e2e8f0', justifyContent: 'center' }}>
                <div style={{ backgroundColor: '#10b981', color: 'white', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', marginBottom: '10px' }}>
                  דירוג: {post.rating || 5} ★
                </div>
                <div style={{ width: '45px', height: '45px', minWidth: '45px', minHeight: '45px', borderRadius: '50%', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {post.author?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span style={{ fontWeight: 'bold', color: '#064e3b', fontSize: '13px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{post.author?.name}</span>
              </div>

              {/* גוף הפוסט דחוס ומבוטח מפני התרחבות לצדדים */}
              <div style={{ flex: 1, minWidth: 0, padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
                      <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{post.category}</span>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</h3>
                      
                      {/* תצוגת בועות התגיות של פרוג */}
                      {post.tags && Array.isArray(post.tags) && post.tags.map((tag: any) => {
                        const tagName = typeof tag === 'object' && tag !== null ? tag.name : tag;
                        return (
                          <span 
                            key={tag._id || tagName}
                            onClick={(e) => {
                              e.stopPropagation(); // מונע כניסה לפוסט בלחיצה על התגית
                              setSearchQuery(tagName); // מעדכן את שדה החיפוש ומסנן מיד
                            }}
                            style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500', border: '1px solid #e2e8f0', cursor: 'pointer', transition: '0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                          >
                            #{tagName}
                          </span>
                        );
                      })}
                    </div>
                    <span style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap', marginRight: '10px' }}>
                       צפיות: {post.viewsCount || 0} | תגובות: {post.commentCount || 0}
                    </span>
                  </div>
                  <p style={{ color: '#4b5563', lineHeight: '1.5', fontSize: '14px', margin: '0 0 10px 0' }}>{post.content.substring(0, 140)}...</p>
                </div>

                {/* תצוגת תגובה אחרונה */}
                {post.lastComment && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation(); 
                      navigate(`/forum/post/${post._id}?scroll=bottom`);
                    }}
                    style={{ backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRight: '3px solid #94a3b8', marginTop: '5px', gap: '15px' }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                      <strong style={{ color: '#064e3b' }}>{post.lastComment.authorName}: </strong>
                      {post.lastComment.content.substring(0, 90)}{post.lastComment.content.length > 90 ? '...' : ''}
                    </div>
                    
                    <button 
                      style={{ backgroundColor: '#fff', color: '#16a34a', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                    >
                      לתגובה האחרונה ←
                    </button>
                  </div>
                )}

                {/* סרגל תחתון */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '8px' }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/forum/post/${post._id}`);
                    }} 
                    style={{ backgroundColor: '#fff', color: '#064e3b', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                  >
                    לכל התגובות
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* מודאל הוספת פוסט */}
      <AddPostModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onPostCreated={() => fetchPosts(searchQuery)} 
      />
    </div>
  );
};

export default ForumPage;