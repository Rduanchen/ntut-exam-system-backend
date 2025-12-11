import express from "express";
const pathToSwaggerUi = require("swagger-ui-dist").absolutePath();
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";
import cors from "cors";
import session from "express-session";
// import apiRouter from "./routes/index";
import adminAPI from "./routes/adminApi";
import userAPI from "./routes/userAPI";
import { connectDB } from "./config/database";
const app = express();

(async () => {
  await connectDB();
})();

declare module "express-session" {
  interface SessionData {
    [key: string]: any;
  }
}

declare global {
  namespace Express {
    interface Request {
      sessionID: string;
    }
  }
}

const allowedOrigins = [
  "http://localhost:5173", // 你的前端開發網址
  "http://localhost:3000", // 或其他前端網址
];

app.use(
  cors({
    origin: true,
    credentials: true, // 若要帶 cookie/session
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  })
);
app.use(express.json());
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // 若走 HTTPS，請改 true 並設定 sameSite
  })
);
app.use(express.json());

app.use("/api", userAPI);
app.use("/admin", adminAPI);

app.get("/", function (req, res) {
  res.send('This is TA api server.');
});

const PORT = Number(process.env.PORT) || 3001;

// app.listen(PORT, "0.0.0.0", () => {
//   console.log(`Server is running on port ${PORT}`);
// });

export default app;
