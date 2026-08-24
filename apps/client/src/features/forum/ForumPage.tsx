import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddPostModal } from './AddPostModal';
import { API_BASE_URL } from '../../config/api';

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
  isBlocked?: boolean;
  isLocked?: boolean;
  ratingCount: number;
  averageRating: number;
}

export const ForumPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<string[]>([]);
  
  // ניהול חלוקת עמודים
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // המלצות אישיות מבוססות היסטוריה
  const [recommendedPosts, setRecommendedPosts] = useState<{ _id: string; title: string }[]>([]);

  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isAdmin = currentUser?.role === 'admin';

  const fetchPosts = (search: string = '', page: number = 1) => {
    setLoading(true);
    const userRole = currentUser?.role || 'user';

    const baseUrl = search.trim()
      ? `${API_BASE_URL}/api/posts/search?query=${encodeURIComponent(search)}`
      : `${API_BASE_URL}/api/posts?page=${page}`;
    
    const url = baseUrl.includes('?') 
      ? `${baseUrl}&userRole=${userRole}${!search.trim() ? '' : `&page=${page}`}` 
      : `${baseUrl}?userRole=${userRole}&page=${page}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('שרת הפורום החזיר שגיאה');
        return res.json();
      })
      .then((data) => {
        if (data && data.posts) {
          setPosts(data.posts);
          setCurrentPage(data.currentPage || page);
          setTotalPages(data.totalPages || 1);

          localStorage.setItem('user_posts_backup', JSON.stringify(data.posts.map((p: Post) => ({ _id: p._id, title: p.title }))));
        } else {
          setPosts(Array.isArray(data) ? data : []);
          setCurrentPage(1);
          setTotalPages(1);
        }
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
      fetchPosts(searchQuery, currentPage);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, currentPage]);

  // אפקט חכם המושך המלצות ומסנן כפילויות - מעודכן לשימוש ב-postId מהיר
  useEffect(() => {
    const userHistory = JSON.parse(localStorage.getItem('viewed_titles') || '[]');
    let targetTitle = '';

    if (userHistory.length > 0) {
      targetTitle = userHistory[0];
    } else if (posts.length > 0) {
      targetTitle = posts[0].title;
    }

    // שינוי: בניית ה-queryParam בצורה חכמה. עדיפות עליונה ל-postId של פוסט קיים למהירות שיא
    let queryParam = '';
    if (posts.length > 0) {
      queryParam = `postId=${posts[0]._id}`;
    } else if (targetTitle) {
      queryParam = `title=${encodeURIComponent(targetTitle)}`;
    }

    if (queryParam) {
      fetch(`${API_BASE_URL}/api/posts/search-similar?${queryParam}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const currentPostIds = posts.map(p => p._id);
            
            // 1. סינון פוסטים שמוצגים כרגע בעמוד
            const filtered = data.filter((p: { _id: string }) => !currentPostIds.includes(p._id));

            // 2. מניעת כפילויות פנימיות
            const uniqueMap = new Map();
            filtered.forEach(p => uniqueMap.set(p._id, p));
            const finalRecommendations = Array.from(uniqueMap.values());

            // 3. מנגנון השלמה (Fallback): אם נשארו פחות מ-3 פוסטים לאחר הסינון,
            // ניקח פוסטים אחרים מהעמוד הנוכחי כדי להשלים לשלשה קבועה
            if (finalRecommendations.length < 3 && posts.length > 0) {
              for (const postItem of posts) {
                if (finalRecommendations.length >= 3) break;
                if (!finalRecommendations.some(r => r._id === postItem._id)) {
                  finalRecommendations.push({
                    _id: postItem._id,
                    title: postItem.title
                  });
                }
              }
            }

            // 4. חיתוך מדויק של 3 פוסטים בלבד
            setRecommendedPosts(finalRecommendations.slice(0, 3));
          } else {
            setRecommendedPosts([]);
          }
        })
        .catch((err) => console.error('Error fetching personalized recommendations:', err));
    }
  }, [posts]);

  const handleClearFilter = () => {
    setSearchQuery('');
    setCurrentPage(1);
    fetchPosts('', 1); 
  };

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleExpandPost = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation(); 
    setExpandedPosts((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const handleModeratePost = async (e: React.MouseEvent, postId: string, actionType: 'block' | 'unblock' | 'lock' | 'unlock') => {
    e.stopPropagation(); 
    if (!currentUser?._id) return alert('משתמש לא מחובר');

    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/moderation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser._id,
          actionType: actionType
        })
      });

      if (response.ok) {
        fetchPosts(searchQuery, currentPage);
      } else {
        const errData = await response.json();
        alert(errData.message || 'שגיאה בביצוע הפעולה');
      }
    } catch (error) {
      console.error('Error moderating post:', error);
      alert('שגיאה בתקשורת עם השרת');
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

  return (
    <div style={{ padding: '20px', direction: 'rtl', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Assistant, sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', gap: '20px' }}>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 25px', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
        >
          הוסף פוסט חדש
        </button>

        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="חפשו פוסטים, תגיות או נושאים..."
            style={{ width: '100%', padding: '10px 35px 10px 15px', borderRadius: '6px', border: '2px solid #d1fae5', fontSize: '15px', outline: 'none' }}
          />
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', color: '#10b981', fontSize: '16px' }}></i>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #10b981', paddingBottom: '10px', marginBottom: '25px' }}>
        <h2 style={{ color: '#064e3b', margin: 0, fontWeight: 'bold', fontSize: '20px' }}>
          {searchQuery ? `תוצאות חיפוש עבור: "${searchQuery}"` : 'פוסטים בפורום'}
        </h2>
        {searchQuery && (
          <button
            onClick={handleClearFilter}
            style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fa-solid fa-arrow-rotate-left"></i>
            חזור לרשימה המלאה
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '50px', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>מחפש פוסטים...</div>
      ) : !Array.isArray(posts) || posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '2px dashed #cbd5e1', borderRadius: '12px', backgroundColor: '#f8fafc', color: '#64748b' }}>
          <i className="fa-solid fa-folder-open" style={{ fontSize: '50px', color: '#cbd5e1', marginBottom: '15px' }}></i>
          <h3 style={{ margin: '0 0 10px 0', color: '#475569' }}>לא נמצאו פוסטים מתאימים</h3>
          <button onClick={handleClearFilter} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            הצג את כל הפוסטים
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {posts.map((post) => {
              const lineCount = post.content.split('\n').length;
              const isLongPost = post.content.length > 140 || lineCount > 6;
              const isExpanded = expandedPosts.includes(post._id);

              return (
                <div 
                  key={post._id} 
                  onClick={() => navigate(`/forum/post/${post._id}`)} 
                  style={{ display: 'flex', border: post.isBlocked ? '1px dashed #ef4444' : '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: post.isBlocked ? '#fef2f2' : '#fff', cursor: 'pointer', overflow: 'hidden', transition: '0.1s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                >
                  <div style={{ width: '130px', minWidth: '130px', backgroundColor: post.isBlocked ? '#fee2e2' : '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px', borderLeft: '1px solid #e2e8f0', justifyContent: 'flex-start' }}>
                    {post.ratingCount > 0 && (
                      <div style={{ backgroundColor: '#10b981', color: 'white', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', marginBottom: '10px' }}>
                        דירוג: {post.averageRating} ★
                      </div>
                    )}
                    <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                      {post.author?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span style={{ fontWeight: 'bold', color: '#064e3b', fontSize: '13px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{post.author?.name}</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0, padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '400' }}>
                          {formatForumDate(post.createdAt)}
                        </span>
                        <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '400', whiteSpace: 'nowrap' }}>
                           צפיות: {post.viewsCount || 0} | תגובות: {post.commentCount || 0}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '8px', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold' }}>{post.category}</span>
                        {post.isBlocked && <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '1px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold' }}>🛑 חסום</span>}
                        {post.isLocked && <span style={{ backgroundColor: '#f59e0b', color: 'white', padding: '1px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold' }}>🔒 נעול</span>}

                        <h3 style={{ margin: 0, fontSize: '21px', color: '#0f172a', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</h3>
                        {post.tags && Array.isArray(post.tags) && post.tags.map((tag: string | { _id: string; name: string }) => {
                          const isTagObject = typeof tag === 'object' && tag !== null;
                          const tagName = isTagObject ? tag.name : tag;
                          const tagKey = isTagObject ? tag._id : tagName;
                          return (
                            <span key={tagKey} onClick={(e) => { e.stopPropagation(); setSearchQuery(tagName); setCurrentPage(1); }} style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                             {tagName}
                            </span>
                          );
                        })}
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <p style={{ color: '#4b5563', lineHeight: '1.5', fontSize: '14px', margin: 0, whiteSpace: 'pre-line' }}>
                          {isLongPost && !isExpanded 
                            ? post.content.split('\n').length > 6
                              ? post.content.split('\n').slice(0, 6).join('\n')
                              : `${post.content.substring(0, 140)}`
                            : post.content}
                        </p>
                        {isLongPost && (
                          <span 
                            onClick={(e) => toggleExpandPost(e, post._id)}
                            style={{ color: '#10b981', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'inline-block', marginTop: '4px', userSelect: 'none' }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                          >
                            {isExpanded ? 'הצג פחות ^' : 'הצג עוד...'}
                          </span>
                        )}
                      </div>
                    </div>

                    {post.lastComment && (
                      <div onClick={(e) => { e.stopPropagation(); navigate(`/forum/post/${post._id}?scroll=bottom`); }} style={{ backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRight: '3px solid #94a3b8', marginTop: '5px', gap: '15px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                          <strong style={{ color: '#064e3b' }}>{post.lastComment.authorName}: </strong>
                          {(() => {
                            const stripHtml = (html: string) => {
                              if (!html) return '';
                              return html.replace(/<\/?[^>]+(>|$)/g, " ");
                            };
                            return stripHtml(post.lastComment.content).substring(0, 90);
                          })()}
                        </div>
                        <span style={{ color: '#16a34a', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', textDecoration: 'none' }}>
                          לתגובה האחרונה ←
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {isAdmin && (
                          <>
                            <button 
                              onClick={(e) => handleModeratePost(e, post._id, post.isBlocked ? 'unblock' : 'block')}
                              style={{ backgroundColor: post.isBlocked ? '#10b981' : '#ef4444', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                            >
                              {post.isBlocked ? '🔓 ביטל חסימה' : '🛑 חסום פוסט'}
                            </button>
                            <button 
                              onClick={(e) => handleModeratePost(e, post._id, post.isLocked ? 'unlock' : 'lock')}
                              style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                            >
                              {post.isLocked ? '🔓 שחרר נעילה' : '🔒 נעל לתגובות'}
                            </button>
                          </>
                        )}
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/forum/post/${post._id}`); }} 
                        style={{ backgroundColor: '#fff', color: '#064e3b', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                      >
                        לכל התגובות
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '35px', gap: '6px', userSelect: 'none' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                style={{ backgroundColor: currentPage === 1 ? '#f1f5f9' : '#fff', color: currentPage === 1 ? '#94a3b8' : '#10b981', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                הקודם ←
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  style={{ backgroundColor: currentPage === pageNumber ? '#10b981' : '#fff', color: currentPage === pageNumber ? 'white' : '#334155', border: '1px solid #cbd5e1', width: '38px', height: '38px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: '0.15s' }}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                style={{ backgroundColor: currentPage === totalPages ? '#f1f5f9' : '#fff', color: currentPage === totalPages ? '#94a3b8' : '#10b981', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                → הבא
              </button>
            </div>
          )}

          {/* רכיב המלצות אישיות מבוסס AI עם מניעת כפילויות מלאה */}
          {recommendedPosts.length > 0 && (
            <div style={{ marginTop: '45px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ color: '#064e3b', margin: '0 0 15px 0', fontSize: '15px', fontWeight: 'bold' }}>
                <i className="fa-solid fa-wand-magic-sparkles" style={{ marginLeft: '8px', color: '#f59e0b' }}></i>
               אולי יעניין אותך גם...
              </h3>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {recommendedPosts.map((p) => (
                  <div 
                    key={p._id}
                    onClick={() => {
                      navigate(`/forum/post/${p._id}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{ flex: '1', minWidth: '260px', backgroundColor: '#fff', padding: '12px 15px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10b981'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                  >
                    <span style={{ color: '#1e293b', fontSize: '14px', fontWeight: '500', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.title}
                    </span>
                    <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold', display: 'inline-block', marginTop: '5px' }}>קרא עוד ←</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <AddPostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onPostCreated={() => fetchPosts(searchQuery, currentPage)} />
    </div>
  );
};

export default ForumPage;