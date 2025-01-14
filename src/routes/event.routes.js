import { Router } from "express";

import {
  addAtendees,
  createEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  updateEvent,
} from "../controllers/event.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, createEvent);
router.route("/").get(verifyJWT, getAllEvents);
router.route("/:id").get(verifyJWT, getEventById);
router.route("/:id").put(verifyJWT, updateEvent);
router.route("/:id").delete(verifyJWT, deleteEvent);
router.route("/:id/attend").post(verifyJWT, addAtendees);

export default router;
