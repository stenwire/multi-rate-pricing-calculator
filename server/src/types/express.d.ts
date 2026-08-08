import { IDocument } from '../models/Document';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      document?: IDocument;
    }
  }
}

export {};
