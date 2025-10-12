const { DataTypes } = require('sequelize');
module.exports = (sequelize) =>
  sequelize.define('User', {
    name: DataTypes.STRING,
    email: { type: DataTypes.STRING, unique: true },
    password: DataTypes.STRING,
    businessName: DataTypes.STRING,
    industry: DataTypes.STRING,
    locale: DataTypes.STRING,
    role: {
      type: DataTypes.ENUM('entrepreneur', 'consultant', 'vendor', 'admin'),
      allowNull: false,
      defaultValue: 'entrepreneur',
    },
    site: DataTypes.JSON,
  });
