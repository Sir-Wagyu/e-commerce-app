const UserModel = require("../models/userModel");

const UserController = {
   registerUser: async (req, res) => {
      const { username, password, role } = req.body;
      if (!username || !password) {
         return res.status(400).json({ message: "Username and password are required" });
      }

      try {
         const userId = await UserModel.create(username, password, role || "customer");
         res.status(201).json({ message: "User created successfully", userId });
      } catch (error) {
         console.error("Error creating user:", error);
         res.status(500).json({ message: "Error Register User" });
      }
   },

   loginUser: async (req, res) => {
      const { username, password } = req.body;
      if (!username || !password) {
         return res.status(400).json({ message: "Username and password are required" });
      }

      try {
         const user = await UserModel.findByUsername(username);
         if (!user) {
            return res.status(400).json({ message: "User not found" });
         }

         if (user.password !== password) {
            return res.status(400).json({ message: "Invalid password" });
         }

         res.status(200).json({ message: "Login successful", id: user.id, username: user.username, role: user.role });
      } catch (error) {
         console.error("Error logging in user:", error);
         res.status(500).json({ message: "Error Logging In User" });
      }
   },

   getUserById: async (req, res) => {
      const { id } = req.params;

      try {
         const user = await UserModel.findById(id);
         if (!user) {
            return res.status(404).json({ message: "User not found" });
         }

         res.status(200).json({ user });
      } catch (error) {
         console.error("Error fetching user by ID:", error);
         res.status(500).json({ message: "Error Getting User" });
      }
   },

   updateUser: async (req, res) => {
      const { id } = req.params;
      const { username, password, role } = req.body;

      try {
         const affectedRows = await UserModel.update(id, username, password, role);
         if (affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
         }

         res.status(200).json({ message: "User updated successfully" });
      } catch (error) {
         console.error("Error updating user:", error);
         res.status(500).json({ message: "Error Updating User" });
      }
   },

   deleteUser: async (req, res) => {
      const { id } = req.params;

      try {
         const affectedRows = await UserModel.delete(id);
         if (affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
         }

         res.status(200).json({ message: "User deleted successfully" });
      } catch (error) {
         console.error("Error deleting user:", error);
         res.status(500).json({ message: "Error Deleting User" });
      }
   },

   getAllUsers: async (req, res) => {
      try {
         const users = await UserModel.getAll();
         res.status(200).json({ users });
      } catch (error) {
         console.error("Error fetching all users:", error);
         res.status(500).json({ message: "Error Getting All Users" });
      }
   },
};

module.exports = UserController;
