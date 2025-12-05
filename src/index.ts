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

// 啟用 CORS 中介軟體，允許所有來源
const corsOptions = cors({
  origin: "http://localhost:3000", // 前端應用程式的 URL
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
});

const app = express();

app.use(corsOptions);
app.use(express.json());
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// 設置 Swagger UI 的路由
// app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// 引用所有的 router
// app.use("/api", apiRouter);
app.use("/api", userAPI);
app.use("/admin", adminAPI);

// 提供 Swagger UI 所需的靜態檔案
// app.use("/swagger-ui-assets", express.static(pathToSwaggerUi));

app.get("/", function (req, res) {
  res.send('<a href="/api-docs">Go to API Docs</a>');
});

app.get("/status", (req, res) => {
  if (!req.session.views) {
    req.session.views = 1;
  } else {
    req.session.views++;
  }
  res.json({ status: "ok", views: req.session.views });
});

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server is running on port 3001");
  console.log("API docs are available at http://localhost:3001/api-docs");
});
