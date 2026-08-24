// Dummy secrets so modules that validate/construct SDK clients at import time
// (src/utils/jwt.ts, src/config/openaiclient.ts, src/controllers/uploadController.ts)
// don't throw when tests import src/index.ts. Never used against a real
// deployment - test-only values, and any test that needs to control what
// these clients actually return mocks the module directly (e.g.
// jest.mock('../../services/aiService', ...)).
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-jwt-refresh-secret";
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-openai-key";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "test-aws-key-id";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "test-aws-secret";
process.env.AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || "test-bucket";
