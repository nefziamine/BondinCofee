export interface Reclamation {
  id?: number;
  userId?: number;
  sujet: string;
  description: string;
  status: string;
  category?: string;
  type?: 'QUESTION' | 'RECLAMATION';
  reponse?: string;
  userEmail?: string;
  dateCreation?: string | Date; 
}