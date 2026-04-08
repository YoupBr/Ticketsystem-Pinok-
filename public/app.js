const socket = io();

const orderForm = document.getElementById("orderForm");
const orderNumberInput = document.getElementById("orderNumber");
const ordersList = document.getElementById("ordersList");

const displayOrders = document.getElementById("displayOrders");
const busyMessage = document.getElementById("busyMessage");

// ORDER TOEVOEGEN
if (orderForm && orderNumberInput) {
  orderForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const number = orderNumberInput.value.trim();
    if (!number) return;

    try {
      const response = await fetch("/add-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ number })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Er ging iets mis bij het toevoegen van de bestelling.");
        return;
      }

      orderNumberInput.value = "";
      orderNumberInput.focus();
    } catch (error) {
      console.error("Fout bij toevoegen van order:", error);
      alert("Server niet bereikbaar.");
    }
  });
}

// ORDER VERWIJDEREN
window.removeOrder = async function (id) {
  try {
    const response = await fetch("/remove-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id })
    });

    if (!response.ok) {
      alert("Verwijderen mislukt.");
    }
  } catch (error) {
    console.error("Fout bij verwijderen van order:", error);
    alert("Server niet bereikbaar.");
  }
};

// REALTIME UPDATES
socket.on("ordersUpdated", (orders) => {
  renderAdminOrders(orders);
  renderDisplayOrders(orders);
});

// ADMIN RENDER
function renderAdminOrders(orders) {
  if (!ordersList) return;

  ordersList.innerHTML = "";

  if (!Array.isArray(orders) || orders.length === 0) {
    ordersList.innerHTML = `
      <div class="border-2 border-[#00257b] rounded-2xl p-6 text-xl bg-white">
        Er staan momenteel geen actieve bestellingen klaar.
      </div>
    `;
    return;
  }

  const adminOrders = [...orders].reverse();

  adminOrders.forEach((order) => {
    const div = document.createElement("div");
    div.className =
      "flex items-center justify-between border-2 border-[#00257b] rounded-2xl px-6 py-4 bg-white shadow-sm";

    div.innerHTML = `
      <span class="text-3xl font-bold text-[#00257b]">${escapeHtml(order.number)}</span>
      <button
        class="bg-[#00257b] text-white px-5 py-3 rounded-xl font-semibold hover:opacity-90 transition"
        data-order-id="${order.id}"
      >
        Verwijderen
      </button>
    `;

    const button = div.querySelector("button");
    button.addEventListener("click", () => {
      removeOrder(order.id);
    });

    ordersList.appendChild(div);
  });
}

// DISPLAY RENDER
function renderDisplayOrders(orders) {
  if (!displayOrders) return;

  displayOrders.innerHTML = "";

  // Druktemelding altijd updaten
  if (busyMessage) {
    if (Array.isArray(orders) && orders.length >= 10) {
      busyMessage.classList.remove("hidden");
    } else {
      busyMessage.classList.add("hidden");
    }
  }

  if (!Array.isArray(orders) || orders.length === 0) {
    displayOrders.innerHTML = `
      <div class="text-3xl md:text-4xl font-semibold text-center text-[#00257b]">
        Nog geen bestellingen klaar
      </div>
    `;
    return;
  }

  orders.forEach((order, index) => {
    const isNewest = index === orders.length - 1;

    const div = document.createElement("div");
    div.className = isNewest
      ? "border-4 border-[#00257b] text-[#00257b] rounded-3xl px-12 py-10 font-bold min-w-[200px] text-center shadow-md text-7xl md:text-8xl animate-pulse bg-blue-50"
      : "border-4 border-[#00257b] text-[#00257b] rounded-3xl px-10 py-8 font-bold min-w-[180px] text-center shadow-md text-5xl md:text-6xl bg-white";

    div.textContent = order.number;
    displayOrders.appendChild(div);
  });
}

// HTML escape
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}