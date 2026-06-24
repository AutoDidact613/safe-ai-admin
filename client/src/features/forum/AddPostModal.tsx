import React, { useState, useEffect, useRef } from 'react';

interface AddPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export const AddPostModal: React.FC<AddPostModalProps> = ({ isOpen, onClose, onPostCreated }) => {
  const [formData, setFormData] = useState({ title: '', category: 'פיתוח', tags: '', content: '' });
  const [similarPosts, setSimilarPosts] = useState([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  // יצירת רפרנס (Ref) לשדה בחירת הקבצים הנסתר
  const fileInputRef = useRef<HTMLInputElement>(null);

  // פיצ'ר: הצעת פוסטים דומים בזמן אמת בזמן הקלדת הכותרת
  useEffect(() => {
    if (formData.title.length >= 3) {
      const timer = setTimeout(() => {
        fetch(`http://localhost:5000/api/posts/search-similar?title=${formData.title}`)
          .then((res) => res.json())
          .then((data) => setSimilarPosts(data))
          .catch((err) => console.error('Error fetching similar posts:', err));
      }, 500); // Debounce: מחכה חצי שנייה אחרי סיום ההקלדה כדי לא להעמיס על השרת
      return () => clearTimeout(timer);
    } else {
      setSimilarPosts([]);
    }
  }, [formData.title]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  // יצירת אובייקט FormData מיוחד לשליחת קבצים
  const formDataToSend = new FormData();
  formDataToSend.append('title', formData.title);
  formDataToSend.append('content', formData.content);
  formDataToSend.append('category', formData.category);
  formDataToSend.append('tags', formData.tags);
  formDataToSend.append('userId', user?._id || '');

  // אם המשתמש בחר קובץ מהמחשב - מצרפים אותו לבקשה
  if (selectedFile) {
    formDataToSend.append('file', selectedFile);
  }

  try {
    const response = await fetch('http://localhost:5000/api/posts', {
      method: 'POST',
      // שימי לב: כששולחים FormData *לא* כותבים Content-Type ב-headers, הדפדפן עושה זאת לבד!
      body: formDataToSend 
    });

    if (response.ok) {
      onPostCreated();
      onClose();
      setFormData({ title: '', category: 'פיתוח', tags: '', content: '' });
      setSelectedFile(null);
    }
  } catch (err) {
    console.error('Error saving post:', err);
  } finally {
    setLoading(false);
  }
};

  // פונקציה שמדמה לחיצה על ה-input הנסתר של הקבצים
  const handleClipClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, direction: 'rtl' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '800px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '2px solid #10b981' }}>
        <h2 style={{ color: '#064e3b', textAlign: 'center', marginBottom: '25px', fontWeight: 'bold' }}>הוסף תוכן חדש</h2>
        
        <form onSubmit={handleSubmit}>
          {/* שורה ראשונה: קטגוריה, כותרת, תגיות */}
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            
            {/* קטגוריה */}
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#064e3b' }}>קטגוריה/מקדם</label>
              <select 
                value={formData.category} 
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1fae5', backgroundColor: '#f0fdf4' }}
              >
                <option value="פיתוח">פיתוח</option>
                <option value="AI">AI</option>
                <option value="כללי">כללי</option>
              </select>
            </div>

            {/* כותרת + תיבת הצעות פוסטים דומים */}
            <div style={{ flex: 2, position: 'relative' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#064e3b' }}>כותרת</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                placeholder="רשמי כותרת נושא..."
                required 
              />
              {/* תיבת הצעות פוסטים דומים (האתר מביא למשתמש) */}
              {similarPosts.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: '#f0fdf4', padding: '12px', marginTop: '5px', borderRadius: '6px', border: '1px solid #10b981', zIndex: 10 }}>
                  <small style={{ color: '#065f46', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                    💡 אולי כבר יש מענה לפוסט שלך? בדקי פוסטים דומים:
                  </small>
                  {similarPosts.map((post: any) => (
                    <div key={post._id} style={{ marginBottom: '4px' }}>
                      <a href={`/forum/post/${post._id}`} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#059669', textDecoration: 'underline' }}>
                        {post.title}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#064e3b' }}>תגיות (הפרידי בפסיק)</label>
            <input 
                type="text" 
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                placeholder="למשל: פיתוח, שגיאה, react"
            />
            </div>
          </div>

          {/* תוכן הפוסט + לחצן קבצים מובנה */}
          <div style={{ position: 'relative', marginBottom: '25px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#064e3b' }}>תוכן</label>
            <textarea 
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              placeholder="כתבי כאן את גוף הפוסט..." 
              style={{ width: '100%', height: '200px', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px' }}
              required
            />
            
            {/* שדה קובץ נסתר של הדפדפן */}
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            
            {/* לחצן הצירוף המעוצב (לפי הסקיצה ממוקם בתוך התוכן משמאל) */}
            <button 
              type="button" 
              onClick={handleClipClick}
              style={{ position: 'absolute', bottom: '15px', left: '15px', backgroundColor: '#ecfdf5', border: '1px solid #10b981', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', color: '#059669', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <i className="fa-solid fa-paperclip"></i>
              {selectedFile ? `📎 ${selectedFile.name}` : 'צירוף קבצים'}
            </button>
          </div>

          {/* כפתורי שליטה */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '10px' }}>
            <button type="submit" disabled={loading} style={{ padding: '10px 40px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
              {loading ? 'מעלה פוסט...' : 'הוסף'}
            </button>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};