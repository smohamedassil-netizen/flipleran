import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Vérifie le JWT dans le header Authorization: Bearer <token>
 * Attache req.user = { id, role } (depuis le token)
 * Si le token est valide mais l'utilisateur supprimé, renvoie 401.
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acces refuse : aucun token fourni.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Vérification légère : l'utilisateur existe toujours en base et est actif
    const user = await User.findById(decoded.id).select('isActive');
    if (!user) {
      return res.status(401).json({ message: 'Acces refuse : utilisateur introuvable.' });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Compte désactivé. Contactez votre administrateur.' });
    }

    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Session expiree, veuillez vous reconnecter.'
        : 'Token invalide.';
    res.status(401).json({ message });
  }
};

export default authMiddleware;
