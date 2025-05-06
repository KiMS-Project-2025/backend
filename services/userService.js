const db = require("../utils/db")

exports.getAllUsers = (callback) => {
    db.all("SELECT * FROM users;",(err, rows) => {
        if (err) {
            callback(err, null)
        } else {
            callback(null, rows)
        }
    })
}