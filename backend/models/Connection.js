const { DataTypes } = require('sequelize');
module.exports = (sequelize) =>
  sequelize.define('Connection', {
    user_id: DataTypes.INTEGER,
    key: DataTypes.STRING,
    name: DataTypes.STRING,
    connected: { type: DataTypes.BOOLEAN, defaultValue: false },
    lastSync: DataTypes.DATE,
    // Mock OAuth fields
    oauthState: DataTypes.STRING, // 'pending', 'authorized'
    token: DataTypes.STRING,      // mock access token
  });
