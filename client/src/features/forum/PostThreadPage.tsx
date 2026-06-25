import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

interface Comment {
  _id: string;
  content: string;
  author: { name: string };
  createdAt: string;
  attachments?: string[]; // קבצים מצורפים לתגובה במודל
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
  const location = useLocation();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newCommentText, setNewCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

    // שליפת נתוני הפוסט והתגובות שלו מהשרת
    fetch(`http://localhost:5000/api/posts/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPost(data.post);
        setComments(data.comments || []);
        setLoading(false);
        
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get('scroll') === 'bottom') {
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
        }
      })
      .catch((err) => {
        console.error('Error fetching post thread:', err);
        setLoading(false);
      });

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
          if (viewData && viewData.viewsCount !== undefined) {
            setPost((prev) => prev ? { ...prev, viewsCount: viewData.viewsCount } : null);
          }
        })
        .catch((err) => console.error('Error incrementing view:', err));
    }
  }, [id, location.search]);

  // שליחת תגובה חדשה כולל תמיכה מלאה בהעלאת קבצים (FormData)
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || commentLoading) return;

    setCommentLoading(true);
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    const formDataToSend = new FormData();
    formDataToSend.append('postId', id || '');
    formDataToSend.append('content', newCommentText);
    formDataToSend.append('userId', user?._id || '');
    if (selectedFile) {
      formDataToSend.append('file', selectedFile);
    }

    try {
      const response = await fetch(`http://localhost:5000/api/posts/${id}/comment`, {
        method: 'POST',
        body: formDataToSend
      });

      if (response.ok) {
        const savedComment = await response.json();
        setComments((prevComments) => [...prevComments, savedComment]);
        setNewCommentText('');
        setSelectedFile(null);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px', color: '#10b981', fontWeight: 'bold', direction: 'rtl' }}>טוען שרשור...</div>;
  if (!post) return <div style={{ textAlign: 'center', padding: '50px', direction: 'rtl' }}>הפוסט לא נמצא.</div>;

  const currentUserStr = localStorage.getItem('user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const currentUserInitial = currentUser?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <div style={{ padding: '20px', direction: 'rtl', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Assistant, sans-serif' }}>
      
      {/* כפתור חזרה לפורום הראשי */}
      <button 
        onClick={() => navigate('/forum')} 
        style={{ marginBottom: '15px', cursor: 'pointer', background: 'none', border: 'none', color: '#10b981', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}
      >
        ← חזרה לפורום
      </button>

      {/* כרטיסיית הפוסט המלא */}
      <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '15px' }}>
        
        {/* סרגל ימני: פרטי המפרסם */}
        <div style={{ width: '140px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px', borderLeft: '1px solid #e2e8f0' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '5px' }}>
            {post.author?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span style={{ fontWeight: 'bold', color: '#064e3b', fontSize: '14px', textAlign: 'center' }}>
            {post.author?.name || 'משתמש מערכת'}
          </span>
          <small style={{ color: '#6b7280', fontSize: '11px', marginTop: '3px' }}>
            {new Date(post.createdAt).toLocaleDateString()}
          </small>
        </div>

        {/* גוף התוכן השמאלי */}
        <div style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold' }}>
                  {post.category}
                </span>
                <h1 style={{ margin: 0, fontSize: '19px', color: '#064e3b', fontWeight: 'bold' }}>{post.title}</h1>
              </div>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                👁 צפיות: {post.viewsCount}
              </span>
            </div>

            <p style={{ color: '#374151', lineHeight: '1.5', fontSize: '15px', whiteSpace: 'pre-line', margin: '5px 0' }}>
              {post.content}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            {post.tags && post.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {post.tags.map((tag, idx) => (
                  <span key={idx} style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', border: '1px solid #bbf7d0', fontWeight: 'bold' }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {post.attachments && post.attachments.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {post.attachments.map((file, index) => {
                  const fileUrl = `http://localhost:5000/uploads/${file}`;
                  return (
                    <a 
                      key={index}
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={file}
                      style={{ textDecoration: 'none', border: '1px solid #10b981', borderRadius: '4px', padding: '4px 10px', backgroundColor: '#fff', color: '#059669', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}
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

      {/* ריבוע מאוחד ודחוס לכל התגובות - עודכנו צבעי האייקונים ונוספו מרווחים נקיים בין השורות */}
      {comments.length > 0 && (
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: '20px' }}>
          {comments.map((comment, index) => {
            const commenterInitial = comment.author?.name?.charAt(0).toUpperCase() || 'U';
            return (
              <div 
                key={comment._id} 
                style={{ 
                  display: 'flex',
                  padding: '16px 15px', // הגדלת הריפוד הפנימי לריווח נעים
                  borderBottom: index === comments.length - 1 ? 'none' : '1px solid #e2e8f0', 
                  backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc'
                }}
              >
                {/* אייקון המשתמש שכתב את התגובה - שונה לצבע הירוק המקורי של האתר */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px', marginLeft: '15px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(16,185,129,0.1)' }}>
                    {commenterInitial}
                  </div>
                  <small style={{ color: '#064e3b', fontSize: '11px', marginTop: '4px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', fontWeight: 'bold' }}>
                    {comment.author?.name || 'משתמש'}
                  </small>
                </div>

                {/* תוכן התגובה והקבצים המצורפים אליה */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ color: '#9ca3af', fontSize: '10px', marginBottom: '4px' }}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </div>
                  
                  <p style={{ margin: 0, color: '#374151', fontSize: '14px', lineHeight: '1.5' }}>{comment.content}</p>

                  {/* הצגת קבצים מצורפים לתגובה */}
                  {comment.attachments && comment.attachments.length > 0 && (
                    <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
                      {comment.attachments.map((file, idx) => (
                        <a key={idx} href={`http://localhost:5000/uploads/${file}`} target="_blank" rel="noreferrer" download style={{ textDecoration: 'none', color: '#059669', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fa-solid fa-paperclip"></i> {file}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div ref={bottomRef} />

      {/* טופס תגובה קומפקטי - מיושר ימינה במדויק לפי הסקיצה (אייקון מימין, תוכן משמאל) */}
      <div style={{ border: '1px solid #10b981', borderRadius: '4px', padding: '15px', backgroundColor: '#f0fdf4', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
        
        {/* אייקון המשתמש המחובר - ממוקם בצד ימין כדרישת הסקיצה */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
          <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(16,185,129,0.2)' }}>
            {currentUserInitial}
          </div>
          <small style={{ color: '#064e3b', fontWeight: 'bold', marginTop: '3px', fontSize: '11px', textAlign: 'center' }}>
            {currentUser?.name || 'את/ה'}
          </small>
        </div>

        {/* תוכן הטופס - ממוקם בצד שמאל */}
        <form onSubmit={handleCommentSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <textarea 
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="כתבי את תגובתך כאן..."
            required
            style={{ width: '100%', height: '65px', padding: '8px', borderRadius: '4px', border: '1px solid #d1fae5', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="submit" disabled={commentLoading} style={{ backgroundColor: '#10b981', color: 'white', padding: '6px 20px', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
              {commentLoading ? 'שומר...' : 'שמור תגובה'}
            </button>
            
            <input type="file" ref={commentFileInputRef} style={{ display: 'none' }} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
            <button type="button" onClick={() => commentFileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#059669', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="fa-solid fa-paperclip"></i> {selectedFile ? selectedFile.name : 'צרף קובץ לתגובה'}
            </button>
          </div>
        </form>

      </div>

    </div>
  );
};

export default PostThreadPage;