import axios from "axios";
import { getUserById, updateUser } from "../repositories/userRepository";
import { encryptSecret, generateApiKey, getKeyPrefix, hashApiKey } from "../utils/crypto";
import logger from "../logger";

interface ProxyKeyInfo {
  proxyKeyPrefix: string;
  isActive: boolean;
  createdAt?: Date;
  litellmPrefix: string;
}

interface RegenerateResult {
  proxyApiKey: string;
  keyInfo: ProxyKeyInfo;
}

/**
 * Get proxy key information for a user (without exposing the actual key)
 */
export async function getProxyKeyInfo(userId: string): Promise<ProxyKeyInfo | null> {
  const user = await getUserById(userId);
  
  if (!user) {
    return null;
  }

  return {
    proxyKeyPrefix: user.proxyKeyPrefix,
    isActive: user.isActive,
    createdAt: user.createdAt,
    litellmPrefix: user.litellmPrefix,
  };
}

/**
 * Regenerate proxy key for a user
 * This will:
 * 1. Generate a new proxy API key
 * 2. Update LiteLLM with the new key
 * 3. Update the user record in the database
 */
export async function regenerateProxyKey(userId: string): Promise<RegenerateResult | null> {
  const user = await getUserById(userId);
  
  if (!user) {
    return null;
  }

  // Generate new proxy API key
  const proxyApiKey = generateApiKey("sk-safeai");
  const proxyKeyHash = hashApiKey(proxyApiKey);
  const proxyKeyPrefix = getKeyPrefix(proxyApiKey);

  try {
    // Delete old key from LiteLLM if it exists
    if (user.litellmToken) {
      try {
        await axios.post(
          `${process.env.LITELLM_PROXY_URL}/key/delete`,
          {
            keys: [user.litellmToken],
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.LITELLM_MASTER_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: 5000,
          }
        );
      } catch (deleteError) {
        logger.warn("Failed to delete old LiteLLM key:", deleteError);
        // Continue anyway - we'll create a new key
      }
    }

    // Create new key in LiteLLM
    const response = await axios.post(
      `${process.env.LITELLM_PROXY_URL}/key/generate`,
      {
        models: ["*"],
        user_id: user.email,
        duration: "30d",
        metadata: {
          source: "SafeAI_KeyRegeneration",
          user_email: user.email,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.LITELLM_MASTER_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 5000,
      }
    );

    const { key, token, key_name } = response.data;
    const litellmKeyEncrypted = encryptSecret(key);

    // Update user in database
    const updatedUser = await updateUser(userId, {
      proxyKeyHash,
      proxyKeyPrefix,
      litellmKeyEncrypted,
      litellmPrefix: key_name,
      litellmToken: token,
    });

    if (!updatedUser) {
      throw new Error("Failed to update user in database");
    }

    return {
      proxyApiKey,
      keyInfo: {
        proxyKeyPrefix,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        litellmPrefix: key_name,
      },
    };
  } catch (error: any) {
    const errorDetail = error.response?.data || error.message;
    logger.error("Failed to regenerate proxy key:", { error: errorDetail.message, stack: errorDetail.stack });
    throw new Error(
      `Failed to regenerate proxy key: ${JSON.stringify(errorDetail)}`
    );
  }
}

/**
 * Toggle proxy key active status (enable/disable)
 */
export async function toggleProxyKeyStatus(
  userId: string,
  isActive: boolean
): Promise<ProxyKeyInfo | null> {
  const user = await getUserById(userId);
  
  if (!user) {
    return null;
  }

  try {
    // Update LiteLLM key status if needed
    if (user.litellmToken) {
      try {
        // LiteLLM doesn't have a direct enable/disable endpoint
        // We can update the key's metadata or duration
        // For now, we'll just update our database
        // In production, you might want to delete/recreate the key
      } catch (litellmError) {
        logger.warn("Failed to update LiteLLM key status:", litellmError);
        // Continue anyway - we'll update our database
      }
    }

    // Update user in database
    const updatedUser = await updateUser(userId, { isActive });

    if (!updatedUser) {
      throw new Error("Failed to update user in database");
    }

    return {
      proxyKeyPrefix: updatedUser.proxyKeyPrefix,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt,
      litellmPrefix: updatedUser.litellmPrefix,
    };
  } catch (error: any) {
    const errorDetail = error.response?.data || error.message;
    logger.error("Failed to toggle proxy key status:", { error: errorDetail.message, stack: errorDetail.stack });
    throw new Error(
      `Failed to toggle proxy key status: ${JSON.stringify(errorDetail)}`
    );
  }
}
