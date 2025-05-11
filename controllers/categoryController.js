const categoryService = require("../services/categoryService")

exports.addCategory = (req, res) => {
    categoryService.createCategory(req.body, (status, data) => {
        res.status(status).json(data)

    })
}

exports.getCategory = (req, res) => {
    categoryService.getCategory((status, data) => {
        res.status(status).json(data)
    })
}

exports.deleteCategory = (req, res) => {
    categoryService.deleteCategory(req.body, (status, data) => {
        res.status(status).json(data)
    })
}