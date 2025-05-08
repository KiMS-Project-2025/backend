const multer = require("multer")
const path = require("path")
const { v4: uuidv4 } = require("uuid")
const db = require("../utils/db")
const fs = require("fs")

async function generateId() {
    while (true) {
        const did = uuidv4()

        const rs = await db.runPreparedSelect("SELECT id FROM File WHERE id=?", [did])
        if (rs.length === 0) {
            return did
        }
    }
}

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const { title, cid, author, did, description } = req.body
        if (!(title && cid && author && did && description)) {
            return cb(new Error("missing parameter."))
        }

        // Valid the cid
        const validCid = await db.runPreparedSelect("SELECT id FROM Category WHERE id=?", [cid])
        if (validCid.length === 0) {
            return cb(new Error("category not found."))
        }

        // Valid the did
        const validDid = await db.runPreparedSelect("SELECT id FROM Document WHERE id=?", [did])
        if (validDid.length === 0) {
            return cb(new Error("document not found."))
        }

        // Check the document in the server
        const documentPath = path.join(process.cwd(), process.env.STORAGE_DIR, did)
        if (!fs.existsSync(documentPath)) {
            return cb(new Error("document not found in server."))
        }

        cb(null, documentPath)
    },
    filename: async (req, file, cb) => {
        const fid = await generateId()
        req.savedFileId = fid

        const ext = path.extname(file.originalname)
        cb(null, `${fid}${ext}`)
    }
})

const fileFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
        cb(null, true)
    } else {
        cb(new Error("allow PDF file only."), false)
    }
}

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
})


module.exports = upload