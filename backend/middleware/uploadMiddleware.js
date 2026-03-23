const upload = require('../config/multer');

const uploadSingle = upload.single('evidence');
const uploadMultiple = upload.array('evidences', 10);

module.exports = {
    uploadSingle,
    uploadMultiple
};