// API endpoint for biology composer
import { VercelRequest, VercelResponse } from '@vercel/node';

// Import the main handler
import mainHandler from '../run';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set the path parameter for the main handler
  req.query.path = ['chat', 'composer-biology'];
  return mainHandler(req, res);
}