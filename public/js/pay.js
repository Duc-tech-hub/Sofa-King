import { auth, db } from "./firebase-config.js";
import {
    doc, setDoc, collection, addDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import {
    onAuthStateChanged, reauthenticateWithPopup, GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const STORAGE_KEY = 'sofa_cart_history';
// Caculate total money
const calculateTotal = () => {
    const rawData = localStorage.getItem(STORAGE_KEY);
    const outputMoneyEl = document.getElementById("output_money");
    if (!rawData) return 0;

    const items = JSON.parse(rawData);
    const total = items.reduce((sum, item) => {
        const price = parseFloat(item.Price) || 0;
        const qty = parseInt(item.quantity) || 0;
        return sum + (price * qty);
    }, 0);

    if (outputMoneyEl) {
        outputMoneyEl.innerHTML = `<strong>Total: $${total.toLocaleString()}</strong>`;
    }
    return total;
};
// Listen to admin verify
const startListeningAdmin = (email) => {
    const statusRef = doc(db, "history", email, "admin_verify", "status");
    const note = document.getElementById("note");
    const confirmBtn = document.getElementById("confirmed-sent");
    const recheckBtn = document.getElementById("recheck");

    return onSnapshot(statusRef, async (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();

        if (data.is_waiting === true && data.is_confirmed === false && data.is_rejected === false) {
            if (confirmBtn) confirmBtn.style.display = "none";
            if (recheckBtn) recheckBtn.style.display = "none";
            if (note) {
                note.style.display = "block";
                note.style.color = "orange";
                note.innerText = "Waiting for Admin to verify...";
            }
            return;
        }

        if (data.is_confirmed === true || data.is_rejected === true) {
            if (data.is_confirmed === true) {
                alert("Payment Successful! Thank you.");
            } else {
                alert("Payment Rejected! Please try again.");
            }

            localStorage.removeItem(STORAGE_KEY);

            await setDoc(statusRef, {
                is_waiting: false,
                is_confirmed: false,
                is_rejected: false,
                updatedAt: Date.now()
            }, { merge: true });

            if (data.is_confirmed === true) {
                window.location.href = "../html/home.html";
            } else {
                window.location.reload();
            }
        }
    });
};
// Send request to admin
const handleConfirmRequest = async (user, totalAmount) => {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData || !user) return false;

    try {
        const items = JSON.parse(rawData);
        const pendingCol = collection(db, "history", user.email, "pending_orders");

        for (const item of items) {
            await addDoc(pendingCol, {
                ...item,
                timestamp: Date.now(),
                status: "waiting"
            });
        }

        const statusRef = doc(db, "history", user.email, "admin_verify", "status");
        await setDoc(statusRef, {
            is_waiting: true,
            is_confirmed: false,
            is_rejected: false,
            updatedAt: Date.now(),
            userEmail: user.email,
            totalBill: totalAmount
        });

        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

onAuthStateChanged(auth, (user) => {
    if (!user) return;

    const totalAmount = calculateTotal();
    startListeningAdmin(user.email);

    const recheckBtn = document.getElementById("recheck");
    const confirmBtn = document.getElementById("confirmed-sent");

    if (recheckBtn) {
        recheckBtn.addEventListener("click", async () => {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'login', max_age: '0' });

            try {
                await reauthenticateWithPopup(user, provider);
                recheckBtn.innerHTML = "<p>Verified ✓</p>";
                recheckBtn.disabled = true;
                if (confirmBtn) {
                    confirmBtn.style.display = "block";
                    confirmBtn.style.opacity = "1";
                }
            } catch (e) {
                if (e.code === 'auth/user-mismatch') {
                    alert("Wrong account! Please use: " + user.email);
                }
            }
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            if (totalAmount <= 0) {
                alert("Your cart is empty!");
                return;
            }

            confirmBtn.disabled = true;
            confirmBtn.innerText = "Processing...";
            const success = await handleConfirmRequest(user, totalAmount);

            if (!success) {
                confirmBtn.disabled = false;
                confirmBtn.innerText = "I have sent money.";
                alert("Failed to send request.");
            }
        });
    }
});