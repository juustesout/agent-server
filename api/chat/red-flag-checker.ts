// API endpoint for red flag checker
import { VercelRequest, VercelResponse } from '@vercel/node';

// Import the main handler
import mainHandler from '../run';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set the path parameter for the main handler
  req.query.path = ['chat', 'red-flag-checker'];
  return mainHandler(req, res);
}