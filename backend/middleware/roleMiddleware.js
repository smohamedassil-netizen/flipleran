/**
 * Usages :
 *   router.get('/admin', authMiddleware, requireRole('admin'), handler)
 *   router.post('/cours', authMiddleware, requireRole('professeur', 'admin'), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Non authentifie.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Acces refuse. Role requis : ${roles.join(' ou ')}.`,
    });
  }
  next();
};

export default requireRole;
