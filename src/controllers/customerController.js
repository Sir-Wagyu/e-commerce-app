const CustomerModel = require("../models/customerModel");
const { getAll } = require("../models/userModel");
const { get } = require("../routes/userRoutes");

const CustomerController = {
   createCustomer: async (req, res) => {
      const { userId, name, email, phone, address } = req.body;

      // Tambahkan phone ke validasi jika phone juga wajib
      if (!userId || !name || !email || !address) {
         return res.status(400).json({ message: "User ID, name, email, and address are required" });
      }

      try {
         // >>> PERBAIKI DI SINI: Teruskan userId ke CustomerModel.create
         const customerId = await CustomerModel.create(userId, name, email, phone, address); // Menambahkan userId, phone
         res.status(201).json({ message: "Customer created successfully", customerId });
      } catch (error) {
         console.error("Error creating customer:", error);
         res.status(500).json({ message: "Error Creating Customer" });
      }
   },

   getCustomerById: async (req, res) => {
      const { id } = req.params;

      try {
         const customer = await CustomerModel.findById(id);
         if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
         }

         res.status(200).json({ customer });
      } catch (error) {
         console.error("Error fetching customer by ID:", error);
         res.status(500).json({ message: "Error Getting Customer" });
      }
   },

   getCustomerByUserId: async (req, res) => {
      const { userId } = req.params;

      try {
         const customer = await CustomerModel.findByUserId(userId);
         if (!customer) {
            return res.status(404).json({ message: "Customer not found for this user" });
         }

         res.status(200).json({ customer });
      } catch (error) {
         console.error("Error fetching customer by User ID:", error);
         res.status(500).json({ message: "Error Getting Customer by User ID" });
      }
   },

   updateCustomer: async (req, res) => {
      const { id } = req.params;
      const { name, email, phone, address } = req.body;

      try {
         const affectedRows = await CustomerModel.update(id, name, email, phone, address);
         if (affectedRows === 0) {
            return res.status(404).json({ message: "Customer not found" });
         }

         res.status(200).json({ message: "Customer updated successfully" });
      } catch (error) {
         console.error("Error updating customer:", error);
         res.status(500).json({ message: "Error Updating Customer" });
      }
   },

   deleteCustomer: async (req, res) => {
      const { id } = req.params;

      try {
         const affectedRows = await CustomerModel.delete(id);
         if (affectedRows === 0) {
            return res.status(404).json({ message: "Customer not found" });
         }

         res.status(200).json({ message: "Customer deleted successfully" });
      } catch (error) {
         console.error("Error deleting customer:", error);
         res.status(500).json({ message: "Error Deleting Customer" });
      }
   },

   getAllCustomers: async (req, res) => {
      try {
         const customers = await CustomerModel.getAll();
         res.status(200).json({ customers });
      } catch (error) {
         console.error("Error fetching all customers:", error);
         res.status(500).json({ message: "Error Getting All Customers" });
      }
   },
};

module.exports = CustomerController;
