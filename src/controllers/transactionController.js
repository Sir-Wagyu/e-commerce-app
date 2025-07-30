const TransactionModel = require("../models/transactionModel");
const ProductModel = require("../models/productModel");
const CustomerModel = require("../models/customerModel");
const pool = require("../config/db"); // Pool untuk database tunggal Anda

const TransactionController = {
  createTransaction: async (req, res) => {
    const { customerId, items } = req.body;
    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Customer ID and transaction items are required" });
    }

    const connection = await pool.getConnection(); // Dapatkan koneksi dari pool
    try {
      await connection.beginTransaction(); // Mulai transaksi database

      // 1. Validasi Customer (menggunakan koneksi transaksi)
      const [customerRows] = await connection.execute("SELECT * FROM customers WHERE id = ?", [customerId]);
      const customer = customerRows[0];
      if (!customer) {
        await connection.rollback();
        return res.status(404).json({ message: "Customer not found" });
      }

      // 2. Validasi semua produk dan stoknya (menggunakan koneksi transaksi dan FOR UPDATE)
      let totalAmount = 0;
      const processedItems = [];

      for (const item of items) {
        // SELECT product DENGAN FOR UPDATE untuk mengunci baris produk
        // Ini mencegah transaksi lain mengubah stok produk yang sama sampai transaksi ini selesai
        const [productRows] = await connection.execute("SELECT * FROM products WHERE id = ? FOR UPDATE", [item.productId]);
        const product = productRows[0];

        if (!product) {
          await connection.rollback();
          return res
            .status(404)
            .json({ message: `Product with ID ${item.productId} not found` });
        }

        if (product.stock < item.quantity) {
          await connection.rollback();
          return res
            .status(400)
            .json({ message: `Not enough stock for product ${product.name}. Available: ${product.stock}` });
        }

        totalAmount += product.price * item.quantity;
        processedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          pricePerItem: product.price,
          stockBefore: product.stock, // Simpan stok saat ini untuk update
        });
      }

      // 3. Simpan transaksi utama ke DB lokal
      const [transResult] = await connection.execute(
        "INSERT INTO transactions (customer_id, total_amount, status) VALUES (?, ?, ?)",
        [customerId, totalAmount, "pending"]
      );
      const transactionId = transResult.insertId;

      // 4. Simpan item-item transaksi ke DB lokal
      for (const item of processedItems) {
        await connection.execute(
          "INSERT INTO transaction_items (transaction_id, product_id, quantity, price_per_item) VALUES (?, ?, ?, ?)",
          [transactionId, item.productId, item.quantity, item.pricePerItem]
        );
      }

      // 5. Kurangi stok produk (menggunakan koneksi transaksi yang sama)
      for (const item of processedItems) {
        // Lakukan UPDATE stok menggunakan koneksi transaksi yang sama
        await connection.execute(
          "UPDATE products SET stock = ? WHERE id = ?",
          [item.stockBefore - item.quantity, item.productId]
        );
      }

      await connection.commit(); // Commit transaksi jika semua berhasil
      res
        .status(201)
        .json({ message: "Transaction created successfully", transactionId });
    } catch (error) {
      await connection.rollback(); // Rollback jika ada error
      console.error(
        "Error creating transaction:",
        error.message // Cukup error.message untuk monolitik
      );
      res.status(500).json({
        message: "Error creating transaction, transaction rolled back",
        error: error.message,
      });
    } finally {
      connection.release(); // Selalu lepaskan koneksi kembali ke pool
    }
  },

  // --- Metode GET dan lainnya tidak perlu diubah secara signifikan untuk masalah ini ---

  getTransactionById: async (req, res) => {
    try {
      const { id } = req.params;
      const transactionItems = await TransactionModel.findById(id);
      if (transactionItems.length === 0) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const transaction = {
        id: transactionItems[0].id,
        customer_id: transactionItems[0].customer_id,
        total_amount: transactionItems[0].total_amount,
        status: transactionItems[0].status,
        transaction_date: transactionItems[0].transaction_date,
        items: transactionItems.map((item) => ({
          item_id: item.item_id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price_per_item: item.price_per_item,
        })),
      };

      res.status(200).json(transaction);
    } catch (error) {
      console.error("Error getting transaction by ID:", error);
      res.status(500).json({ message: "Error getting transaction" });
    }
  },

  getTransactionsByCustomerId: async (req, res) => {
    try {
      const { customerId } = req.params;
      const allItems = await TransactionModel.findByCustomerId(customerId);
      if (allItems.length === 0) {
        return res
          .status(404)
          .json({ message: "No transactions found for this customer" });
      }

      const transactionsMap = new Map();
      allItems.forEach((item) => {
        if (!transactionsMap.has(item.id)) {
          transactionsMap.set(item.id, {
            id: item.id,
            customer_id: item.customer_id,
            total_amount: item.total_amount,
            status: item.status,
            transaction_date: item.transaction_date,
            items: [],
          });
        }
        transactionsMap.get(item.id).items.push({
          item_id: item.item_id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price_per_item: item.price_per_item,
        });
      });

      res.status(200).json(Array.from(transactionsMap.values()));
    } catch (error) {
      console.error("Error getting transactions by customer ID:", error);
      res.status(500).json({ message: "Error getting transactions" });
    }
  },

  updateTransactionStatus: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !["pending", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status provided" });
    }
    try {
      const affectedRows = await TransactionModel.updateStatus(id, status);
      if (affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Transaction not found or no changes made" });
      }
      res
        .status(200)
        .json({ message: "Transaction status updated successfully" });
    } catch (error) {
      console.error("Error updating transaction status:", error);
      res.status(500).json({ message: "Error updating transaction status" });
    }
  },

  deleteTransaction: async (req, res) => {
    const { id } = req.params;
    try {
      const affectedRows = await TransactionModel.delete(id);
      if (affectedRows === 0) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.status(200).json({ message: "Transaction deleted successfully" });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Error deleting transaction" });
    }
  },

  getAllTransactions: async (req, res) => {
    try {
      const transactionItems = await TransactionModel.getAll();
      if (transactionItems.length === 0) {
        return res.status(200).json([]); // No transactions found
      }

      const transactionsMap = new Map();
      transactionItems.forEach((item) => {
        if (!transactionsMap.has(item.id)) {
          transactionsMap.set(item.id, {
            id: item.id,
            customer_id: item.customer_id,
            total_amount: item.total_amount,
            status: item.status,
            transaction_date: item.transaction_date,
            items: [],
          });
        }
        transactionsMap.get(item.id).items.push({
          item_id: item.item_id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price_per_item: item.price_per_item,
        });
      });
      res.status(200).json(Array.from(transactionsMap.values()));
    } catch (error) {
      console.error("Error getting all transactions:", error);
      res.status(500).json({ message: "Error getting all transactions" });
    }
  },
};

module.exports = TransactionController;