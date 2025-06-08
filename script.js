import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, deleteDoc, getDocs, query, orderBy, serverTimestamp} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA5OGCXlYYb_dnZ8VtKeIX9eQgGKUeLdYU",
    authDomain: "personal-expense-tracker-33c0f.firebaseapp.com",
    projectId: "personal-expense-tracker-33c0f",
    appId: "1:1032655596820:web:7cf7451a728641915f6601"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore();
let currentUser = null;


// let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
let expenses = [];

//DOM elements
const form = document.getElementById("expense-form");
const expenseList = document.getElementById("expense-list");
const totalDisplay = document.getElementById("total-expense");
const filterCategory = document.getElementById('filter-category');
const filterDate = document.getElementById('filter-date');

let categoryChart;
let monthlyChart;

filterCategory.addEventListener('change', renderExpenses);
filterDate.addEventListener('input', renderExpenses);

form.addEventListener("submit", async e => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const date = document.getElementById("date").value;
    const category = document.getElementById("category").value;

    if (!title || !amount || !date || !category) return;

    const expense = {
        title,
        amount,
        date,
        category,
        timestamp: serverTimestamp()
    }

    if (currentUser) {
        await addDoc(
            collection(db, "users", currentUser.uid, "expenses"),
            expense
        );
        await loadUserExpense(currentUser.uid);
    }
    form.reset();
});

function saveAndRender() {
    renderExpenses();
    updateTotal();
    updateChart();
    updateMonthlyChart();
}

function renderExpenses() {
    expenseList.innerHTML = "";

    const selectedCategory = filterCategory.value;
    const selectedDate = filterDate.value;

    const filtered = expenses.filter(exp => {
        const categoryMatch = selectedCategory === "all" || exp.category === selectedCategory;
        const dateMatch = !selectedDate || exp.date === selectedDate;
        return categoryMatch && dateMatch;
    });

    filtered.forEach(exp => {
        const li = document.createElement("li");
        li.innerHTML = `
        <strong>${exp.title}</strong> - ${exp.amount} (${exp.date}) - ${exp.category}
        <button class="delete-btn">Delete</button>
      `;
      li.querySelector(".delete-btn").addEventListener("click", () => deleteExpense(exp.id));
      expenseList.appendChild(li);
    });

}

async function deleteExpense(expenseId) {
    if (!expenseId) return console.error("Missing expense ID");
    if (currentUser) {
        try {
            await deleteDoc(doc(db, "users", currentUser.uid, expenses, expenseId));
            await loadUserExpense(currentUser.uid);
            console.log("Expense deleted expense", expenseId);
        } catch(error) {
            console.error("Failed to delete expense: ", error)
        }
    } else {
        console.error("No user logged in..")
    }
    saveAndRender();
}

function updateTotal() {
    const total = expenses.reduce((sum, exp) => sum +exp.amount, 0);
    totalDisplay.innerText = total.toFixed(2);
}

function updateChart() {
    const categoryTotals = {};

    expenses.forEach(exp => {
        if (categoryTotals[exp.category]) {
            categoryTotals[exp.category] += exp.amount;
        } else {
            categoryTotals[exp.category] = exp.amount;
        }
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Expenses by Category',
            data: data,
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
            borderColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
            borderWidth: 1
        }]
    };
    
    const config = {
        type: 'pie',
        data: chartData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Expenses by Category'
                }
            }
        },
    }

    if (categoryChart) {
        categoryChart.destroy();// Destroy the previous chart instance before creating a new one
    }

    const ctx = document.getElementById('category-chart').getContext('2d');
    categoryChart = new Chart(ctx, config);
}

function updateMonthlyChart() {
    const monthlyTotals = {};

    expenses.forEach(exp => {
        const month = new Date(exp.date).toLocaleString('default', { month: 'long' });
        if (monthlyTotals[month]) {
            monthlyTotals[month] += exp.amount;
        } else {
            monthlyTotals[month] = exp.amount;
        }
    });
    
    const sortedMonths = Object.keys(monthlyTotals).sort();

    const data = sortedMonths.map(month => monthlyTotals[month]);

    const chartData = {
        labels: sortedMonths,
        datasets: [{
            label: 'Monthly Expenses',
            data: data,
            backgroundColor: '#36A2EB',
            borderColor: '#36A2EB',
            borderWidth: 1
        }]
    };
    const config = {
        type: 'bar',
        data: chartData,
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Monthly Expenses'
                }
            }
        },
    };

    if (monthlyChart) {
        monthlyChart.destroy(); // Destroy the previous chart instance before creating a new one
    }

    const ctx = document.getElementById('monthly-chart').getContext('2d');
    monthlyChart = new Chart(ctx, config);
}

document.getElementById("login-btn").addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert(error.message);
        }
    }
);

function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    auth.signInWithEmailAndPassword(email, password).then(
        user => {console.log("Logged in: ", user);
        }).catch(error => {alert(error.message)});
}

document.getElementById("signup-btn").addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    try {
        await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert(error.message);
    }
})

function signup() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    auth.createUserWithEmailAndPassword(email, password).then(
        user => {console.log("Signed up: ", user.user.email);
        }
    ).catch(error => {alert(error.message)});
}

document.getElementById("logout-btn").addEventListener("click", async () => {
    await signOut(auth);
})

function logout() {
    auth.signOut();
}



// Initial render
saveAndRender();

async function loadUserExpense(uid) {
    expenses = [];
    const q = query(collection(db, "users", uid, "expenses"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
        const expense = docSnap.data();
        expense.id = docSnap.id;
        expenses.push(expense);
    });
    saveAndRender();
}

auth.onAuthStateChanged(user => {
    const userInfo = document.getElementById("user-information");

    if (user) {
        currentUser = user;
        userInfo.textContent = `Logged in as ${user.email}`;
        document.querySelector(".container").style.display = "block";
        loadUserExpense(user.uid);
    } else {
        currentUser = null;
        expenses = [];
        saveAndRender();
        userInfo.textContent = "Not logged in";
        document.querySelector(".container").style.display = "none";
    }
});