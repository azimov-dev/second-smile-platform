module.exports = (err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
};
