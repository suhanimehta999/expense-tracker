const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },

    category: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    date: {
        type: String,
        required: true
    },

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    }
});

module.exports = mongoose.model("Expense", expenseSchema);