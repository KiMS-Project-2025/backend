const db = require("../utils/db")
const fs = require("fs")
const path = require("path")

exports.createFile = async (body, fid, callback) => {
    const { title, cid, author, did, description } = body

    const modified_at = new Date().toISOString()

    // Insert to database
    await db.runPreparedExecute("INSERT INTO File VALUES (?, ?, ?, ?, ?, ?)", [fid, title, cid, author, description, did])
    await db.runPreparedExecute("INSERT INTO File_History VALUES (?, ?)", [fid, modified_at])

    // Get file modified history
    const fileHistory = await db.runPreparedSelect("SELECT modified_at FROM File_History WHERE fid = ? ORDER BY modified_at DESC", [fid])
    callback(201, { "id": fid, "title": title, "modified_at": modified_at, "history": fileHistory.map(item => item.modified_at) })
}

exports.editFileInformation = async (body, callback) => {
    const { id, title, cid, description } = body

    if (!id || (!title && !cid && !description))
        return callback(400, { "message": "missing parameter." })

    let updates = []
    let params = []
    if (title) {
        updates.push("title=?")
        params.push(title)
    }
    if (cid) {
        const check = await db.runPreparedSelect("SELECT id FROM Category WHERE id=?", [cid])
        if (check.length !== 1) {
            return callback(404, { "message": "category not found." })
        }
        updates.push("cid=?")
        params.push(cid)
    }
    if (description) {
        updates.push("description=?")
        params.push(description)
    }

    await db.runPreparedExecute(`UPDATE File SET ${updates.join(", ")} WHERE id=?`, [...params, id])

    const modified_at = new Date().toISOString()
    await db.runPreparedExecute("INSERT INTO File_History VALUES(?, ?)", [id, modified_at])

    let fileInformation = await db.runPreparedSelect("SELECT * FROM File WHERE id=?", [id])
    if (fileInformation.length === 0) {
        return callback(404, { "message": "file not found." })
    }

    const fileHistory = await db.runPreparedSelect("SELECT modified_at FROM File_History WHERE fid = ? ORDER BY modified_at DESC", [id])

    const history = fileHistory.map(item => item.modified_at)
    fileInformation = fileInformation[0]
    fileInformation["modified_at"] = modified_at
    fileInformation["history"] = history
    callback(200, fileInformation)
}

exports.getFile = async (id, callback) => {
    const rs = await db.runPreparedSelect("SELECT id, did FROM File WHERE id=?", [id])
    if (rs.length == 0) {
        return callback(404, { "message": "file not found." })
    }

    const did = rs[0]?.did
    const fid = rs[0]?.id

    const storagePath = path.join(process.cwd(), process.env.STORAGE_DIR, did)

    if (!fs.existsSync(storagePath)) {
        throw new Error("document not exist.")
    }

    const files = fs.readdirSync(storagePath)
    const matchedFile = files.find(file => file.startsWith(fid + "."))

    if (!matchedFile) {
        throw new Error("file not exist.")
    }

    callback(200, path.join(storagePath, matchedFile))
}

exports.getFileInformation = async (id, callback) => {
    let fileInformation = await db.runPreparedSelect("SELECT * FROM File WHERE id=?", [id])
    if (fileInformation.length === 0) {
        return callback(404, { "message": "file not found." })
    }

    const fileHistory = await db.runPreparedSelect("SELECT modified_at FROM File_History WHERE fid = ? ORDER BY modified_at DESC", [id])

    const modified_at = fileHistory[0].modified_at
    const history = fileHistory.map(item => item.modified_at)
    fileInformation = fileInformation[0]
    fileInformation["modified_at"] = modified_at
    fileInformation["history"] = history
    callback(200, fileInformation)
}

exports.deleteFile = async (body, callback) => {
    const { id } = body
    if (!id)
        return callback(400, { "message": "missing parameter." })

    let did = await db.runPreparedSelect("SELECT did FROM File WHERE id=?", [id])
    if (did.length === 0) {
        return callback(404, { "message": "file not found" })
    }
    did = did[0]?.did

    const storagePath = path.join(process.cwd(), process.env.STORAGE_DIR, did)
    if (!fs.existsSync(storagePath)) {
        return callback(404, { "message": "document not found" })
    }
    const files = fs.readdirSync(storagePath)
    const matchedFile = files.find(file => file.startsWith(id + "."))
    const filePath = path.join(storagePath, matchedFile)
    if (!fs.existsSync(filePath)) {
        return callback(404, { "message": "file not found" })
    }

    await db.runPreparedExecute("DELETE FROM File_History WHERE fid=?", [id])
    await db.runPreparedExecute("DELETE FROM File WHERE id=?", [id])

    fs.unlinkSync(filePath)
    callback(200, { "message": "delete successfully." })
}