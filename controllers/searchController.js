const searchService = require("../services/searchService")

exports.search = (req, res) => {
    searchService.search(req.query, (status, data) => {
        res.status(status).json(data)
    })
}