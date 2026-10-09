require('dotenv').config();
const { app } = require('./app');

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`HumanCare backend listening on http://localhost:${port}`);
});
