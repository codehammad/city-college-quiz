function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    if (req.session.user.role !== role) return res.status(403).render('error', { title: 'Access denied', message: 'You do not have permission to view this page.' });
    next();
  };
}

function csrf(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = require('crypto').randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.path !== '/login') {
    const submittedToken = req.body?._csrf || req.get('x-csrf-token');
    if (submittedToken !== req.session.csrfToken) return res.status(403).send('Invalid form token. Please go back and try again.');
  }
  next();
}

module.exports = { requireLogin, requireRole, csrf };
