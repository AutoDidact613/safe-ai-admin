import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';

interface Comment {
  _id: string;
  content: string;
  author: { name: string };
  createdAt: string;
  attachments?: string[];
}

interface Post {
  _id: string;
  title: string;
  content: string;
  category: string;
  tags: { _id: string; name: string }[];
  attachments: string[];
  viewsCount: number;
  author: { _id: string; name: string };
  createdAt: string;
  isLocked?: boolean;
  ratingCount: number;
  averageRating: number;
  ratedBy: string[];
}

export const PostThreadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [similarPosts, setSimilarPosts] = useState<{ _id: string; title: string }[]>([]);

  const currentUserStr = localStorage.getItem('user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const currentUserInitial = currentUser?.name?.charAt(0).toUpperCase() || 'U';
  const isAdmin = currentUser?.role === 'admin';

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder: 'כתוב תגובה...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: '',
  });

  const loadPostAndComments = () => {
    if (!id) return;
    fetch(`http://localhost:5000/api/posts/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPost(data.post);
        setComments(data.comments || []);
        setLoading(false);

        if (data.post && data.post.title) {
          const currentTitle = data.post.title;
          
          const existingHistory = JSON.parse(localStorage.getItem('viewed_titles') || '[]');
          const updatedHistory = existingHistory.filter((title: string) => title !== currentTitle);
          updatedHistory.unshift(currentTitle);
          if (updatedHistory.length > 5) updatedHistory.pop();
          localStorage.setItem('viewed_titles', JSON.stringify(updatedHistory));

          // שימוש בפרמטר postId המהיר ב-100% מול ה-Backend
          fetch(`http://localhost:5000/api/posts/search-similar?postId=${data.post._id}`)
            .then((res) => res.json())
            .then((similarData) => {
              if (Array.isArray(similarData)) {
                let filtered = similarData.filter((p: any) => p._id !== data.post._id);

                const uniqueMap = new Map();
                filtered.forEach(p => uniqueMap.set(p._id, p));
                let finalSimilar = Array.from(uniqueMap.values());

                if (finalSimilar.length < 3) {
                  const backupPosts = JSON.parse(localStorage.getItem('user_posts_backup') || '[]');
                  for (const fallbackItem of backupPosts) {
                    if (finalSimilar.length >= 3) break;
                    if (fallbackItem._id !== data.post._id && !finalSimilar.some(r => r._id === fallbackItem._id)) {
                      finalSimilar.push({
                        _id: fallbackItem._id,
                        title: fallbackItem.title
                      });
                    }
                  }
                }

                setSimilarPosts(finalSimilar.slice(0, 3));
              } else {
                setSimilarPosts([]);
              }
            })
            .catch((err) => console.error('Error fetching similar posts:', err));
        }
      })
      .catch((err) => {
        console.error('Error fetching post thread:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!id) return;

    loadPostAndComments();

    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('scroll') === 'bottom') {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 300);
    }

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

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('האם את בטוחה שברצונך למחוק תגובה זו לצמיתות?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/posts/comment/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?._id })
      });

      if (response.ok) {
        setComments((prev) => prev.filter((comment) => comment._id !== commentId));
      } else {
        const errData = await response.json();
        alert(errData.message || 'שגיאה במחיקת התגובה');
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('שגיאה בתקשורת עם השרת');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;

    const htmlContent = editor.getHTML();
    if (!htmlContent || htmlContent === '<p></p>' || commentLoading) return;

    setCommentLoading(true);
    let finalFileUrl = "";

    if (selectedFile) {
      try {
        const urlResponse = await fetch('http://localhost:5000/api/upload/get-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileType: selectedFile.type,
          }),
        });

        if (!urlResponse.ok) throw new Error('נכשלה קבלת קישור מאובטח לתגובה');
        const { uploadUrl, fileUrl } = await urlResponse.json();

        const awsResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': selectedFile.type },
          body: selectedFile,
        });

        if (!awsResponse.ok) throw new Error('העלאת קובץ התגובה ל-S3 נכשלה');
        finalFileUrl = fileUrl;

      } catch (error) {
        console.error('Error uploading comment file to S3:', error);
        alert('נכשלה העלאת הקובץ המצורף לתגובה. אנו נסה שוב.');
        setCommentLoading(false);
        return;
      }
    }

    const commentPayload = {
      postId: id || '',
      content: htmlContent,
      fileUrl: finalFileUrl,
      userId: currentUser?._id
    };

    try {
      const response = await fetch(`http://localhost:5000/api/posts/${id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentPayload)
      });

      if (response.ok) {
        const savedComment = await response.json();
        setComments((prevComments) => [...prevComments, savedComment]);
        editor.commands.clearContent(); 
        setSelectedFile(null);
        navigate('/forum');
      } else {
        const errData = await response.json();
        alert(`שגיאת שרת: ${errData.message || 'לא ניתן לשמור תגובה'}`);
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleStarClick = async (selectedRating: number) => {
    if (!post) return;
    setUserRating(selectedRating);

    try {
      const response = await fetch(`http://localhost:5000/api/posts/${post._id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: currentUser?._id,
          rating: selectedRating
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPost((prev) => prev ? { ...prev, averageRating: data.averageRating, ratingCount: data.ratingCount } : null);
      }
    } catch (error) {
      console.error('Failed to save rating:', error);
    }
  };

  const convertToGematriaPipe = (num: number): string => {
    if (num === 15) return 'טו"';
    if (num === 16) return 'טז"';
    const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];
    const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    const units = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    let result = '';
    const h = Math.floor((num % 1000) / 100);
    const t = Math.floor((num % 100) / 10);
    const u = num % 10;
    if (h > 0) result += hundreds[h] || '';
    if (t > 0) result += tens[t] || '';
    if (u > 0) result += units[u] || '';
    if (result.length === 1) {
      return `${result}'`;
    } else if (result.length > 1) {
      return `${result.slice(0, -1)}"${result.slice(-1)}`;
    }
    return result;
  };

  const formatForumDate = (dateInput: string | Date | number): string => {
    const now = new Date();
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const timeString = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (diffInMinutes < 60 && diffInMinutes >= 0) {
      return diffInMinutes === 0 ? 'עכשיו' : `לפני ${diffInMinutes} דקות`;
    } 
    if (compareDate.getTime() === today.getTime()) return `היום ב-${timeString}`;
    if (compareDate.getTime() === yesterday.getTime()) return `אתמול ב-${timeString}`;

    const isCurrentYear = date.getFullYear() === now.getFullYear();
    const monthFormatter = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { month: 'long' });
    const monthName = monthFormatter.format(date).replace(/[\u0591-\u05C7]/g, "");
    const dayLetters = convertToGematriaPipe(date.getDate());
    let hebrewDate = `${dayLetters} ב${monthName}`;

    if (!isCurrentYear) {
      const jewishYearFormatter = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { year: 'numeric' });
      const yearParts = jewishYearFormatter.format(date).split(' ');
      let yearLetters = yearParts[yearParts.length - 1];
      if (yearLetters.startsWith('ה')) yearLetters = yearLetters.substring(1);
      hebrewDate += ` ${yearLetters}`;
    }

    const gregoreanDate = date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'numeric',
      year: isCurrentYear ? undefined : 'numeric'
    });
    return `${hebrewDate} / ${gregoreanDate}`;
  };
const renderFileAttachment = (fileUrl: string, index: number) => {
    if (!fileUrl) return null;
    
    // 1. פיענוח תווים מיוחדים בעברית (הופך %D7%A5 וכדומה לאותיות אמיתיות)
    const cleanPath = decodeURIComponent(fileUrl.split('?')[0]);
    let fileName = cleanPath.split('/').pop() || 'קובץ מצורף';
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

    // 2. חילוץ השם המקורי בצורה בטוחה: 
    // אם יש קו תחתון (_) או מיקוף (-) ושם הקובץ ארוך מאוד (כמו במקרה של GUID או Timestamp של S3)
    if (fileName.length > 30) {
      if (fileName.includes('_')) {
        // לוקח את כל מה שמופיע אחרי הקו התחתון הראשון
        fileName = fileName.substring(fileName.indexOf('_') + 1);
      } else if (fileName.includes('-')) {
        // לוקח את החלק האחרון אחרי המיקופים של ה-GUID
        const parts = fileName.split('-');
        if (parts.length > 4) {
          fileName = parts.slice(4).join('-');
        }
      }
    }

    // 3. הגנה חיונית: אם החיתוך השתבש והשאיר שם ריק או רק את הסיומת, נחזיר את השם המקורי לפני החיתוך
    if (!fileName || fileName.startsWith('.') || fileName === fileExtension) {
      fileName = cleanPath.split('/').pop() || 'קובץ מצורף';
    }

    // 4. הגבלת אורך תצוגה אסתטית (למשל: document...docx)
    if (fileName.length > 25) {
      const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
      fileName = `${nameWithoutExtension.substring(0, 12)}...${nameWithoutExtension.slice(-4)}.${fileExtension}`;
    }

    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);

    if (isImage) {
      return (
        <div
          key={index}
          onClick={() => window.open(fileUrl, '_blank')}
          title="לחצי להגדלת התמונה"
          style={{ width: '75px', height: '75px', borderRadius: '8px', border: '1px solid #10b981', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'transform 0.15s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <img src={fileUrl} alt="תצוגה מקדימה" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      );
    }

    let iconClass = 'fa-solid fa-file';
    let iconColor = '#64748b';

    if (fileExtension === 'pdf') {
      iconClass = 'fa-solid fa-file-pdf';
      iconColor = '#ef4444';
    } else if (['doc', 'docx'].includes(fileExtension)) {
      iconClass = 'fa-solid fa-file-word';
      iconColor = '#3b82f6';
    } else if (['xls', 'xlsx'].includes(fileExtension)) {
      iconClass = 'fa-solid fa-file-excel';
      iconColor = '#10b981';
    } else if (['zip', 'rar', '7z'].includes(fileExtension)) {
      iconClass = 'fa-solid fa-file-zipper';
      iconColor = '#f59e0b';
    } else if (['ts', 'tsx', 'js', 'jsx', 'html', 'css', 'json'].includes(fileExtension)) {
      iconClass = 'fa-solid fa-file-code';
      iconColor = '#8b5cf6';
    }

    return (
      <div 
        key={index}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 14px', width: '320px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
      >
        <i className={iconClass} style={{ fontSize: '24px', color: iconColor }}></i>
        
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <span 
            style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            title={fileName}
          >
            {fileName}
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>קובץ {fileExtension}</span>
        </div>

        <a 
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          download={fileName}
          style={{ textDecoration: 'none', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '5px 10px', color: '#475569', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', transition: '0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
        >
          <i className="fa-solid fa-download"></i>
          הורדה
        </a>
      </div>
    );
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px', color: '#10b981', fontWeight: 'bold', direction: 'rtl' }}>טוען שרשור...</div>;

  if (loading) return <div style={{ textAlign: 'center', padding: '50px', color: '#10b981', fontWeight: 'bold', direction: 'rtl' }}>טוען שרשור...</div>;
  if (!post) return <div style={{ textAlign: 'center', padding: '50px', direction: 'rtl' }}>הפוסט לא נמצא.</div>;

  return (
    <div style={{ padding: '20px', direction: 'rtl', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Assistant, sans-serif' }}>
      
      <button 
        onClick={() => navigate('/forum')} 
        style={{ marginBottom: '15px', cursor: 'pointer', background: 'none', border: 'none', color: '#10b981', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}
      >
        ← חזרה לפורום
      </button>

      <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '15px' }}>
        <div style={{ width: '140px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px', borderLeft: '1px solid #e2e8f0' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '5px' }}>
            {post.author?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span style={{ fontWeight: 'bold', color: '#064e3b', fontSize: '14px', textAlign: 'center' }}>
            {post.author?.name || 'משתמש מערכת'}
          </span>
        </div>

        <div style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '400' }}>
                {formatForumDate(post.createdAt)}
              </span>
              <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '400' }}>
                👁 צפיות: {post.viewsCount}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', gap: '10px' }}>
              <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold' }}>
                {post.category}
              </span>
              {post.isLocked && (
                <span style={{ backgroundColor: '#f59e0b', color: 'white', padding: '1px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🔒 נעול
                </span>
              )}
              <h1 style={{ margin: 0, fontSize: '19px', color: '#064e3b', fontWeight: 'bold' }}>{post.title}</h1>
            </div>

            <p style={{ color: '#374151', lineHeight: '1.5', fontSize: '15px', whiteSpace: 'pre-line', margin: '5px 0' }}>
              {post.content}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            {post.tags && post.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {post.tags.map((tag: any, idx) => {
                  const tagName = typeof tag === 'object' && tag !== null ? tag.name : tag;
                  return (
                    <span key={idx} style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', border: '1px solid #bbf7d0', fontWeight: 'bold' }}>
                      #{tagName}
                    </span>
                  );
                })}
              </div>
            )}

           {post.attachments && post.attachments.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {post.attachments.map((file, index) => renderFileAttachment(file, index))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px', padding: '12px 0', borderTop: '1px solid #eee', marginBottom: '20px' }}>
        <span style={{ fontSize: '14px', color: '#4b5563', fontWeight: '500' }}>דירוג הפוסט:</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= (hoverRating || userRating);
            return (
              <span
                key={star}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  fontSize: '26px',
                  cursor: 'pointer',
                  color: isFilled ? '#ffbc00' : '#e5e7eb',
                  transition: 'color 0.1s ease-in-out',
                  userSelect: 'none'
                }}
              >
                ★
              </span>
            );
          })}
        </div>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
          ({post.averageRating || 0}/5 מתוך {post.ratingCount || 0} מדרגים)
        </span>
      </div>

      {comments.length > 0 && (
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: '20px' }}>
          {comments.map((comment, index) => {
            const commenterInitial = comment.author?.name?.charAt(0).toUpperCase() || 'U';
            return (
              <div 
                key={comment._id} 
                style={{ 
                  display: 'flex',
                  padding: '16px 15px', 
                  borderBottom: index === comments.length - 1 ? 'none' : '1px solid #e2e8f0', 
                  backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px', marginLeft: '15px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(16,185,129,0.1)' }}>
                    {commenterInitial}
                  </div>
                  <small style={{ color: '#064e3b', fontSize: '11px', marginTop: '4px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', fontWeight: 'bold' }}>
                    {comment.author?.name || 'משתמש'}
                  </small>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ color: '#9ca3af', fontSize: '11px', fontWeight: '400' }}>
                      {formatForumDate(comment.createdAt)}
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        title="מחק תגובה זו כעל מנהל"
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', padding: '2px 6px', borderRadius: '4px', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <i className="fa-solid fa-trash-can"></i>
                        מחק
                      </button>
                    )}
                  </div>
                  
                  <div 
                    dangerouslySetInnerHTML={{ __html: comment.content }} 
                    style={{ margin: '4px 0 0 0', color: '#374151', fontSize: '14px', lineHeight: '1.5' }} 
                  />

                {comment.attachments && comment.attachments.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                      {comment.attachments.map((file, idx) => renderFileAttachment(file, idx))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div ref={bottomRef} />

      {post.isLocked ? (
        <div style={{ border: '2px dashed #f59e0b', borderRadius: '6px', padding: '20px', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#b45309', fontWeight: 'bold', fontSize: '15px', textAlign: 'center', marginBottom: '25px' }}>
          <i className="fa-solid fa-lock" style={{ fontSize: '20px' }}></i>
          <span>שרשור זה ננעל לתגובות חדשות על ידי מנהל המערכת.</span>
        </div>
      ) : (
        <div style={{ border: '1px solid #10b981', borderRadius: '4px', padding: '15px', backgroundColor: '#f0fdf4', display: 'flex', gap: '15px', alignItems: 'flex-start', marginBottom: '25px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
            <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(16,185,129,0.2)' }}>
              {currentUserInitial}
            </div>
            <small style={{ color: '#064e3b', fontWeight: 'bold', marginTop: '3px', fontSize: '11px', textAlign: 'center' }}>
              {currentUser?.name || 'את/ה'}
            </small>
          </div>

          <form 
            onSubmit={handleCommentSubmit} 
            style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0px', border: '1px solid #d1fae5', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#fff' }}
          >
            {editor && (
              <div style={{ display: 'flex', gap: '6px', padding: '6px 10px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', alignItems: 'center', flexWrap: 'wrap' }}>
                <select 
                  onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
                  style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '2px 4px', fontSize: '12px', color: '#374151', outline: 'none' }}
                >
                  <option value="Arial">Sans Serif (Arial)</option>
                  <option value="Courier New">Fixed Width</option>
                  <option value="Times New Roman">Serif</option>
                </select>

                <select 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'p') editor.chain().focus().setParagraph().run();
                    else editor.chain().focus().toggleHeading({ level: Number(val) as any }).run();
                  }}
                  style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '2px 4px', fontSize: '12px', color: '#374151', outline: 'none' }}
                >
                  <option value="p">טקסט רגיל</option>
                  <option value="3">כותרת קטנה</option>
                  <option value="2">כותרת בינונית</option>
                  <option value="1">כותרת גדולה</option>
                </select>

                <div style={{ width: '1px', height: '16px', backgroundColor: '#e5e7eb', margin: '0 2px' }} />

                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  style={{ background: editor.isActive('bold') ? '#e5e7eb' : 'none', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#374151' }}
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  style={{ background: editor.isActive('italic') ? '#e5e7eb' : 'none', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontStyle: 'italic', color: '#374151' }}
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  style={{ background: editor.isActive('strike') ? '#e5e7eb' : 'none', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', textDecoration: 'line-through', color: '#374151' }}
                >
                  S
                </button>

                <div style={{ width: '1px', height: '16px', backgroundColor: '#e5e7eb', margin: '0 2px' }} />

                <select 
                  onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                  style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '2px 4px', fontSize: '12px', outline: 'none' }}
                >
                  <option value="#374151">✒️ שחור</option>
                  <option value="#10b981">ירוק</option>
                  <option value="#2563eb">כחול</option>
                  <option value="#ef4444">אדום</option>
                </select>

                <select 
                  onChange={(e) => {
                    if (e.target.value === 'none') editor.chain().focus().unsetHighlight().run();
                    else editor.chain().focus().toggleHighlight({ color: e.target.value }).run();
                  }}
                  style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '2px 4px', fontSize: '12px', outline: 'none' }}
                >
                  <option value="none">⚪ ללא רקע</option>
                  <option value="#fef08a">צהוב</option>
                  <option value="#bbf7d0">ירוק בהיר</option>
                  <option value="#bfdbfe">כחול בהיר</option>
                </select>

                <div style={{ width: '1px', height: '16px', backgroundColor: '#e5e7eb', margin: '0 2px' }} />

                <button
                  type="button"
                  onClick={() => editor.chain().focus().setTextAlign('right').run()}
                  style={{ background: editor.isActive({ textAlign: 'right' }) ? '#e5e7eb' : 'none', border: 'none', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  ➡️
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().setTextAlign('center').run()}
                  style={{ background: editor.isActive({ textAlign: 'center' }) ? '#e5e7eb' : 'none', border: 'none', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  ↔️
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().setTextAlign('left').run()}
                  style={{ background: editor.isActive({ textAlign: 'left' }) ? '#e5e7eb' : 'none', border: 'none', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  ⬅️
                </button>

                <div style={{ width: '1px', height: '16px', backgroundColor: '#e5e7eb', margin: '0 2px' }} />

                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  style={{ background: editor.isActive('bulletList') ? '#e5e7eb' : 'none', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: '#374151' }}
                >
                  • רשימה
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  style={{ background: editor.isActive('orderedList') ? '#e5e7eb' : 'none', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: '#374151' }}
                >
                  1. רשימה
                </button>
              </div>
            )}

            {selectedFile && (
              <div style={{ padding: '6px 12px', backgroundColor: '#f0fdf4', borderBottom: '1px solid #d1fae5', display: 'flex', alignItems: 'center', justifyItems: 'flex-start', gap: '8px', color: '#15803d', fontSize: '13px', fontWeight: '500' }}>
                <i className="fa-solid fa-circle-check" style={{ fontSize: '14px' }}></i>
                <span>הקובץ המצורף <strong>{selectedFile.name}</strong> הועלה ומוכן לשמירה!</span>
                <button type="button" onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', marginRight: 'auto' }}>הסר קובץ</button>
              </div>
            )}

            <div 
              onClick={() => editor?.commands.focus()} 
              style={{ padding: '12px', minHeight: '160px', direction: 'rtl', textAlign: 'right', backgroundColor: '#fff', cursor: 'text' }}
            >
              <style>{`
                .ProseMirror { outline: none !important; min-height: 140px; white-space: pre-wrap !important; }
                .ProseMirror p { margin: 0 0 8px 0; }
                .ProseMirror p.is-editor-empty::before {
                  content: attr(data-placeholder);
                  float: right;
                  color: #9ca3af;
                  font-weight: 300;
                  font-size: 14px;
                  pointer-events: none;
                  height: 0;
                }
              `}</style>
              <EditorContent editor={editor} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#fafafa', borderTop: '1px solid #f3f4f6' }}>
              <button type="submit" disabled={commentLoading} style={{ backgroundColor: '#10b981', color: 'white', padding: '6px 20px', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                {commentLoading ? 'שומר...' : 'שמור תגובה'}
              </button>
              
              <input type="file" ref={commentFileInputRef} style={{ display: 'none' }} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              <button type="button" onClick={() => commentFileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#059669', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className="fa-solid fa-paperclip"></i> צרף קובץ לתגובה
              </button>
            </div>
          </form>
        </div>
      )}

      {similarPosts.length > 0 && (
        <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ color: '#064e3b', margin: '0 0 15px 0', fontSize: '16px', fontWeight: 'bold' }}>
            <i className="fa-solid fa-circle-nodes" style={{ marginLeft: '8px', color: '#10b981' }}></i>
            פוסטים נוספים שיכולים לעניין אותך:
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
            {similarPosts.map((p) => (
              <div 
                key={p._id}
                onClick={() => {
                  navigate(`/forum/post/${p._id}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', transition: '0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10b981'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
              >
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1e293b', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</h4>
                <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>המשך לשרשור המלא ←</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default PostThreadPage;