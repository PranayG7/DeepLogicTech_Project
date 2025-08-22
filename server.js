const http = require("http");
const https = require("https");

const PORT = 3000;

// Fix weird HTML stuff like &amp; back to &
function fixText(text) {
  if (!text) return "";
  
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .trim();
}

// Go get a webpage
function getPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Couldn't get page: ${response.statusCode}`));
      }

      let data = "";
      response.on("data", chunk => data += chunk);
      response.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

// Find stories in the HTML mess
function findStories(html) {
  if (!html) return [];

  // Look for Time.com article links
  const linkPattern = /<a[^>]*href="(https:\/\/time\.com\/\d+[^"]*)"[^>]*>(.*?)<\/a>/gi;
  
  const stories = [];
  const seen = new Set();
  let match;

  while ((match = linkPattern.exec(html)) && stories.length < 6) {
    const url = match[1];
    const title = fixText(match[2].replace(/<[^>]*>/g, ""));

    // Skip if title is too short or we've seen this URL
    if (title.length < 10 || seen.has(url)) continue;

    seen.add(url);
    stories.push({ title, url });
  }

  return stories;
}

// Handle requests
const server = http.createServer(async (req, res) => {
  // Let browsers call this from anywhere
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.url === "/stories" && req.method === "GET") {
    try {
      const html = await getPage("https://time.com/");
      const stories = findStories(html);
      
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(stories, null, 2));
      
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        error: "Couldn't get stories right now. Try again in a bit!" 
      }));
    }
  } else {
    // Wrong page
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Try going to /stories instead");
  }
});

server.listen(PORT, () => {
  console.log(`Stories server running at http://localhost:${PORT}/stories`);
  console.log("Go there to see the latest Time Magazine stories!");
});