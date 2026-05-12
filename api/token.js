export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ token: process.env.GIST_TOKEN || '' });
}
