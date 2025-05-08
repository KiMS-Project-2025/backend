const db = require("../utils/db");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const multer = require("multer");


// Multer setup – files are stored in memory before processing.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed."), false);
    }
    cb(null, true);
  },
});

// Middleware to handle file upload
exports.uploadMiddleware = upload.single("attachment"); // "attachment" matches the key in Postman

/**
 * Upload File Service (PDF Only)
 * Required fields: title, cid, author, did
 * Optional field: description
 * File is processed via Multer as req.file.
 */
exports.uploadFile = async (req, callback) => {
  try {
    const { title, cid, author, did, description } = req.body; // Text fields
    const file = req.file; // Uploaded file

    if (!file || !title || !cid || !author || !did) {
      return callback(400, { message: "Missing required parameter." });
    }

    const fid = await generateFileId();
    const modified_at = new Date().toISOString();

    // Create the document directory (STORAGE_DIR/<did>) if it does not exist.
    const docDirectory = path.join(process.cwd(), process.env.STORAGE_DIR, did);
    if (!fs.existsSync(docDirectory)) {
      fs.mkdirSync(docDirectory, { recursive: true });
    }

    // Save file as <fid>.pdf inside STORAGE_DIR/<did>/
    const filePath = path.join(docDirectory, fid + ".pdf");
    fs.writeFileSync(filePath, file.buffer);

    // Insert file metadata into the database.
    await db.runPreparedExecute(
      "INSERT INTO File (id, title, cid, author, description, did, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [fid, title, cid, author, description || null, did, modified_at]
    );

    // Log modification history.
    await db.runPreparedExecute(
      "INSERT INTO File_History (fid, modified_at) VALUES (?, ?)",
      [fid, modified_at]
    );

    callback(201, {
      id: fid,
      title,
      cid,
      author,
      description,
      did,
      modified_at,
    });
  } catch (error) {
    callback(500, { message: error.message });
  }
};

exports.getFile = async (query, res) => {
  const { id, detail } = query;

  if (!id) {
    return res.status(400).json({ message: "Missing required parameter: id" });
  }

  // Retrieve file details from the database.
  const fileData = await db.runPreparedSelect("SELECT * FROM File WHERE id=?", [id]);
  if (fileData.length === 0) {
    return res.status(404).json({ message: "File not found." });
  }

  const fileRecord = fileData[0];
  const filePath = path.join(process.cwd(), process.env.STORAGE_DIR, fileRecord.did, id + ".pdf");

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found on server storage." });
  }

  if (detail === "1") {
    // If detail=1, return file information
    return res.status(200).json({
      id: fileRecord.id,
      title: fileRecord.title,
      cid: fileRecord.cid,
      author: fileRecord.author,
      description: fileRecord.description,
      did: fileRecord.did,
      created_at: fileRecord.created_at,
    });
  }

  // Otherwise, send the file for download
  res.setHeader("Content-Disposition", `attachment; filename="${fileRecord.title}.pdf"`);
  res.setHeader("Content-Type", "application/pdf");

  fs.createReadStream(filePath).pipe(res);
};
/**
 * Update File Metadata or Replace the PDF
 * Required: id (File ID)
 * At least one of the following must be provided: title, cid, description, or new PDF file.
 * Multer processes the new file as req.file.
 */
exports.updateFile = async (req, callback) => {
  const { id, title, cid, description } = req.body;
  const file = req.file;

  if (!id || (!title && !cid && !description && !file)) {
    return callback(400, { "message": "Provide file id and at least one update parameter." });
  }

  // Retrieve existing file details.
  const fileRecord = await db.runPreparedSelect("SELECT did FROM File WHERE id=?", [id]);
  if (fileRecord.length === 0) {
    return callback(404, { "message": "File not found." });
  }

  const modified_at = new Date().toISOString();
  let updates = [];
  let params = [];

  if (title) {
    updates.push("title=?");
    params.push(title);
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
    // Update file metadata.
    await db.runPreparedExecute(`UPDATE File SET ${updates.join(", ")} WHERE id=?`, [...params, id]);
  }

  // If a new PDF file is provided, replace the physical file.
  if (file) {
    const docDirectory = path.join(process.cwd(), process.env.STORAGE_DIR, fileRecord[0].did);
    const filePath = path.join(docDirectory, id + ".pdf");
    fs.writeFileSync(filePath, file.buffer);
  }

  // Log the update operation.
  await db.runPreparedExecute("INSERT INTO File_History (fid, modified_at) VALUES (?, ?)", [id, modified_at]);

  callback(200, { "message": "File updated successfully." });
};

/**
 * Delete File Service
 * Required: id (File ID)
 */
exports.deleteFile = async (query, callback) => {
  const { id } = query;
  if (!id) {
    return callback(400, { "message": "Missing required parameter." });
  }

  // Get document id (did) associated with the file.
  const fileRecord = await db.runPreparedSelect("SELECT did FROM File WHERE id=?", [id]);
  if (fileRecord.length === 0) {
    return callback(404, { "message": "File not found." });
  }

  const filePath = path.join(process.cwd(), process.env.STORAGE_DIR, fileRecord[0].did, id + ".pdf");

  // Delete file metadata and history from the database.
  await db.runPreparedExecute("DELETE FROM File WHERE id=?", [id]);
  await db.runPreparedExecute("DELETE FROM File_History WHERE fid=?", [id]);

  // Delete the physical file.
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  callback(200, { "message": "File deleted successfully." });
};

/**
 * Download File Service
 * Required query parameter: id (File ID)
 */
exports.downloadFile = async (query, res) => {
  const { id } = query;
  if (!id) {
    return res.status(400).json({ message: "Missing required parameter: id" });
  }

  // Retrieve document id and title for the file.
  const fileRecord = await db.runPreparedSelect("SELECT did, title FROM File WHERE id=?", [id]);
  if (fileRecord.length === 0) {
    return res.status(404).json({ message: "File not found." });
  }

  const filePath = path.join(process.cwd(), process.env.STORAGE_DIR, fileRecord[0].did, id + ".pdf");
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found on server storage." });
  }

  res.setHeader("Content-Disposition", `attachment; filename="${fileRecord[0].title}.pdf"`);
  res.setHeader("Content-Type", "application/pdf");

  fs.createReadStream(filePath).pipe(res);
};

