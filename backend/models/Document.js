const { DataTypes } = require('sequelize');
module.exports = (sequelize) =>
  sequelize.define('Document', {
    user_id: DataTypes.INTEGER,
    title: DataTypes.STRING,
    description: DataTypes.TEXT,
    filename: DataTypes.STRING,
    originalName: DataTypes.STRING,
    filePath: DataTypes.STRING,
    fileSize: DataTypes.INTEGER,
    mimeType: DataTypes.STRING,
    content: DataTypes.TEXT,
    processed: { type: DataTypes.BOOLEAN, defaultValue: false },
    vector_path: DataTypes.STRING,
  });