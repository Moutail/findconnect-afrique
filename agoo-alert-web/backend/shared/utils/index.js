const jwt = require('jsonwebtoken');

const generateToken = (payload, secret, expiresIn = '7d') => {
  return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};

const formatError = (message, status = 500) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const paginate = (query, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
};

const buildPaginationMeta = (total, page, limit) => {
  return {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
};

module.exports = {
  generateToken,
  verifyToken,
  formatError,
  asyncHandler,
  paginate,
  buildPaginationMeta,
};
