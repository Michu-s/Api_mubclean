const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const uploadController = require('../controllers/upload.controller');

/**
 * @swagger
 * /api/v1/uploads:
 *   post:
 *     summary: Upload a file
 *     description: Uploads a single file (image) and returns its public URL.
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         required: true
 *         description: The file to upload.
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         schema:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *               example: "http://localhost:3000/uploads/1678886400000-my-image.jpg"
 *       400:
 *         description: No file uploaded
 */
router.post('/', upload.single('file'), uploadController.uploadFile);

module.exports = router;
