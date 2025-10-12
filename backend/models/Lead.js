const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define('Lead', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING, // e.g., website, instagram, referral
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('new', 'contacted', 'qualified', 'won', 'lost'),
      defaultValue: 'new',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    followUpAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });
