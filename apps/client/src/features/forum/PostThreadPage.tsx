import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import {
  fetchPostById,
  fetchSimilarPosts,
  incrementPostView,
  deleteComment,
  getUploadUrl,
  uploadFileToS3,
  createComment,
  ratePost,
} from './api';
import type { Post, Comment } from './types';
import '../../styles/forum.css';

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
  const isCommentBlocked = !isAdmin && currentUser?.canComment === false;

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
    fetchPostById(id)
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
          fetchSimilarPosts(`postId=${data.post._id}`)
            .then((res) => res.json())
            .then((similarData) => {
              if (Array.isArray(similarData)) {
                const filtered = similarData.filter((p: { _id: string }) => p._id !== data.post._id);

                const uniqueMap = new Map();
                filtered.forEach(p => uniqueMap.set(p._id, p));
                const finalSimilar = Array.from(uniqueMap.values());

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
      incrementPostView(id, user._id)
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
      const response = await deleteComment(commentId, currentUser?._id);

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
        const urlResponse = await getUploadUrl(selectedFile.name, selectedFile.type);

        if (!urlResponse.ok) throw new Error('נכשלה קבלת קישור מאובטח לתגובה');
        const { uploadUrl, fileUrl } = await urlResponse.json();

        const awsResponse = await uploadFileToS3(uploadUrl, selectedFile);

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
      const response = await createComment(id, commentPayload);

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
    if (!post || !currentUser) return;
    setUserRating(selectedRating);

    try {
      const response = await ratePost(post._id, currentUser?._id, selectedRating);

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
    const monthName = monthFormatter.format(date).replace(/[֑-ׇ]/g, "");
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
          className="forum-attachment-image"
        >
          <img src={fileUrl} alt="תצוגה מקדימה" className="forum-attachment-image-img" />
        </div>
      );
    }

    let iconClass = 'fa-solid fa-file';
    let iconColor = 'var(--text-muted)';

    if (fileExtension === 'pdf') {
      iconClass = 'fa-solid fa-file-pdf';
      iconColor = 'var(--color-danger)';
    } else if (['doc', 'docx'].includes(fileExtension)) {
      iconClass = 'fa-solid fa-file-word';
      iconColor = 'var(--link-color)';
    } else if (['xls', 'xlsx'].includes(fileExtension)) {
      iconClass = 'fa-solid fa-file-excel';
      iconColor = 'var(--brand-secondary)';
    } else if (['zip', 'rar', '7z'].includes(fileExtension)) {
      iconClass = 'fa-solid fa-file-zipper';
      iconColor = 'var(--color-warning)';
    } else if (['ts', 'tsx', 'js', 'jsx', 'html', 'css', 'json'].includes(fileExtension)) {
      iconClass = 'fa-solid fa-file-code';
      iconColor = '#8b5cf6';
    }

    return (
      <div
        key={index}
        className="forum-attachment-file"
      >
        <i className={`${iconClass} forum-attachment-icon`} style={{ color: iconColor }}></i>

        <div className="forum-attachment-info">
          <span
            className="forum-attachment-filename"
            title={fileName}
          >
            {fileName}
          </span>
          <span className="forum-attachment-filetype">קובץ {fileExtension}</span>
        </div>

        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          download={fileName}
          className="forum-attachment-download"
        >
          <i className="fa-solid fa-download"></i>
          הורדה
        </a>
      </div>
    );
  };

  if (loading) return <div className="forum-thread-loading">טוען שרשור...</div>;

  if (loading) return <div className="forum-thread-loading">טוען שרשור...</div>;
  if (!post) return <div className="forum-thread-not-found">הפוסט לא נמצא.</div>;

  return (
    <div className="forum-thread-page">

      <button
        onClick={() => navigate('/forum')}
        className="forum-back-btn"
      >
        ← חזרה לפורום
      </button>

      <div className="forum-post-card">
        <div className="forum-post-avatar-col">
          <div className="forum-post-avatar-circle">
            {post.author?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="forum-post-author-name">
            {post.author?.name || 'משתמש מערכת'}
          </span>
        </div>

        <div className="forum-post-body">
          <div>
            <div className="forum-post-meta-row">
              <span className="forum-post-meta-text">
                {formatForumDate(post.createdAt)}
              </span>
              <span className="forum-post-meta-text">
                👁 צפיות: {post.viewsCount}
              </span>
            </div>

            <div className="forum-post-badges-row">
              <span className="forum-post-category-badge">
                {post.category}
              </span>
              {post.isLocked && (
                <span className="forum-post-locked-badge">
                  🔒 נעול
                </span>
              )}
              <h1 className="forum-post-title">{post.title}</h1>
            </div>

            <p className="forum-post-content">
              {post.content}
            </p>
          </div>

          <div className="forum-post-footer-row">
            {post.tags && post.tags.length > 0 && (
              <div className="forum-post-tags-list">
                {post.tags.map((tag: string | { name: string }, idx) => {
                  const tagName = typeof tag === 'object' && tag !== null ? tag.name : tag;
                  return (
                    <span key={idx} className="forum-post-tag-chip">
                      #{tagName}
                    </span>
                  );
                })}
              </div>
            )}

           {post.attachments && post.attachments.length > 0 && (
              <div className="forum-post-attachments-list">
                {post.attachments.map((file, index) => renderFileAttachment(file, index))}
              </div>
            )}
          </div>
        </div>
      </div>
      {currentUser && (     
      <div className="forum-rating-row">
        <span className="forum-rating-label">דירוג הפוסט:</span>
        <div className="forum-stars-row">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= (hoverRating || userRating);
            return (
              <span
                key={star}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className={`forum-star ${isFilled ? 'forum-star-filled' : ''}`}
              >
                ★
              </span>
            );
          })}
        </div>
        <span className="forum-rating-summary">
          ({post.averageRating || 0}/5 מתוך {post.ratingCount || 0} מדרגים)
        </span>
      </div>
      )}

      {comments.length > 0 && (
        <div className="forum-comments-list">
          {comments.map((comment, index) => {
            const commenterInitial = comment.author?.name?.charAt(0).toUpperCase() || 'U';
            return (
              <div
                key={comment._id}
                className={`forum-comment-item ${index === comments.length - 1 ? 'forum-comment-item-last' : ''} ${index % 2 !== 0 ? 'forum-comment-item-odd' : ''}`}
              >
                <div className="forum-comment-avatar-col">
                  <div className="forum-comment-avatar-circle">
                    {commenterInitial}
                  </div>
                  <small className="forum-comment-author-name">
                    {comment.author?.name || 'משתמש'}
                  </small>
                </div>

                <div className="forum-comment-body">
                  <div className="forum-comment-header-row">
                    <div className="forum-comment-date">
                      {formatForumDate(comment.createdAt)}
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        title="מחק תגובה זו כעל מנהל"
                        className="forum-comment-delete-btn"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                        מחק
                      </button>
                    )}
                  </div>

                  <div
                    dangerouslySetInnerHTML={{ __html: comment.content }}
                    className="forum-comment-content"
                  />

                {comment.attachments && comment.attachments.length > 0 && (
                    <div className="forum-comment-attachments-list">
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
        <div className="forum-locked-notice">
          <i className="fa-solid fa-lock forum-locked-icon"></i>
          <span>שרשור זה ננעל לתגובות חדשות על ידי מנהל המערכת.</span>
        </div>
      ) : !currentUser ? (
       <div className="forum-unauthorized-notice">
        <span>יש <Link to="/login" className="forum-login-link">להתחבר</Link> כדי להגיב כאן</span>
      </div>
      ) : (
        <div className="forum-comment-form-wrap">
          <div className="forum-comment-form-avatar-col">
            <div className="forum-comment-form-avatar-circle">
              {currentUserInitial}
            </div>
            <small className="forum-comment-form-username">
              {currentUser?.name || 'את/ה'}
            </small>
          </div>

          <form
            onSubmit={handleCommentSubmit}
            className="forum-comment-form"
          >
            {editor && (
              <div className="forum-editor-toolbar">
                <select 
                  onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
                  className="forum-editor-select"
                >
                  <option value="Arial">Sans Serif (Arial)</option>
                  <option value="Courier New">Fixed Width</option>
                  <option value="Times New Roman">Serif</option>
                </select>

                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'p') editor.chain().focus().setParagraph().run();
                    else editor.chain().focus().toggleHeading({ level: Number(val) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
                  }}
                  className="forum-editor-select"
                >
                  <option value="p">טקסט רגיל</option>
                  <option value="3">כותרת קטנה</option>
                  <option value="2">כותרת בינונית</option>
                  <option value="1">כותרת גדולה</option>
                </select>

                <div className="forum-editor-divider" />

                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`forum-editor-btn forum-editor-btn-text forum-editor-btn-bold ${editor.isActive('bold') ? 'forum-editor-btn-active' : ''}`}
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`forum-editor-btn forum-editor-btn-text forum-editor-btn-italic ${editor.isActive('italic') ? 'forum-editor-btn-active' : ''}`}
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  className={`forum-editor-btn forum-editor-btn-text forum-editor-btn-strike ${editor.isActive('strike') ? 'forum-editor-btn-active' : ''}`}
                >
                  S
                </button>

                <div className="forum-editor-divider" />

                <select
                  onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                  className="forum-editor-select-plain"
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
                  className="forum-editor-select-plain"
                >
                  <option value="none">⚪ ללא רקע</option>
                  <option value="#fef08a">צהוב</option>
                  <option value="#bbf7d0">ירוק בהיר</option>
                  <option value="#bfdbfe">כחול בהיר</option>
                </select>

                <div className="forum-editor-divider" />

                <button
                  type="button"
                  onClick={() => editor.chain().focus().setTextAlign('right').run()}
                  className={`forum-editor-btn forum-editor-btn-align ${editor.isActive({ textAlign: 'right' }) ? 'forum-editor-btn-active' : ''}`}
                >
                  ➡️
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().setTextAlign('center').run()}
                  className={`forum-editor-btn forum-editor-btn-align ${editor.isActive({ textAlign: 'center' }) ? 'forum-editor-btn-active' : ''}`}
                >
                  ↔️
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().setTextAlign('left').run()}
                  className={`forum-editor-btn forum-editor-btn-align ${editor.isActive({ textAlign: 'left' }) ? 'forum-editor-btn-active' : ''}`}
                >
                  ⬅️
                </button>

                <div className="forum-editor-divider" />

                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={`forum-editor-btn forum-editor-btn-text ${editor.isActive('bulletList') ? 'forum-editor-btn-active' : ''}`}
                >
                  • רשימה
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={`forum-editor-btn forum-editor-btn-text ${editor.isActive('orderedList') ? 'forum-editor-btn-active' : ''}`}
                >
                  1. רשימה
                </button>
              </div>
            )}

            {selectedFile && (
              <div className="forum-selected-file-banner">
                <i className="fa-solid fa-circle-check forum-selected-file-icon"></i>
                <span>הקובץ המצורף <strong>{selectedFile.name}</strong> הועלה ומוכן לשמירה!</span>
                <button type="button" onClick={() => setSelectedFile(null)} className="forum-remove-file-btn">הסר קובץ</button>
              </div>
            )}

            <div
              onClick={() => editor?.commands.focus()}
              className="forum-editor-content-wrap"
            >
              <style>{`
                .ProseMirror { outline: none !important; min-height: 140px; white-space: pre-wrap !important; }
                .ProseMirror p { margin: 0 0 8px 0; }
                .ProseMirror p.is-editor-empty::before {
                  content: attr(data-placeholder);
                  float: right;
                  color: var(--text-muted);
                  font-weight: 300;
                  font-size: 14px;
                  pointer-events: none;
                  height: 0;
                }
              `}</style>
              <EditorContent editor={editor} />
            </div>

            <div className="forum-comment-form-footer">
              <button
                type="submit"
                disabled={commentLoading || isCommentBlocked}
                title={isCommentBlocked ? "אין לך הרשאה להגיב לפוסטים" : undefined}
                className="forum-comment-submit-btn"
              >
                {commentLoading ? "שומר..." : "שמור תגובה"}
              </button>
              
              <input type="file" ref={commentFileInputRef} className="forum-file-input-hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              <button type="button" onClick={() => commentFileInputRef.current?.click()} className="forum-attach-comment-btn">
                <i className="fa-solid fa-paperclip"></i> צרף קובץ לתגובה
              </button>
            </div>
          </form>
        </div>
      )}

      {similarPosts.length > 0 && (
        <div className="forum-thread-recommendations">
          <h3 className="forum-thread-recommendations-title">
            <i className="fa-solid fa-circle-nodes forum-thread-recommendations-icon"></i>
            פוסטים נוספים שיכולים לעניין אותך:
          </h3>
          <div className="forum-thread-recommendations-grid">
            {similarPosts.map((p) => (
              <div
                key={p._id}
                onClick={() => {
                  navigate(`/forum/post/${p._id}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="forum-thread-recommendation-card"
              >
                <h4 className="forum-thread-recommendation-title">{p.title}</h4>
                <span className="forum-thread-recommendation-link">המשך לשרשור המלא ←</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default PostThreadPage;