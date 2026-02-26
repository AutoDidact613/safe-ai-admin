# בסיס התמונה
FROM node:14

# הגדרת תיקיית העבודה בתמונה
WORKDIR /app

# העתקת קבצי package.json ו- package-lock.json
COPY package*.json ./

# התקנת התלויות
RUN npm install

# העתקת שאר הקבצים
COPY . .

# חשיפת הפורט
EXPOSE 3001

# פקודת הרצה של השרת
CMD ["npm", "start"]