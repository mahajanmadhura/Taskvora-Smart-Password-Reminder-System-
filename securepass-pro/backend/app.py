from flask import Flask, request, jsonify
from pymongo import MongoClient
from datetime import datetime

app = Flask(__name__)

# MongoDB Connection
client = MongoClient("mongodb://localhost:27017/")
db = client["PasswordManagerDB"]
collection = db["users"]

# Home Route
@app.route("/")
def home():
    return "Server Running & MongoDB Connected 🚀"

# Check Database Connection
@app.route("/testdb")
def test_db():
    try:
        client.admin.command("ping")
        return "MongoDB Connected Successfully ✅"
    except Exception as e:
        return f"Connection Failed ❌ {str(e)}"

# Insert Data (Register User)
@app.route("/register", methods=["POST"])
def register():
    try:
        data = request.json
        
        user_data = {
            "name": data["name"],
            "email": data["email"],
            "created_at": datetime.now()
        }

        collection.insert_one(user_data)

        return jsonify({"message": "User Registered Successfully ✅"})
    
    except Exception as e:
        return jsonify({"error": str(e)})

# Get All Users
@app.route("/users", methods=["GET"])
def get_users():
    users = list(collection.find({}, {"_id": 0}))
    return jsonify(users)

if __name__ == "__main__":
    app.run(debug=True)