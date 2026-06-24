import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Comment {
  _id: string;
  content: string;
  author: { name: string };
  createdAt: string;
}

interface Post {
  _id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  attachments: string[];
  viewsCount: number;
  author: { _id: string; name: string };
  createdAt: string;
}

export const PostThreadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // 1. שליפת נתוני הפוסט והתגובות שלו מהשרת
    fetch(`http://localhost:5000/api/posts/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPost(data.post);
        setComments(data.comments || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching post thread:', err);
        setLoading(false);
      });

    // 2. עדכון צפיות חכם: שליחת בקשה לשרת כדי לספור צפייה ייחודית (לא היוצר)
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    if (user) {
      fetch(`http://localhost:5000/api/posts/${id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id })
      })
        .then((res) => res.json())
        .then((viewData) => {
          // מעדכן את ה-State של הפוסט עם כמות הצפיות החדשה מהשרת
          if (viewData && viewData.viewsCount !== undefined) {
            setPost((prev) => prev ? { ...prev, viewsCount: viewData.viewsCount } : null);
          }
        })
        .catch((err) => console.error('Error incrementing view:', err));
    }
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: '50px', direction: 'rtl' }}>טוען שרשור...</div>;
  if (!post) return <div style={{ textAlign: 'center', padding: '50px', direction: 'rtl' }}>הפוסט לא נמצא.</div>;

  return (
    <div style={{ padding: '30px', direction: 'rtl', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Assistant, sans-serif' }}>
      
      {/* כפתור חזרה לפורום הראשי */}
      <button 
        onClick={() => navigate('/forum')} 
        style={{ marginBottom: '25px', cursor: 'pointer', background: 'none', border: 'none', color: '#10b981', fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '5px' }}
      >
        ← חזרה לפורום
      </button>

      {/* כרטיסיית הפוסט המלא - מעוצבת ירוק ולבן בהשראת פרוג */}
      <div style={{ display: 'flex', border: '2px solid #10b981', borderRadius: '12px', backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '35px' }}>
        
        {/* סרגל ימני: פרטי המפרסם */}
        <div style={{ width: '180px', backgroundColor: '#f0fdf4', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '25px', borderLeft: '1px solid #d1fae5' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 'bold', marginBottom: '12px' }}>
            {post.author?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span style={{ fontWeight: 'bold', color: '#064e3b', fontSize: '16px', textAlign: 'center' }}>
            {post.author?.name || 'משתמש מערכת'}
          </span>
          <small style={{ color: '#6b7280', marginTop: '10px' }}>
            {new Date(post.createdAt).toLocaleDateString()}
          </small>
        </div>

        {/* גוף התוכן השמאלי */}
        <div style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            {/* שורת כותרת עליונה */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>
                  {post.category}
                </span>
                <h1 style={{ margin: 0, fontSize: '24px', color: '#064e3b', fontWeight: 'bold' }}>{post.title}</h1>
              </div>
              <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 'bold' }}>
                👁 צפיות: {post.viewsCount}
              </span>
            </div>

            {/* תוכן הפוסט */}
            <p style={{ color: '#374151', lineHeight: '1.8', fontSize: '17px', whiteSpace: 'pre-line', margin: '20px 0' }}>
              {post.content}
            </p>
          </div>

          {/* תחתית הפוסט: תגיות וקבצים מצורפים */}
          <div>
            {/* בלוני תגיות (בדיוק כמו בפרוג) */}
            {post.tags && post.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '15px', marginBottom: '15px' }}>
                {post.tags.map((tag, idx) => (
                  <span key={idx} style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '4px 12px', borderRadius: '15px', fontSize: '13px', border: '1px solid #bbf7d0', fontWeight: 'bold' }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* רשימת קבצים מצורפים לפוסט - עודכן לתמיכה בהורדה ופתיחה ישירה */}
            {post.attachments && post.attachments.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
                {post.attachments.map((file, index) => {
                  const fileUrl = `http://localhost:5000/uploads/${file}`;
                  return (
                    <a 
                      key={index}
                      href={fileUrl}
                      target="_blank" // פותח תמונות בלשונית חדשה
                      rel="noreferrer"
                      download={file} // מאלץ הורדה לקבצי מערכת
                      style={{ 
                        textDecoration: 'none',
                        border: '1px solid #10b981', 
                        borderRadius: '6px', 
                        padding: '8px 16px', 
                        backgroundColor: '#fff', 
                        color: '#059669', 
                        fontSize: '14px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        transition: '0.2s',
                        fontWeight: 'bold'
                      }}
                    >
                      <i className="fa-solid fa-file-arrow-down"></i>
                      {file}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* אזור רשימת התגובות */}
      <h3 style={{ color: '#064e3b', borderBottom: '2px solid #d1fae5', paddingBottom: '10px', marginBottom: '20px', fontWeight: 'bold' }}>
        תגובות בשרשור ({comments.length})
      </h3>
      
      {comments.length === 0 ? (
        <p style={{ color: '#6b7280', fontStyle: 'italic' }}>אין עדיין תגובות בשרשור זה. תגובות יתווספו בשלב הבא.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {comments.map((comment) => (
            <div key={comment._id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', borderRight: '4px solid #10b981', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', border: '1px solid #e5e7eb', borderRightWidth: '4px' }}>
              <p style={{ margin: '0 0 10px 0', color: '#374151', fontSize: '15px', lineHeight: '1.6' }}>{comment.content}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '12px' }}>
                <span>מאת: <strong>{comment.author?.name || 'משתמש מערכת'}</strong></span>
                <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default PostThreadPage;