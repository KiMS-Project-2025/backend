const db = require("../utils/db")

exports.search = async (query, callback) => {
    const { q } = query
    if (!q) {
        return callback(400, { "message": "missing parameter." })
    }

    const stm = `SELECT 
                    f.id,
                    f.title,
                    f.description,
                    c.name AS category,
                    f.author,
                    f.did
                FROM File f
                JOIN Category c ON f.cid = c.id
                WHERE 
                    f.id LIKE '%' || ? || '%' OR
                    f.title LIKE '%' || ? || '%' OR
                    f.description LIKE '%' || ? || '%' OR
                    c.name LIKE '%' || ? || '%' OR
                    f.author LIKE '%' || ? || '%';
                `
    const rs = await db.runPreparedSelect(stm, [q, q, q, q, q])
    callback(200, rs)
}