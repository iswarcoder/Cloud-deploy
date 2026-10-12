import { Router } from "express";
import multer from "multer";
import { deleteFile, downloadFile, listFiles, uploadFile } from "../controllers/files.controller.js";
import { requireCognitoAuth } from "../middleware/auth.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }
});

router.use(requireCognitoAuth);
router.get("/", listFiles);
router.post("/", upload.single("file"), uploadFile);
router.get("/download", downloadFile);
router.delete("/", deleteFile);

export default router;
