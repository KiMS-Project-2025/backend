const fileService = require("../services/fileService");

// Controller to handle file uploads.

exports.uploadFile = (req, res) => {
    // req.file should be provided by your middleware, e.g., Multer.
    fileService.uploadFile(req.body, req.file, (status, data) => {
        res.status(status).json(data);
    });
};

// Controller to get file information.

exports.getFile = (req, res) => {
    fileService.getFile(req.query, (status, data) => {
        res.status(status).json(data);
    });
};

// Controller to update file information.
exports.updateFile = (req, res) => {á
    fileService.updateFile(req.body, (status, data) => {
        res.status(status).json(data);
    });
};

// Controller to delete a file.
exports.deleteFile = (req, res) => {
    fileService.deleteFile(req.query, (status, data) => {
        res.status(status).json(data);
    });
};
