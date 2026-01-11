const supabase = require('../config/db');

const TABLE = 'items';

const listItems = async (req, res) => {
  try {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error) return res.status(404).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createItem = async (req, res) => {
  try {
    const payload = req.body;
    const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const { data, error } = await supabase.from(TABLE).update(payload).eq('id', id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ deleted: true, item: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
};
