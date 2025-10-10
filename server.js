// Load environment variables from .env into process.env
require('dotenv').config();
// Resend SDK (installed via `npm install resend`)
const { Resend } = require('resend');
// Create a Resend client instance using API key from .env
// (keep the client shared rather than re-creating per request)
const resend = new Resend(process.env.RESEND_API_KEY);

// 1. Import the Express library
const express = require('express');

// 2. Create an Express application
const app = express();

// 3. Define the port number (default 3000)
const PORT = process.env.PORT || 3000;

// 4. Middleware: parse JSON bodies (from POST requests)
app.use(express.json());

// 5. Middleware: serve static files from the "public" folder
//    Example: http://localhost:3000/index.html
app.use(express.static('public'));

app.post('/api/send', async (req, res) => {
  try {
    // Extract fields from frontend JSON
    const { requesterName, company, entries } = req.body;

    // 🔍 Validation checks — ensure required fields exist
    if (!requesterName || !company || !entries || !entries.length) {
      return res.status(400).json({ ok: false, error: 'Missing required form fields.' });
    }

    // Build the email's HTML content
    const html = `
      <h2>New Badge Request</h2>
      <h3><strong>Requester:</strong> ${requesterName}</h3>

      <h3>Entries:</h3>
      <table style="width:100%; border-collapse:collapse; font-family:Arial, sans-serif;">
        <thead>
          <tr style="background-color:#f2f2f2;">
            <th style="border:1px solid #ddd; padding:8px; text-align:left;">#</th>
            <th style="border:1px solid #ddd; padding:8px; text-align:left;">Employee Name</th>
            <th style="border:1px solid #ddd; padding:8px; text-align:left;">ID Type</th>
            <th style="border:1px solid #ddd; padding:8px; text-align:left;">ID Value</th>
            <th style="border:1px solid #ddd; padding:8px; text-align:left;">Company</th>
          </tr>
        </thead>
        <tbody>
          ${entries
            .map(
              (e, i) => `
                <tr>
                  <td style="border:1px solid #ddd; padding:8px;">${i + 1}</td>
                  <td style="border:1px solid #ddd; padding:8px;">${e.employeeName}</td>
                  <td style="border:1px solid #ddd; padding:8px;">${e.idType}</td>
                  <td style="border:1px solid #ddd; padding:8px;">${e.idValue}</td>
                  <td style="border:1px solid #ddd; padding:8px;">${e.company}</td>
                </tr>`
            )
            .join('')}
        </tbody>
      </table>
    `;

    // 📤 Send the email via Resend
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM,     // verified domain email
      to: process.env.RESEND_TEST_TO,    // IT coordinator email
      subject: `Badge Request from ${requesterName}`,
      html,
    });

    // Log full result for debugging (safe locally)
    console.log('✅ Resend send result:', result);

    // Respond to the caller with success and the Resend response id
    return res.json({ ok: true, id: result.id, result });
  } catch (err) {
    console.error('❌ Resend send error:', err);
    // Try to give the caller useful information without exposing secret data
    return res.status(500).json({ ok: false, error: err.message || err });
  }
});

// 7. Export the app for Vercel
// When running locally (`node server.js`), start the server manually.
// When running on Vercel, Vercel will automatically handle the server.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Local server running at http://localhost:${PORT}`);
  });
}

// Export for Vercel's serverless handler
module.exports = app;