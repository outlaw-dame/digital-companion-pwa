import { serve } from "bun";
import { Database } from "bun:sqlite";

const db = new Database("mydb.sqlite");

// Create a table if it doesn't exist
db.run("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)");

serve({
  port: 3000,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      return new Response("Hello from Bun Backend!");
    }
    if (url.pathname === "/messages" && request.method === "POST") {
      return request.json().then(data => {
        const stmt = db.prepare("INSERT INTO messages (content) VALUES (?)");
        stmt.run(data.content);
        return new Response("Message saved!", { status: 201 });
      });
    }
    if (url.pathname === "/messages" && request.method === "GET") {
      const messages = db.query("SELECT * FROM messages").all();
      return new Response(JSON.stringify(messages), { headers: { "Content-Type": "application/json" } });
    }
    return new Response("404!");
  },
  error(error) {
    return new Response(`<pre>${error}\n${error.stack}</pre>`, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  },
});

console.log("Bun server listening on port 3000");
