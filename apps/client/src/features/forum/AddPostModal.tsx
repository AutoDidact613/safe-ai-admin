import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';
import type { MultiValue } from 'react-select';
import {
  fetchTags,
  fetchStrictSimilarPosts,
  generateAiAssistance,
  getUploadUrl,
  uploadFileToS3,
  createPost,
} from './api';
import '../../styles/forum.css';

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
    fetchTags()
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
        fetchStrictSimilarPosts(formData.title)
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
      const response = await generateAiAssistance(mode, formData.content);

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
        const urlResponse = await getUploadUrl(selectedFile.name, selectedFile.type);

        if (!urlResponse.ok) throw new Error('נכשלה קבלת קישור מאובטח מהשרת');
        const { uploadUrl, fileUrl } = await urlResponse.json();

        const awsResponse = await uploadFileToS3(uploadUrl, selectedFile);

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
      const response = await createPost(postPayload);

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
    <div className="forum-modal-overlay">
      <div className="forum-modal-box">
        <h2 className="forum-modal-title">הוסף תוכן חדש</h2>

        <form onSubmit={handleSubmit}>

          <div className="forum-form-row">
            <div className="forum-category-field">
              <label className="forum-field-label">קטגוריה/מקדם</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="forum-category-select"
              >
                <option value="פיתוח">פיתוח</option>
                <option value="AI">AI</option>
                <option value="כללי">כללי</option>
              </select>
            </div>

            <div className="forum-title-field">
              <label className="forum-field-label">כותרת</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="forum-title-input"
                placeholder="רשמי כותרת נושא..."
                required
              />

              {showSimilar && similarPosts.length > 0 && (
                <div className="forum-similar-posts-dropdown">
                  <div className="forum-similar-posts-header">
                    <small className="forum-similar-posts-label">
                      💡 אולי כבר יש מענה לפוסט שלך? בדקי פוסטים דומים:
                    </small>
                    <button
                      type="button"
                      onClick={() => setShowSimilar(false)}
                      className="forum-similar-posts-close"
                    >
                      סגור ✖
                    </button>
                  </div>
                  {similarPosts.map((post: { _id: string; title: string }) => (
                    <div key={post._id} className="forum-similar-post-item">
                      <a href={`/forum/post/${post._id}`} target="_blank" rel="noreferrer" className="forum-similar-post-link">
                        {post.title}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="forum-content-field">
            <label className="forum-content-label">תוכן</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              placeholder="כתוב כאן את גוף הפוסט..."
              className="forum-content-textarea"
              required
            />

            <input
              type="file"
              ref={fileInputRef}
              className="forum-file-input-hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />

            <button
              type="button"
              onClick={handleClipClick}
              className="forum-clip-btn"
            >
              <i className="fa-solid fa-paperclip"></i>
              {selectedFile ? `📎 ${selectedFile.name}` : 'צירוף קבצים'}
            </button>
          </div>

          {/* --- סרגל כלים מבוסס AI --- */}
          <div className="forum-ai-toolbar">
            <div className="forum-ai-toolbar-row">
              <span className="forum-ai-toolbar-label">
                <span className="forum-ai-emoji">🪄</span> עוזר כתיבה חכם:
              </span>
              <button
                type="button"
                disabled={isRefineDisabled}
                onClick={() => handleAiAssist('refine')}
                className={`forum-ai-refine-btn ${isRefineDisabled ? 'forum-ai-refine-btn-disabled' : ''}`}
              >
                {isAiLoading ? 'מעבד...' : 'שפר ניסוח'}
              </button>

              {backupContent && (
                <button
                  type="button"
                  onClick={handleUndoRefine}
                  className="forum-ai-undo-btn"
                >
                  ↩️ בטל שינוי AI
                </button>
              )}

              <button
                type="button"
                disabled={isAiLoading || isContentTooShort}
                onClick={() => handleAiAssist('titles')}
                className={`forum-ai-titles-btn ${isContentTooShort ? 'forum-ai-titles-btn-disabled' : ''}`}
              >
                {isAiLoading ? 'מעבד...' : 'הצעת כותרת'}
              </button>
              <button
                type="button"
                disabled={isAiLoading || isContentTooShort}
                onClick={() => handleAiAssist('tags')}
                className={`forum-ai-tags-btn ${isContentTooShort ? 'forum-ai-tags-btn-disabled' : ''}`}
              >
                {isAiLoading ? 'מעבד...' : 'הצעת תגיות'}
              </button>
              {isContentTooShort && <small className="forum-ai-hint">הקלידי לפחות 15 תווים בתוכן להפעלת ה-AI</small>}
            </div>

            {/* הצגת כותרות לחיצות מוצעות */}
            {aiTitles.length > 0 && (
              <div className="forum-ai-suggestions-block">
                <small className="forum-ai-suggestions-label">בחרי כותרת מתאימה מההצעות:</small>
                <div className="forum-ai-titles-list">
                  {aiTitles.map((title, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectSuggestedTitle(title)}
                      className="forum-ai-title-option"
                    >
                      💡 {title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* הצגת תגיות לחיצות מוצעות */}
            {aiTags.length > 0 && (
              <div className="forum-ai-suggestions-block">
                <small className="forum-ai-suggestions-label">לחצי על תגיות להוספה מהירה:</small>
                <div className="forum-ai-tags-list">
                  {aiTags.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectSuggestedTag(tag)}
                      className="forum-ai-tag-option"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="forum-tags-field">
            <label className="forum-field-label">תגיות נושא </label>
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
                  borderColor: '#DEEFF7',
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
                  '&:hover': { borderColor: '#1C7AA6' }
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
                  border: '1px solid #1C7AA6',
                  boxShadow: '0 -4px 12px rgba(0,0,0,0.1)'
                }),
                multiValue: (base) => ({
                  ...base,
                  backgroundColor: '#DEEFF7',
                  borderRadius: '4px',
                  border: '1px solid #A6C9D9',
                  margin: '2px'
                }),
                multiValueLabel: (base) => ({
                  ...base,
                  color: '#135471',
                  fontWeight: 'bold',
                  fontSize: '13px'
                }),
              }}
            />
          </div>

          {validationError && (
            <div className="forum-validation-error">
              ⚠️ {validationError}
            </div>
          )}

          <div className="forum-modal-actions">
            <button
              type="submit"
              disabled={isSubmitting || isAiLoading}
              className={`forum-submit-btn ${isSubmitting ? 'forum-submit-btn-submitting' : ''}`}
            >
              {isSubmitting ? 'מפרסם פוסט...' : 'הוסף'}
            </button>
            <button
              type="button"
              disabled={isSubmitting || isAiLoading}
              onClick={onClose}
              className={`forum-cancel-btn ${isSubmitting ? 'forum-cancel-btn-disabled' : ''}`}
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