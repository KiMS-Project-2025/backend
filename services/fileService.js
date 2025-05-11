const db = require("../utils/db")
const fs = require("fs")
const path = require("path")

exports.createFile = async (body, fid, callback) => {
    const { title, cid, author, did, description } = body

    const modified_at = new Date().toISOString()

    // Insert to database
    await db.runPreparedExecute("INSERT INTO File VALUES (?, ?, ?, ?, ?, ?, ?)", [fid, title, cid, author, description, did, 0])
    await db.runPreparedExecute("INSERT INTO File_History VALUES (?, ?)", [fid, modified_at])

    // Get file information
    let fileInformation = await db.runPreparedSelect("SELECT * FROM File WHERE id=?", [fid])
    if (fileInformation.length === 0) {
        return callback(404, { "message": "file not found." })
    }

    let fileHistory = await db.runPreparedSelect("SELECT modified_at FROM File_History WHERE fid = ? ORDER BY modified_at DESC", [fid])

    fileHistory = fileHistory.map(item => item.modified_at)
    fileInformation = fileInformation[0]
    fileInformation["modified_at"] = fileHistory[0]
    fileInformation["history"] = fileHistory

    callback(200, fileInformation)
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
    const rs = await db.runPreparedSelect("SELECT id, did, title FROM File WHERE id=?", [id])
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
    const fileName = `${rs[0]?.title}.pdf`

    callback(200, { "filePath": path.join(storagePath, matchedFile), "fileName": fileName })
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

exports.addView = async (body, callback) => {
    const { id } = body
    if (!id) {
        return callback(400, { "message": "missing parameter." })
    }

    let view = await db.runPreparedSelect("SELECT view FROM File WHERE id=?", [id])
    if (view.length === 0) {
        return callback(404, { "message": "file not found." })
    }

    view = view[0].view + 1
    await db.runPreparedExecute("UPDATE File SET view=? WHERE id=?", [view, id])

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