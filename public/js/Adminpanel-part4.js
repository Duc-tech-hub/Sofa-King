import { db } from './firebase-config.js';
import {
    collection, onSnapshot, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const selectShippingBtn = document.getElementById('select-shipping');
const completeShippingBtn = document.getElementById('complete-shipping');
const deleteShippingBtn = document.getElementById('delete-shipping');
let isShippingSelectMode = false;

if (selectShippingBtn) {
    selectShippingBtn.addEventListener('click', () => {
        isShippingSelectMode = !isShippingSelectMode;
        selectShippingBtn.innerText = isShippingSelectMode ? "Cancel" : "Select";

        const displayMode = isShippingSelectMode ? "inline-block" : "none";
        if (completeShippingBtn) completeShippingBtn.style.display = displayMode;
        if (deleteShippingBtn) deleteShippingBtn.style.display = displayMode;

        document.querySelectorAll('.shipping-checkbox').forEach(cb => {
            cb.style.display = isShippingSelectMode ? "block" : "none";
        });
    });
}
// Show orders from collection all_orders
const loadShippingDashboard = () => {
    const container = document.getElementById('shipping-container');
    const totalCountEl = document.getElementById('total-orders-count');
    const pendingCountEl = document.getElementById('pending-delivery-count');

    if (!container) return;

    onSnapshot(collection(db, "all_orders"), (snapshot) => {
        let tempHTML = "";
        let totalOrders = snapshot.size;
        let pendingDeliveryCount = 0;

        snapshot.docs.forEach(docSnap => {
            const order = docSnap.data();
            const docId = docSnap.id;
            const currentStatus = (order.status || "").toLowerCase();

            if (currentStatus === "packing") {
                pendingDeliveryCount++;
            }

            tempHTML += `
                <div class="order-card" style="position: relative; border-left: 5px solid ${currentStatus === 'delivered' ? '#28a745' : '#f1c40f'}; border-bottom: 1px solid #ddd; padding: 15px; margin-bottom: 10px;">
                    <input type="checkbox" class="shipping-checkbox" value="${docId}" 
                           style="display: ${isShippingSelectMode ? 'block' : 'none'}; 
                           position: absolute; top: 10px; right: 10px; width: 20px; height: 20px;">
                    
                    <div class="order-card-header">
                        <h4 class="order-id">ID: #${order.orderId || 'NoID'}</h4>
                        <span class="status-badge" style="background: ${currentStatus === 'delivered' ? '#d4edda' : '#fff3cd'}; padding: 5px; border-radius: 4px;">
                            ${order.status}
                        </span>
                    </div>

                    <div class="order-info">
                        <p><strong>Customer:</strong> ${order.customerEmail}</p>
                    </div>

                    <ul style="list-style: none; padding-left: 0; background: #fafafa; padding: 10px;">
                        ${order.items ? order.items.map(item => `
                            <li style="font-size: 0.9rem;">• ${item.Name} (${item.Size}) x${item.quantity}</li>
                        `).join("") : "<li>No items</li>"}
                    </ul>
                    
                    ${currentStatus === "packing" ?
                    `<button class="btn-action" style="background: #007bff; color: white; border: none; padding: 5px 10px; cursor: pointer;" onclick="markAsDelivered('${docId}')">MARK DELIVERED</button>` :
                    `<span style="color: green; font-weight: bold;">✓ Delivered</span>`
                }
                </div>
            `;
        });

        container.innerHTML = tempHTML || '<p style="text-align:center; padding:20px;">No orders found in database.</p>';

        if (totalCountEl) totalCountEl.innerText = totalOrders;
        if (pendingCountEl) pendingCountEl.innerText = pendingDeliveryCount;
    });
};
// Change status of orders from packing to delivered(Multiple)
window.markAsDelivered = async (id) => {
    if (!confirm("Confirm delivery for this order?")) return;
    try {
        const orderRef = doc(db, "all_orders", id);
        await updateDoc(orderRef, {
            status: "Delivered",
            deliveredAt: Date.now()
        });
    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
    }
};

loadShippingDashboard();

if (completeShippingBtn) {
    completeShippingBtn.addEventListener('click', async () => {
        const selected = document.querySelectorAll('.shipping-checkbox:checked');
        if (selected.length === 0) return alert("Select at least one order!");
        for (const cb of selected) {
            await updateDoc(doc(db, "all_orders", cb.value), { status: "Delivered", deliveredAt: Date.now() });
        }
        alert("Done!");
    });
}
// Delete orders from all_orders
if (deleteShippingBtn) {
    deleteShippingBtn.addEventListener('click', async () => {
        const selected = document.querySelectorAll('.shipping-checkbox:checked');

        if (selected.length === 0) {
            return alert("Please select at least one order to remove!");
        }

        const confirmDelete = confirm(`Are you sure you want to PERMANENTLY delete ${selected.length} order(s)?`);

        if (confirmDelete) {
            try {
                for (const cb of selected) {
                    await deleteDoc(doc(db, "all_orders", cb.value));
                }
                alert("Successfully removed selected orders!");
                if (isShippingSelectMode) {
                    selectShippingBtn.click();
                }
            } catch (error) {
                console.error(error);
                alert("Failed to delete orders.");
            }
        }
    });
}