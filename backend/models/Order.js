const { DataTypes } = require('sequelize');

/**
 * Order model used by analytics to compute KPIs and channel breakdowns.
 * Fields align with backend/routes/analytics.js usage.
 */
module.exports = (sequelize) =>
  sequelize.define('Order', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    orderId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    platform: {
      type: DataTypes.STRING, // e.g., 'shopify', 'amazon', 'pos', 'meesho', etc.
      allowNull: true,
    },
    amount: {
      type: DataTypes.FLOAT, // order total amount
      allowNull: false,
      defaultValue: 0,
    },
    profit: {
      type: DataTypes.FLOAT, // profit amount for the order
      allowNull: false,
      defaultValue: 0,
    },
    isNewCustomer: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  });
