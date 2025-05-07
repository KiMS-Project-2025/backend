const express = require("express");
const router = express.Router();
const fileController = require("../controllers/fileController");

// POST to upload a file.
router.post("/", fileController.uploadFile);

// GET to retrieve file information using file id as a query parameter.
router.get("/", fileController.getFile);

// PUT to update file information. 
router.put("/", fileController.updateFile);

// DELETE to remove a file using file id as a query parameter.
router.delete("/", fileController.deleteFile);

module.exports = router;