/**
 * Controller: testServer
 * What it does:
 * - Simple health-check endpoint to verify if the Express backend server is up, running, and accessible.
 * - Returns status 200 with a "Backend working properly" message.
 */
exports.testServer = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend working properly"
  });
};