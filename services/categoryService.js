const db = require("../utils/db")

exports.createCategory = async (body, callback) => {
    let { name } = body
    if (!name) {
        return callback(400, { "message": "missing parameter." })
    }

    name = name.trim().toUpperCase()

    let rs = await db.runPreparedSelect("SELECT name FROM Category WHERE name=?", [name])
    if (rs.length !== 0) {
        return callback(403, { "message": "this category is exist." })
    }

    rs = await db.runPreparedExecute("INSERT INTO Category (name) VALUES(?)", [name])
    let id = rs.lastID

    callback(201, { "id": id, "name": name })
}

exports.getCategory = async (callback) => {
    let rs = await db.runPreparedSelect("SELECT * FROM Category")
    callback(200, rs)
}

exports.deleteCategory = async (body, callback) => {
    let { id } = body
    if (!id) {
        return callback(400, { "message": "missing parameter." })
    }

    if (isNaN(id)) {
        return callback(400, { "message": "id must be an integer." })
    }

    const rs = await db.runPreparedSelect("SELECT id FROM Category WHERE id=?", [id])
    if (rs.length === 0) {
        return callback(404, { "message": "category not found." })
    }


    await db.runPreparedExecute("DELETE FROM Category WHERE id=?", [parseInt(id, 10)])
    callback(200, { "message": "delete successfully." })
}