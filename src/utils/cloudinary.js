import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCLoudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return "Local File Path Required";
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.error("Error cloudinary :", error);
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFromCloudinary = async (publicUri) => {
  try {
    if (!publicUri) return "PublicUri is required";
    const response = await cloudinary.uploader.destroy(publicUri, {
      resource_type: "image",
    });
    return response;
  } catch (error) {
    console.error("Error cloudinary while deleting: ", error);
  }
};

export { uploadOnCLoudinary, deleteFromCloudinary };