const { DataTypes } = require('sequelize');
module.exports = (sequelize) =>
  sequelize.define('Chat', {
    user_id: DataTypes.INTEGER,
    messages: DataTypes.TEXT, // Store as JSON string
  });