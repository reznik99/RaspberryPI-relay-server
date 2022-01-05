const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

module.exports = {
    SECRET: process.env.JWT_SECRET,
    PORT: process.env.PORT,
    LOGIN: process.env.LOGIN,
    PASSWORD: process.env.PASSWORD,
};
