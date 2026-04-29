import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';

/**
 * POST /api/auth/refresh
 * Reads the httpOnly cookie "refreshToken", verifies it, and returns a new
 * access token (+ rotates the refresh token cookie).
 */
const refreshHandler = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ message: 'Refresh token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);

    const user = await User.findById(decoded.id).select('isActive status role');
    if (!user || user.isActive === false || user.status !== 'active') {
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      return res.status(401).json({ message: 'Compte invalide ou désactivé.' });
    }

    const payload = { id: decoded.id, role: user.role };
    const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
    const newRefreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ token: newAccessToken });
  } catch {
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    return res.status(401).json({ message: 'Refresh token invalide ou expiré.' });
  }
};

export default refreshHandler;
