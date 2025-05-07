const sqlite3 = require("sqlite3").verbose();
const path = require("path");

function openDatabase() {
    return new sqlite3.Database("database.db", (err) => {
        if (err) {
            console.error("❌ Database connection error:", err.message);
        } else {
            console.log("✅ Connected to SQLite database.");
        }
    });
}

// SELECT
function runPreparedSelect(sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = openDatabase();
        const stmt = db.prepare(sql);
        stmt.all(params, (err, rows) => {
            stmt.finalize();
            db.close();
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// INSERT/UPDATE/DELETE
function runPreparedExecute(sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = openDatabase();
        const stmt = db.prepare(sql);
        stmt.run(params, function (err) {
            stmt.finalize();
            db.close();
            if (err) {
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

module.exports = {
    runPreparedSelect,
    runPreparedExecute
};
