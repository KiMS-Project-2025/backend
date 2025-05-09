const db = require("../utils/db")

exports.getAllDocuments = async (callback) => {
    let documents = await db.runPreparedSelect("SELECT id, title FROM Document")

    documents = await Promise.all(documents.map(async (element) => {
        let history = await db.runPreparedSelect(
            "SELECT modified_at FROM Document_History WHERE did = ? ORDER BY modified_at DESC",
            [element.id]
        )

        history = history.map(item => item.modified_at)

        return {
            ...element,
            modified_at: history[0],
            history: history
        }
    }))

    callback(200, documents)
}