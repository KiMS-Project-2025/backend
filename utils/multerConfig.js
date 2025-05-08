const multer = require("multer")
const path = require("path")
const { v4: uuidv4 } = require("uuid")
const db = require("../utils/db")

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
    destination: (req, file, cb) => {
        const did = req.body.did
        if (!did)
            return cb(new Error("Missing folder ID (did)."))

        const docDirectory = path.join(process.cwd(), process.env.STORAGE_DIR, did)

        cb(null, docDirectory)
    },
    filename: async (req, file, cb) => {
        const fid = await generateId()
        req.savedFileId = fid

        const ext = path.extname(file.originalname)
        cb(null, `${fid}${ext}`)
    }
})

const upload = multer({ storage })

module.exports = upload