const express = require("express")
const router = express.Router()
const fileController = require("../controllers/fileController")
const fileService = require("../services/fileService")
const app = express();


router.post(
    "/file",
    fileService.uploadMiddleware, // Multer middleware to handle file upload
    (req, res) => {
      fileService.uploadFile(req, (status, response) => {
        res.status(status).json(response);
      });
    }
  );

// GET to retrieve file information using file id as a query parameter.
router.get("/", fileController.getFile);

// PUT to update file information. 
router.put("/", fileController.updateFile);

// DELETE to remove a file using file id as a query parameter.
router.delete("/", fileController.deleteFile);

module.exports = router;