import { Event } from "../models/Event.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Create a new Event
const createEvent = async function (req, res) {
  const { name, description, date } = req.body;
  const userId = req.user._id;
  try {
    const newEvent = await Event.create({
      name,
      description,
      date,
      createdBy: userId,
    });
    if (!newEvent) {
      throw new ApiError(500, "Erorr while adding the Event");
    }
    res
      .status(201)
      .json(new ApiResponse(201, newEvent, "Event Created Successfully"));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};

// get all events(public and created by the user)
const getAllEvents = async function (req, res) {
  try {
    const events = await Event.find().populate("createdBy", "username email");
    res.status(200).json(new ApiResponse(200, events));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};

// get a single event by Id
const getEventById = async function (req, res) {
  const { id } = req.params;
  try {
    const event = await Event.findById(id).populate(
      "createdBy",
      "username email"
    );
    if (!event) {
      return res.status(404).json(new ApiResponse(404, {}, "Event not found"));
    }
    res
      .status(200)
      .json(new ApiResponse(200, event, "Event Fetched Successfully"));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};

// update the event (only by the creator)
const updateEvent = async function (req, res) {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json(new ApiResponse(404, {}, "Event Not Found"));
    }
    // Checking Ownership of event
    if (event.createdBy.toString() !== userId) {
      return res
        .status(403)
        .json(
          new ApiResponse(
            403,
            {},
            "You are not authorized to perform the update operation on the given event"
          )
        );
    }
    const updatedEvent = await Event.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res
      .status(200)
      .json(new ApiResponse(200, updatedEvent, "Event Updated Successfully"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// Delete an event (only the creator can perform such action)

const deleteEvent = async function (req, res) {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const event = await Event.findById(id);
    if (event) {
      return res.status(404).json(new ApiResponse(404, {}, "Event not found"));
    }
    // Checking ownership of the event
    if (event.createdBy.toString() !== userId) {
      return res
        .status(403)
        .json(
          new ApiResponse(
            403,
            {},
            "You are not authorized to delete this event"
          )
        );
    }
    const deletedEvent = await Event.findByIdAndDelete(id);
    return res
      .status(200)
      .json(new ApiResponse(200, deletedEvent, "Event deleted Successfully"));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// Add attendees in real-time

const addAtendees = async function (req, res) {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json(new ApiResponse(404, {}, "Event not found"));
    }
    // Add the user to attendees if not already added
    if (!event.attendees.includes(userId)) {
      event.attendees.push(userId);
      await event.save();

      // Emiting real time update via Websocket
      req.io.to(id).emit("attendeeUpdated", event.attendees.length);
    }
    res
      .status(200)
      .json(new ApiResponse(200, event, "You have joined the event"));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

export {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  addAtendees,
};
