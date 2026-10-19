const PRODUCTS = [
    { id: 1, name: "Zvonček na bicykel", price: 8.5, tags: ["bike"] },
    { id: 2, name: "Fľaša na vodu", price: 12, tags: ["sport"] },
    { id: 3, name: "Svetlá na bicykel", price: 24.9, tags: ["bike", "safety"] },
];

const list = document.getElementById("products");
console.log(list);

function createProductItem(product) {
    const item = document.createElement("li");

    const name = document.createElement("span");
    name.textContent = product.name;

    const price = document.createElement("span");
    price.textContent = `${product.price.toFixed(2)} €`;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Do košíka";

    button.addEventListener("click", () => addToCart(product));
    item.append(name, price, button);
    return item;
}

function renderProducts(products) {
    while (list.firstChild) {
        list.removeChild(list.firstChild);
    }
    const fragment = document.createDocumentFragment();
    for (const product of products) {
        fragment.appendChild(createProductItem(product));
    }
    list.appendChild(fragment);
}

const cart = [];

function addToCart(product) {
    cart.push(product);
    renderCart();
}

function renderCart() {
    const items = discountActive ? applyDiscount(cart) : cart;
    const total = items.reduce((sum, item) => sum + item.price, 0);
    document.getElementById("cart-count").textContent = cart.length;
    document.getElementById("cart-total").textContent = total.toFixed(2);
}

const discountButton = document.getElementById("discount");

let discountActive = false;

function applyDiscount(items) {
    return items.map((item) => ({ ...item, price: item.price * 0.9 }));
}

discountButton.addEventListener("click", () => {
    discountActive = !discountActive;
    discountButton.textContent = discountActive ? "Zrušiť zľavu" : "Zľava 10 %";
    renderCart();
});

const statusText = document.getElementById("status");
const reloadButton = document.getElementById("reload");

function loadProducts() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (Math.random() < 0.3) {
                reject(new Error("Server neodpovedá"));
            } else {
                resolve(structuredClone(PRODUCTS));
            }
        }, 1500);
    });
}

reloadButton.addEventListener("click", showProducts);

async function showProducts() {
    statusText.textContent = "Načítavam…";
    reloadButton.disabled = true;

    try {
        const products = await loadProducts();
        renderProducts(products);
        statusText.textContent = `Načítaných produktov: ${products.length}`;
    } catch (error) {
        statusText.textContent = `Chyba: ${error.message}. Skúste to znova.`;
    } finally {
        reloadButton.disabled = false;
    }
}

showProducts();