const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env.test") });

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_jwt";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
