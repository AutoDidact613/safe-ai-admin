import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';
import { apiCall } from '../../config/api'; // ייבוא פונקציית השרת המרכזית בהתאם למיקום הקובץ בפרויקט

interface AddPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

// הגדרת טיפוסים בסיסיים שמתקבלים מה-API
interface TagOption {
  _id?: string;
  name: string;
}

interface SimilarPost {
  _id: string;
  title: string;
}

interface UploadUrlResponse {
  uploadUrl: string;
  fileUrl: string;
}

export const AddPostModal: React.FC<AddPostModalProps> = ({ isOpen, onClose, onPostCreated }) => {
  const [formData, setFormData] = useState({ title: '', category: 'פיתוח', tags: '', content: '' });
  const [similarPosts, setSimilarPosts] = useState<SimilarPost[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [allTags, setAllTags] = useState<{ value: string; label: string }[]>([]);
  const [selectedTags, setSelectedTags] = useState<{ value: string; label: string }[]>([]);
  const [tagInputValue, setTagInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // טעינת תגיות באמצעות ה-apiCall המרכזי
  const loadTagsFromServer = () => {
    apiCall<TagOption[]>('/api/tags')
      .then((data) => {
        const formatted = Array.isArray(data) ? data.map((tag: { _id?: string; name: string }) => ({
          value: tag._id || tag.name,
          label: tag.name
        })) : [];
        setAllTags(formatted);
      })
      .catch((err) => console.error('Error fetching tags:', err));
  };

  // חיפוש פוסטים דומים בזמן אמת
  useEffect(() => {
    if (formData.title.length >= 3) {
      const timer = setTimeout(() => {
        apiCall<SimilarPost[]>(`/api/posts/search-similar?title=${encodeURIComponent(formData.title)}`)
          .then((data) => setSimilarPosts(data))
          .catch((err) => console.error('Error fetching similar posts:', err));
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSimilarPosts([]);
    }
  }, [formData.title]);

  useEffect(() => {
    loadTagsFromServer();
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedTags || selectedTags.length === 0) {
      setValidationError('חובה לבחור או ליצור לפחות תגית אחת עבור הפוסט!');
      return;
    }
    setValidationError(null);
    setIsSubmitting(true);

    const { title, content, category } = formData;
    let finalFileUrl = ""; 

    // --- שלב א': העלאת קובץ ל-S3 (במידה וקיים) ---
    if (selectedFile) {
      try {
        // שימוש ב-apiCall לקבלת ה-Pre-signed URL מהשרת שלנו
        const { uploadUrl, fileUrl } = await apiCall<UploadUrlResponse>('/upload/get-url', {
          method: 'POST',
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileType: selectedFile.type,
          }),
        });

        // העלאה ישירה ל-S3 (כאן נשארים עם fetch רגיל מכיוון שמדובר ביעד חיצוני של AWS ולא בשרת המערכת)
        const awsResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': selectedFile.type },
          body: selectedFile,
        });

        if (!awsResponse.ok) throw new Error('העלאת הקובץ ל-S3 נכשלה');
        finalFileUrl = fileUrl;

      } catch (error) {
        console.error('Error uploading file:', error);
        setValidationError('נכשלה העלאת הקובץ המצורף לענן. אנא נסה שוב.');
        setIsSubmitting(false);
        return;
      }
    }

    // --- שלב ב': יצירת הפוסט במערכת ---
    const tagsPayload = selectedTags.map(t => ({ id: t.value, name: t.label }));
    const postPayload = {
      title,
      content,
      category,
      tags: tagsPayload,
      fileUrl: finalFileUrl
    };

    try {
      // יצירת הפוסט בעזרת apiCall
      await apiCall('/api/posts', {
        method: 'POST',
        body: JSON.stringify(postPayload),
      });

      // איפוס והצלחה
      setFormData({ title: '', category: 'פיתוח', tags: '', content: '' });
      setSelectedTags([]);
      setSelectedFile(null);
      setTagInputValue('');
      loadTagsFromServer();
      onClose(); 
      if (onPostCreated) onPostCreated();
      navigate('/forum');
    } catch (error) {
      console.error('Error creating post:', error);
      setValidationError('אירעה שגיאה בשמירת הפוסט בשרת.');
    } finally {
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
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'flex-end', width: '100%' }}>
            <div style={{ width: '160px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', color: '#064e3b', fontSize: '14px' }}>קטגוריה/מקדם</label>
              <select 
                value={formData.category} 
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '6px', border: '2px solid #d1fae5', backgroundColor: '#fff', fontSize: '14px', outline: 'none' }}
              >
                <option value="פיתוח">פיתוח</option>
                <option value="AI">AI</option>
                <option value="כללי">כללי</option>
              </select>
            </div>

            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', color: '#064e3b', fontSize: '14px' }}>כותרת</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '6px', border: '2px solid #d1fae5', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                placeholder="רשמי כותרת נושא..."
                required 
              />
              
              {similarPosts.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: '#f0fdf4', padding: '12px', marginTop: '5px', borderRadius: '6px', border: '1px solid #10b981', zIndex: 10 }}>
                  <small style={{ color: '#065f46', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                    💡 אולי כבר יש מענה לפוסט שלך? בדקי פוסטים דומים:
                  </small>
                  {similarPosts.map((post: { _id: string; title: string }) => (
                    <div key={post._id} style={{ marginBottom: '4px' }}>
                      <a href={`/forum/post/${post._id}`} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#059669', textDecoration: 'underline' }}>
                        {post.title}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ position: 'relative', marginBottom: '20px', width: '100%' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#064e3b' }}>תוכן</label>
            <textarea 
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              placeholder="כתוב כאן את גוף הפוסט..."
              style={{ 
                width: '100%', 
                height: '200px', 
                padding: '15px', 
                borderRadius: '8px', 
                border: '1px solid #ddd', 
                fontSize: '15px', 
                outline: 'none',
                boxSizing: 'border-box'
              }}
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

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '25px' }}>
            <label style={{ fontWeight: 'bold', color: '#064e3b', fontSize: '14px' }}>תגיות נושא </label>
            <CreatableSelect
              isMulti
              options={allTags}
              value={selectedTags}
              onChange={(newValue: readonly { value: string; label: string }[] | null) => setSelectedTags(newValue ? [...newValue] : [])}
              inputValue={tagInputValue}
              onInputChange={(val) => setTagInputValue(val)}
              placeholder="נא להכניס לפחות 3 אותיות"
              formatCreateLabel={(inputValue) => `${inputValue}`}
              menuPlacement="top"
              noOptionsMessage={() => 
                tagInputValue.length < 3 
                  ? "נא להקליד לפחות 3 אותיות..." 
                  : "לא נמצאה תגית מתאימה"
              }
              filterOption={(option, rawInput) => {
                if (rawInput.length < 3) return false;
                return option.label.toLowerCase().includes(rawInput.toLowerCase());
              }}
              isSearchable
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#d1fae5',
                  borderWidth: '2px',
                  borderRadius: '6px',
                  minHeight: '40px',
                  height: 'auto',
                  textAlign: 'right',
                  boxShadow: 'none',
                  backgroundColor: '#fff',
                  paddingLeft: '8px',
                  paddingRight: '8px',
                  boxSizing: 'border-box',
                  '&:hover': { borderColor: '#10b981' }
                }),
                valueContainer: (base) => ({
                  ...base,
                  height: 'auto',
                  maxHeight: 'none',
                  overflowY: 'visible',
                  padding: '4px 6px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px'
                }),
                input: (base) => ({
                  ...base,
                  margin: '2px',
                  padding: '0px'
                }),
                menu: (base) => ({
                  ...base,
                  zIndex: 1050,
                  border: '1px solid #10b981',
                  boxShadow: '0 -4px 12px rgba(0,0,0,0.1)'
                }),
                multiValue: (base) => ({
                  ...base,
                  backgroundColor: '#ecfdf5',
                  borderRadius: '4px',
                  border: '1px solid #a7f3d0',
                  margin: '2px'
                }),
                multiValueLabel: (base) => ({
                  ...base,
                  color: '#065f46',
                  fontWeight: 'bold',
                  paddingRight: '6px',
                  paddingLeft: '6px',
                  fontSize: '13px'
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
          {validationError && (
            <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '4px', padding: '10px 12px', marginBottom: '12px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚠️ {validationError}
            </div>
          )}

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