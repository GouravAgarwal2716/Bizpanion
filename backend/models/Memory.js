const { DataTypes } = require('sequelize');
module.exports = (sequelize) =>
  sequelize.define('Memory', {
    user_id: DataTypes.INTEGER,
    type: DataTypes.ENUM('short-term', 'long-term'),
    content: DataTypes.TEXT,
  });