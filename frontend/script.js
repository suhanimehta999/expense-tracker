
const API_URL = "http://localhost:5000";

// Login and Register
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    let isRegister = false;

    const nameField = document.getElementById("nameField");
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const submitButton = document.getElementById("submitButton");
    const formTitle = document.getElementById("formTitle");
    const switchText = document.getElementById("switchText");
    const switchMode = document.getElementById("switchMode");
    const message = document.getElementById("message");

    switchMode.addEventListener("click", function (event) {
        event.preventDefault();

        isRegister = !isRegister;

        nameField.style.display = isRegister ? "block" : "none";
        nameInput.required = isRegister;

        formTitle.textContent = isRegister
            ? "Create your account"
            : "Login to manage your expenses";

        submitButton.textContent = isRegister ? "Register" : "Login";

        switchText.textContent = isRegister
            ? "Already have an account?"
            : "Don't have an account?";

        switchMode.textContent = isRegister ? "Login" : "Register";
        message.textContent = "";
    });

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (isRegister && name === "") {
            message.textContent = "Please enter your name.";
            return;
        }

        if (password.length < 8) {
            message.textContent = "Password must be at least 8 characters.";
            return;
        }

        const endpoint = isRegister ? "/register" : "/login";

        const requestData = isRegister
            ? { name: name, email: email, password: password }
            : { email: email, password: password };

        submitButton.disabled = true;
        message.textContent = isRegister ? "Creating account..." : "Logging in...";

        try {
            const response = await fetch(API_URL + endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (!response.ok) {
                message.textContent = data.message || "Something went wrong.";
                return;
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("userName", data.name);
            localStorage.setItem("userEmail", data.email);

            window.location.href = "dashboard.html";

        } catch (error) {
            console.log("Login/Register error:", error);
            message.textContent = "Cannot connect to backend. Make sure the server is running.";
        } finally {
            submitButton.disabled = false;
        }
    });
}


// Dashboard
const expenseForm = document.querySelector(".expense-form");

if (expenseForm) {
    const token = localStorage.getItem("token");
    const userName = localStorage.getItem("userName");

    if (!token || !userName) {
        window.location.href = "login.html";
    } else {
        const amountInput = expenseForm.querySelector('input[type="number"]');
        const categoryInput = expenseForm.querySelector("select");
        const descriptionInput = expenseForm.querySelector('input[type="text"]');
        const dateInput = expenseForm.querySelector('input[type="date"]');
        const addButton = expenseForm.querySelector("button");
        const expenseList = document.querySelector(".expense-list");

        const welcomeText = document.querySelector(".dashboard-container header p");

        if (welcomeText) {
            welcomeText.textContent = "Welcome, " + userName;
        }

        // Send the login token to the backend
        async function apiRequest(url, options = {}) {
            const response = await fetch(API_URL + url, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token,
                    ...(options.headers || {})
                }
            });

            if (response.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("userName");
                localStorage.removeItem("userEmail");
                window.location.href = "login.html";
                throw new Error("Please login again.");
            }

            return response;
        }

        // Load only this user's expenses
        async function loadExpenses() {
            try {
                const response = await apiRequest("/expenses");

                if (!response.ok) {
                    throw new Error("Failed to load expenses");
                }

                const expenses = await response.json();

                expenseList.querySelectorAll(".expense-item").forEach(function (item) {
                    item.remove();
                });

                let totalExpense = 0;

                expenses.forEach(function (expense) {
                    totalExpense += Number(expense.amount);
                    createExpenseItem(expense);
                });

                document.querySelector(".total-box h2").textContent =
                    "₹" + totalExpense;

            } catch (error) {
                console.log("Error loading expenses:", error);
            }
        }

        // Show one expense
        function createExpenseItem(expense) {
            const expenseItem = document.createElement("div");
            expenseItem.className = "expense-item";

            const details = document.createElement("div");
            const category = document.createElement("h3");
            const description = document.createElement("p");
            const date = document.createElement("small");

            category.textContent = expense.category;
            description.textContent = expense.description;
            date.textContent = expense.date;

            details.append(category, description, date);

            const actions = document.createElement("div");
            const amount = document.createElement("strong");
            const deleteButton = document.createElement("button");

            amount.textContent = "₹" + expense.amount;
            deleteButton.textContent = "Delete";
            deleteButton.className = "delete-btn";

            actions.append(amount, deleteButton);
            expenseItem.append(details, actions);
            expenseList.appendChild(expenseItem);

            // Delete only an expense belonging to this user
            deleteButton.addEventListener("click", async function () {
                try {
                    const response = await apiRequest(
                        "/expenses/" + expense._id,
                        { method: "DELETE" }
                    );

                    const data = await response.json();

                    if (response.ok) {
                        loadExpenses();
                    } else {
                        alert(data.message || "Failed to delete expense.");
                    }
                } catch (error) {
                    console.log("Delete error:", error);
                    if (error.message !== "Please login again.") {
                        alert("Could not delete expense.");
                    }
                }
            });
        }

        // Add an expense
        expenseForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const amount = Number(amountInput.value);
            const category = categoryInput.value;
            const description = descriptionInput.value.trim();
            const date = dateInput.value;

            if (amount <= 0 || !category || description === "" || date === "") {
                alert("Please fill all fields correctly.");
                return;
            }

            try {
                const response = await apiRequest("/expenses", {
                    method: "POST",
                    body: JSON.stringify({
                        amount: amount,
                        category: category,
                        description: description,
                        date: date
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    alert("Expense added successfully!");

                    amountInput.value = "";
                    descriptionInput.value = "";
                    dateInput.value = "";

                    loadExpenses();
                } else {
                    alert(data.message || "Failed to add expense.");
                }
            } catch (error) {
                console.log("Add expense error:", error);
                if (error.message !== "Please login again.") {
                    alert("Cannot connect to backend.");
                }
            }
        });

        loadExpenses();
    }
}


// Logout
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
        localStorage.removeItem("token");
        localStorage.removeItem("userName");
        localStorage.removeItem("userEmail");

        window.location.href = "login.html";
    });
}

