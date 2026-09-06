import * as repo from "../repositories/userRepository";
import axios from "axios";

import { encryptSecret, generateApiKey, getKeyPrefix, hashApiKey } from "../utils/crypto";

export async function createUser(data: any) {
  // 1. הכנת המפתחות (לפני הנגיעה ב-DB)
  const proxyApiKey = generateApiKey("sk-safeai");
  const proxyKeyHash = hashApiKey(proxyApiKey);
  const proxyKeyPrefix = getKeyPrefix(proxyApiKey);

  try {
    // 2. ניסיון רישום ב-LiteLLM תחילה (Fail Fast)
    // אם ה-Proxy למטה או הכתובת שגויה, זה יזרוק שגיאה ויעבור ל-catch
    const response = await axios.post(
      `${process.env.LITELLM_PROXY_URL}/key/generate`,
      {
        models: ["*"],
        user_id: data.email, // מזהה זמני או אימייל
        duration:'30d', // תוקף של 30 יום, אפשר להתאים לפי הצורך
        metadata: { 
          source: "SafeAI_Registration", 
          user_email: data.email },
      },
      {
        headers: {
          Authorization:
           `Bearer ${process.env.LITELLM_MASTER_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 5000, // הגבלת זמן המתנה ל-5 שניות
      },
    );


    const { key, token, key_name } = response.data;

    const litellmKeyEncrypted = encryptSecret(key);
    // 3. רק אם הרישום ב-LiteLLM הצליח - יוצרים את המשתמש ב-DB שלך
    const user = await repo.createUser({
      ...data,
      mode: data.mode || "BYOK",
      proxyKeyHash,
      proxyKeyPrefix,
      litellmKeyEncrypted,
      litellmPrefix: key_name,
      litellmToken: token,
    });

    return {
      user,
      proxyApiKey,
    };
  } catch (error: any) {
    // טיפול בשגיאות ודיווח
    const errorDetail = error.response?.data || error.message;
    console.error(
      "CRITICAL: LiteLLM Sync Failed. User not created.",
      errorDetail,
    );

    // זריקת שגיאה חזרה ל-Controller כדי שיחזיר תשובה מתאימה למשתמש
    throw new Error(
      `Registration failed: Could not synchronize with Proxy. Details: ${JSON.stringify(errorDetail)}`,
    );
  }
}

export async function listUsers() {
  return repo.getUsers();
}

export async function getUserById(userId: string) {
  return repo.getUserById(userId);
}

export async function updateUser(userId: string, data: any) {
  return repo.updateUser(userId, data);
}

export async function deleteUser(userId: string) {
  return repo.deleteUser(userId);
}

export const findUserByEmail = async (email: string) => {
  return repo.findUserByEmail(email);
};

export const addRefreshToken = async (userId: string, refreshToken: string) => {
  return repo.updateUser(userId, {
    $push: { refreshTokens: refreshToken }
  });
};
