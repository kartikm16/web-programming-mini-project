const { db } = require('./db');

async function clear() {
    console.log("Clearing dummy data...");
    try {
        await db.ref('products').remove();
        await db.ref('orders').remove();
        await db.ref('userOrders').remove();
        await db.ref('farmerOrders').remove();
        await db.ref('carts').remove();
        console.log("Database cleared successfully! You have a clean slate.");
        process.exit(0);
    } catch (e) {
        console.error("Error clearing database:", e);
        process.exit(1);
    }
}

clear();
