const express = require("express")
const router = express.Router()
const documentController = require("../controllers/documentController")

router.get("/", documentController.getDocument)
router.post("/", documentController.addDocument)
router.put("/", documentController.editDocument)
router.delete("/", documentController.deleteDocument)

module.exports = router