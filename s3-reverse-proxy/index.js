const express = require('express');
const mime = require('mime-types');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const PORT = 8000;

const s3 = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://localhost:9000',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin'
  },
  forcePathStyle: true
});

app.use(async (req, res) => {
  try {
    const hostname = req.hostname; // e.g. "clever-lion-42.localhost"
    const subdomain = hostname.split('.')[0];

    let filePath = req.path;

    if (filePath === '/') {
      filePath = '/index.html';
    }

    const key = `__outputs/${subdomain}${filePath}`;

    console.log('Fetching:', key);

    const command = new GetObjectCommand({
      Bucket: 'vercel',
      Key: key
    });

    const response = await s3.send(command);

    res.setHeader(
      'Content-Type',
      mime.lookup(filePath) || 'application/octet-stream'
    );

    response.Body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(404).send('Not Found');
  }
});

app.listen(PORT, () => {
  console.log(`Reverse Proxy running on ${PORT}`);
});