import { getUserProfile, updateUserProfile } from "../services/profile.service.js";

const urlFields = ["website", "githubUrl", "instagramUrl", "facebookUrl", "linkedinUrl", "avatarUrl"];

function validateProfile(input) {
  const fullName = String(input.fullName || "").trim();
  const phone = String(input.phone || "").trim();
  if (Object.prototype.hasOwnProperty.call(input, "fullName") && !fullName) return "Full name is required.";
  if (fullName && (fullName.length < 2 || fullName.length > 120)) return "Full name must be between 2 and 120 characters.";
  if (phone && !/^\+?[0-9][0-9\s().-]{5,24}$/.test(phone)) return "Enter a valid phone number with digits and an optional country code.";
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.email))) return "Enter a valid email address.";
  for (const field of urlFields) {
    if (!input[field]) continue;
    try {
      const url = new URL(String(input[field]));
      if (!["http:", "https:"].includes(url.protocol)) return `${field} must use http or https.`;
    } catch {
      return `${field} must be a valid URL.`;
    }
  }
  return null;
}

export async function getProfile(req, res, next) {
  try {
    return res.json({ data: await getUserProfile(req.user.sub) });
  } catch (error) {
    return next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const validationError = validateProfile(req.body);
    if (validationError) return res.status(400).json({ error: { code: "INVALID_PROFILE", message: validationError } });
    return res.json({ data: await updateUserProfile(req.user.sub, req.body) });
  } catch (error) {
    return next(error);
  }
}
