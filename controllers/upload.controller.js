exports.uploadFile = (req, res) => {
  if (req.file) {
    // Construct the public URL
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(200).json({ url: url });
  } else {
    res.status(400).json({ error: 'No file uploaded' });
  }
};
