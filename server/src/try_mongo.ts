const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://<username>:<password>@autodidact-cluster.dbyvpmf.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully to Atlas");
  } catch (err) {
    console.error("Connection error:", err);
  } finally {
    await client.close();
  }
}
run();