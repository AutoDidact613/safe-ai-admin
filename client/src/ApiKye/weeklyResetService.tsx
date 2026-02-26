import { store } from '../app/store';
import { resetAllWeeklyUsage } from './ApiSlice';

// שם הקובץ לשמירת תאריך האחרון שהתאפסנו
const LAST_RESET_KEY = 'lastWeeklyReset';

export const checkAndResetWeekly = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // 0 = ראשון (תחילת השבוע)
  if (dayOfWeek === 0) {
    const lastReset = localStorage.getItem(LAST_RESET_KEY);
    const todayString = today.toDateString();
    
    // אם לא התאפסנו היום, קרא לאיפוס
    if (lastReset !== todayString) {
      store.dispatch(resetAllWeeklyUsage());
      localStorage.setItem(LAST_RESET_KEY, todayString);
      console.log('השימוש השבועי התאפס!');
    }
  }
};

// קרא לפונקציה זו בעת טעינת האפליקציה או במרווחים
export const initWeeklyReset = () => {
  checkAndResetWeekly();
  
  // בדוק כל שעה אם צריך להאפס
  setInterval(checkAndResetWeekly, 60 * 60 * 1000); // כל שעה
};
