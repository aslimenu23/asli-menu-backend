const winston = require("winston");

// Define log file locations
const logFile = "app.log";

// Create the logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// Customize log format
logger.add(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf((info) => {
        return `${info.timestamp} ${info.level}: ${info.message}`;
      })
    ),
  })
);

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1); // Terminate the process after logging the exception
});

// Customize log level
logger.level = process.env.LOGGER_LEVEL ?? "info";

module.exports = logger;
