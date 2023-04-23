import express from "express";
import cors from "cors";
import config from "config";
import connect from "./utils/connect";
import logger from "./utils/logger";
import routes from "./routes";
import deserializeUser from "./middleware/deserializeUser";
import rateLimit from 'express-rate-limit'

const port = config.get<number>("port");

const app = express();

app.use(cors());

app.use(express.json());

app.use(deserializeUser);

// limit api calls per user
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

app.use(limiter);

app.listen(port, async () => {
    logger.info(`App is running`);

    await connect();

    routes(app);
});
