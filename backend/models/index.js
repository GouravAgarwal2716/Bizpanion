const { Sequelize } = require('sequelize');

// Use DATABASE_URL for production (like Supabase), fallback to SQLite for local dev
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: './database.sqlite',
    });

const User = require('./User')(sequelize);
const Chat = require('./Chat')(sequelize);
const Memory = require('./Memory')(sequelize);
const Document = require('./Document')(sequelize);
const Connection = require('./Connection')(sequelize);
const Task = require('./Task')(sequelize);
const Product = require('./Product')(sequelize);
const Invoice = require('./Invoice')(sequelize);
const Lead = require('./Lead')(sequelize);
const Order = require('./Order')(sequelize);

// You can define associations here if needed

module.exports = { sequelize, User, Chat, Memory, Document, Connection, Task, Product, Invoice, Lead, Order };
