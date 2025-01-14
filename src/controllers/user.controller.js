import { User } from "../models/User.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCLoudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async function (userId) {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating accessToken and Refresh Token"
    );
  }
};
const registerUser = async function (req, res) {
  const { username, email, password } = req.body;
  if ([username, email, password].some((field) => field.trim() === "")) {
    return res
      .status(401)
      .json(new ApiResponse({}, "All fields are required", 401));
  }

  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res
        .status(409)
        .json(
          new ApiResponse({}, "User with email or username already exists", 409)
        );
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    console.log("avatar ", req.files);
    if (!avatarLocalPath) {
      return new ApiError(404, "Avatar file not found");
    }

    const avatar = await uploadOnCLoudinary(avatarLocalPath);

    if (!avatar) {
      throw new ApiError(
        400,
        "Erorr while uploading avatar image on cloudinary"
      );
    }
    const user = await User.create({
      username: username.toLowerCase(),
      email,
      password,
      avatar: avatar.url,
    });
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );
    if (!createdUser) {
      throw new ApiError(500, "Error while Registering a new User");
    }
    return res
      .status(201)
      .json(new ApiResponse(201, createdUser, "User Registration Successful"));
  } catch (error) {
    console.error("Error occured during User registration process");
  }
};

const loginUser = async function (req, res) {
  const { email, username, password } = req.body;

  try {
    if (!username && !email) {
      throw new ApiError(400, "username or email is required to login");
    }
    const user = await User.findOne({ $or: [{ username }, { email }] });
    if (!user) {
      throw new ApiError(404, "User does not exists");
    }
    const validatePassword = await user.isPasswordCorrect(password);

    if (!validatePassword) {
      throw new ApiError(401, "Invalid User Credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: loggedInUser,
            accessToken,
            refreshToken,
          },
          "User Logged In Successfully "
        )
      );
  } catch (error) {
    throw new ApiError(400, "Error while loggin User");
  }
};

const logoutUser = async function (req, res) {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
};

const refreshAccessToken = async function (req, res) {
  const incomingRequestToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRequestToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRequestToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRequestToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user?._id);

    return res
      .status(201)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
};

export {
  generateAccessAndRefreshToken,
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
};
