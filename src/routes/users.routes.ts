import { Router } from "express";
import {
  deleteUserById,
  getUserById,
  getUserSubscription,
  getUserUrls,
  registerUser,
  updateUserById,
  updateUserPassword,
} from "../controllers/users.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  RegisterUserSchema,
  UpdatePasswordSchema,
  UpdateUserSchema,
  UserIdParamSchema,
} from "../models/users.model";

export const usersRouter = Router();

usersRouter.post("/", validate({ body: RegisterUserSchema }), registerUser);
usersRouter.get(
  "/:path_user_id",
  validate({ params: UserIdParamSchema }),
  getUserById,
);
usersRouter.patch(
  "/:path_user_id",
  validate({ params: UserIdParamSchema, body: UpdateUserSchema }),
  updateUserById,
);
usersRouter.delete(
  "/:path_user_id",
  validate({ params: UserIdParamSchema }),
  deleteUserById,
);
usersRouter.get(
  "/:path_user_id/urls",
  validate({ params: UserIdParamSchema }),
  getUserUrls,
);
usersRouter.get(
  "/:path_user_id/subscription",
  validate({ params: UserIdParamSchema }),
  getUserSubscription,
);
usersRouter.patch(
  "/:path_user_id/updatepassword",
  validate({ params: UserIdParamSchema, body: UpdatePasswordSchema }),
  updateUserPassword,
);

export default usersRouter;
