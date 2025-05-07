const db = require("../utils/db");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

// Generate a unique File ID
async function generateFileId() {
  while (true) {
    const fid = uuidv4();
    const rs = await db.runPreparedSelect("SELECT id FROM File WHERE id=?", [fid]);
    if (rs.length === 0) {
      return fid;
    }
  }
}

/**
 * Upload File Service
 * Required (green): attachment (file), title, category, author, did (document id)
 * Optional (yellow): description
 */
exports.uploadFile = async (body, callback) => {
  const { title, cid, author, description, did} = body;
  if (!title || !cid || !author || !did || !description) {
    return callback(400, { "message": "missing required parameter." });
  }

  const fid = await generateFileId();

  const modified_at = new Date().toISOString();

  // Insert into File table.
  // Assumes table File has columns: id, title, did, category, author, description
  await db.runPreparedExecute(
    "INSERT INTO File (id, title, cid, author, description, did) VALUES (?, ?, ?, ?, ?, ?)",
    [fid, title, cid, author, description, did]
  );

  // Insert an initial record to File_History table.
  await db.runPreparedExecute(
    "INSERT INTO File_History (fid, modified_at) VALUES (?, ?)",
    [fid, modified_at]
  );

  // Fetch the file's modification history
  const file_history = await db.runPreparedSelect(
    "SELECT modified_at FROM File_History WHERE fid=?á ORDER BY modified_at DESC",
    [fid]
  );

  callback(201, { 
    "id": fid, 
    "title": title,
    "categoryID": cid,
    "author": author,
    "description": description,
    "did": did, 
    "modified_at": modified_at, 
    "history": file_history.map(item => item.modified_at) 
  });
};

/**
 * Get File Information Service
 * Required (green): id (file id)
 */
exports.getFile = async (query, callback) => {
  const { id } = query;
  if (!id) {
    return callback(400, { "message": "missing required parameter." });
  }

  // Retrieve file record
  const fileData = await db.runPreparedSelect("SELECT * FROM File WHERE id=?", [id]);
  if (fileData.length === 0) {
    return callback(404, { "message": "file not found." });
  }

  // Retrieve file modification history
  const history = await db.runPreparedSelect(
    "SELECT modified_at FROM File_History WHERE fid=? ORDER BY modified_at DESC",
    [id]
  );

  callback(200, {
    "id": id,
    "title": fileData[0].title,
    "did": fileData[0].did,
    "category": fileData[0].category,
    "author": fileData[0].author,
    "created_at": fileData[0].created_at,
    "history": history.map(item => item.modified_at)
  });
};


exports.updateFile = async (body, callback) => {
    // Destructure parameters including the new "description"
    const { id, name, cid, description } = body;
    
    // Validate that a file id is provided and at least one of name, cid, or description is present
    if (!id || (!name && !cid && !description)) {
      return callback(400, { 
        "message": "Missing required parameter. Must provide file id and at least one of new name, new category (cid), or new description." 
      });
    }
  
    // Retrieve the current file record from the database
    const fileRecord = await db.runPreparedSelect("SELECT * FROM File WHERE id=?", [id]);
    if (fileRecord.length === 0) {
      return callback(404, { "message": "File not found." });
    }
  
    const modified_at = new Date().toISOString();
  
    // Dynamically build the update query based on provided parameters  
    let updates = [];
    let params = [];
    
    // Update file title if provided
    if (name) {
      updates.push("title=?");
      params.push(name);
    }
    
    // Update file category id if provided
    if (cid) {
      updates.push("cid=?");
      params.push(cid);
    }
    
    // Update file description if provided
    if (description) {
      updates.push("description=?");
      params.push(description);
    }
  
    // Finalize query construction
    const updateQuery = "UPDATE File SET " + updates.join(", ") + " WHERE id=?";
    params.push(id);
  
    await db.runPreparedExecute(updateQuery, params);
  
    // Log the modification in the File_History table
    await db.runPreparedExecute(
      "INSERT INTO File_History (fid, modified_at) VALUES (?, ?)",
      [id, modified_at]
    );
  
    // Retrieve updated file modification history
    const history = await db.runPreparedSelect(
      "SELECT modified_at FROM File_History WHERE fid=? ORDER BY modified_at DESC",
      [id]
    );
  
    // Prepare updated output, falling back to original values if a field wasn't updated
    const updatedTitle = name ? name : fileRecord[0].title;
    const updatedCid = cid ? cid : fileRecord[0].cid;
    const updatedDescription = description ? description : fileRecord[0].description;
  
    callback(200, { 
      "id": id, 
      "title": updatedTitle,
      "cid": updatedCid,
      "description": updatedDescription,
      "modified_at": modified_at, 
      "history": history.map(item => item.modified_at) 
    });
  };
  

/**
 * Delete File Service
 * Required (green): id (file id)
 */
exports.deleteFile = async (query, callback) => {
  const { id } = query;
  if (!id) {
    return callback(400, { "message": "missing required parameter." });
  }

  // Verify the file exists by selecting its file_path from File table
  const fileRecord = await db.runPreparedSelect("SELECT file_path FROM File WHERE id=?", [id]);
  if (fileRecord.length === 0) {
    return callback(404, { "message": "file not found." });
  }

  // Remove the file record and its history from the database
  await db.runPreparedExecute("DELETE FROM File WHERE id=?", [id]);
  await db.runPreparedExecute("DELETE FROM File_History WHERE fid=?", [id]);

  // Remove the physical file/directory from disk
  const filePath = fileRecord[0].file_path;
  const fileDirectory = path.dirname(filePath);
  if (fs.existsSync(fileDirectory)) {
    fs.rmdirSync(fileDirectory, { recursive: true });
  }

  callback(200, { "message": "File deleted." });
};
