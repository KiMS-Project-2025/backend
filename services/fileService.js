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

exports.uploadFile = async (body, file, callback) => {
    const { title, cid, author, description, did } = body;
    if (!title || !cid || !author || !did || !file) {
      return callback(400, { "message": "missing required parameter." });
    }
    
    // Ensure the file is a PDF
    if (file.mimetype !== "application/pdf") {
      return callback(400, { "message": "Only PDF files are allowed." });
    }
    
    const fid = await generateFileId();
    const modified_at = new Date().toISOString();
    
    // Create the document directory if it doesn't exist: STORAGE_DIR/<did>
    const docDirectory = path.join(process.cwd(), process.env.STORAGE_DIR, did);
    if (!fs.existsSync(docDirectory)) {
      fs.mkdirSync(docDirectory, { recursive: true });
    }
    
    // Save the PDF file into the document folder as <fid>.pdf
    const filePath = path.join(docDirectory, fid + ".pdf");
    fs.writeFileSync(filePath, file.buffer);
    
    // Insert into the File table (include file_path and created_at)
    await db.runPreparedExecute(
      "INSERT INTO File (id, title, cid, author, description, did) VALUES (?, ?, ?, ?, ?, ?)",
      [fid, title, cid, author, description, did]
    );
    
    // Insert an initial record into File_History
    await db.runPreparedExecute(
      "INSERT INTO File_History (fid, modified_at) VALUES (?, ?)",
      [fid, modified_at]
    );
    
    // Retrieve file modification history
    const file_history = await db.runPreparedSelect(
      "SELECT modified_at FROM File_History WHERE fid=? ORDER BY modified_at DESC",
      [fid]
    );
    
    callback(201, { 
      "id": fid, 
      "title": title,
      "cid": cid,
      "author": author,
      "description": description,
      "did": did,
      "file_path": filePath,
      "modified_at": modified_at, 
      "history": file_history.map(item => item.modified_at) 
    });
  };


  exports.updateFile = async (body, file, callback) => {
    const { id, name, cid, description } = body;
    
    // At least one update must be provided (metadata change or file update)
    if (!id || (!name && !cid && !description && !file)) {
      return callback(400, { 
        "message": "Missing required parameter. Must provide file id and at least one update (name, cid, description, or a new PDF file)." 
      });
    }
    
    // Retrieve the current file record
    const fileRecord = await db.runPreparedSelect("SELECT * FROM File WHERE id=?", [id]);
    if (fileRecord.length === 0) {
      return callback(404, { "message": "File not found." });
    }
    
    const modified_at = new Date().toISOString();
    
    // Prepare to update metadata if provided
    let updates = [];
    let params = [];
    
    if (name) {
      updates.push("title=?");
      params.push(name);
    }
    if (cid) {
      updates.push("cid=?");
      params.push(cid);
    }
    if (description) {
      updates.push("description=?");
      params.push(description);
    }
    
    if (updates.length > 0) {
      const updateQuery = "UPDATE File SET " + updates.join(", ") + " WHERE id=?";
      params.push(id);
      await db.runPreparedExecute(updateQuery, params);
    }
    
    // If a new PDF file is provided, update the physical file on disk.
    if (file) {
      if (file.mimetype !== "application/pdf") {
        return callback(400, { "message": "Only PDF files are allowed." });
      }
      // Overwrite the current physical file
      fs.writeFileSync(fileRecord[0].file_path, file.buffer);
    }
    
    // Log the modification in history
    await db.runPreparedExecute(
      "INSERT INTO File_History (fid, modified_at) VALUES (?, ?)",
      [id, modified_at]
    );
    
    // Retrieve updated file history
    const history = await db.runPreparedSelect(
      "SELECT modified_at FROM File_History WHERE fid=? ORDER BY modified_at DESC",
      [id]
    );
    
    // Prepare updated output (fall back to original values if not updated)
    const updatedTitle = name ? name : fileRecord[0].title;
    const updatedCid = cid ? cid : fileRecord[0].cid;
    const updatedDescription = description ? description : fileRecord[0].description;
    const updatedFilePath = fileRecord[0].file_path;
    
    callback(200, { 
      "id": id, 
      "title": updatedTitle,
      "cid": updatedCid,
      "description": updatedDescription,
      "file_path": updatedFilePath,
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
    
    // Retrieve file record to get the file path and document id (did)
    const fileRecord = await db.runPreparedSelect("SELECT file_path, did FROM File WHERE id=?", [id]);
    if (fileRecord.length === 0) {
      return callback(404, { "message": "file not found." });
    }
    
    const filePath = fileRecord[0].file_path;
    
    // Delete the file record and its history from the database
    await db.runPreparedExecute("DELETE FROM File WHERE id=?", [id]);
    await db.runPreparedExecute("DELETE FROM File_History WHERE fid=?", [id]);
    
    // Delete the physical PDF file from storage
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Optionally, remove the document directory if it is empty
    const docDirectory = path.dirname(filePath);
    const filesInDir = fs.readdirSync(docDirectory);
    if (!filesInDir.length) {
      fs.rmdirSync(docDirectory);
    }
    
    callback(200, { "message": "File deleted." });
  };

  exports.downloadFile = async (query, res) => {
    const { id } = query;

    if (!id) {
        return res.status(400).json({ message: "Missing required parameter: id" });
    }

    try {
        // Retrieve document ID (`did`) and title from the database
        const fileRecord = await db.runPreparedSelect("SELECT did, title FROM File WHERE id=?", [id]);
        
        if (fileRecord.length === 0) {
            return res.status(404).json({ message: "File not found." });
        }

        const did = fileRecord[0].did;
        const fileName = fileRecord[0].title + ".pdf"; // Ensure filename includes `.pdf`

        // Construct file path dynamically
        const filePath = path.join(process.cwd(), process.env.STORAGE_DIR, did, id + ".pdf");

        // Check if the file exists on disk
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "File not found on server storage." });
        }

        // Set headers for file download
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Content-Type", "application/pdf");

        // Stream the file to the user
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error("Error downloading file:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};
