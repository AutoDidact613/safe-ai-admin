import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable'; // שדרוג: מאפשר יצירת תגיות חדשות על המקום

interface AddPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export const AddPostModal: React.FC<AddPostModalProps> = ({ isOpen, onClose, onPostCreated }) => {
  const [formData, setFormData] = useState({ title: '', category: 'פיתוח', tags: '', content: '' });
  const [similarPosts, setSimilarPosts] = useState([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // ניהול מצב שליחה חכם למניעת כפל הגשות
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [allTags, setAllTags] = useState<{ value: string; label: string }[]>([]);
  // מחזיק את המושגים הספציפיים שהמשתמש בחר כרגע בריבועים
  const [selectedTags, setSelectedTags] = useState<{ value: string; label: string }[]>([]);
  // סטייט חדש שעוקב אחרי מה שהמשתמש מקליד ברגע זה בתוך שדה התגיות
  const [tagInputValue, setTagInputValue] = useState('');

  // פונקציה ייעודית למשיכת התגיות מהשרת כדי שנוכל לקרוא לה גם בזמן יצירת תגית חדשה
  const loadTagsFromServer = () => {
    fetch('http://localhost:5000/api/tags')
      .then((res) => res.json())
      .then((data) => {
        // הגנה למקרה שהשרת מחזיר שגיאה: מוודאים שזה מערך לפני ה-map
        const formatted = Array.isArray(data) ? data.map((tag: any) => ({
          value: tag._id || tag.name,
          label: tag.name
        })) : [];
        setAllTags(formatted);
      })
      .catch((err) => console.error('Error fetching tags:', err));
  };

  // פיצ'ר: הצעת פוסטים דומים בזמן אמת בזמן הקלדת הכותרת (נשמר במלואו)
  useEffect(() => {
    if (formData.title.length >= 3) {
      const timer = setTimeout(() => {
        fetch(`http://localhost:5000/api/posts/search-similar?title=${formData.title}`)
          .then((res) => res.json())
          .then((data) => setSimilarPosts(data))
          .catch((err) => console.error('Error fetching similar posts:', err));
      }, 500); // Debounce
      return () => clearTimeout(timer);
    } else {
      setSimilarPosts([]);
    }
  }, [formData.title]);

  // משיכת התגיות הקיימות מהשרת בטעינה ראשונית
  useEffect(() => {
    loadTagsFromServer();
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // הגנה ראשונית: אם כבר נשלח, מונע הגשה כפולה
    if (isSubmitting) return;

    // הפעלת מצב טעינה (הכפתור יינעל מיד)
    setIsSubmitting(true);

    const { title, content, category } = formData;
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    // בניית ה-FormData להעלאת קבצים (נשמר במלואו)
    const formDataToSend = new FormData();
    formDataToSend.append('title', title);
    formDataToSend.append('content', content);
    formDataToSend.append('category', category);
    
    // התאמה ל-CreatableSelect: שולח מערך מסודר של אובייקטים המכילים ID קיים או שם של תגית חדשה
    const tagsPayload = selectedTags.map(t => ({ id: t.value, name: t.label }));
    formDataToSend.append('tags', JSON.stringify(tagsPayload));    
    
    formDataToSend.append('userId', user?._id || '');
    if (selectedFile) formDataToSend.append('file', selectedFile);

    try {
      const response = await fetch('http://localhost:5000/api/posts', {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        // איפוס טופס וקובץ נבחר
        setFormData({ title: '', category: 'פיתוח', tags: '', content: '' });
        setSelectedTags([]);
        setSelectedFile(null);
        setTagInputValue('');
        
        // שדרוג: רענון מאגר התגיות הכללי מיד לאחר יצירת הפוסט כדי לשמור על תגיות חדשות בזמן אמת
        loadTagsFromServer();

        // סגירת המודאל
        onClose(); 
        
        // רענון רשימת הפוסטים בעמוד הראשי
        if (onPostCreated) onPostCreated();

        // ניווט חזרה לרשימת הפוסטים הכללית
        navigate('/forum');
      } else {
        console.error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      // כיבוי מצב טעינה בשחרור הבקשה
      setIsSubmitting(false);
    }
  };

  const handleClipClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, direction: 'rtl' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '800px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '2px solid #10b981' }}>
        <h2 style={{ color: '#064e3b', textAlign: 'center', marginBottom: '25px', fontWeight: 'bold' }}>הוסף תוכן חדש</h2>
        
        <form onSubmit={handleSubmit}>
          {/* שורה ראשונה: קטגוריה, כותרת, תגיות */}
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'flex-start' }}>
            
            {/* קטגוריה */}
            <div style={{ width: '160px' }}>
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
            <div style={{ flex: 1, position: 'relative' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#064e3b' }}>כותרת</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                placeholder="רשמי כותרת נושא..."
                required 
              />
              {/* תיבת הצעות פוסטים דומים */}
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

            {/* תגיות נושא בעיצוב פרוג - עם הגבלת 3 אותיות חכמה */}
            <div style={{ flex: 1, minWidth: '250px', direction: 'rtl' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#064e3b' }}>תגיות נושא</label>
              <CreatableSelect
                isMulti
                options={allTags}
                value={selectedTags}
                onChange={(newValue: any) => setSelectedTags(newValue || [])}
                inputValue={tagInputValue} // שליטה בטקסט המוקלד
                onInputChange={(val) => setTagInputValue(val)} // עדכון הטקסט המוקלד בזמן אמת
                placeholder="הקלידי לפחות 3 אותיות..."
                formatCreateLabel={(inputValue) => `צור תגית חדשה: "${inputValue}"`}
                
                // 1. הגדרת ההודעה הדינמית: אם הוקלדו פחות מ-3 אותיות, נבקש להמשיך להקליד
                noOptionsMessage={() => 
                  tagInputValue.length < 3 
                    ? "נא להקליד לפחות 3 אותיות..." 
                    : "לא נמצאה תגית מתאימה"
                }
                
                // 2. פונקציית הסינון החכמה: רשימת האפשרויות תישאר ריקה לחלוטין כל עוד אין 3 אותיות ומעלה
                filterOption={(option, rawInput) => {
                  if (rawInput.length < 3) return false; // מסתיר את כל הרשימה הכללית מראש
                  return option.label.toLowerCase().includes(rawInput.toLowerCase()); // מציג רק תגיות מתאימות מהאות השלישית
                }}
                
                isSearchable
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: '#ddd',
                    borderRadius: '6px',
                    padding: '2px',
                    textAlign: 'right',
                    boxShadow: 'none',
                    '&:hover': { borderColor: '#10b981' }
                  }),
                  multiValue: (base) => ({
                    ...base,
                    backgroundColor: '#ecfdf5',
                    borderRadius: '4px',
                    border: '1px solid #a7f3d0'
                  }),
                  multiValueLabel: (base) => ({
                    ...base,
                    color: '#065f46',
                    fontWeight: 'bold',
                    paddingRight: '6px',
                    paddingLeft: '6px',
                  }),
                  multiValueRemove: (base) => ({
                    ...base,
                    color: '#10b981',
                    ':hover': {
                      backgroundColor: '#fee2e2',
                      color: '#ef4444',
                    },
                  }),
                }}
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
            
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            
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
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '10px', alignItems: 'center' }}>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              style={{ padding: '10px 40px', background: isSubmitting ? '#a7f3d0' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '16px' }}
            >
              {isSubmitting ? 'מפרסם פוסט...' : 'הוסף'}
            </button>
            <button 
              type="button" 
              disabled={isSubmitting}
              onClick={onClose} 
              style={{ padding: '10px 20px', background: 'none', border: 'none', color: '#666', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPostModal;