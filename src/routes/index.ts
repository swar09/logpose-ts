import { Router } from "express";
import { redirectShortCode } from "../controllers/urls";
import auth_router from "./auth";
import billing_router from "./billing";
import health_router from "./health";
import public_router from "./public";
import urls_router from "./urls";
import users_router from "./users";
import webhooks_router from "./webhooks";

const router = Router();

router.use("/api", health_router);

router.use("/api/v1/auth", auth_router);
router.use("/api/v1/users", users_router);
router.use("/api/v1/urls", urls_router);
router.use("/api/v1/public", public_router);
router.use("/api/v1/billing", billing_router);
router.use("/api/v1/webhooks", webhooks_router);

router.get("/:short_code", redirectShortCode);

export default router;
