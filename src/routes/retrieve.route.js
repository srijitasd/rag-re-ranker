import { Router } from "express";
import { celebrate } from "celebrate";

import { retrieveSchema } from "../schema/retrieve.schema.js";
import { retrieveController } from "../controllers/retrieve.controller.js";

const router = Router();

router.get("/retrieve", celebrate(retrieveSchema), retrieveController);

export default router;
