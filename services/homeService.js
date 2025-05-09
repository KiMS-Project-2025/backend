const db = require("../utils/db")

exports.getAllDocuments = async (callback) => {
    let documents = await db.runPreparedSelect(`
        SELECT d.id, d.title, MAX(h.modified_at) as modified_at
        FROM Document d
        LEFT JOIN Document_History h ON d.id = h.did
        GROUP BY d.id
        ORDER BY modified_at DESC
    `)

    documents = await Promise.all(documents.map(async (doc) => {
        let history = await db.runPreparedSelect(
            "SELECT modified_at FROM Document_History WHERE did = ? ORDER BY modified_at DESC",
            [doc.id]
        )

        return {
            ...doc,
            history: history.map(item => item.modified_at)
        }
    }))

    callback(200, documents)
}