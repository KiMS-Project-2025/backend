const fileService = require("../services/fileService")

exports.uploadFile = (req, res) => {
    if (!req.file) return res.status(400).json({ "message": "not upload any file." })

    const fid = req.savedFileId
    fileService.createFile(req.body, fid, (status, data) => {
        res.status(status).json(data)
    })
}

exports.editFile = (req, res) => {
    fileService.editFileInformation(req.body, (status, data) => {
        res.status(status).json(data)
    })
}

exports.getFile = (req, res) => {
    const { id, detail, download } = req.query

    if (!id) return res.status(400).json({ "message": "missing parameter." })

    if (!detail) {
        fileService.getFile(id, (status, data) => {
            if (status === 200) {
                const { filePath, fileName } = data

                if (download) {
                    res.download(filePath, fileName, (err) => {
                        if (err) {
                            res.status(404).json({ "message": "file not found." })
                        }
                    })
                } else {
                    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`)
                    res.sendFile(filePath, (err) => {
                        if (err) {
                            res.status(404).json({ "message": "file not found." })
                        }
                    })
                }
            }
            else {
                res.status(404).json({ "message": "file not found." })
            }
        })
    } else {
        fileService.getFileInformation(id, (status, data) => {
            res.status(status).json(data)
        })
    }
}

exports.deleteFile = (req, res) => {
    fileService.deleteFile(req.body, (status, data) => {
        res.status(status).json(data)
    })
}