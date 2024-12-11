const jwt = require('jsonwebtoken');

function generateLink(email) {
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return `${process.env.APP_BASE_URL}/driver/signup/${token}`;
}

module.exports = { generateLink };
