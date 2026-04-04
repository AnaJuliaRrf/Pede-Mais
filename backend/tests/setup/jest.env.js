const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env.test") });

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_jwt";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
process.env.WEBHOOK_VERIFY_TOKEN =
  process.env.WEBHOOK_VERIFY_TOKEN || "test_verify_token";
process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS =
  process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS || "60000";
process.env.WEBHOOK_RATE_LIMIT_MAX = process.env.WEBHOOK_RATE_LIMIT_MAX || "0";
