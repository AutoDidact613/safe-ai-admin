import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';
import type { MultiValue } from 'react-select';
import { authFetch } from '../../utils/apiClient';
import { API_BASE_URL } from '../../config/api';

interface AddPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export const AddPostModal: React.FC<AddPostModalProps> = ({ isOpen, onClose, onPostCreated }) => {
  const [formData, setFormData] = useState({ title: '', category: 'פיתוח', tags: '', content: '' });
  const [similarPosts, setSimilarPosts] = useState<{ _id: string; title: string }[]>([]);
  const [showSimilar, setShowSimilar] = useState(false); 
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [allTags, setAllTags] = useState<{ value: string; label: string }[]>([]);
  const [selectedTags, setSelectedTags] = useState<{ value: string; label: string }[]>([]);
  const [tagInputValue, setTagInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // --- סטייטים לניהול תוצאות ה-AI הנפרדות ואופציית ה-Undo ---
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiTitles, setAiTitles] = useState<string[]>([]);
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [lastRefinedContent, setLastRefinedContent] = useState('');
  const [backupContent, setBackupContent] = useState(''); 

  const loadTagsFromServer = () => {
    fetch(`${API_BASE_URL}/api/tags`)
      .then((res) => res.json())
      .then((data) => {
        const formatted = Array.isArray(data) ? data.map((tag: { _id?: string; name: string }) => ({
          value: tag._id || tag.name,
          label: tag.name
        })) : [];
        setAllTags(formatted);
      })
      .catch((err) => console.error('Error fetching tags:', err));
  };

  useEffect(() => {
    if (formData.title.length >= 3) {
      const timer = setTimeout(() => {
        fetch(`${API_BASE_URL}/api/posts/search-strict-similar?title=${encodeURIComponent(formData.title)}`)
          .then((res) => res.json())
          .then((data) => {
            setSimilarPosts(data);
            if (data && data.length > 0) setShowSimilar(true);
          })
          .catch((err) => console.error('Error fetching similar posts:', err));
      }, 600); 
      return () => clearTimeout(timer);
    } else {
      setSimilarPosts([]);
      setShowSimilar(false);
    }
  }, [formData.title]);

  useEffect(() => {
    loadTagsFromServer();
  }, []);

  if (!isOpen) return null;

const handleAiAssist = async (mode: 'refine' | 'titles' | 'tags') => {
    if (formData.content.trim().length < 15) return;
    
    if (mode === 'refine' && formData.content.trim() === lastRefinedContent) {
      setValidationError('התוכן כבר עבר אופטימיזציה ושיפור ניסוח על ידי ה-AI.');
      return;
    }

    setIsAiLoading(true);
    setValidationError(null);

    if (mode === 'titles') setAiTitles([]);
    if (mode === 'tags') setAiTags([]);

    try {
      const response = await authFetch(`${API_BASE_URL}/api/posts/ai-assist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mode, content: formData.content })
      });

      const data = await response.json();
      console.log("[AI Assist Debug] המידע שחזר מהשרת עבור", mode, ":", data);

      if (!response.ok) {
        throw new Error(data.message || 'קריאת ה-AI נכשלה');
      }

      if (mode === 'refine' && data.refinedContent) {
        setBackupContent(formData.content); 
        setFormData(prev => ({ ...prev, content: data.refinedContent }));
        setLastRefinedContent(data.refinedContent.trim()); 
      } else if (mode === 'titles') {
        // גיבוי למקרה שהשרת מחזיר שמות שדות באותיות גדולות או תחת אובייקט פנימי
        setAiTitles(data.titles || data.Titles || []);
      } else if (mode === 'tags') {
        // גיבוי למקרה שהשרת מחזיר שמות שדות באותיות גדולות או תחת אובייקט פנימי
        setAiTags(data.tags || data.Tags || []);
      }

    } catch (err: unknown) {
      console.error(err);
      setValidationError(err instanceof Error ? err.message : 'לא ניתן היה לקבל מענה מה-AI כרגע.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleUndoRefine = () => {
    if (!backupContent) return;
    setFormData(prev => ({ ...prev, content: backupContent }));
    setBackupContent('');
    setLastRefinedContent('');
  };

  const selectSuggestedTitle = (title: string) => {
    setFormData(prev => ({ ...prev, title }));
    setAiTitles([]); 
  };

  const selectSuggestedTag = (tagName: string) => {
    const cleanName = tagName.trim();
    if (!cleanName) return;

    const isAlreadySelected = selectedTags.some(t => t.label.toLowerCase() === cleanName.toLowerCase());
    if (isAlreadySelected) return;

    const existingTag = allTags.find(t => t.label.toLowerCase() === cleanName.toLowerCase());

    if (existingTag) {
      setSelectedTags(prev => [...prev, existingTag]);
    } else {
      setSelectedTags(prev => [...prev, { value: cleanName, label: cleanName }]);
    }
  };

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

    if (selectedFile) {
      try {
        const urlResponse = await fetch(`${API_BASE_URL}/api/upload/get-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileType: selectedFile.type,
          }),
        });

        if (!urlResponse.ok) throw new Error('נכשלה קבלת קישור מאובטח מהשרת');
        const { uploadUrl, fileUrl } = await urlResponse.json();

        const awsResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': selectedFile.type },
          body: selectedFile,
        });

        if (!awsResponse.ok) throw new Error('העלאת הקובץ ל-S3 נכשלה');
        finalFileUrl = fileUrl;

      } catch (error) {
        console.error('Error uploading file to S3:', error);
        setValidationError('נכשלה העלאת הקובץ המצורף לענן. אנא נסה שוב.');
        setIsSubmitting(false);
        return;
      }
    }

    const tagsPayload = selectedTags.map(t => ({ id: t.value, name: t.label }));

    const postPayload = {
      title,
      content,
      category,
      tags: tagsPayload,
      fileUrl: finalFileUrl 
    };

    try {
      const response = await authFetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postPayload)
      });

      if (response.ok) {
        setFormData({ title: '', category: 'כללי', tags: '', content: '' });
        setSelectedTags([]);
        setSelectedFile(null);
        setTagInputValue('');
        setAiTitles([]);
        setAiTags([]);
        setLastRefinedContent('');
        setBackupContent('');
        loadTagsFromServer();
        onClose(); 
        if (onPostCreated) onPostCreated();
        navigate('/forum');
      } else {
        console.error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClipClick = () => {
    fileInputRef.current?.click();
  };

  const isContentTooShort = formData.content.trim().length < 15;
  const isRefineDisabled = isAiLoading || isContentTooShort || formData.content.trim() === lastRefinedContent;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, direction: 'rtl' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '800px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '2px solid #10b981', maxHeight: '95vh', overflowY: 'auto' }}>
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
              
              {showSimilar && similarPosts.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: '#f0fdf4', padding: '12px', marginTop: '5px', borderRadius: '6px', border: '1px solid #10b981', zIndex: 999, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <small style={{ color: '#065f46', fontWeight: 'bold' }}>
                      💡 אולי כבר יש מענה לפוסט שלך? בדקי פוסטים דומים:
                    </small>
                    <button 
                      type="button" 
                      onClick={() => setShowSimilar(false)} 
                      style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                    >
                      סגור ✖
                    </button>
                  </div>
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

          <div style={{ position: 'relative', marginBottom: '15px', width: '100%' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#064e3b' }}>תוכן</label>
            <textarea 
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              placeholder="כתוב כאן את גוף הפוסט..."
              style={{ width: '100%', height: '160px', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
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

          {/* --- סרגל כלים מבוסס AI --- */}
          <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#10b981' }}>🪄</span> עוזר כתיבה חכם:
              </span>
              <button
                type="button"
                disabled={isRefineDisabled}
                onClick={() => handleAiAssist('refine')}
                style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: isRefineDisabled ? '#f3f4f6' : '#fff', color: isRefineDisabled ? '#9ca3af' : '#4b5563', cursor: isRefineDisabled ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                {isAiLoading ? 'מעבד...' : 'שפר ניסוח'}
              </button>
              
              {backupContent && (
                <button
                  type="button"
                  onClick={handleUndoRefine}
                  style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', color: '#b91c1c', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ↩️ בטל שינוי AI
                </button>
              )}

              <button
                type="button"
                disabled={isAiLoading || isContentTooShort}
                onClick={() => handleAiAssist('titles')}
                style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: isContentTooShort ? '#f3f4f6' : '#fff', color: isContentTooShort ? '#9ca3af' : '#059669', cursor: isContentTooShort ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                {isAiLoading ? 'מעבד...' : 'הצעת כותרת'}
              </button>
              <button
                type="button"
                disabled={isAiLoading || isContentTooShort}
                onClick={() => handleAiAssist('tags')}
                style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: isContentTooShort ? '#f3f4f6' : '#fff', color: isContentTooShort ? '#9ca3af' : '#2563eb', cursor: isContentTooShort ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                {isAiLoading ? 'מעבד...' : 'הצעת תגיות'}
              </button>
              {isContentTooShort && <small style={{ color: '#9ca3af', fontSize: '11px', marginRight: '5px' }}>הקלידי לפחות 15 תווים בתוכן להפעלת ה-AI</small>}
            </div>

            {/* הצגת כותרות לחיצות מוצעות */}
            {aiTitles.length > 0 && (
              <div style={{ marginTop: '12px', borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
                <small style={{ fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '6px' }}>בחרי כותרת מתאימה מההצעות:</small>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {aiTitles.map((title, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectSuggestedTitle(title)}
                      style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', color: '#2563eb', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', textAlign: 'right', fontWeight: '500', width: '100%' }}
                    >
                      💡 {title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* הצגת תגיות לחיצות מוצעות */}
            {aiTags.length > 0 && (
              <div style={{ marginTop: '12px', borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
                <small style={{ fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '6px' }}>לחצי על תגיות להוספה מהירה:</small>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {aiTags.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectSuggestedTag(tag)}
                      style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '25px' }}>
            <label style={{ fontWeight: 'bold', color: '#064e3b', fontSize: '14px' }}>תגיות נושא </label>
            <CreatableSelect
              isMulti
              options={allTags}
              value={selectedTags}
              onChange={(newValue: MultiValue<{ value: string; label: string }>) => setSelectedTags(newValue ? [...newValue] : [])}
              inputValue={tagInputValue}
              onInputChange={(val) => setTagInputValue(val)}
              placeholder="נא להכניס לפחות 3 אותיות"
              formatCreateLabel={(inputValue) => `${inputValue}`}
              menuPlacement="top"
              noOptionsMessage={() => tagInputValue.length < 3 ? "נא להקליד לפחות 3 אותיות..." : "לא נמצאה תגית מתאימה"}
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
                  fontSize: '13px'
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
              disabled={isSubmitting || isAiLoading} 
              style={{ padding: '10px 40px', background: isSubmitting ? '#a7f3d0' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '16px' }}
            >
              {isSubmitting ? 'מפרסם פוסט...' : 'הוסף'}
            </button>
            <button 
              type="button" 
              disabled={isSubmitting || isAiLoading}
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