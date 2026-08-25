import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddPostModal } from './AddPostModal';
import { fetchPosts as fetchPostsFromApi, fetchSimilarPosts, moderatePost as moderatePostApi } from './api';
import type { Post } from './types';
import '../../styles/forum.css';

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

    fetchPostsFromApi(search, page, userRole)
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
      fetchSimilarPosts(queryParam)
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
      const response = await moderatePostApi(postId, currentUser._id, actionType);

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
    <div className="forum-page">

      <div className="forum-toolbar">
        <button
          onClick={() => setIsModalOpen(true)}
          className="forum-add-btn"
        >
          הוסף פוסט חדש
        </button>

        <div className="forum-search-wrap">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="חפשו פוסטים, תגיות או נושאים..."
            className="forum-search-input"
          />
          <i className="fa-solid fa-magnifying-glass forum-search-icon"></i>
        </div>
      </div>

      <div className="forum-header-row">
        <h2 className="forum-header-title">
          {searchQuery ? `תוצאות חיפוש עבור: "${searchQuery}"` : 'פוסטים בפורום'}
        </h2>
        {searchQuery && (
          <button
            onClick={handleClearFilter}
            className="forum-clear-filter-btn"
          >
            <i className="fa-solid fa-arrow-rotate-left"></i>
            חזור לרשימה המלאה
          </button>
        )}
      </div>

      {loading ? (
        <div className="forum-loading">מחפש פוסטים...</div>
      ) : !Array.isArray(posts) || posts.length === 0 ? (
        <div className="forum-empty-state">
          <i className="fa-solid fa-folder-open forum-empty-icon"></i>
          <h3 className="forum-empty-title">לא נמצאו פוסטים מתאימים</h3>
          <button onClick={handleClearFilter} className="forum-show-all-btn">
            הצג את כל הפוסטים
          </button>
        </div>
      ) : (
        <>
          <div className="forum-list">
            {posts.map((post) => {
              const lineCount = post.content.split('\n').length;
              const isLongPost = post.content.length > 140 || lineCount > 6;
              const isExpanded = expandedPosts.includes(post._id);

              return (
                <div
                  key={post._id}
                  onClick={() => navigate(`/forum/post/${post._id}`)}
                  className={`forum-card ${post.isBlocked ? 'forum-card-blocked' : ''}`}
                >
                  <div className={`forum-card-avatar-col ${post.isBlocked ? 'forum-card-avatar-col-blocked' : ''}`}>
                    {post.ratingCount > 0 && (
                      <div className="forum-card-rating-badge">
                        דירוג: {post.averageRating} ★
                      </div>
                    )}
                    <div className="forum-avatar-circle">
                      {post.author?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="forum-author-name">{post.author?.name}</span>
                  </div>

                  <div className="forum-card-body">
                    <div>
                      <div className="forum-card-meta-row">
                        <span className="forum-card-date">
                          {formatForumDate(post.createdAt)}
                        </span>
                        <span className="forum-card-stats">
                           צפיות: {post.viewsCount || 0} | תגובות: {post.commentCount || 0}
                        </span>
                      </div>

                      <div className="forum-tags-row">
                        <span className="forum-category-badge">{post.category}</span>
                        {post.isBlocked && <span className="forum-blocked-badge">🛑 חסום</span>}
                        {post.isLocked && <span className="forum-locked-badge">🔒 נעול</span>}

                        <h3 className="forum-card-title">{post.title}</h3>
                        {post.tags && Array.isArray(post.tags) && post.tags.map((tag: string | { _id: string; name: string }) => {
                          const isTagObject = typeof tag === 'object' && tag !== null;
                          const tagName = isTagObject ? tag.name : tag;
                          const tagKey = isTagObject ? tag._id : tagName;
                          return (
                            <span key={tagKey} onClick={(e) => { e.stopPropagation(); setSearchQuery(tagName); setCurrentPage(1); }} className="forum-tag-chip">
                             {tagName}
                            </span>
                          );
                        })}
                      </div>

                      <div className="forum-card-content-wrap">
                        <p className="forum-card-excerpt">
                          {isLongPost && !isExpanded
                            ? post.content.split('\n').length > 6
                              ? post.content.split('\n').slice(0, 6).join('\n')
                              : `${post.content.substring(0, 140)}`
                            : post.content}
                        </p>
                        {isLongPost && (
                          <span
                            onClick={(e) => toggleExpandPost(e, post._id)}
                            className="forum-read-more"
                          >
                            {isExpanded ? 'הצג פחות ^' : 'הצג עוד...'}
                          </span>
                        )}
                      </div>
                    </div>

                    {post.lastComment && (
                      <div onClick={(e) => { e.stopPropagation(); navigate(`/forum/post/${post._id}?scroll=bottom`); }} className="forum-last-comment">
                        <div className="forum-last-comment-text">
                          <strong className="forum-last-comment-author">{post.lastComment.authorName}: </strong>
                          {(() => {
                            const stripHtml = (html: string) => {
                              if (!html) return '';
                              return html.replace(/<\/?[^>]+(>|$)/g, " ");
                            };
                            return stripHtml(post.lastComment.content).substring(0, 90);
                          })()}
                        </div>
                        <span className="forum-last-comment-link">
                          לתגובה האחרונה ←
                        </span>
                      </div>
                    )}

                    <div className="forum-card-footer">
                      <div className="forum-card-actions">
                        {isAdmin && (
                          <>
                            <button
                              onClick={(e) => handleModeratePost(e, post._id, post.isBlocked ? 'unblock' : 'block')}
                              className={`forum-block-btn ${post.isBlocked ? 'forum-block-btn-active' : ''}`}
                            >
                              {post.isBlocked ? '🔓 ביטל חסימה' : '🛑 חסום פוסט'}
                            </button>
                            <button
                              onClick={(e) => handleModeratePost(e, post._id, post.isLocked ? 'unlock' : 'lock')}
                              className="forum-lock-btn"
                            >
                              {post.isLocked ? '🔓 שחרר נעילה' : '🔒 נעל לתגובות'}
                            </button>
                          </>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/forum/post/${post._id}`); }}
                        className="forum-comments-btn"
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
            <div className="forum-pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="forum-page-nav-btn"
              >
                הקודם ←
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`forum-page-num-btn ${currentPage === pageNumber ? 'forum-page-num-btn-active' : ''}`}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="forum-page-nav-btn"
              >
                → הבא
              </button>
            </div>
          )}

          {/* רכיב המלצות אישיות מבוסס AI עם מניעת כפילויות מלאה */}
          {recommendedPosts.length > 0 && (
            <div className="forum-recommendations">
              <h3 className="forum-recommendations-title">
                <i className="fa-solid fa-wand-magic-sparkles forum-recommendations-icon"></i>
               אולי יעניין אותך גם...
              </h3>
              <div className="forum-recommendations-list">
                {recommendedPosts.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => {
                      navigate(`/forum/post/${p._id}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="forum-recommendation-card"
                  >
                    <span className="forum-recommendation-title">
                      {p.title}
                    </span>
                    <span className="forum-recommendation-link">קרא עוד ←</span>
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