export const getHealth = (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'nexfolio-api',
    timestamp: new Date().toISOString(),
  });
};
