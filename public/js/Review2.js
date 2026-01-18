import { db } from "./firebase-config.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";



addEventListener("DOMContentLoaded", async () => {
    const commentsContainer = document.querySelector("#comments-container");
    const pad = n => n.toString().padStart(2, '0');

    commentsContainer.innerHTML = '<div class="loading">Loading comments...</div>';

    const q = query(collection(db, "comments"), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);

    commentsContainer.innerHTML = '';

    if (querySnapshot.empty) {
        commentsContainer.innerHTML = '<div class="no-comments">No comments yet.</div>';
        return;
    }
    // Show all comments
    querySnapshot.forEach(doc => {
        const item = doc.data();
        const d = item.date && typeof item.date.toDate === "function"
            ? item.date.toDate()
            : (item.date ? new Date(item.date) : new Date());

        const date = pad(d.getDate());
        const month = pad(d.getMonth() + 1);
        const year = d.getFullYear();

        const div = document.createElement("div");
        div.classList.add("comment");
        div.innerHTML = `
            <div class="author">${item.name ? item.name.replace(/</g, "&lt;") : "Anonymous"}</div>
            <div class="date">${date}/${month}/${year}</div>
            <div class="product">Reviewed: ${item.product ? item.product.replace(/</g, "&lt;") : "N/A"}</div>
            <div class="rating">${"⭐".repeat(Math.max(0, Math.min(5, item.stars || 0)))}</div>
            <div class="text">${item.text ? item.text.replace(/</g, "&lt;") : ""}</div>
        `;
        commentsContainer.appendChild(div);
    });
});