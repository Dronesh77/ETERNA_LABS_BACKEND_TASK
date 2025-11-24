# Postman Collection Setup Guide

## 📥 How to Import the Collection

### **Option 1: Import JSON File**
1. Open Postman
2. Click **Import** button (top left)
3. Select **File** tab
4. Choose `Order_Execution_Engine.postman_collection.json`
5. Click **Import**

### **Option 2: Import via URL**
1. Open Postman
2. Click **Import**
3. Select **Link** tab
4. Paste the file path (if hosted)
5. Click **Import**

---

## ⚙️ Environment Variables

The collection uses these variables:

- **`base_url`**: `http://localhost:3000` (default)
- **`order_id`**: Will be set automatically from responses

### **To Set Variables:**
1. Click on collection name
2. Go to **Variables** tab
3. Edit `base_url` if your server runs on different port
4. `order_id` will be auto-populated from responses

---

## 🎬 Using for Video Demo

### **Recommended Sequence:**

1. **Health Check** - Verify server is running
2. **Create Order - Alice BUY** - First order (PENDING)
3. **Create Order - Bob SELL** - Will match! (Shows trade)
4. **Create Order - Charlie SELL** - Better price
5. **Create Order - David BUY** - High price
6. **Create Order - Eve SELL** - Another match
7. **Get Order Book** - Show pending orders
8. **Get All Trades** - Show executed trades

### **For Simultaneous Orders:**
- Open multiple Postman windows/tabs
- Run orders 3, 4, 5 quickly one after another
- Watch server logs process them sequentially

---

## 📋 Collection Structure

### **1. Health Check**
- `GET /health` - Verify server status

### **2. Orders**
- Create Order (multiple examples)
- Get Order by ID
- Get Orders by User
- Get Pending Orders
- Get Order Book
- Cancel Order

### **3. Trades**
- Get All Trades
- Get Trades by Symbol
- Get Trades by Order ID

### **4. Video Demo Sequence**
- Pre-configured sequence for video recording
- All requests in order
- Ready to run one after another

---

## 🎯 Quick Tips

1. **Save Responses**: Click "Save Response" to keep examples
2. **Use Runner**: Use Collection Runner to run all requests in sequence
3. **Show in Video**: Postman UI is great for video - shows request/response clearly
4. **Auto-fill Variables**: Order IDs from responses can be saved to variables

---

## 🚀 Running the Demo Sequence

### **Manual:**
1. Run requests 1-6 in order
2. Watch responses
3. Check order book
4. Check trades

### **Using Collection Runner:**
1. Click on collection
2. Click **Run** button
3. Select "Video Demo Sequence" folder
4. Click **Run Order Execution Engine API**
5. Watch all requests execute automatically!

---

## 💡 Pro Tips for Video

1. **Split Screen**: Postman on one side, VS Code on other
2. **Show Response**: Expand response JSON to show details
3. **Highlight Trades**: Point to `"trades": [...]` array
4. **Show Status Changes**: Point to `"status": "PENDING"` → `"FILLED"`
5. **Use Pretty View**: Postman's pretty JSON view is great for video

---

## 📝 Example Response to Highlight

### **After Matching:**
```json
{
  "order": {
    "id": "...",
    "status": "PARTIALLY_FILLED",  ← Point to this!
    "filledQuantity": 5,           ← Point to this!
    "quantity": 10
  },
  "trades": [                      ← Point to this!
    {
      "id": "...",
      "quantity": 5,
      "price": 50000
    }
  ]
}
```

---

## ✅ Ready to Use!

The collection is ready to import and use for your video demonstration!

