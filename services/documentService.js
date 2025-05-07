const db = require("../utils/db")
const { v4: uuidv4 } = require("uuid")
const fs = require("fs")
const path = require("path")


async function generateId() {
    while (true) {
        const did = uuidv4()

        const rs = await db.runPreparedSelect("SELECT id FROM Document WHERE id=?", [did])
        if (rs.length === 0) {
            return did
        }
    }
}

exports.createDocument = async (body, callback) => {
    const { title } = body
    if (!title) {
        return callback(400, { "message": "missing parameter." })
    }

    const did = await generateId()

    const docDirectory = path.join(process.cwd(), process.env.STORAGE_DIR, did)
    if (!fs.existsSync(docDirectory)) {
        // Create document folder
        fs.mkdirSync(docDirectory, { recursive: true })

        const modified_at = new Date().toISOString()
        // Insert to database
        await db.runPreparedExecute("INSERT INTO Document VALUES (?, ?)", [did, title])
        await db.runPreparedExecute("INSERT INTO Document_History VALUES (?, ?)", [did, modified_at])

        // Get document modified history
        const doc_history = await db.runPreparedSelect("SELECT modified_at FROM Document_History WHERE did = ? ORDER BY modified_at DESC", [did])
        callback(201, { "id": did, "title": title, "modified_at": modified_at, "history": doc_history.map(item => item.modified_at) })
    }
}

exports.getDocument = async (query, callback) => {
    const { id } = query
    if (!id) {
        return callback(400, { "message": "missing parameter." })
    }

    const document_title = await db.runPreparedSelect("SELECT title FROM Document WHERE id=?", [id])
    if (!document_title.length) {
        return callback(404, { "message": "document not found." })
    }

    const rs = await db.runPreparedSelect("SELECT * FROM File WHERE did=?", [id])
    rs.array?.forEach(async (element) => {
        const history = await db.runPreparedSelect("SELECT modified_at FROM File_History WHERE fid=?", [element.id])
        rs.history = history.map(item => item.modified_at)
    });

    // Get document modified history
    const doc_history = await db.runPreparedSelect("SELECT modified_at FROM Document_History WHERE did = ? ORDER BY modified_at DESC", [id])

    callback(200, { "id": id, "title": document_title[0].title, "modified_at": doc_history[0].modified_at, "history": doc_history.map(item => item.modified_at), "files": rs })
}

exports.changeDocumentName = async (body, callback) => {
    const { id, title } = body
    if (!id || !title) {
        return callback(400, { "message": "missing parameter." })
    }

    const did = await db.runPreparedSelect("SELECT id FROM Document WHERE id=?", [id])
    if (!did.length) {
        return callback(404, { "message": "document not found." })
    }

    const modified_at = new Date().toISOString()

    await db.runPreparedExecute("UPDATE Document SET title=? WHERE id=?", [title, id])
    await db.runPreparedExecute("INSERT INTO Document_History VALUES (?, ?)", [id, modified_at])

    // Get document modified history
    const doc_history = await db.runPreparedSelect("SELECT modified_at FROM Document_History WHERE did = ? ORDER BY modified_at DESC", [id])
    callback(201, { "id": did[0].id, "title": title, "modified_at": modified_at, "history": doc_history.map(item => item.modified_at) })
}

exports.deleteDocument = (callback) => {
    // after file API
}