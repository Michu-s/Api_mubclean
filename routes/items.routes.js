const express = require('express');
const router = express.Router();
const itemController = require('../controllers/item.controller');

// Listar todos los items
router.get('/', itemController.listItems);

// Obtener item por id
router.get('/:id', itemController.getItem);

// Crear nuevo item
router.post('/', itemController.createItem);

// Actualizar item por id
router.put('/:id', itemController.updateItem);

// Eliminar item por id
router.delete('/:id', itemController.deleteItem);

module.exports = router;
