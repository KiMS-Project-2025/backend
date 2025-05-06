const userService = require("../services/userService")

exports.getUsers = (req, res) => {
    userService.getAllUsers((err, users) => {
        if (err) {
            return res.status(500).json({ "message": err.message })
        }
        res.json(users)
    })
}