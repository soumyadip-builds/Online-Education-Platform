const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, path.join(__dirname, "..", "uploads", "assignments"));
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = file.originalname.replace(ext, '').replace(/\s/g, '_');
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});

module.exports = multer({ storage });