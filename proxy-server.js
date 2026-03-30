const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 4000;

app.use(cors());

app.get("/medicines", async (req, res) => {
  const query = req.query.q;
  try {
    const response = await axios.get(
      `https://onedoc.1mg.com/v1.0.0/search-suggestion?q=${encodeURIComponent(query)}&types=brand,sku,udp&per_page=8`,
      {
        headers: {
          "X-Platform": "desktop-0.0.1",
          "X-Access-Key": "1mg_client_access_key",
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});
