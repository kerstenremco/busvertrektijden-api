import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp(),
    process.env.LOG_FILE ? winston.format.json() : winston.format.prettyPrint()
  ),
  transports: process.env.LOG_FILE ? [new winston.transports.File({ filename: process.env.LOG_FILE })] : [new winston.transports.Console()],
});

export default logger;
