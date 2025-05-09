const homeService = require("../services/homeService")

exports.getAllDocuments = (req, res) => {
    homeService.getAllDocuments((status, data) => {
        res.status(status).json(data)
    })
}