const express = require(`express`)
const app = express()
app.use(express.json())

const menuController = require(`../controllers/menu.controller`)
const { authorization }  = require (`../controllers/auth.controller`)

app.post(`/menu`,authorization(["admin", "kasir"]), menuController.addMenu)
app.get(`/menu`,authorization(["admin", "manajer","kasir"]), menuController.getMenu)
app.post(`/menu/find`,authorization(["admin", "kasir"]), menuController.findMenu)
app.put(`/menu/:id_menu`,authorization(["admin", "kasir"]), menuController.updateMenu)
app.delete(`/menu/:id_menu`,authorization(["admin", "kasir"]), menuController.deleteMenu)

module.exports = app