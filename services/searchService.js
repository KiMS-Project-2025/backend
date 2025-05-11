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
                    f.cid,
                    f.author,
                    f.did,
                    MAX(fh.modified_at) AS modified_at
                FROM File f
                JOIN Category c ON f.cid = c.id
                LEFT JOIN File_History fh ON f.id = fh.fid
                WHERE 
                    f.id LIKE '%' || ? || '%' OR
                    f.title LIKE '%' || ? || '%' OR
                    f.description LIKE '%' || ? || '%' OR
                    c.name LIKE '%' || ? || '%' OR
                    f.author LIKE '%' || ? || '%'
                GROUP BY f.id, f.title, f.description, c.name, f.author, f.did;
                `
    const rs = await db.runPreparedSelect(stm, [q, q, q, q, q])

    callback(200, rs)
}