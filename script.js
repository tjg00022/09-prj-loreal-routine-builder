// Initialize state
let products = [];
let selectedProducts =
  JSON.parse(localStorage.getItem("selectedProducts")) || [];
let conversationHistory = [];

// Function to save selected products to localStorage
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

// Function to display message in chat window
function displayMessage(message, isUser = false) {
  const chatWindow = document.getElementById("chatWindow");
  const messageDiv = document.createElement("div");
  messageDiv.className = isUser ? "user-message" : "ai-message";
  messageDiv.innerHTML = message;
  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Load products from JSON
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  products = data.products;
  return products;
}

// Create product card HTML
function createProductCard(product) {
  const isSelected = selectedProducts.some((p) => p.id === product.id);
  return `
        <div class="product-card ${isSelected ? "selected" : ""}" 
             data-product-id="${product.id}" 
             onclick="toggleProductSelection(${product.id})">
            <img src="${product.image}" alt="${product.name}">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p>${product.brand}</p>
            </div>
            <div class="product-description">
                ${product.description}
            </div>
        </div>
    `;
}

// Function to display products
function displayProducts(productsToShow) {
  const productsContainer = document.getElementById("productsContainer");
  productsContainer.innerHTML = productsToShow.map(createProductCard).join("");
}

// Function to toggle product selection
function toggleProductSelection(productId) {
  const productCard = document.querySelector(
    `[data-product-id="${productId}"]`
  );
  const product = products.find((p) => p.id === productId);

  if (productCard.classList.contains("selected")) {
    productCard.classList.remove("selected");
    selectedProducts = selectedProducts.filter((p) => p.id !== productId);
  } else {
    productCard.classList.add("selected");
    selectedProducts.push(product);
  }

  saveSelectedProducts();
  updateSelectedProductsList();
}

// Function to update selected products list
function updateSelectedProductsList() {
  const selectedProductsList = document.getElementById("selectedProductsList");

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = "<p>No products selected</p>";
    document.getElementById("generateRoutine").disabled = true;
    return;
  }

  document.getElementById("generateRoutine").disabled = false;
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
            <div class="selected-item">
                <span>${product.name}</span>
                <button class="remove-btn" onclick="removeProduct(${product.id})">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
        `
    )
    .join("");
}

// Function to remove product from selection
function removeProduct(productId) {
  const productCard = document.querySelector(
    `[data-product-id="${productId}"]`
  );
  if (productCard) {
    productCard.classList.remove("selected");
  }
  selectedProducts = selectedProducts.filter((p) => p.id !== productId);
  saveSelectedProducts();
  updateSelectedProductsList();
}

// Function to generate routine using OpenAI API
async function generateRoutine() {
  if (selectedProducts.length === 0) {
    displayMessage("Please select some products first!");
    return;
  }

  const prompt = `Create a personalized beauty routine using these L'Oréal products:
${selectedProducts
  .map((p) => `- ${p.name} (${p.category}): ${p.description}`)
  .join("\n")}

Please provide a detailed routine that explains:
1. The order to use these products
2. When to use each product (morning/evening)
3. Any special instructions or tips
4. How these products work together`;

  try {
    displayMessage("Generating your personalized routine...");

    const response = await fetch(
      "https://wanderbot-worker.tjg00022.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...conversationHistory, { role: "user", content: prompt }],
        }),
      }
    );

    const data = await response.json();
    const routine = data.choices[0].message.content;

    conversationHistory.push(
      { role: "user", content: prompt },
      { role: "assistant", content: routine }
    );

    displayMessage(routine);
  } catch (error) {
    console.error("Error:", error);
    displayMessage(
      "Sorry, there was an error generating your routine. Please try again."
    );
  }
}

// Function to handle chat form submission
async function handleChat(event) {
  event.preventDefault();
  const userInput = document.getElementById("userInput");
  const message = userInput.value.trim();

  if (!message) return;

  displayMessage(message, true);
  userInput.value = "";

  try {
    const response = await fetch(
      "https://wanderbot-worker.tjg00022.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            ...conversationHistory,
            { role: "user", content: message },
          ],
        }),
      }
    );

    const data = await response.json();
    const reply = data.choices[0].message.content;

    conversationHistory.push(
      { role: "user", content: message },
      { role: "assistant", content: reply }
    );

    displayMessage(reply);
  } catch (error) {
    console.error("Error:", error);
    displayMessage("Sorry, I couldn't process your message. Please try again.");
  }
}

// Initialize everything when the page loads
document.addEventListener("DOMContentLoaded", async () => {
  // Load initial products
  products = await loadProducts();

  // Set up event listeners
  document
    .getElementById("generateRoutine")
    .addEventListener("click", generateRoutine);
  document.getElementById("chatForm").addEventListener("submit", handleChat);

  // Initialize category filter
  document.getElementById("categoryFilter").addEventListener("change", (e) => {
    const category = e.target.value;
    const filteredProducts = category
      ? products.filter(
          (p) => p.category.toLowerCase() === category.toLowerCase()
        )
      : products;
    displayProducts(filteredProducts);
  });

  // Display any previously selected products
  updateSelectedProductsList();

  // Show welcome message
  displayMessage(
    "Welcome! Select some products and I'll help you create a personalized routine."
  );
});
