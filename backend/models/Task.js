const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define('Task', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('open', 'done'),
      defaultValue: 'open',
    },
    source: {
      type: DataTypes.ENUM('chat', 'growth', 'manual'),
      defaultValue: 'manual',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
      defaultValue: 'medium',
    },
    progress: {
      type: DataTypes.INTEGER, // 0..100
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });
