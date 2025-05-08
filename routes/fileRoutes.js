const express = require("express")
const router = express.Router()
const fileController = require("../controllers/fileController")
const upload = require("../utils/multerConfig")

router.get("/", fileController.getFile)
router.post("/", upload.single("attachment"), fileController.uploadFile, (err, req, res, next) => {
    res.status(400).json({ "message": err.message })
})
router.put("/", fileController.editFile)
router.delete("/", fileController.deleteFile)

module.exports = router