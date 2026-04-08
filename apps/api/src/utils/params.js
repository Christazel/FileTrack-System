function requirePositiveIntParam(req, res, paramName = "id") {
  const rawValue = req.params?.[paramName];
  const value = Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    res.status(400).json({ message: "ID tidak valid." });
    return null;
  }

  return value;
}

module.exports = {
  requirePositiveIntParam,
};
