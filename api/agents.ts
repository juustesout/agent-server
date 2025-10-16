// API endpoint for listing agents
import { VercelRequest, VercelResponse } from '@vercel/node';

// Import the main handler
import mainHandler from './run';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set the path parameter for the main handler
  req.query.path = ['agents'];
  return mainHandler(req, res);
}