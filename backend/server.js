require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("./user");
const Expense = require("./expense");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Check environment settings
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    console.error("Please set MONGODB_URI and JWT_SECRET in .env");
    process.exit(1);
}

// Create login token
function createToken(user) {
    return jwt.sign(
        { userId: user._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );
}

// Verify login token
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Please login first"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Session expired. Please login again"
        });
    }
}

// Test route
app.get("/", function (req, res) {
    res.send("Expense Tracker Backend is Running");
});

// Register
app.post("/register", async function (req, res) {
    try {
        const name = req.body.name?.trim();
        const email = req.body.email?.trim().toLowerCase();
        const password = req.body.password;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                message: "Email is already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });

        const token = createToken(user);

        res.status(201).json({
            message: "Registration successful",
            token,
            name: user.name,
            email: user.email
        });
    } catch (error) {
        console.error("Register error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Email is already registered"
            });
        }

        res.status(500).json({
            message: "Registration failed"
        });
    }
});

// Login
app.post("/login", async function (req, res) {
    try {
        const email = req.body.email?.trim().toLowerCase();
        const password = req.body.password;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = createToken(user);

        res.json({
            message: "Login successful",
            token,
            name: user.name,
            email: user.email
        });
    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Login failed"
        });
    }
});

// Get only the logged-in user's expenses
app.get("/expenses", authenticate, async function (req, res) {
    try {
        const expenses = await Expense.find({
            owner: req.userId
        }).sort({ _id: -1 });

        res.json(expenses);
    } catch (error) {
        console.error("Get expenses error:", error);

        res.status(500).json({
            message: "Failed to get expenses"
        });
    }
});

// Add expense for the logged-in user
app.post("/expenses", authenticate, async function (req, res) {
    try {
        const { amount, category, description, date } = req.body;

        if (
            !Number.isFinite(amount) ||
            amount <= 0 ||
            typeof category !== "string" ||
            !category.trim() ||
            typeof description !== "string" ||
            !description.trim() ||
            typeof date !== "string" ||
            !date.trim()
        ) {
            return res.status(400).json({
                message: "Please enter valid expense details"
            });
        }

        const expense = await Expense.create({
            amount,
            category: category.trim(),
            description: description.trim(),
            date,
            owner: req.userId
        });

        res.status(201).json(expense);
    } catch (error) {
        console.error("Add expense error:", error);

        res.status(500).json({
            message: "Failed to add expense"
        });
    }
});

// Delete only the logged-in user's expense
app.delete("/expenses/:id", authenticate, async function (req, res) {
    try {
        const deletedExpense = await Expense.findOneAndDelete({
            _id: req.params.id,
            owner: req.userId
        });

        if (!deletedExpense) {
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        res.json({
            message: "Expense deleted"
        });
    } catch (error) {
        console.error("Delete expense error:", error);

        res.status(400).json({
            message: "Invalid expense ID or delete failed"
        });
    }
});

// Start server after MongoDB connects
async function startServer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB Connected");

        app.listen(PORT, function () {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("MongoDB Connection Error:", error.message);
        process.exit(1);
    }
}

startServer();