const pool = require("../config/db");
const { getAll } = require("./userModel");

const TransactionModel = {
   createTransaction: async (customerId, totalAmount, status = "pending") => {
      const [result] = await pool.execute("INSERT INTO transactions (customer_id, total_amount, status) VALUES (?, ?, ?)", [customerId, totalAmount, status]);
      return result.insertId;
   },

   addTransactionItem: async (transactionId, productId, quantity, pricePerItem) => {
      const [result] = await pool.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, price_per_item) VALUES (?, ?, ?, ?)", [transactionId, productId, quantity, pricePerItem]);
      return result.insertId;
   },

   findById: async (id) => {
      const [rows] = await pool.execute(
         `SELECT t.*, ci.id AS item_id, ci.product_id, ci.quantity, ci.price_per_item, 
            p.name AS product_name, p.price AS product_price
            FROM transactions t
            JOIN transaction_items ci ON t.id = ci.transaction_id
            JOIN products p ON ci.product_id = p.id
            WHERE t.id = ?`,
         [id]
      );
      return rows;
   },

   findByCustomerId: async (customerId) => {
      const [rows] = await pool.execute(
         `SELECT t.*, ci.id AS item_id, ci.product_id, ci.quantity, ci.price_per_item, 
            p.name AS product_name, p.price AS product_price
            FROM transactions t
            JOIN transaction_items ci ON t.id = ci.transaction_id
            JOIN products p ON ci.product_id = p.id
            WHERE t.customer_id = ?
            ORDER BY t.transaction_date DESC`,
         [customerId]
      );
      return rows;
   },

   updateStatus: async (id, status) => {
      const [result] = await pool.execute("UPDATE transactions SET status = ? WHERE id = ?", [status, id]);
      return result.affectedRows;
   },

   delete: async (id) => {
      const [result] = await pool.execute("DELETE FROM transactions WHERE id = ?", [id]);
      return result.affectedRows;
   },

   getAll: async () => {
      const [rows] = await pool.execute(
         `SELECT t.*,
            ci.id AS item_id, ci.product_id, ci.quantity,
            ci.price_per_item,
            p.name AS product_name, p.price AS product_price
            FROM transactions t
            JOIN transaction_items ci ON t.id = ci.transaction_id
            JOIN products p ON ci.product_id = p.id
            ORDER BY t.transaction_date DESC`
      );
      return rows;
   },
};

module.exports = TransactionModel;
