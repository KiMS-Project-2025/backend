const documentService = require("../services/documentService")

exports.addDocument = (req, res) => {
    documentService.createDocument(req.body, (status, data) => {
        res.status(status).json(data)
    })
}

exports.getDocument = (req, res) => {
    documentService.getDocument(req.query, (status, data) => {
        res.status(status).json(data)
    })
}

exports.editDocument = (req, res) => {
    documentService.changeDocumentName(req.body, (status, data) => {
        res.status(status).json(data)
    })
}

exports.deleteDocument = (req, res) => {
    // after file API
}